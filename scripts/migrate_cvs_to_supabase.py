#!/usr/bin/env python3
"""
CV Migration Script: Django media files → Supabase Storage
===========================================================
Migrates CV files from Django media folder to Supabase Storage
and updates database references.

Requirements:
  pip install supabase python-dotenv

Usage:
  python3 scripts/migrate_cvs_to_supabase.py
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pllzfnekiebxsiuoyeuu.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
DJANGO_MEDIA_ROOT = os.getenv('DJANGO_MEDIA_ROOT', '/home/user/VeriCV-v2/backend/media')
STORAGE_BUCKET = 'cv-uploads'

if not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# CV records from your database (user_id = 2, which we'll map to Supabase UUID)
CVS_TO_MIGRATE = [
    {
        'id': 1,
        'title': '__السيرة الذاتية _.pdf',
        'file': 'cvs/__السيرة_الذاتية___1fOQo2C.pdf',
        'django_user_id': 2,
        'uploaded_at': '2025-10-29 11:50:40.80286+00',
        'extracted_name': 'عبدالعزيز طالل الداحس',
        'extracted_phone': '+966557703930',
        'extracted_city': 'الرياض',
        'detected_language': 'ar',
        'extracted_job_titles': ['محامي', 'مستشار قانوني', 'باحث قانوني'],
        'info_confirmed': False,
        'ip_detected_city': '',
    },
    {
        'id': 2,
        'title': 'Amirah-khalid-CV-2025.pdf',
        'file': 'cvs/Amirah-khalid-CV-2025_1J6PXRk.pdf',
        'django_user_id': 2,
        'uploaded_at': '2025-10-29 11:57:21.775551+00',
        'extracted_name': 'Amira khalid',
        'extracted_phone': '+966567670159',
        'extracted_city': 'Riyadh',
        'detected_language': 'en',
        'extracted_job_titles': ['Marketing Assistant', 'Marketing Coordinator', 'Business Development Coordinator'],
        'info_confirmed': False,
        'ip_detected_city': '',
    },
    {
        'id': 3,
        'title': '__السيرة الذاتية _.pdf',
        'file': 'cvs/__السيرة_الذاتية___ZcV7Zty.pdf',
        'django_user_id': 2,
        'uploaded_at': '2025-10-29 12:04:23.95141+00',
        'extracted_name': 'عبدالعزيز طالل الداحس',
        'extracted_phone': '+966557703930',
        'extracted_city': 'الرياض',
        'detected_language': 'ar',
        'extracted_job_titles': ['محامي', 'مستشار قانوني', 'باحث قانوني'],
        'info_confirmed': False,
        'ip_detected_city': 'Riyadh',
    },
    {
        'id': 4,
        'title': '__السيرة الذاتية _.pdf',
        'file': 'cvs/__السيرة_الذاتية___uSIExBt.pdf',
        'django_user_id': 2,
        'uploaded_at': '2025-10-29 12:11:59.342454+00',
        'extracted_name': 'عبدالعزيز طالل الداحس',
        'extracted_phone': '+966557703930',
        'extracted_city': 'الرياض',
        'detected_language': 'ar',
        'extracted_job_titles': ['محامي', 'مستشار قانوني', 'باحث قانوني'],
        'info_confirmed': False,
        'ip_detected_city': '',
    },
    {
        'id': 5,
        'title': 'Amirah-khalid-CV-2025.pdf',
        'file': 'cvs/Amirah-khalid-CV-2025_8RkaSMK.pdf',
        'django_user_id': 2,
        'uploaded_at': '2025-10-29 12:18:22.19625+00',
        'extracted_name': 'Amira khalid',
        'extracted_phone': '+966567670159',
        'extracted_city': 'Riyadh',
        'detected_language': 'en',
        'extracted_job_titles': ['Marketing Assistant', 'Marketing Coordinator', 'Business Analyst'],
        'info_confirmed': False,
        'ip_detected_city': 'Riyadh',
    }
]

def get_user_uuid_mapping():
    """Get Django user ID to Supabase UUID mapping."""
    try:
        response = supabase.table('user_migration_mapping').select('*').execute()
        mapping = {}
        for row in response.data:
            mapping[row['django_user_id']] = row['supabase_user_id']
        return mapping
    except Exception as e:
        print(f"❌ ERROR: Failed to get user mapping: {e}")
        print(f"   Make sure you've run migrate_users_to_supabase.py first!")
        sys.exit(1)

def create_storage_bucket():
    """Create Supabase Storage bucket for CV uploads."""
    print(f"\n📦 Setting up Supabase Storage bucket: {STORAGE_BUCKET}")

    try:
        # Try to create bucket (will fail if it already exists)
        supabase.storage.create_bucket(STORAGE_BUCKET, {
            'public': False,  # Private bucket - requires authentication
            'file_size_limit': 10485760,  # 10MB max file size
            'allowed_mime_types': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        })
        print(f"✅ Bucket '{STORAGE_BUCKET}' created successfully")
    except Exception as e:
        if 'already exists' in str(e).lower():
            print(f"✅ Bucket '{STORAGE_BUCKET}' already exists")
        else:
            print(f"⚠️  Warning: {e}")

def upload_cv_file(cv_record: dict, supabase_uuid: str) -> str:
    """
    Upload CV file to Supabase Storage.

    Args:
        cv_record: CV database record
        supabase_uuid: User's Supabase UUID

    Returns:
        str: Supabase Storage path
    """
    django_file_path = Path(DJANGO_MEDIA_ROOT) / cv_record['file']

    # Check if file exists
    if not django_file_path.exists():
        raise FileNotFoundError(f"File not found: {django_file_path}")

    # Read file content
    with open(django_file_path, 'rb') as f:
        file_content = f.read()

    # Get file size
    file_size = len(file_content)

    # Determine file extension
    file_ext = django_file_path.suffix or '.pdf'

    # Create new storage path: user_uuid/cv_id/filename.pdf
    storage_path = f"{supabase_uuid}/cv_{cv_record['id']}/{cv_record['id']}{file_ext}"

    print(f"   📤 Uploading {django_file_path.name} ({file_size} bytes)")
    print(f"      Storage path: {storage_path}")

    # Upload to Supabase Storage
    try:
        response = supabase.storage.from_(STORAGE_BUCKET).upload(
            storage_path,
            file_content,
            {
                'content-type': 'application/pdf',
                'upsert': True  # Overwrite if exists
            }
        )
        print(f"   ✅ File uploaded successfully")
        return storage_path

    except Exception as e:
        print(f"   ❌ Upload failed: {e}")
        raise

def migrate_cv(cv_record: dict, user_uuid_mapping: dict) -> dict:
    """
    Migrate a single CV record.

    Args:
        cv_record: CV database record
        user_uuid_mapping: Django user ID to Supabase UUID mapping

    Returns:
        dict: Migration result
    """
    print(f"\n{'='*80}")
    print(f"Migrating CV #{cv_record['id']}: {cv_record['title']}")
    print('='*80)

    try:
        # Get Supabase UUID for this user
        django_user_id = cv_record['django_user_id']
        supabase_uuid = user_uuid_mapping.get(django_user_id)

        if not supabase_uuid:
            raise ValueError(f"No Supabase UUID found for Django user ID {django_user_id}")

        print(f"   User: Django ID {django_user_id} → Supabase UUID {supabase_uuid}")

        # Upload file to Supabase Storage
        storage_path = upload_cv_file(cv_record, supabase_uuid)

        # Get file size
        django_file_path = Path(DJANGO_MEDIA_ROOT) / cv_record['file']
        file_size = django_file_path.stat().st_size if django_file_path.exists() else None

        # Insert into new cvs table
        cv_data = {
            'user_id': supabase_uuid,
            'title': cv_record['title'],
            'file_path': storage_path,
            'file_size': file_size,
            'file_type': 'application/pdf',
            'extracted_name': cv_record['extracted_name'],
            'extracted_phone': cv_record['extracted_phone'],
            'extracted_city': cv_record['extracted_city'],
            'extracted_job_titles': cv_record['extracted_job_titles'],
            'detected_language': cv_record['detected_language'],
            'ip_detected_city': cv_record['ip_detected_city'],
            'info_confirmed': cv_record['info_confirmed'],
            'processing_status': 'completed',
            'uploaded_at': cv_record['uploaded_at'],
            'processed_at': cv_record['uploaded_at'],
        }

        print(f"   💾 Saving CV record to database...")
        response = supabase.table('cvs').insert(cv_data).execute()

        new_cv_id = response.data[0]['id']
        print(f"   ✅ CV saved with new ID: {new_cv_id}")

        print(f"\n✅ SUCCESS: CV #{cv_record['id']} migrated successfully!")

        return {
            'success': True,
            'old_id': cv_record['id'],
            'new_id': new_cv_id,
            'title': cv_record['title'],
            'storage_path': storage_path,
        }

    except Exception as e:
        print(f"\n❌ ERROR migrating CV #{cv_record['id']}: {str(e)}")
        return {
            'success': False,
            'old_id': cv_record['id'],
            'title': cv_record['title'],
            'error': str(e),
        }

def verify_migration():
    """Verify that all CVs were migrated successfully."""
    print(f"\n{'='*80}")
    print("VERIFICATION")
    print('='*80)

    try:
        # Count CVs in new table
        response = supabase.table('cvs').select('*', count='exact').execute()
        migrated_count = response.count

        print(f"\n📊 Migration Statistics:")
        print(f"   Total Django CVs: {len(CVS_TO_MIGRATE)}")
        print(f"   Migrated CVs: {migrated_count}")

        if migrated_count >= len(CVS_TO_MIGRATE):
            print(f"   ✅ All CVs migrated successfully!")
        else:
            print(f"   ⚠️  Some CVs may not have been migrated")

        # Display migrated CVs
        print(f"\n📋 Migrated CVs:")
        for cv in response.data:
            print(f"   • CV #{cv['id']}: {cv['title']}")
            print(f"     Storage: {cv['file_path']}")
            print(f"     User: {cv['user_id']}")

        return True

    except Exception as e:
        print(f"\n❌ ERROR during verification: {str(e)}")
        return False

def main():
    """Main migration process."""
    print("="*80)
    print("VERICV CV MIGRATION: Django Media → Supabase Storage")
    print("="*80)

    # Check if Django media folder exists
    media_path = Path(DJANGO_MEDIA_ROOT)
    if not media_path.exists():
        print(f"❌ ERROR: Django media folder not found: {DJANGO_MEDIA_ROOT}")
        print(f"   Update DJANGO_MEDIA_ROOT in .env or script")
        sys.exit(1)

    print(f"\nDjango media folder: {DJANGO_MEDIA_ROOT}")
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Storage bucket: {STORAGE_BUCKET}")
    print(f"CVs to migrate: {len(CVS_TO_MIGRATE)}")

    # Get user mapping
    print(f"\n📋 Loading user mapping...")
    user_uuid_mapping = get_user_uuid_mapping()
    print(f"   Found {len(user_uuid_mapping)} user mappings")
    for django_id, supabase_uuid in user_uuid_mapping.items():
        print(f"   • Django user {django_id} → {supabase_uuid}")

    # Create storage bucket
    create_storage_bucket()

    # Confirm before proceeding
    print(f"\n⚠️  WARNING: This will upload CV files to Supabase Storage")
    print(f"   and create new CV records in the database.")
    response = input(f"\nProceed with migration? (yes/no): ")

    if response.lower() not in ['yes', 'y']:
        print("❌ Migration cancelled by user")
        sys.exit(0)

    # Migrate each CV
    results = []
    for cv_record in CVS_TO_MIGRATE:
        result = migrate_cv(cv_record, user_uuid_mapping)
        results.append(result)

    # Verify migration
    verify_migration()

    # Summary
    print(f"\n{'='*80}")
    print("MIGRATION SUMMARY")
    print('='*80)

    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]

    print(f"\n✅ Successful: {len(successful)}")
    print(f"❌ Failed: {len(failed)}")

    if failed:
        print(f"\nFailed migrations:")
        for result in failed:
            print(f"   • CV #{result['old_id']}: {result['title']}")
            print(f"     Error: {result.get('error', 'Unknown error')}")

    print(f"\n{'='*80}")
    print("✅ CV MIGRATION COMPLETE!")
    print('='*80)
    print(f"\nNext steps:")
    print(f"1. Verify CVs in Supabase Dashboard → Storage → {STORAGE_BUCKET}")
    print(f"2. Verify CV records in Supabase Dashboard → Table Editor → cvs")
    print(f"3. Test CV upload/download in the application")
    print(f"4. Once verified, you can safely delete Django media files")
    print('='*80)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
User Migration Script: Django auth_user → Supabase Auth
========================================================
Migrates Django users to Supabase Auth and creates user profiles.

Requirements:
  pip install supabase python-dotenv

Usage:
  python3 scripts/migrate_users_to_supabase.py
"""

import os
import sys
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://pllzfnekiebxsiuoyeuu.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment")
    print("   Add it to your .env file or export it:")
    print("   export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'")
    sys.exit(1)

# Initialize Supabase client with service role key (admin privileges)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Django users to migrate (from your data)
DJANGO_USERS = [
    {
        'django_id': 1,
        'username': 'admin',
        'email': 'admin@vericv.app',
        'first_name': '',
        'last_name': '',
        'date_joined': '2025-10-29T11:42:50.081839+00:00',
        'temp_password': 'VeriCV2025!Admin',  # Temporary password - user must change
    },
    {
        'django_id': 2,
        'username': 'root',
        'email': 'tariq@ib.com.sa',
        'first_name': '',
        'last_name': '',
        'date_joined': '2025-10-29T11:47:20.916093+00:00',
        'temp_password': 'VeriCV2025!Root',  # Temporary password - user must change
    }
]

def migrate_user(django_user: dict) -> dict:
    """
    Migrate a single Django user to Supabase Auth.

    Returns:
        dict: Migration result with Supabase UUID
    """
    print(f"\n{'='*80}")
    print(f"Migrating user: {django_user['username']} ({django_user['email']})")
    print('='*80)

    try:
        # Step 1: Create user in Supabase Auth using Admin API
        print(f"📝 Creating auth user...")

        # Use Supabase Admin API to create user
        auth_response = supabase.auth.admin.create_user({
            'email': django_user['email'],
            'password': django_user['temp_password'],
            'email_confirm': True,  # Auto-confirm email
            'user_metadata': {
                'username': django_user['username'],
                'full_name': f"{django_user['first_name']} {django_user['last_name']}".strip(),
                'migrated_from': 'django',
                'django_user_id': django_user['django_id'],
            }
        })

        if not auth_response.user:
            raise Exception(f"Failed to create auth user: {auth_response}")

        supabase_uuid = auth_response.user.id
        print(f"✅ Auth user created with UUID: {supabase_uuid}")

        # Step 2: Create user profile
        print(f"📝 Creating user profile...")

        profile_data = {
            'id': supabase_uuid,
            'username': django_user['username'],
            'full_name': f"{django_user['first_name']} {django_user['last_name']}".strip() or None,
            'created_at': django_user['date_joined'],
        }

        profile_response = supabase.table('user_profiles').insert(profile_data).execute()
        print(f"✅ User profile created")

        # Step 3: Create migration mapping
        print(f"📝 Creating migration mapping...")

        mapping_data = {
            'django_user_id': django_user['django_id'],
            'supabase_user_id': supabase_uuid,
            'django_username': django_user['username'],
            'django_email': django_user['email'],
        }

        mapping_response = supabase.table('user_migration_mapping').insert(mapping_data).execute()
        print(f"✅ Migration mapping created")

        print(f"\n✅ SUCCESS: User '{django_user['username']}' migrated successfully!")
        print(f"   Django ID: {django_user['django_id']}")
        print(f"   Supabase UUID: {supabase_uuid}")
        print(f"   Email: {django_user['email']}")
        print(f"   Temporary Password: {django_user['temp_password']}")
        print(f"   ⚠️  User should change password on first login!")

        return {
            'success': True,
            'django_id': django_user['django_id'],
            'supabase_uuid': supabase_uuid,
            'username': django_user['username'],
            'email': django_user['email'],
        }

    except Exception as e:
        print(f"\n❌ ERROR migrating user '{django_user['username']}': {str(e)}")
        return {
            'success': False,
            'django_id': django_user['django_id'],
            'username': django_user['username'],
            'email': django_user['email'],
            'error': str(e),
        }

def verify_migration():
    """Verify that all users were migrated successfully."""
    print(f"\n{'='*80}")
    print("VERIFICATION")
    print('='*80)

    try:
        # Check migration mapping table
        mapping_response = supabase.table('user_migration_mapping').select('*').execute()
        migrated_count = len(mapping_response.data)

        print(f"\n📊 Migration Statistics:")
        print(f"   Total Django users: {len(DJANGO_USERS)}")
        print(f"   Migrated users: {migrated_count}")

        if migrated_count == len(DJANGO_USERS):
            print(f"   ✅ All users migrated successfully!")
        else:
            print(f"   ⚠️  Some users may not have been migrated")

        # Display migrated users
        print(f"\n📋 Migrated Users:")
        for mapping in mapping_response.data:
            print(f"   • Django ID {mapping['django_user_id']} → {mapping['supabase_user_id']}")
            print(f"     Username: {mapping['django_username']}")
            print(f"     Email: {mapping['django_email']}")

        return True

    except Exception as e:
        print(f"\n❌ ERROR during verification: {str(e)}")
        return False

def main():
    """Main migration process."""
    print("="*80)
    print("VERICV USER MIGRATION: Django → Supabase")
    print("="*80)
    print(f"\nSupabase URL: {SUPABASE_URL}")
    print(f"Users to migrate: {len(DJANGO_USERS)}")

    # Confirm before proceeding
    print(f"\n⚠️  WARNING: This will create new users in Supabase Auth")
    print(f"   Existing users with the same email will cause errors.")
    response = input(f"\nProceed with migration? (yes/no): ")

    if response.lower() not in ['yes', 'y']:
        print("❌ Migration cancelled by user")
        sys.exit(0)

    # Migrate each user
    results = []
    for django_user in DJANGO_USERS:
        result = migrate_user(django_user)
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
            print(f"   • {result['username']} ({result['email']}): {result.get('error', 'Unknown error')}")

    print(f"\n{'='*80}")
    print("⚠️  IMPORTANT POST-MIGRATION STEPS:")
    print('='*80)
    print(f"1. Send password reset emails to users:")
    for user in DJANGO_USERS:
        print(f"   • {user['email']} (temp password: {user['temp_password']})")
    print(f"\n2. Update CV records to use new Supabase UUIDs")
    print(f"   Run: python3 scripts/migrate_cvs_to_supabase.py")
    print(f"\n3. Verify users can log in with temporary passwords")
    print(f"\n4. Force password reset on first login")
    print('='*80)

if __name__ == '__main__':
    main()

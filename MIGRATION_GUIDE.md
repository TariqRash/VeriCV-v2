# 🚀 COMPLETE DJANGO → SUPABASE MIGRATION GUIDE

This guide will help you completely **replace Django backend** with **Supabase** for VeriCV v2.

---

## 📋 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Migration Steps](#migration-steps)
4. [Testing](#testing)
5. [Production Deployment](#production-deployment)
6. [Rollback Plan](#rollback-plan)

---

## 🎯 **OVERVIEW**

### **What's Being Replaced:**

| Component | Old (Django) | New (Supabase) |
|-----------|--------------|----------------|
| **Authentication** | Django Auth + JWT | Supabase Auth (built-in) |
| **User Management** | `auth_user` table | `auth.users` + `user_profiles` |
| **File Storage** | Django media folder | Supabase Storage |
| **API Endpoints** | Django REST Framework | Supabase Edge Functions |
| **Database** | PostgreSQL via Django ORM | Supabase PostgreSQL (direct) |
| **AI Processing** | Django views | Edge Functions (Deno/TypeScript) |

### **Architecture Comparison:**

**Before (Django):**
```
React → Django REST API → PostgreSQL
                ↓
         Groq AI / Whisper
```

**After (Supabase):**
```
React → Supabase (Auth, Storage, Database, Edge Functions)
                        ↓
                 Groq AI / Whisper
```

---

## ✅ **PREREQUISITES**

### **1. Install Required Tools**

```bash
# Supabase CLI
npm install -g supabase

# Python packages for migration scripts
pip install supabase python-dotenv

# PostgreSQL client tools (optional, for verification)
brew install postgresql  # macOS
# or
apt-get install postgresql-client  # Linux
```

### **2. Environment Variables**

Create/update `.env` file in project root:

```bash
# Supabase Credentials
SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI API Keys (keep existing)
GROQ_API_KEY=your-groq-api-key
OPENAI_API_KEY=your-openai-api-key

# Django Media Root (for migration)
DJANGO_MEDIA_ROOT=/path/to/VeriCV-v2/backend/media

# Production URL
NEXT_PUBLIC_API_URL=https://prod.vericv.app
```

### **3. Backup Existing Data**

```bash
# Backup Django database
python backend/manage.py dumpdata > backup_django_data.json

# Backup media files
tar -czf backup_media_files.tar.gz backend/media/
```

---

## 🔄 **MIGRATION STEPS**

### **PHASE 1: Database Schema Setup**

#### **Step 1.1: Create New Supabase Schema**

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref pllzfnekiebxsiuoyeuu

# Apply new schema
cd /path/to/VeriCV-v2
psql "$SUPABASE_POSTGRES_URL" < supabase/migrations/001_new_schema.sql
```

Or run the SQL directly in **Supabase Dashboard → SQL Editor**:
1. Go to: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/sql
2. Copy contents of `supabase/migrations/001_new_schema.sql`
3. Run the query

**Verify Schema Created:**
```sql
-- Run in SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'cvs', 'quizzes', 'questions', 'quiz_results', 'voice_interviews', 'feedback');
```

You should see all 7 tables listed.

---

### **PHASE 2: User Migration**

#### **Step 2.1: Migrate Users to Supabase Auth**

```bash
# Run user migration script
cd /path/to/VeriCV-v2
python3 scripts/migrate_users_to_supabase.py
```

**Expected Output:**
```
================================================================================
Migrating user: admin (admin@vericv.app)
================================================================================
📝 Creating auth user...
✅ Auth user created with UUID: 12345678-1234-1234-1234-123456789abc
✅ User profile created
✅ Migration mapping created

✅ SUCCESS: User 'admin' migrated successfully!
   Django ID: 1
   Supabase UUID: 12345678-1234-1234-1234-123456789abc
   Temporary Password: VeriCV2025!Admin
```

#### **Step 2.2: Verify User Migration**

**Option A: Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/auth/users
2. Verify 2 users exist: `admin@vericv.app` and `tariq@ib.com.sa`

**Option B: SQL Query**
```sql
-- Run in SQL Editor
SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  up.username,
  um.django_user_id
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
LEFT JOIN public.user_migration_mapping um ON um.supabase_user_id = au.id
ORDER BY au.created_at;
```

---

### **PHASE 3: CV Files Migration**

#### **Step 3.1: Create Supabase Storage Bucket**

**Option A: Dashboard (Easiest)**
1. Go to: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/storage/buckets
2. Click "Create bucket"
3. Name: `cv-uploads`
4. Public: **NO** (Private)
5. File size limit: `10MB`
6. Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Option B: SQL**
```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-uploads',
  'cv-uploads',
  false,
  10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);
```

#### **Step 3.2: Migrate CV Files**

```bash
# Run CV migration script
cd /path/to/VeriCV-v2
python3 scripts/migrate_cvs_to_supabase.py
```

**Expected Output:**
```
================================================================================
Migrating CV #1: __السيرة الذاتية _.pdf
================================================================================
   User: Django ID 2 → Supabase UUID 87654321-4321-4321-4321-210987654321
   📤 Uploading __السيرة_الذاتية___1fOQo2C.pdf (245678 bytes)
      Storage path: 87654321-4321-4321-4321-210987654321/cv_1/1.pdf
   ✅ File uploaded successfully
   💾 Saving CV record to database...
   ✅ CV saved with new ID: 1

✅ SUCCESS: CV #1 migrated successfully!
```

#### **Step 3.3: Verify CV Migration**

**Option A: Check Storage in Dashboard**
1. Go to: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/storage/buckets/cv-uploads
2. Navigate folders: `user-uuid/cv_id/`
3. Verify 5 PDF files exist

**Option B: Check Database**
```sql
-- Run in SQL Editor
SELECT
  id,
  title,
  file_path,
  file_size,
  extracted_name,
  detected_language,
  array_length(extracted_job_titles, 1) as job_titles_count
FROM public.cvs
ORDER BY uploaded_at DESC;
```

---

### **PHASE 4: Deploy Edge Functions**

#### **Step 4.1: Deploy Edge Functions to Supabase**

```bash
# Login to Supabase CLI
supabase login

# Link project
supabase link --project-ref pllzfnekiebxsiuoyeuu

# Set secrets (environment variables)
supabase secrets set GROQ_API_KEY=your-groq-api-key
supabase secrets set OPENAI_API_KEY=your-openai-api-key

# Deploy all Edge Functions
cd /path/to/VeriCV-v2
supabase functions deploy extract-cv-info
supabase functions deploy generate-quiz
supabase functions deploy submit-quiz
```

**Expected Output:**
```
Deploying function extract-cv-info...
✓ Function deployed successfully
Function URL: https://pllzfnekiebxsiuoyeuu.supabase.co/functions/v1/extract-cv-info
```

#### **Step 4.2: Verify Edge Functions**

```bash
# Test extract-cv-info
curl -X POST \
  'https://pllzfnekiebxsiuoyeuu.supabase.co/functions/v1/extract-cv-info' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"cv_text":"John Doe\nSoftware Engineer\n+1234567890\nNew York"}'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "name": "John Doe",
#     "phone": "+1234567890",
#     "city": "New York",
#     "job_titles": ["Software Engineer", "Developer", "Programmer"]
#   }
# }
```

---

### **PHASE 5: Update Frontend**

#### **Step 5.1: Install Supabase JS Client**

```bash
cd /path/to/VeriCV-v2/frontend
npm install @supabase/supabase-js
```

#### **Step 5.2: Update Supabase Client**

Update `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper to get auth token
export const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}
```

#### **Step 5.3: Replace Authentication**

Update `frontend/src/context/AuthContext.tsx`:

```typescript
import { supabase } from '@/lib/supabase'

// Replace Django login with Supabase Auth
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data.user
}

// Replace Django register with Supabase Auth
export const register = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })

  if (error) throw error
  return data.user
}

// Auto token refresh (built-in with Supabase)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user)
  }
  if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed')
  }
})
```

#### **Step 5.4: Update API Calls**

Update `frontend/src/api/endpoints.ts`:

```typescript
import { supabase, getAuthToken } from '@/lib/supabase'

// Get Supabase Edge Function URL
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// Upload CV
export const uploadCV = async (file: File, title: string) => {
  const user = await supabase.auth.getUser()
  if (!user.data.user) throw new Error('Not authenticated')

  // 1. Upload file to Storage
  const filePath = `${user.data.user.id}/cv_${Date.now()}/${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('cv-uploads')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // 2. Extract CV information
  const token = await getAuthToken()
  const response = await fetch(`${FUNCTIONS_URL}/extract-cv-info`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cv_text: await extractTextFromFile(file), // You'll need to implement this
    }),
  })

  const result = await response.json()
  return result
}

// Generate Quiz
export const generateQuiz = async (cvId: number, cvText: string) => {
  const token = await getAuthToken()
  const response = await fetch(`${FUNCTIONS_URL}/generate-quiz`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cv_id: cvId,
      cv_text: cvText,
    }),
  })

  return response.json()
}

// Submit Quiz
export const submitQuiz = async (quizId: number, answers: any[]) => {
  const token = await getAuthToken()
  const response = await fetch(`${FUNCTIONS_URL}/submit-quiz`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quiz_id: quizId,
      answers: answers,
    }),
  })

  return response.json()
}
```

#### **Step 5.5: Update Environment Variables**

Update `frontend/.env`:

```bash
# Supabase
VITE_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Remove old Django API URL
# VITE_API_URL=http://localhost:8000  # ❌ DELETE THIS
```

---

## ✅ **TESTING**

### **Test 1: User Authentication**

```bash
# Test registration (use a new email)
curl -X POST \
  'https://pllzfnekiebxsiuoyeuu.supabase.co/auth/v1/signup' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Test login
curl -X POST \
  'https://pllzfnekiebxsiuoyeuu.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vericv.app","password":"VeriCV2025!Admin"}'
```

### **Test 2: CV Upload & Extraction**

1. Login to frontend: http://localhost:5173
2. Upload a test CV
3. Verify file appears in Supabase Storage
4. Verify extracted info is displayed
5. Check database record was created

### **Test 3: Quiz Generation**

1. After uploading CV, click "Generate Quiz"
2. Verify 15 questions appear
3. Check database: `quiz_quiz` and `quiz_question` tables have records

### **Test 4: Quiz Submission**

1. Answer all 15 questions
2. Submit quiz
3. Verify score is calculated
4. Verify AI feedback is generated
5. Check `quiz_results` table has record

### **Test 5: RLS Policies**

```sql
-- Test that users can only see their own data
-- Login as user A, try to query user B's CVs (should return empty)
SELECT * FROM cvs WHERE user_id = 'USER_B_UUID';
-- Should return: []
```

---

## 🚀 **PRODUCTION DEPLOYMENT**

### **Step 1: Update Production Environment**

```bash
# Set production environment variables
export NEXT_PUBLIC_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Update production URL
export NEXT_PUBLIC_API_URL=https://prod.vericv.app
```

### **Step 2: Build Frontend**

```bash
cd /path/to/VeriCV-v2/frontend
npm run build

# Deploy to production server
scp -r dist/* user@prod.vericv.app:/var/www/html/
```

### **Step 3: Configure Supabase for Production**

1. Go to: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/settings/auth
2. Update **Site URL**: `https://prod.vericv.app`
3. Update **Redirect URLs**: `https://prod.vericv.app/**`

### **Step 4: Remove Django Backend**

```bash
# Stop Django/Gunicorn service
sudo systemctl stop gunicorn
sudo systemctl disable gunicorn

# Backup Django code (just in case)
tar -czf backup_django_backend.tar.gz backend/

# Optional: Remove Django backend (after thorough testing!)
# rm -rf backend/
```

---

## 🔙 **ROLLBACK PLAN**

If something goes wrong, you can rollback:

### **Rollback Step 1: Restore Django Backend**

```bash
# Restart Django service
sudo systemctl start gunicorn
sudo systemctl enable gunicorn

# Restore frontend to use Django API
cd /path/to/VeriCV-v2/frontend
# Edit .env to point back to Django API
echo "VITE_API_URL=http://localhost:8000" > .env
npm run build
```

### **Rollback Step 2: Restore Database**

```bash
# Restore Django data from backup
python backend/manage.py loaddata backup_django_data.json
```

### **Rollback Step 3: Restore Media Files**

```bash
tar -xzf backup_media_files.tar.gz -C backend/
```

---

## 📊 **MIGRATION CHECKLIST**

- [ ] ✅ Backup all Django data and media files
- [ ] ✅ Create new Supabase schema
- [ ] ✅ Migrate users to Supabase Auth
- [ ] ✅ Migrate CV files to Supabase Storage
- [ ] ✅ Deploy Edge Functions
- [ ] ✅ Update frontend authentication
- [ ] ✅ Update frontend API calls
- [ ] ✅ Test all features thoroughly
- [ ] ✅ Deploy to production
- [ ] ✅ Verify production works correctly
- [ ] ✅ Monitor for 24-48 hours
- [ ] ✅ Remove Django backend (optional)
- [ ] ✅ Clean up old Django tables
- [ ] ✅ Celebrate! 🎉

---

## 🎯 **NEXT STEPS AFTER MIGRATION**

1. **Enable Email Confirmations** (Supabase Auth → Email Templates)
2. **Set up Social Auth** (Google, GitHub, etc.)
3. **Configure Storage Policies** (Fine-tune access control)
4. **Set up Database Backups** (Supabase Dashboard → Database → Backups)
5. **Enable Realtime** (For live updates)
6. **Add Analytics** (Supabase Analytics or PostHog)
7. **Optimize Edge Functions** (Add caching, rate limiting)

---

## 📞 **SUPPORT**

If you encounter issues:

1. Check Supabase logs: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/logs
2. Check Edge Function logs: `supabase functions logs extract-cv-info`
3. Review this guide's troubleshooting section
4. Contact Supabase support: https://supabase.com/support

---

**Good luck with the migration!** 🚀

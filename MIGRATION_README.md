# 🚀 VERICV DJANGO → SUPABASE MIGRATION

## ⚡ **QUICK START (TL;DR)**

```bash
# 1. Apply new schema
psql "$SUPABASE_POSTGRES_URL" < supabase/migrations/001_new_schema.sql

# 2. Migrate users (2 users)
python3 scripts/migrate_users_to_supabase.py

# 3. Migrate CVs (5 files)
python3 scripts/migrate_cvs_to_supabase.py

# 4. Deploy Edge Functions
supabase secrets set GROQ_API_KEY=your-key
supabase functions deploy extract-cv-info
supabase functions deploy generate-quiz
supabase functions deploy submit-quiz

# 5. Update frontend
cd frontend && npm install @supabase/supabase-js
# Edit: src/lib/supabase.ts, src/context/AuthContext.tsx, src/api/endpoints.ts
npm run build

# 6. Deploy to prod.vericv.app
# Stop Django: sudo systemctl stop gunicorn
```

---

## 📁 **FILES OVERVIEW**

| File | Purpose |
|------|---------|
| `MIGRATION_GUIDE.md` | **📖 Complete step-by-step guide** (START HERE) |
| `IMPLEMENTATION_SUMMARY.md` | 📊 Architecture overview & summary |
| `supabase/migrations/001_new_schema.sql` | 🗄️ New database schema (8 tables + RLS) |
| `supabase/migrations/002_migrate_users.sql` | 👥 User migration SQL |
| `scripts/migrate_users_to_supabase.py` | 🔄 Automated user migration |
| `scripts/migrate_cvs_to_supabase.py` | 📄 Automated CV migration |
| `supabase/functions/extract-cv-info/` | ⚡ Edge Function: CV extraction |
| `supabase/functions/generate-quiz/` | ⚡ Edge Function: Quiz generation |
| `supabase/functions/submit-quiz/` | ⚡ Edge Function: Quiz submission |

---

## 🎯 **WHAT GETS REPLACED**

| Component | Before (Django) | After (Supabase) |
|-----------|-----------------|------------------|
| **Auth** | Django auth_user + JWT | Supabase Auth (built-in) |
| **Users** | 2 Django users (integer IDs) | 2 Supabase Auth users (UUIDs) |
| **Storage** | Django media folder (5 CVs) | Supabase Storage bucket |
| **API** | Django REST Framework | Edge Functions (Deno/TS) |
| **Database** | PostgreSQL via ORM | PostgreSQL (direct) |
| **Backend** | 8000+ lines of Python | **0 lines** (Supabase handles it) |

---

## ⏱️ **MIGRATION TIME**

- **Preparation**: 30 min
- **Schema Setup**: 30 min
- **Data Migration**: 45 min
- **Edge Functions**: 1 hour
- **Frontend Updates**: 2-3 hours
- **Testing**: 2-3 hours
- **Production Deploy**: 1 hour

**Total: ~8 hours**

---

## ✅ **MIGRATION CHECKLIST**

```bash
[ ] 1. Read MIGRATION_GUIDE.md
[ ] 2. Backup Django data & media files
[ ] 3. Run 001_new_schema.sql
[ ] 4. Migrate users (scripts/migrate_users_to_supabase.py)
[ ] 5. Migrate CVs (scripts/migrate_cvs_to_supabase.py)
[ ] 6. Deploy Edge Functions
[ ] 7. Update frontend code
[ ] 8. Test all features
[ ] 9. Deploy to production
[ ] 10. Stop Django backend
```

---

## 📊 **CURRENT DATA (From Supabase)**

### **Users (2)**
- `admin@vericv.app` (Django ID: 1)
- `tariq@ib.com.sa` (Django ID: 2)

### **CVs (5)** - All belong to user #2
1. __السيرة الذاتية _.pdf (Arabic lawyer CV)
2. Amirah-khalid-CV-2025.pdf (English marketing CV)
3. __السيرة الذاتية _.pdf (Arabic lawyer CV - duplicate)
4. __السيرة الذاتية _.pdf (Arabic lawyer CV - duplicate)
5. Amirah-khalid-CV-2025.pdf (English marketing CV - duplicate)

### **Quizzes/Results (0)**
- ✅ Clean slate - no migration needed

---

## 🏗️ **NEW DATABASE SCHEMA**

### **Tables Created:**
1. **`user_profiles`** - User profile data (extends Supabase Auth)
2. **`cvs`** - CV uploads with AI-extracted info
3. **`quizzes`** - Quiz sessions
4. **`questions`** - Quiz questions (MCQ with 4 options)
5. **`quiz_results`** - Quiz scores & AI feedback
6. **`voice_interviews`** - Voice interview recordings & evaluations
7. **`feedback`** - AI-generated feedback
8. **`user_activity`** - Activity tracking (optional)

### **Security:**
- ✅ Row Level Security (RLS) on all tables
- ✅ Users can only see/modify their own data
- ✅ Service role can bypass RLS for migrations

---

## 🔑 **ENVIRONMENT VARIABLES**

Create `.env` file:

```bash
# Supabase
SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI APIs
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key

# Django (for migration only)
DJANGO_MEDIA_ROOT=/path/to/VeriCV-v2/backend/media

# Production
NEXT_PUBLIC_API_URL=https://prod.vericv.app
```

---

## 🚀 **EDGE FUNCTIONS**

### **1. extract-cv-info**
- **Input**: CV text
- **Process**: Groq AI extraction
- **Output**: Name, phone, city, 3 job titles
- **Replaces**: `backend/ai/ai_logic.py::extract_cv_information()`

### **2. generate-quiz**
- **Input**: CV text, language
- **Process**: Groq AI generates 15 MCQ questions
- **Output**: Quiz ID + questions
- **Replaces**: `backend/ai/views.py::generate_questions_view()`

### **3. submit-quiz**
- **Input**: Quiz ID, user answers
- **Process**: Calculate score, generate AI feedback
- **Output**: Score, feedback, result ID
- **Replaces**: `backend/ai/views.py::submit_answers_view()`

---

## 📝 **TEMPORARY PASSWORDS**

After user migration, users will have these temporary passwords:

- `admin@vericv.app`: `VeriCV2025!Admin`
- `tariq@ib.com.sa`: `VeriCV2025!Root`

**⚠️ Users must change passwords on first login!**

---

## 🔗 **USEFUL LINKS**

- **Supabase Dashboard**: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu
- **SQL Editor**: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/sql
- **Auth Users**: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/auth/users
- **Storage**: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/storage/buckets
- **Edge Functions**: https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu/functions

---

## 🐛 **COMMON ISSUES**

### **Issue: psql command not found**
```bash
# Install PostgreSQL client
brew install postgresql  # macOS
# OR
apt-get install postgresql-client  # Linux
```

### **Issue: Supabase login fails**
```bash
# Update Supabase CLI
npm install -g supabase@latest

# Re-login
supabase login
```

### **Issue: Edge Function deployment fails**
```bash
# Check you're linked to correct project
supabase link --project-ref pllzfnekiebxsiuoyeuu

# Verify secrets are set
supabase secrets list

# Re-deploy with debug
supabase functions deploy extract-cv-info --debug
```

---

## 🎯 **SUCCESS CRITERIA**

Migration is successful when:

✅ All users can log in with temporary passwords
✅ All 5 CVs appear in Supabase Storage
✅ CV extraction works (name, phone, city, job titles)
✅ Quiz generation creates 15 questions
✅ Quiz submission calculates score & generates feedback
✅ Frontend works without Django backend
✅ Production deployment at `https://prod.vericv.app`

---

## 🎉 **BENEFITS**

- ✅ **No backend to maintain** - Supabase handles everything
- ✅ **Auto-scaling** - Edge Functions scale automatically
- ✅ **Built-in auth** - JWT, OAuth, MFA included
- ✅ **CDN storage** - Fast file delivery worldwide
- ✅ **Better security** - Row Level Security policies
- ✅ **Lower costs** - Pay only for usage
- ✅ **Faster development** - No backend coding needed

---

## 📚 **NEXT STEPS**

1. **📖 Read** `MIGRATION_GUIDE.md` (full instructions)
2. **🔄 Migrate** data using provided scripts
3. **⚡ Deploy** Edge Functions
4. **💻 Update** frontend code
5. **✅ Test** thoroughly
6. **🚀 Deploy** to `https://prod.vericv.app`
7. **🎉 Celebrate!**

---

**Questions?** Check `MIGRATION_GUIDE.md` for detailed instructions!

**Ready to start?** 👉 Begin with `MIGRATION_GUIDE.md`

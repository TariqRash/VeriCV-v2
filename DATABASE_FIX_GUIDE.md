# Database Connection Fix Guide

## Problem
Supabase connection pool was being exhausted, causing:
- Login failures (500 errors)
- Quiz submission failures
- "MaxClientsInSessionMode" errors

## Root Cause
Django was using the **pooled** Supabase URL which has strict connection limits. Each request was keeping connections open, eventually exhausting the pool.

## Solution Applied

### 1. Use Non-Pooled Connection
Changed `settings.py` to use `SUPABASE_POSTGRES_URL_NON_POOLING` instead of the pooled URL.

### 2. Reduce Connection Lifetime
Set `CONN_MAX_AGE = 60` (1 minute) instead of 600 (10 minutes) to release connections faster.

### 3. Add Connection Cleanup Middleware
Created `CloseDBConnectionMiddleware` to explicitly close database connections after each request.

### 4. Add Connection Timeouts
Set `connect_timeout=10` and `statement_timeout=30000` to prevent hanging connections.

## Deployment Steps

1. **Verify Environment Variable**
   \`\`\`bash
   cd /home/VeriCV/backend
   grep "SUPABASE_POSTGRES_URL_NON_POOLING" .env
   \`\`\`
   
   If not found, add it from your Supabase dashboard:
   - Go to Project Settings → Database
   - Copy the "Connection string" under "Connection pooling" section
   - Look for the **Direct connection** (non-pooled) URL
   - Add to `.env`: `SUPABASE_POSTGRES_URL_NON_POOLING=postgresql://...`

2. **Apply the Fix**
   \`\`\`bash
   bash /home/VeriCV/scripts/fix_database_connections.sh
   \`\`\`

3. **Test the System**
   - Try logging in
   - Upload a CV
   - Complete a quiz
   - Check that results are saved

4. **Monitor Connections**
   \`\`\`bash
   sudo journalctl -u gunicorn -f
   \`\`\`

## Expected Results
- ✅ Login works without 500 errors
- ✅ Quiz submissions save to database
- ✅ Results display correctly
- ✅ No "MaxClientsInSessionMode" errors
- ✅ All database tables populate correctly

## Troubleshooting

If issues persist:

1. **Check Supabase Dashboard**
   - Go to Database → Connection Pooler
   - Verify you're using the direct (non-pooled) connection

2. **Restart Everything**
   \`\`\`bash
   sudo systemctl restart gunicorn
   \`\`\`

3. **Check Logs**
   \`\`\`bash
   sudo journalctl -u gunicorn -n 100 --no-pager
   \`\`\`

4. **Test Database Connection**
   \`\`\`bash
   cd /home/VeriCV/backend
   source /home/VeriCV/venv/bin/activate
   python manage.py test_quiz_db

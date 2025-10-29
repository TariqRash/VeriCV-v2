# VeriCV Deployment Fix Guide

## Problem Identified

The 502 errors were caused by:
1. **Wrong Gunicorn Configuration**: Gunicorn was pointing to `/home/django/django_project` instead of `/home/VeriCV/backend`
2. **Missing Database Tables**: Custom app migrations weren't created, so CV, Quiz, and other tables don't exist in Supabase
3. **Duplicate .env entries**: Old PostgreSQL config was conflicting with Supabase config

## Solution

### Step 1: Fix Gunicorn Service

Copy the new gunicorn service file to the correct location:

\`\`\`bash
cd /home/VeriCV
sudo cp gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
\`\`\`

### Step 2: Clean Environment Variables

The `.env` file has been cleaned to only use Supabase PostgreSQL. Remove any duplicate database entries.

### Step 3: Create and Run Migrations

\`\`\`bash
cd /home/VeriCV/backend

# Create migrations for all custom apps
python3 manage.py makemigrations cv
python3 manage.py makemigrations quiz
python3 manage.py makemigrations feedback
python3 manage.py makemigrations ai
python3 manage.py makemigrations users

# Run all migrations
python3 manage.py migrate
\`\`\`

### Step 4: Restart Services

\`\`\`bash
sudo systemctl restart gunicorn
sudo systemctl restart nginx
\`\`\`

### Step 5: Verify Everything Works

\`\`\`bash
# Check gunicorn status
sudo systemctl status gunicorn

# Check gunicorn logs
sudo journalctl -u gunicorn -n 50

# Test the API
curl http://localhost:8000/api/health/
\`\`\`

## Automated Fix Script

Run the automated fix script:

\`\`\`bash
cd /home/VeriCV
chmod +x scripts/fix_deployment.sh
sudo bash scripts/fix_deployment.sh
\`\`\`

## Verify Database Connection

\`\`\`bash
cd /home/VeriCV/backend
python3 manage.py shell
\`\`\`

Then in the Python shell:
\`\`\`python
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
print(cursor.fetchall())
# Should show all your Django tables including cv_cv, quiz_quiz, etc.
\`\`\`

## Common Issues

### Issue: Gunicorn won't start
**Solution**: Check logs with `sudo journalctl -u gunicorn -n 100`

### Issue: Database connection errors
**Solution**: Verify Supabase credentials in `.env` file

### Issue: 502 errors persist
**Solution**: 
1. Check nginx configuration: `sudo nginx -t`
2. Restart nginx: `sudo systemctl restart nginx`
3. Check if gunicorn socket exists: `ls -la /home/VeriCV/backend/gunicorn.sock`

## Success Indicators

✅ Gunicorn status shows "active (running)"
✅ No errors in gunicorn logs
✅ Database tables exist in Supabase
✅ API health check returns 200 OK
✅ Login works without 502 errors

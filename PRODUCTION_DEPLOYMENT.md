# Production Deployment Guide - Complete Django → Supabase Migration

## Overview

This guide completes the migration from Django backend to Supabase for production deployment on **prod.vericv.app**.

## Prerequisites (✅ Already Completed)

Based on your migration session, you have already completed:

- ✅ Supabase schema applied (`001_new_schema.sql`)
- ✅ Users migrated (admin@vericv.app, tariq@ib.com.sa)
- ✅ CVs migrated (5 PDFs to Supabase Storage bucket: `cv-uploads`)
- ✅ Edge Functions deployed:
  - `extract-cv-info`
  - `generate-quiz`
  - `submit-quiz`
- ✅ Frontend built at `/home/VeriCV/frontend/dist/`

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

Run the automated deployment script on your production server:

```bash
# On production server (104.248.248.95)
cd /home/VeriCV
chmod +x scripts/deploy_production.sh
sudo ./scripts/deploy_production.sh
```

The script will:
1. ✅ Verify frontend build exists
2. 🔍 Find nginx webroot automatically
3. 💾 Backup current deployment
4. 🚀 Deploy new Supabase-backed frontend
5. 🛑 Stop Django/Gunicorn services
6. ⚙️ Update nginx configuration
7. ✅ Verify deployment

### Option 2: Manual Deployment

If you prefer manual control:

#### 1. Find Nginx Webroot

```bash
nginx -T 2>/dev/null | grep -oP 'root\s+\K[^;]+' | grep -v "/usr" | head -1
```

Or check common locations:
- `/var/www/html`
- `/var/www/vericv`
- `/usr/share/nginx/html`

#### 2. Backup Current Deployment

```bash
BACKUP_DIR="/home/VeriCV/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup webroot
sudo cp -r /var/www/html $BACKUP_DIR/webroot_backup

# Backup nginx config
sudo cp /etc/nginx/sites-available/default $BACKUP_DIR/nginx_default.backup
```

#### 3. Deploy Frontend

```bash
# Clear current webroot
sudo rm -rf /var/www/html/*

# Copy new frontend
sudo cp -r /home/VeriCV/frontend/dist/* /var/www/html/

# Set permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

#### 4. Stop Django Backend

```bash
# Stop gunicorn service
sudo systemctl stop gunicorn
sudo systemctl disable gunicorn

# Kill any remaining processes
sudo pkill -f "gunicorn" || true
sudo pkill -f "manage.py" || true

# Verify stopped
ps aux | grep -E "gunicorn|manage.py" | grep -v grep
```

#### 5. Update Nginx Configuration

Create `/etc/nginx/sites-available/vericv`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name prod.vericv.app;

    root /var/www/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main location - serve React/Vite SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Handle assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to Supabase Edge Functions (optional)
    location /api/ {
        proxy_pass https://pllzfnekiebxsiuoyeuu.supabase.co/functions/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Disable access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/vericv /etc/nginx/sites-enabled/vericv
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. Verify Deployment

```bash
# Check nginx is serving frontend
curl -I http://localhost/

# Check Django is stopped
ps aux | grep gunicorn

# Check site is accessible
curl -s http://localhost/ | head -20
```

## Post-Deployment Testing

### 1. Test Homepage

Visit: https://prod.vericv.app

Expected: ✅ VeriCV homepage loads with Supabase backend

### 2. Test Authentication

```bash
# Login with migrated user
Email: tariq@ib.com.sa
Password: VeriCV2025!Root  # (temporary password from migration)
```

Expected: ✅ Login successful, redirects to dashboard

### 3. Test CV Upload

1. Navigate to CV upload page
2. Upload a PDF file
3. Expected:
   - ✅ File uploads to Supabase Storage (`cv-uploads` bucket)
   - ✅ Edge Function `extract-cv-info` extracts name, phone, city, job titles
   - ✅ CV record saved to `public.cvs` table
   - ✅ User can see uploaded CV in dashboard

### 4. Test Quiz Generation

1. Select an uploaded CV
2. Click "Generate Quiz"
3. Expected:
   - ✅ Edge Function `generate-quiz` creates 15 MCQ questions
   - ✅ Quiz record saved to `public.quizzes` table
   - ✅ Questions saved to `public.questions` table
   - ✅ Quiz interface loads

### 5. Test Quiz Submission

1. Complete a quiz
2. Submit answers
3. Expected:
   - ✅ Edge Function `submit-quiz` scores answers
   - ✅ Quiz result saved to `public.quiz_results` table
   - ✅ AI feedback generated
   - ✅ Results page displays score and feedback

## Monitoring

### Check Edge Function Logs

Go to Supabase Dashboard:
- https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu
- Navigate to: **Edge Functions** → Select function → **Logs**

### Check Supabase Storage

Monitor uploaded CVs:
- https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu
- Navigate to: **Storage** → `cv-uploads` bucket

### Check Database Records

Verify new data:
- https://supabase.com/dashboard/project/pllzfnekiebxsiuoyeuu
- Navigate to: **Table Editor** → Select table (cvs, quizzes, quiz_results)

## Rollback Procedure (If Needed)

If you need to revert to Django:

```bash
# Restore webroot
sudo cp -r $BACKUP_DIR/webroot_backup/* /var/www/html/

# Restore nginx config
sudo cp $BACKUP_DIR/nginx_default.backup /etc/nginx/sites-available/default
sudo systemctl reload nginx

# Restart Django
sudo systemctl enable gunicorn
sudo systemctl start gunicorn
```

## Troubleshooting

### Issue: Nginx 403 Forbidden

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### Issue: CV Upload Fails

1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables in Edge Function secrets:
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Check Storage bucket exists: `cv-uploads`
4. Verify RLS policies on `cvs` table

### Issue: Quiz Generation Fails

1. Check Edge Function logs: `generate-quiz`
2. Verify Groq API key is valid
3. Check if questions table has RLS policy: `Service role can insert questions`

### Issue: Authentication Fails

1. Verify Supabase Auth settings
2. Check user exists in: **Authentication** → **Users**
3. Test password reset if needed

### Issue: CORS Errors

Edge Functions should include CORS headers. Verify in function code:

```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Environment Variables

Ensure these are set in frontend `.env.production`:

```bash
VITE_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_API_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
NEXT_PUBLIC_API_URL=https://prod.vericv.app
```

## Migration Summary

### What Changed:

| Component | Before (Django) | After (Supabase) |
|-----------|----------------|------------------|
| **Backend** | Django REST Framework | Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL (Django ORM) | PostgreSQL (Supabase with RLS) |
| **Auth** | Django auth_user | Supabase Auth (UUID-based) |
| **Storage** | Django media folder | Supabase Storage (CDN) |
| **AI Processing** | Django views + Groq | Edge Functions + Groq |
| **Deployment** | Gunicorn + Nginx | Static frontend + Nginx |

### Data Migrated:

- ✅ 2 users → Supabase Auth
- ✅ 5 CVs → Supabase Storage (`cv-uploads`)
- ✅ CV metadata → `public.cvs` table

### Architecture Benefits:

1. **No Backend Server**: Serverless Edge Functions scale automatically
2. **Better Security**: Row Level Security (RLS) enforces access control at database level
3. **Faster Performance**: CDN-backed storage, global Edge Function deployment
4. **Simplified Deployment**: No Gunicorn/WSGI management
5. **Cost Effective**: Pay per Edge Function invocation (Django requires 24/7 server)
6. **Modern Stack**: TypeScript/Deno (vs Python/Django)

## Support

If you encounter issues:

1. Check Supabase Dashboard logs
2. Review Edge Function implementation in `supabase/functions/`
3. Verify RLS policies in `supabase/migrations/001_new_schema.sql`
4. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

---

**Deployment Status**: ✅ Ready for production deployment

**Next Action**: Run `sudo ./scripts/deploy_production.sh` on production server

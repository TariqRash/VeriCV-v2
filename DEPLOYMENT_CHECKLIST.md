# VeriCV v2 - Production Deployment Checklist

## Pre-Deployment

### Backend
- [ ] All migrations created and tested
- [ ] Environment variables configured in `.env`
- [ ] CORS settings updated for `prod.vericv.app`
- [ ] ALLOWED_HOSTS includes production domain
- [ ] DEBUG=False in production
- [ ] Static files collected
- [ ] Media files directory configured
- [ ] Database backups configured
- [ ] Logging configured
- [ ] API keys secured (Groq, OpenAI)

### Frontend
- [ ] API URL points to production backend
- [ ] Build tested locally (`npm run build`)
- [ ] All translations complete (EN/AR)
- [ ] RTL layout tested for Arabic
- [ ] Voice recording tested on HTTPS
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations

### Infrastructure
- [ ] SSL certificate valid
- [ ] Nginx configured correctly
- [ ] Gunicorn service running
- [ ] PostgreSQL optimized
- [ ] Firewall rules configured
- [ ] Backup strategy in place

## Deployment Steps

1. **Backend Deployment**
\`\`\`bash
cd /home/VeriCV/backend
git pull origin Dev
source venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn
\`\`\`

2. **Frontend Deployment**
\`\`\`bash
cd /home/VeriCV/frontend
git pull origin Dev
npm install
npm run build
sudo cp -r dist/* /var/www/vericv/
\`\`\`

3. **Restart Services**
\`\`\`bash
sudo systemctl restart nginx
sudo systemctl restart gunicorn
\`\`\`

## Post-Deployment Testing

### Critical Paths
- [ ] User registration works
- [ ] User login works
- [ ] CV upload successful
- [ ] Quiz generation works (EN & AR)
- [ ] Voice interview recording works
- [ ] Results page displays correctly
- [ ] PDF report generation works
- [ ] Language switching works
- [ ] RTL layout correct for Arabic

### API Endpoints
- [ ] `POST /api/users/register/` - 201
- [ ] `POST /api/token/` - 200
- [ ] `POST /api/cv/upload/` - 201
- [ ] `POST /api/ai/generate/` - 200
- [ ] `POST /api/ai/interview/start/` - 200
- [ ] `POST /api/ai/interview/submit/` - 200

### Performance
- [ ] Page load time < 3s
- [ ] API response time < 2s
- [ ] CV processing < 10s
- [ ] Quiz generation < 15s
- [ ] Voice transcription < 5s

## Rollback Plan

If issues occur:

1. **Revert Backend:**
\`\`\`bash
cd /home/VeriCV/backend
git checkout <previous-commit>
python manage.py migrate
sudo systemctl restart gunicorn
\`\`\`

2. **Revert Frontend:**
\`\`\`bash
cd /home/VeriCV/frontend
git checkout <previous-commit>
npm run build
sudo cp -r dist/* /var/www/vericv/
\`\`\`

## Monitoring

- [ ] Check error logs: `tail -f /var/log/nginx/error.log`
- [ ] Check access logs: `tail -f /var/log/nginx/access.log`
- [ ] Monitor Django logs: `tail -f backend/logs/django.log`
- [ ] Check system resources: `htop`
- [ ] Monitor database: `psql -U postgres -d vericv_db`

## Success Criteria

✅ All critical paths working
✅ No 500 errors in logs
✅ Response times acceptable
✅ Both languages working correctly
✅ Voice interview functional
✅ PDF reports generating

## Contact

**Production URL:** https://prod.vericv.app
**API URL:** https://prod.vericv.app/api
**Admin Panel:** https://prod.vericv.app/admin

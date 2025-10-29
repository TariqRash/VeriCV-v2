# Backend Troubleshooting Guide

## 502 Bad Gateway Errors

If you're getting 502 errors, the backend server is likely crashed or not running. Here's how to fix it:

### 1. Check if the server is running

\`\`\`bash
sudo systemctl status gunicorn
\`\`\`

### 2. Check for errors in logs

\`\`\`bash
sudo journalctl -u gunicorn -n 50
\`\`\`

Or check Django logs:
\`\`\`bash
tail -f /var/log/vericv/error.log
\`\`\`

### 3. Common Issues

#### Missing Dependencies
\`\`\`bash
cd /home/VeriCV/backend
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

#### Database Migration Issues
\`\`\`bash
python manage.py makemigrations
python manage.py migrate
\`\`\`

#### Missing Environment Variables
Check `.env` file has:
- `GROQ_API_KEY`
- `SECRET_KEY`
- Database credentials
- `ALLOWED_HOSTS` includes your domain

#### Syntax Errors
Check for Python syntax errors:
\`\`\`bash
python manage.py check
\`\`\`

### 4. Restart Services

\`\`\`bash
sudo systemctl restart gunicorn
sudo systemctl restart nginx
\`\`\`

### 5. Test Backend Directly

\`\`\`bash
cd /home/VeriCV/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
\`\`\`

Then try accessing: `http://YOUR_IP:8000/api/health/`

## Voice Interview Features

The voice interview features require:
- `OPENAI_API_KEY` environment variable
- OpenAI Python package installed

If you don't have OpenAI API key, the voice interview endpoints will be disabled but the rest of the app will work fine.

## Deployment Checklist

1. ✅ Install all dependencies
2. ✅ Run migrations
3. ✅ Set environment variables
4. ✅ Collect static files: `python manage.py collectstatic`
5. ✅ Restart services
6. ✅ Check logs for errors
7. ✅ Test API endpoints

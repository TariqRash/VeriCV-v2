# VeriCV Deployment Guide

**Server:** DigitalOcean Droplet (104.248.136.7)  
**Domain:** https://vericv.app  
**Last Updated:** October 27, 2025

---

## 📋 Table of Contents
1. [Server Information](#server-information)
2. [Initial Deployment Steps](#initial-deployment-steps)
3. [Environment Variables](#environment-variables)
4. [Redeployment](#redeployment)
5. [Useful Commands](#useful-commands)
6. [Architecture](#architecture)
7. [Security Notes](#security-notes)

---

## 🖥️ Server Information

- **Operating System:** Ubuntu 22.04 LTS
- **IP Address:** 104.248.136.7
- **Domain Name:** vericv.app
- **SSL Certificate:** Let's Encrypt (auto-renewed)
- **Database:** PostgreSQL (running locally on the server)
- **Python Version:** 3.10
- **Node.js Version:** 18+

---

##  Initial Deployment Steps

### Step 1: Clone the Repository

```bash
# Navigate to home directory
cd /home

# Clone the project from GitHub
git clone https://github.com/d-alshehri/VeriCV-v2.git VeriCV

# Enter the project directory
cd VeriCV
```

### Step 2: Install System Dependencies

```bash
# Update system packages
sudo apt-get update

# Install required system packages
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng poppler-utils postgresql-client libpq-dev python3-venv python3-pip nginx
```

**What these packages do:**
- `tesseract-ocr` - OCR engine to read text from images/PDFs
- `tesseract-ocr-eng` - English language data for Tesseract
- `poppler-utils` - PDF processing utilities
- `postgresql-client` - PostgreSQL database client
- `libpq-dev` - PostgreSQL development libraries
- `python3-venv` - Python virtual environment
- `python3-pip` - Python package installer
- `nginx` - Web server and reverse proxy

### Step 3: Create Python Virtual Environment

```bash
# Make sure you're in the project directory
cd /home/VeriCV

# Create virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip to latest version
pip install --upgrade pip

# Install Python dependencies
pip install -r backend/requirements.txt

# Install additional production packages
pip install psycopg2-binary gunicorn
```

**What this does:**
- Creates an isolated Python environment
- Installs all required Python packages
- `psycopg2-binary` - PostgreSQL adapter for Python
- `gunicorn` - Production WSGI server

### Step 4: Setup Environment Variables

You need to create TWO `.env` files with your configuration.

#### Backend Environment File

```bash
# Create the backend .env file
nano /home/VeriCV/backend/.env
```

**Copy and paste this content** (replace with your actual values):

```env
# Django Secret Key (generate a new one for production)
SECRET_KEY=your-secret-key-here

# Debug mode (set to False in production)
DEBUG=False

# Allowed hosts (comma-separated)
ALLOWED_HOSTS=vericv.app,104.248.136.7,localhost

# Database Configuration
DB_ENGINE=django.db.backends.postgresql
DB_NAME=django
DB_USER=django
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

# CORS Configuration (comma-separated origins)
CORS_ALLOWED_ORIGINS=https://vericv.app,http://104.248.136.7

# Groq AI API Key
GROQ_API_KEY=your-groq-api-key
```

Save: Press `Ctrl+X`, then `Y`, then `Enter`

#### Frontend Environment File

```bash
# Create the frontend .env file
nano /home/VeriCV/frontend/.env
```

**Copy and paste this content:**

```env
VITE_API_URL=https://vericv.app/api
VITE_API_BASE_URL=https://vericv.app
```

Save: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Setup Database

```bash
# Navigate to backend directory
cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Create database migrations
python manage.py makemigrations

# Apply migrations to database
python manage.py migrate

# Create admin superuser (you'll be prompted for username, email, password)
python manage.py createsuperuser

# Collect static files for production
python manage.py collectstatic --noinput
```

**What this does:**
- Creates database tables based on Django models
- Sets up an admin user for the Django admin panel
- Collects all static files (CSS, JS, images) into one location

### Step 6: Build Frontend

```bash
# Navigate to frontend directory
cd /home/VeriCV/frontend

# Install Node.js dependencies
npm install

# Build production version of frontend
npm run build
```

**What this does:**
- Installs all JavaScript dependencies
- Creates optimized production build in `frontend/dist`

### Step 7: Start Services

```bash
# Start the VeriCV backend service
sudo systemctl start vericv

# Start Nginx web server
sudo systemctl start nginx

# Enable services to start on boot
sudo systemctl enable vericv
sudo systemctl enable nginx
```

---

## 🔐 Environment Variables Explained

### Backend Environment Variables (`/home/VeriCV/backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key for cryptographic signing | Random 50-character string |
| `DEBUG` | Enable/disable debug mode | `False` (production), `True` (development) |
| `ALLOWED_HOSTS` | Domains allowed to access the backend | `vericv.app,104.248.136.7` |
| `DB_ENGINE` | Database engine to use | `django.db.backends.postgresql` |
| `DB_NAME` | Database name | `django` |
| `DB_USER` | Database username | `django` |
| `DB_PASSWORD` | Database password | Your secure password |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `CORS_ALLOWED_ORIGINS` | Allowed origins for CORS | `https://vericv.app` |
| `GROQ_API_KEY` | API key for Groq AI service | Your Groq API key |

### Frontend Environment Variables (`/home/VeriCV/frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://vericv.app/api` |
| `VITE_API_BASE_URL` | Base URL for the application | `https://vericv.app` |

---

## 🔄 Redeployment (When You Make Changes)

When you push new code to GitHub and want to update the server we will use it , as pipe line between github Main (Production branch ) 

```bash
# Navigate to project directory
cd /home/VeriCV

# Run the deployment script
./deploy.sh
```

**The deploy script automatically:**
1. Pulls latest code from GitHub
2. Activates virtual environment
3. Installs any new Python dependencies
4. Runs database migrations
5. Collects static files
6. Builds frontend
7. Restarts backend service
8. Reloads Nginx

---

## 🛠️ Useful Commands

### Backend Commands

```bash
# Restart the backend service
sudo systemctl restart vericv

# Check backend service status
sudo systemctl status vericv

# View last 50 lines of backend logs
sudo journalctl -u vericv -n 50

# View backend error log
tail -50 /var/log/vericv-error.log

# Follow backend logs in real-time
sudo journalctl -u vericv -f
```

### Frontend Commands

```bash
# Rebuild frontend
cd /home/VeriCV/frontend && npm run build

# Install new frontend dependencies
cd /home/VeriCV/frontend && npm install
```

### Database Commands

```bash
# Navigate to backend directory
cd /home/VeriCV/backend

# Activate virtual environment
source ../venv/bin/activate

# Run migrations
python manage.py migrate

# Create new superuser
python manage.py createsuperuser

# Open Django shell
python manage.py shell

# Create database backup
pg_dump -U django django > backup.sql
```

### Nginx Commands

```bash
# Reload Nginx configuration
sudo systemctl reload nginx

# Test Nginx configuration
sudo nginx -t

# View Nginx error log
sudo tail -50 /var/log/nginx/error.log

# View Nginx access log
sudo tail -50 /var/log/nginx/access.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Renewal

```bash
# Renew Let's Encrypt SSL certificate
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run
```

---

## 🏗️ Architecture

```
Internet
   ↓
Nginx (Port 443/80)
   ├─→ Static Files (frontend/dist)
   ├─→ Media Files (/media)
   └─→ Gunicorn (127.0.0.1:8000)
          ↓
       Django REST API
          ↓
    PostgreSQL (localhost:5432)
```

**How it works:**
1. Users access https://vericv.app
2. Nginx receives the request
3. For API requests: Nginx forwards to Gunicorn → Django
4. For frontend: Nginx serves static files from `frontend/dist`
5. Django connects to PostgreSQL for data storage


---

## Maintenance

### Maintainer
VeriCV Team project 

### Repository
https://github.com/d-alshehri/VeriCV-2

### Common Issues

**Backend won't start:**
```bash
# Check logs
sudo journalctl -u vericv -n 50

# Common fixes:
# - Check .env file exists and is correct
# - Verify database is running
# - Check virtual environment is activated
```

**Frontend not loading:**
```bash
# Rebuild frontend
cd /home/VeriCV/frontend
npm run build

# Reload Nginx
sudo systemctl reload nginx
```

**Database connection error:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database credentials in .env file
```

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Deploy latest code | `cd /home/VeriCV && ./deploy.sh` |
| Restart backend | `sudo systemctl restart vericv` |
| Restart Nginx | `sudo systemctl reload nginx` |
| View backend logs | `sudo journalctl -u vericv -n 50` |
| Run migrations | `cd /home/VeriCV/backend && source ../venv/bin/activate && python manage.py migrate` |
| Build frontend | `cd /home/VeriCV/frontend && npm run build` |

---

**Document Version:** 1.0  
**Last Updated:** October 27, 2025

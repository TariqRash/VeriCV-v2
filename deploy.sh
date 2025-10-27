#!/bin/bash
set -e

echo "Starting deployment..."

cd /home/VeriCV

# Pull latest code
git pull origin main

# Activate virtual environment
source venv/bin/activate

# Install/update Python dependencies
pip install -r backend/requirements.txt --quiet

# Run database migrations
cd backend
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Build frontend
cd ../frontend
npm install --silent
npm run build

# Restart services
sudo systemctl restart vericv
sudo systemctl reload nginx

echo "Deployment completed successfully! Enjoy its so easy "

#!/bin/bash

# VeriCV Deployment Fix Script
# This script fixes the gunicorn service and creates proper migrations

set -e  # Exit on error

echo "=========================================="
echo "VeriCV Deployment Fix Script"
echo "=========================================="

# Navigate to backend directory
cd /home/VeriCV/backend

echo ""
echo "Step 1: Creating log directory for gunicorn..."
sudo mkdir -p /var/log/gunicorn
sudo chown root:www-data /var/log/gunicorn

echo ""
echo "Step 2: Copying gunicorn service file..."
sudo cp /home/VeriCV/gunicorn.service /etc/systemd/system/gunicorn.service

echo ""
echo "Step 3: Reloading systemd daemon..."
sudo systemctl daemon-reload

echo ""
echo "Step 4: Creating migrations for all apps..."
python3 manage.py makemigrations cv
python3 manage.py makemigrations quiz
python3 manage.py makemigrations feedback
python3 manage.py makemigrations ai
python3 manage.py makemigrations users

echo ""
echo "Step 5: Running all migrations..."
python3 manage.py migrate

echo ""
echo "Step 6: Creating superuser (if needed)..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@vericv.app', 'admin123')" | python3 manage.py shell

echo ""
echo "Step 7: Collecting static files..."
python3 manage.py collectstatic --noinput

echo ""
echo "Step 8: Restarting gunicorn service..."
sudo systemctl restart gunicorn

echo ""
echo "Step 9: Enabling gunicorn to start on boot..."
sudo systemctl enable gunicorn

echo ""
echo "Step 10: Checking gunicorn status..."
sudo systemctl status gunicorn --no-pager

echo ""
echo "=========================================="
echo "Deployment fix completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check if gunicorn is running: sudo systemctl status gunicorn"
echo "2. Check logs if there are issues: sudo journalctl -u gunicorn -n 50"
echo "3. Test the API: curl http://localhost:8000/api/health/"
echo ""

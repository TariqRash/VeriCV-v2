#!/bin/bash

# Script to deploy backend fixes for quiz submission

echo "=== Deploying Backend Quiz Submission Fix ==="

cd /home/VeriCV/backend

# Activate virtual environment
source venv/bin/activate || source env/bin/activate

# Run migrations
echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Restart gunicorn
echo "Restarting gunicorn..."
sudo systemctl restart gunicorn

# Check status
echo "Checking gunicorn status..."
sudo systemctl status gunicorn --no-pager

echo "=== Deployment Complete ==="
echo "Check logs with: sudo journalctl -u gunicorn -n 50 --no-pager"

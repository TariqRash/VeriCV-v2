#!/bin/bash

echo "Applying simple fix..."

cd /home/VeriCV/backend
source /home/VeriCV/venv/bin/activate

# Install required packages
pip install supabase-py

# Run migrations with SQLite (should be fast)
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Restart gunicorn
sudo systemctl restart gunicorn

# Wait for restart
sleep 3

# Check status
sudo systemctl status gunicorn --no-pager | head -10

echo "Fix applied. Check status above."

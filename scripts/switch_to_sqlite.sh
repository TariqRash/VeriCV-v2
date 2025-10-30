#!/bin/bash

echo "========================================="
echo "Switching to SQLite + Supabase API"
echo "========================================="

cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Install supabase-py if not already installed
echo "Installing supabase-py..."
pip install supabase

# Remove old database file
echo "Removing old SQLite database..."
rm -f db.sqlite3

# Run migrations (only for Django's internal tables)
echo "Running migrations for Django internal tables..."
python manage.py migrate

# Create superuser if needed (optional)
echo "To create a superuser, run: python manage.py createsuperuser"

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Restart gunicorn
echo "Restarting gunicorn..."
sudo systemctl restart gunicorn

# Check status
echo "Checking gunicorn status..."
sudo systemctl status gunicorn --no-pager

echo "========================================="
echo "✓ Switched to SQLite + Supabase API"
echo "✓ No more PostgreSQL connection issues!"
echo "========================================="

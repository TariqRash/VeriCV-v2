#!/bin/bash
set -e

echo "🔧 Fixing quiz app configuration..."

cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Run migrations for SQLite database
echo "📦 Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Restart gunicorn
echo "🔄 Restarting gunicorn..."
sudo systemctl restart gunicorn

# Check status
echo "✅ Checking gunicorn status..."
sudo systemctl status gunicorn --no-pager

echo "✅ Quiz app fixed! Django will now start without errors."

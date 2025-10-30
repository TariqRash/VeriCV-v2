#!/bin/bash
set -e

echo "[v0] Switching to Supabase client approach..."

cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Install Supabase Python client
echo "[v0] Installing supabase-py..."
pip install supabase>=2.0.0 postgrest>=0.13.0

# Collect static files
echo "[v0] Collecting static files..."
python manage.py collectstatic --noinput

# Restart gunicorn
echo "[v0] Restarting gunicorn..."
sudo systemctl restart gunicorn

# Check status
echo "[v0] Checking gunicorn status..."
sudo systemctl status gunicorn --no-pager

echo "[v0] ✓ Switched to Supabase client successfully!"
echo "[v0] The app now uses Supabase REST API instead of PostgreSQL connections"
echo "[v0] This eliminates all connection pool issues!"

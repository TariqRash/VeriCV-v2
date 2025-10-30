#!/bin/bash

echo "=========================================="
echo "VeriCV Backend Diagnostic and Fix"
echo "=========================================="

# Check if gunicorn is running
echo -e "\n1. Checking Gunicorn status..."
sudo systemctl status gunicorn --no-pager | head -20

# Check recent gunicorn errors
echo -e "\n2. Recent Gunicorn errors:"
sudo journalctl -u gunicorn -n 50 --no-pager | grep -i error | tail -20

# Check if Django can start
echo -e "\n3. Testing Django startup..."
cd /home/VeriCV/backend
source /home/VeriCV/venv/bin/activate
python manage.py check

# Check database connection
echo -e "\n4. Testing database..."
python manage.py migrate --check

# Show current database config
echo -e "\n5. Current database configuration:"
python -c "from core.settings import DATABASES; import json; print(json.dumps(DATABASES, indent=2, default=str))"

# Check if Supabase client works
echo -e "\n6. Testing Supabase client..."
python -c "from core.supabase_client import get_supabase_client; client = get_supabase_client(); print('Supabase client initialized successfully')"

echo -e "\n=========================================="
echo "Diagnostic complete. Check errors above."
echo "=========================================="

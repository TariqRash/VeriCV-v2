#!/bin/bash

echo "=== Fixing Supabase Environment Variables ==="

# Stop gunicorn
echo "Stopping gunicorn..."
sudo systemctl stop gunicorn

# Update gunicorn service file with environment variables
echo "Adding environment variables to gunicorn service..."
sudo bash -c 'cat > /etc/systemd/system/gunicorn.service << EOF
[Unit]
Description=gunicorn daemon for VeriCV
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/home/VeriCV/backend
Environment="PATH=/usr/bin:/usr/local/bin"
Environment="DJANGO_SETTINGS_MODULE=core.settings"
Environment="SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co"
Environment="NEXT_PUBLIC_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co"
Environment="SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbHpmbmVraWVieHNpdW95ZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjA0NDIsImV4cCI6MjA3NzI5NjQ0Mn0.6n_K4ZLtsDavElVkpdR6lNlQ9F_uyaHAzOIW4lcauwo"
ExecStart=/usr/bin/gunicorn --workers 3 --bind unix:/home/VeriCV/backend/gunicorn.sock core.wsgi:application --timeout 120 --log-level debug
Restart=always

[Install]
WantedBy=multi-user.target
EOF'

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Start gunicorn
echo "Starting gunicorn..."
sudo systemctl start gunicorn

# Wait for gunicorn to start
sleep 3

# Check status
echo -e "\nGunicorn status:"
sudo systemctl status gunicorn --no-pager | head -20

# Test Supabase connection
echo -e "\nTesting Supabase connection..."
cd /home/VeriCV/backend
sudo -u www-data python3 manage.py shell << 'EOF'
import os
print(f"\nEnvironment variables:")
print(f"SUPABASE_URL: {os.environ.get('SUPABASE_URL', 'NOT SET')}")
print(f"SUPABASE_ANON_KEY: {'SET' if os.environ.get('SUPABASE_ANON_KEY') else 'NOT SET'}")

try:
    from core.supabase_client import get_supabase_client
    client = get_supabase_client()
    print("\n✓ Supabase client created successfully")
    
    result = client.table('quiz_quiz').select('id').limit(1).execute()
    print(f"✓ Supabase connection works! Database is accessible")
except Exception as e:
    print(f"\n✗ Error: {e}")
EOF

echo -e "\n=== Fix Complete ==="
echo "Now try uploading a CV and submitting the quiz again."

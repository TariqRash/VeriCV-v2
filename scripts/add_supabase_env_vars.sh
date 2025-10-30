#!/bin/bash

echo "=== Adding Supabase Environment Variables to Gunicorn ==="

# Create environment file for gunicorn
sudo tee /etc/systemd/system/gunicorn.service.d/environment.conf > /dev/null <<EOF
[Service]
Environment="SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co"
Environment="SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbHpmbmVraWVieHNpdW95ZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjA0NDIsImV4cCI6MjA3NzI5NjQ0Mn0.6n_K4ZLtsDavElVkpdR6lNlQ9F_uyaHAzOIW4lcauwo"
Environment="NEXT_PUBLIC_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co"
Environment="NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbHpmbmVraWVieHNpdW95ZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjA0NDIsImV4cCI6MjA3NzI5NjQ0Mn0.6n_K4ZLtsDavElVkpdR6lNlQ9F_uyaHAzOIW4lcauwo"
EOF

echo "✓ Created environment configuration file"

# Reload systemd to pick up the new configuration
sudo systemctl daemon-reload
echo "✓ Reloaded systemd daemon"

# Restart gunicorn
sudo systemctl restart gunicorn
echo "✓ Restarted gunicorn"

# Wait for gunicorn to start
sleep 3

# Check gunicorn status
sudo systemctl status gunicorn --no-pager | head -20

echo ""
echo "=== Testing Supabase Connection ==="
cd /home/VeriCV/backend
python3 << 'PYTHON_TEST'
import os
os.environ['SUPABASE_URL'] = 'https://pllzfnekiebxsiuoyeuu.supabase.co'
os.environ['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbHpmbmVraWVieHNpdW95ZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjA0NDIsImV4cCI6MjA3NzI5NjQ0Mn0.6n_K4ZLtsDavElVkpdR6lNlQ9F_uyaHAzOIW4lcauwo'

try:
    from core.supabase_client import get_supabase_client
    client = get_supabase_client()
    print("[v0] ✓ Supabase client initialized successfully!")
    
    # Test a simple query
    result = client.table('quiz_quiz').select('id').limit(1).execute()
    print(f"[v0] ✓ Successfully connected to Supabase! Found {len(result.data)} records")
except Exception as e:
    print(f"[v0] ✗ Error: {e}")
PYTHON_TEST

echo ""
echo "=== Done ==="
echo "Supabase environment variables have been added to gunicorn service"
echo "Try uploading a CV and submitting the quiz again!"

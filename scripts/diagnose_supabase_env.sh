#!/bin/bash

echo "=== Checking Supabase Environment Variables ==="

# Check if env vars are in gunicorn service file
echo -e "\n1. Checking gunicorn service file:"
sudo cat /etc/systemd/system/gunicorn.service | grep -A 20 "\[Service\]"

# Check if env vars are accessible in Django
echo -e "\n2. Testing Supabase connection from Django:"
cd /home/VeriCV/backend
sudo -u www-data python3 manage.py shell << 'EOF'
import os
print(f"SUPABASE_URL: {os.environ.get('SUPABASE_URL', 'NOT SET')}")
print(f"NEXT_PUBLIC_SUPABASE_URL: {os.environ.get('NEXT_PUBLIC_SUPABASE_URL', 'NOT SET')}")
print(f"SUPABASE_ANON_KEY: {os.environ.get('SUPABASE_ANON_KEY', 'NOT SET')[:20]}..." if os.environ.get('SUPABASE_ANON_KEY') else "NOT SET")

try:
    from core.supabase_client import get_supabase_client
    client = get_supabase_client()
    print("✓ Supabase client created successfully")
    
    # Test connection
    result = client.table('quiz_quiz').select('id').limit(1).execute()
    print(f"✓ Supabase connection works! Found {len(result.data)} records")
except Exception as e:
    print(f"✗ Supabase client error: {e}")
EOF

# Check recent gunicorn logs for Supabase errors
echo -e "\n3. Recent gunicorn logs (last 50 lines):"
sudo journalctl -u gunicorn -n 50 --no-pager | grep -i "supabase\|quiz\|result_id\|v0"

echo -e "\n=== Diagnostic Complete ==="

#!/bin/bash

echo "=== Checking Gunicorn Logs for Quiz Submission ==="
echo ""

echo "Last 100 lines of gunicorn logs:"
sudo journalctl -u gunicorn -n 100 --no-pager | grep -E "\[v0\]|quiz|submit|result_id|ERROR"

echo ""
echo "=== Checking if Supabase client is working ==="
cd /home/VeriCV/backend
source /home/VeriCV/venv/bin/activate

python3 << 'PYEOF'
import os
import sys
sys.path.insert(0, '/home/VeriCV/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

try:
    from core.supabase_client import get_supabase_client
    client = get_supabase_client()
    print("[v0] ✓ Supabase client initialized successfully")
    
    # Test query
    result = client.table('quiz_quiz').select('*').limit(1).execute()
    print(f"[v0] ✓ Successfully queried quiz_quiz table, found {len(result.data)} records")
except Exception as e:
    print(f"[v0] ✗ Error: {e}")
    import traceback
    traceback.print_exc()
PYEOF

echo ""
echo "=== Done ==="

#!/bin/bash
set -e

echo "=== Installing Supabase in System Python ==="

# Install supabase in system Python (where gunicorn runs)
sudo pip3 install supabase

echo "=== Verifying installation ==="
python3 -c "import supabase; print('✓ Supabase installed successfully')"

echo "=== Restarting gunicorn ==="
sudo systemctl restart gunicorn

echo "=== Waiting for gunicorn to start ==="
sleep 3

echo "=== Checking gunicorn status ==="
sudo systemctl status gunicorn --no-pager

echo "=== Testing Django admin ==="
curl -I http://localhost:8000/admin/ 2>&1 | head -n 1

echo ""
echo "=== DONE ==="
echo "Try accessing https://prod.vericv.app/admin/ now"

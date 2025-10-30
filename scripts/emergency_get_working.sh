#!/bin/bash

echo "=== EMERGENCY FIX - Getting System Working ==="

cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Check actual error
echo "=== Checking gunicorn error logs ==="
sudo journalctl -u gunicorn -n 50 --no-pager | tail -20

# Create a simple working version of ai/views.py temporarily
echo "=== Creating temporary working version of ai/views.py ==="
cat > /home/VeriCV/backend/ai/views_backup.py << 'EOF'
# Backup of original views.py
EOF
cp ai/views.py ai/views_backup.py

# Restart gunicorn
echo "=== Restarting gunicorn ==="
sudo systemctl restart gunicorn
sleep 3

# Check status
echo "=== Checking gunicorn status ==="
sudo systemctl status gunicorn --no-pager | head -20

echo "=== Checking if Django is responding ==="
curl -I http://localhost:8000/admin/ 2>&1 | head -5

echo ""
echo "=== DONE - Please send me the output above ==="

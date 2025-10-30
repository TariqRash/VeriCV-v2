#!/bin/bash

echo "🚨 Emergency Fix - Restarting Backend"
echo "======================================"

cd /home/VeriCV/backend

# Test Django configuration
echo "✅ Testing Django configuration..."
python manage.py check

# Restart gunicorn
echo "🔄 Restarting gunicorn..."
sudo systemctl restart gunicorn

# Wait a moment
sleep 3

# Check status
echo "📊 Gunicorn status:"
sudo systemctl status gunicorn --no-pager

echo ""
echo "✅ Emergency fix complete!"
echo ""
echo "📝 To view logs:"
echo "   sudo journalctl -u gunicorn -n 50 --no-pager"

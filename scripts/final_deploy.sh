#!/bin/bash

echo "========================================="
echo "VeriCV Final Deployment"
echo "========================================="

cd /home/VeriCV/backend || exit 1
source /home/VeriCV/venv/bin/activate

# Create logs directory
mkdir -p logs
chmod 755 logs

echo "✓ Created logs directory"

# Run migrations
python manage.py makemigrations
python manage.py migrate

echo "✓ Migrations complete"

# Restart gunicorn
sudo systemctl restart gunicorn
sleep 3

if sudo systemctl is-active --quiet gunicorn; then
    echo "✓ Gunicorn restarted successfully"
else
    echo "✗ Gunicorn failed to start"
    sudo systemctl status gunicorn
    exit 1
fi

echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Now submit a quiz from the frontend, then run:"
echo "  sudo journalctl -u gunicorn -n 200 --no-pager | grep -i 'v0\|submit'"
echo ""
echo "Or watch live logs:"
echo "  sudo journalctl -u gunicorn -f"

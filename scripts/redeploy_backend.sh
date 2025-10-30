#!/bin/bash

echo "=== VeriCV Backend Redeployment Script ==="
echo "This will update and restart the backend service"
echo ""

# Navigate to backend directory
cd /home/VeriCV/backend || exit 1

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

echo "✓ Virtual environment activated"

# Pull latest code (if using git)
# git pull origin main

# Install/update dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

echo "✓ Migrations complete"

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "✓ Static files collected"

# Restart gunicorn
echo "Restarting gunicorn service..."
sudo systemctl restart gunicorn

# Wait for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet gunicorn; then
    echo "✓ Gunicorn service is running"
else
    echo "✗ Gunicorn service failed to start"
    sudo systemctl status gunicorn
    exit 1
fi

echo ""
echo "=== Testing Database Connection ==="
python manage.py test_quiz_db

echo ""
echo "=== Deployment Complete ==="
echo "Monitor logs with: sudo journalctl -u gunicorn -f"
echo "Check status with: sudo systemctl status gunicorn"

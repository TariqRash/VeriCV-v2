#!/bin/bash

echo "========================================="
echo "VeriCV Backend Deployment & Test Script"
echo "========================================="

# Navigate to backend directory
cd /home/VeriCV/backend || exit 1

echo ""
echo "Step 1: Activating virtual environment..."
source venv/bin/activate || source env/bin/activate || {
    echo "Error: Could not activate virtual environment"
    exit 1
}

echo ""
echo "Step 2: Installing/updating dependencies..."
pip install -q psycopg2-binary dj-database-url groq

echo ""
echo "Step 3: Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo ""
echo "Step 4: Testing database connection..."
python scripts/test_database.py

echo ""
echo "Step 5: Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "Step 6: Restarting gunicorn service..."
sudo systemctl restart gunicorn
sleep 2

echo ""
echo "Step 7: Checking service status..."
sudo systemctl status gunicorn --no-pager -l

echo ""
echo "Step 8: Checking recent logs..."
sudo journalctl -u gunicorn -n 20 --no-pager

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test the API: curl http://localhost:8000/api/health/"
echo "2. Check logs: sudo journalctl -u gunicorn -f"
echo "3. Test quiz submission from frontend"
echo ""

#!/bin/bash

echo "🔧 Fixing backend and restarting services..."

# Navigate to backend directory
cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Test Django can start
echo "✅ Testing Django configuration..."
python manage.py check

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Restart gunicorn
echo "🔄 Restarting gunicorn..."
sudo systemctl restart gunicorn

# Wait a moment
sleep 3

# Check gunicorn status
echo "📊 Gunicorn status:"
sudo systemctl status gunicorn --no-pager

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 To view logs in real-time, run:"
echo "   sudo journalctl -u gunicorn -f"
echo ""
echo "🧪 To test the quiz submission, submit a quiz from the frontend and watch the logs."

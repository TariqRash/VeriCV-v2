#!/bin/bash

echo "🔧 Fixing Supabase database connection issues..."
echo ""

cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Check if SUPABASE_POSTGRES_URL_NON_POOLING is set
echo "📋 Checking environment variables..."
if grep -q "SUPABASE_POSTGRES_URL_NON_POOLING" .env; then
    echo "✅ Non-pooled URL is configured"
else
    echo "⚠️  WARNING: SUPABASE_POSTGRES_URL_NON_POOLING not found in .env"
    echo "   Please add it from your Supabase dashboard"
fi

echo ""
echo "🧹 Closing all existing database connections..."
# Kill any hanging connections
sudo systemctl stop gunicorn

echo ""
echo "✅ Testing Django configuration..."
python manage.py check --deploy

echo ""
echo "📦 Running migrations..."
python manage.py migrate

echo ""
echo "🔄 Restarting gunicorn with fresh connections..."
sudo systemctl start gunicorn

sleep 3

echo ""
echo "📊 Gunicorn status:"
sudo systemctl status gunicorn --no-pager -l

echo ""
echo "✅ Database connection fix complete!"
echo ""
echo "📝 To monitor connections, run:"
echo "   sudo journalctl -u gunicorn -f"

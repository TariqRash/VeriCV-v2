#!/bin/bash

echo "🔧 Fixing database connection issues..."

cd /home/VeriCV

# Activate virtual environment
source venv/bin/activate

# Check if non-pooled URL is set
if [ -z "$SUPABASE_POSTGRES_URL_NON_POOLING" ]; then
    echo "❌ SUPABASE_POSTGRES_URL_NON_POOLING is not set!"
    echo "Please add it to your .env file"
    exit 1
fi

echo "✅ Non-pooled Supabase URL is configured"

# Close all existing database connections
echo "🔌 Closing existing database connections..."
cd backend
python manage.py shell << EOF
from django.db import connection
connection.close()
print("Database connections closed")
EOF

# Test database connection
echo "🧪 Testing database connection..."
python manage.py check --database default || {
    echo "❌ Database connection test failed"
    echo "Checking environment variables..."
    env | grep SUPABASE
    exit 1
}

echo "✅ Database connection test passed"

# Run migrations
echo "📦 Running migrations..."
python manage.py migrate --noinput

# Restart gunicorn
echo "♻️  Restarting gunicorn..."
sudo systemctl restart vericv
sleep 2

# Check status
echo "📊 Checking service status..."
sudo systemctl status vericv --no-pager -l | head -20

echo "✅ Database fix completed!"
echo ""
echo "🔍 To monitor logs, run:"
echo "   sudo journalctl -u vericv -f"

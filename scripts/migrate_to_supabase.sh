#!/bin/bash

# VeriCV Supabase Migration Script
# This script automates the migration from local PostgreSQL to Supabase

set -e  # Exit on error

echo "🚀 VeriCV Supabase Migration Script"
echo "===================================="
echo ""

# Check if .env file exists
if [ ! -f "/home/VeriCV/backend/.env" ]; then
    echo "❌ Error: .env file not found at /home/VeriCV/backend/.env"
    echo "Please create the .env file with Supabase credentials first."
    exit 1
fi

# Load environment variables
source /home/VeriCV/backend/.env

# Check if Supabase URL is set
if [ -z "$SUPABASE_POSTGRES_URL_NON_POOLING" ]; then
    echo "❌ Error: SUPABASE_POSTGRES_URL_NON_POOLING not set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Navigate to backend directory
cd /home/VeriCV/backend

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Install required dependencies
echo "📦 Installing required dependencies..."
pip install dj-database-url>=2.1.0 --quiet

echo "✅ Dependencies installed"
echo ""

# Backup existing data (if old database exists)
echo "💾 Creating backup of existing data..."
if python manage.py dumpdata --natural-foreign --natural-primary \
   -e contenttypes -e auth.Permission \
   --indent 2 > /home/VeriCV/backup_$(date +%Y%m%d_%H%M%S).json 2>/dev/null; then
    echo "✅ Backup created successfully"
else
    echo "⚠️  No existing data to backup (this is normal for fresh installations)"
fi
echo ""

# Run migrations
echo "🔄 Running database migrations..."
python manage.py makemigrations
python manage.py migrate

echo "✅ Migrations completed"
echo ""

# Create superuser prompt
echo "👤 Do you want to create a superuser? (y/n)"
read -r create_superuser
if [ "$create_superuser" = "y" ]; then
    python manage.py createsuperuser
fi

# Restart services
echo ""
echo "🔄 Restarting services..."
sudo systemctl restart gunicorn || sudo systemctl restart vericv

echo "✅ Services restarted"
echo ""

# Test connection
echo "🧪 Testing database connection..."
if python manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute('SELECT 1'); print('✅ Database connection successful')"; then
    echo ""
    echo "🎉 Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Visit https://prod.vericv.app/api/health/ to verify backend"
    echo "2. Test login functionality"
    echo "3. Upload a test CV"
    echo "4. Monitor Supabase dashboard for data"
else
    echo "❌ Database connection test failed"
    echo "Please check your Supabase credentials and try again"
    exit 1
fi

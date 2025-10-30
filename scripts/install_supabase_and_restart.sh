#!/bin/bash

echo "=========================================="
echo "Installing Supabase and Restarting Backend"
echo "=========================================="

cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Install supabase package
echo "Installing supabase package..."
pip install supabase==2.9.0 postgrest==0.17.0

# Verify installation
echo "Verifying supabase installation..."
python -c "import supabase; print('✓ Supabase installed successfully')"

# Restart gunicorn
echo "Restarting gunicorn..."
sudo systemctl restart gunicorn

# Wait a moment
sleep 3

# Check status
echo "Checking gunicorn status..."
sudo systemctl status gunicorn --no-pager -l

echo "=========================================="
echo "Installation complete!"
echo "=========================================="

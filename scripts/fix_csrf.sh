#!/bin/bash

echo "Fixing CSRF settings and restarting gunicorn..."

cd /home/VeriCV/backend

# Restart gunicorn
sudo systemctl restart gunicorn

# Check status
sudo systemctl status gunicorn --no-pager

echo ""
echo "✅ Gunicorn restarted with CSRF fix"
echo "Try logging into Django admin at: https://prod.vericv.app/admin/"

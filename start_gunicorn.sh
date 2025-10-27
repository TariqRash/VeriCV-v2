#!/bin/bash
set -a
source /home/VeriCV/backend/.env
set +a

cd /home/VeriCV/backend

exec /home/VeriCV/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/vericv-access.log \
    --error-logfile /var/log/vericv-error.log \
    core.wsgi:application

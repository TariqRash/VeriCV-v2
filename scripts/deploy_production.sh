#!/bin/bash
# ============================================================================
# Production Deployment Script: Complete Django → Supabase Migration
# ============================================================================
# Run this on your production server at /home/VeriCV
# This script will:
#   1. Find and backup current nginx webroot
#   2. Deploy the new Supabase-backed frontend
#   3. Stop Django/Gunicorn services
#   4. Update nginx configuration
#   5. Verify deployment
# ============================================================================

set -e  # Exit on any error

echo "============================================================================"
echo "VERICV PRODUCTION DEPLOYMENT"
echo "Django → Supabase Migration"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_BUILD_DIR="/home/VeriCV/frontend/dist"
BACKUP_DIR="/home/VeriCV/backups/$(date +%Y%m%d_%H%M%S)"

# ============================================================================
# STEP 1: Pre-deployment checks
# ============================================================================
echo -e "${YELLOW}[1/6] Running pre-deployment checks...${NC}"

# Check if frontend build exists
if [ ! -d "$FRONTEND_BUILD_DIR" ]; then
    echo -e "${RED}ERROR: Frontend build not found at $FRONTEND_BUILD_DIR${NC}"
    echo "Please run: cd /home/VeriCV/frontend && npm run build"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build found${NC}"

# Find nginx webroot
echo -e "${YELLOW}Finding nginx webroot...${NC}"

# Try to get nginx root from config
NGINX_ROOT=$(nginx -T 2>/dev/null | grep -oP 'root\s+\K[^;]+' | grep -v "/usr" | head -1)

if [ -z "$NGINX_ROOT" ]; then
    # Fallback: common locations
    for dir in /var/www/html /var/www/vericv /usr/share/nginx/html /home/VeriCV/www; do
        if [ -d "$dir" ]; then
            NGINX_ROOT="$dir"
            break
        fi
    done
fi

if [ -z "$NGINX_ROOT" ]; then
    echo -e "${RED}ERROR: Could not find nginx webroot${NC}"
    echo "Please manually specify: export NGINX_ROOT=/path/to/webroot"
    exit 1
fi

echo -e "${GREEN}✅ Nginx webroot: $NGINX_ROOT${NC}"

# ============================================================================
# STEP 2: Backup current deployment
# ============================================================================
echo -e "${YELLOW}[2/6] Creating backup...${NC}"

mkdir -p "$BACKUP_DIR"

# Backup current webroot
if [ -d "$NGINX_ROOT" ] && [ "$(ls -A $NGINX_ROOT 2>/dev/null)" ]; then
    echo "Backing up current webroot to $BACKUP_DIR/webroot_backup"
    cp -r "$NGINX_ROOT" "$BACKUP_DIR/webroot_backup"
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo "No existing webroot to backup"
fi

# Backup nginx config
if [ -f /etc/nginx/sites-available/default ]; then
    cp /etc/nginx/sites-available/default "$BACKUP_DIR/nginx_default.backup"
    echo -e "${GREEN}✅ Nginx config backed up${NC}"
fi

# ============================================================================
# STEP 3: Deploy frontend
# ============================================================================
echo -e "${YELLOW}[3/6] Deploying frontend...${NC}"

# Clear existing webroot (except hidden files)
echo "Clearing existing webroot..."
rm -rf "$NGINX_ROOT"/*

# Copy new frontend build
echo "Copying new frontend build..."
cp -r "$FRONTEND_BUILD_DIR"/* "$NGINX_ROOT"/

# Set proper permissions
chown -R www-data:www-data "$NGINX_ROOT" 2>/dev/null || chown -R nginx:nginx "$NGINX_ROOT" 2>/dev/null || true
chmod -R 755 "$NGINX_ROOT"

echo -e "${GREEN}✅ Frontend deployed to $NGINX_ROOT${NC}"

# ============================================================================
# STEP 4: Stop Django/Gunicorn
# ============================================================================
echo -e "${YELLOW}[4/6] Stopping Django backend...${NC}"

# Try systemctl first
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet gunicorn 2>/dev/null; then
        systemctl stop gunicorn
        systemctl disable gunicorn
        echo -e "${GREEN}✅ Gunicorn service stopped and disabled${NC}"
    else
        echo "Gunicorn service not running via systemctl"
    fi
fi

# Kill any remaining gunicorn/django processes
if pgrep -f "gunicorn" > /dev/null; then
    echo "Killing remaining gunicorn processes..."
    pkill -f "gunicorn" || true
    sleep 2
    echo -e "${GREEN}✅ Gunicorn processes killed${NC}"
fi

if pgrep -f "manage.py" > /dev/null; then
    echo "Killing Django processes..."
    pkill -f "manage.py" || true
    echo -e "${GREEN}✅ Django processes killed${NC}"
fi

# ============================================================================
# STEP 5: Update nginx configuration
# ============================================================================
echo -e "${YELLOW}[5/6] Updating nginx configuration...${NC}"

# Create nginx config for Supabase-backed frontend
cat > /tmp/vericv_nginx.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name prod.vericv.app;

    root NGINX_ROOT_PLACEHOLDER;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main location - serve React/Vite SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Handle assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to Supabase (if needed for Edge Functions)
    location /api/ {
        proxy_pass https://pllzfnekiebxsiuoyeuu.supabase.co/functions/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Disable access to .git and other hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Replace placeholder with actual nginx root
sed -i "s|NGINX_ROOT_PLACEHOLDER|$NGINX_ROOT|g" /tmp/vericv_nginx.conf

# Backup and update nginx config
if [ -f /etc/nginx/sites-available/default ]; then
    cp /tmp/vericv_nginx.conf /etc/nginx/sites-available/vericv
    ln -sf /etc/nginx/sites-available/vericv /etc/nginx/sites-enabled/vericv
    echo -e "${GREEN}✅ Nginx config updated${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx config not found at standard location${NC}"
    echo "Config created at /tmp/vericv_nginx.conf - please copy manually"
fi

# Test nginx config
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx config is valid${NC}"

    # Reload nginx
    if command -v systemctl &> /dev/null; then
        systemctl reload nginx
    else
        service nginx reload || /etc/init.d/nginx reload
    fi

    echo -e "${GREEN}✅ Nginx reloaded${NC}"
else
    echo -e "${RED}❌ Nginx config test failed${NC}"
    nginx -t
    exit 1
fi

# ============================================================================
# STEP 6: Verify deployment
# ============================================================================
echo -e "${YELLOW}[6/6] Verifying deployment...${NC}"

# Check if nginx is serving the new frontend
sleep 2

# Test local connection
if curl -s http://localhost/ | grep -q "vite\|react\|<!DOCTYPE html>"; then
    echo -e "${GREEN}✅ Frontend is being served by nginx${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify frontend via curl${NC}"
fi

# Check for Django processes (should be none)
if ! pgrep -f "gunicorn\|manage.py" > /dev/null; then
    echo -e "${GREEN}✅ Django backend is stopped${NC}"
else
    echo -e "${RED}⚠️  Django processes still running:${NC}"
    pgrep -fa "gunicorn\|manage.py"
fi

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
echo ""
echo "============================================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "============================================================================"
echo ""
echo "📦 Backup location: $BACKUP_DIR"
echo "🌐 Frontend deployed to: $NGINX_ROOT"
echo "🚀 Production URL: https://prod.vericv.app"
echo ""
echo "Next steps:"
echo "  1. Test the site: https://prod.vericv.app"
echo "  2. Test CV upload functionality"
echo "  3. Test quiz generation and submission"
echo "  4. Monitor Edge Function logs in Supabase Dashboard"
echo ""
echo "If you need to rollback:"
echo "  sudo cp -r $BACKUP_DIR/webroot_backup/* $NGINX_ROOT/"
echo "  sudo systemctl start gunicorn"
echo "  sudo systemctl reload nginx"
echo ""
echo "============================================================================"

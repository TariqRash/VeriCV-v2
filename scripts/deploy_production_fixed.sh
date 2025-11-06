#!/bin/bash
# ============================================================================
# Production Deployment Script: Complete Django → Supabase Migration (FIXED)
# ============================================================================
# This version handles the case where nginx already serves from frontend/dist
# ============================================================================

set -e  # Exit on any error

echo "============================================================================"
echo "VERICV PRODUCTION DEPLOYMENT (Fixed)"
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
echo -e "${YELLOW}[1/5] Running pre-deployment checks...${NC}"

# Check if frontend build exists
if [ ! -d "$FRONTEND_BUILD_DIR" ]; then
    echo -e "${RED}ERROR: Frontend build not found at $FRONTEND_BUILD_DIR${NC}"
    echo "Please run: cd /home/VeriCV/frontend && npm run build"
    exit 1
fi

# Check if index.html exists in build
if [ ! -f "$FRONTEND_BUILD_DIR/index.html" ]; then
    echo -e "${RED}ERROR: Frontend build incomplete - index.html not found${NC}"
    echo "Please rebuild: cd /home/VeriCV/frontend && npm run build"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build found and valid${NC}"

# ============================================================================
# STEP 2: Backup current nginx config
# ============================================================================
echo -e "${YELLOW}[2/5] Creating backup...${NC}"

mkdir -p "$BACKUP_DIR"

# Backup nginx config
if [ -f /etc/nginx/sites-available/default ]; then
    cp /etc/nginx/sites-available/default "$BACKUP_DIR/nginx_default.backup"
    echo -e "${GREEN}✅ Nginx config backed up${NC}"
fi

# Backup any custom nginx configs
if [ -f /etc/nginx/sites-available/vericv ]; then
    cp /etc/nginx/sites-available/vericv "$BACKUP_DIR/nginx_vericv.backup"
fi

# ============================================================================
# STEP 3: Stop Django/Gunicorn
# ============================================================================
echo -e "${YELLOW}[3/5] Stopping Django backend...${NC}"

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
# STEP 4: Update nginx configuration for SPA
# ============================================================================
echo -e "${YELLOW}[4/5] Updating nginx configuration...${NC}"

# Create nginx config for Supabase-backed SPA
cat > /tmp/vericv_nginx.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name prod.vericv.app 104.248.248.95;

    root /home/VeriCV/frontend/dist;
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
        proxy_set_header Host pllzfnekiebxsiuoyeuu.supabase.co;
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

# Update nginx config
cp /tmp/vericv_nginx.conf /etc/nginx/sites-available/vericv

# Enable the new config
ln -sf /etc/nginx/sites-available/vericv /etc/nginx/sites-enabled/vericv

# Disable old Django config if it exists
if [ -f /etc/nginx/sites-enabled/default ] && [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    echo -e "${GREEN}✅ Disabled old nginx config${NC}"
fi

echo -e "${GREEN}✅ Nginx config updated${NC}"

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
# STEP 5: Verify deployment
# ============================================================================
echo -e "${YELLOW}[5/5] Verifying deployment...${NC}"

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

# List the frontend files being served
echo ""
echo "Frontend files in $FRONTEND_BUILD_DIR:"
ls -lh "$FRONTEND_BUILD_DIR"
echo ""

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
echo ""
echo "============================================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "============================================================================"
echo ""
echo "📦 Backup location: $BACKUP_DIR"
echo "🌐 Frontend serving from: $FRONTEND_BUILD_DIR"
echo "🚀 Production URLs:"
echo "    - http://104.248.248.95"
echo "    - http://prod.vericv.app (if DNS configured)"
echo ""
echo "Next steps:"
echo "  1. Test the site: http://104.248.248.95"
echo "  2. Test CV upload functionality"
echo "  3. Test quiz generation and submission"
echo "  4. Monitor Edge Function logs in Supabase Dashboard"
echo "  5. Set up HTTPS with certbot:"
echo "     sudo certbot --nginx -d prod.vericv.app"
echo ""
echo "If you need to rollback:"
echo "  sudo cp $BACKUP_DIR/nginx_default.backup /etc/nginx/sites-available/default"
echo "  sudo systemctl start gunicorn"
echo "  sudo systemctl reload nginx"
echo ""
echo "============================================================================"

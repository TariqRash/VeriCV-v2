#!/bin/bash
# ============================================================================
# Deployment Status Check Script
# ============================================================================
# Run this to diagnose deployment issues
# ============================================================================

echo "============================================================================"
echo "VERICV DEPLOYMENT STATUS CHECK"
echo "============================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check 1: Frontend build
echo -e "${YELLOW}[1] Checking frontend build...${NC}"
if [ -d "/home/VeriCV/frontend/dist" ]; then
    echo -e "${GREEN}✅ Frontend dist directory exists${NC}"
    echo "Contents:"
    ls -lh /home/VeriCV/frontend/dist/ | head -20
    echo ""

    if [ -f "/home/VeriCV/frontend/dist/index.html" ]; then
        echo -e "${GREEN}✅ index.html exists${NC}"
        echo "Size: $(du -h /home/VeriCV/frontend/dist/index.html | cut -f1)"
    else
        echo -e "${RED}❌ index.html NOT found${NC}"
    fi
else
    echo -e "${RED}❌ Frontend dist directory NOT found${NC}"
    echo "Run: cd /home/VeriCV/frontend && npm run build"
fi

echo ""

# Check 2: Node.js version
echo -e "${YELLOW}[2] Checking Node.js version...${NC}"
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
echo "Node.js: $NODE_VERSION"
if [[ "$NODE_VERSION" =~ v2[0-9]\. ]] || [[ "$NODE_VERSION" =~ v[3-9][0-9]\. ]]; then
    echo -e "${GREEN}✅ Node.js version is compatible (v20+)${NC}"
elif [[ "$NODE_VERSION" =~ v18\. ]] || [[ "$NODE_VERSION" =~ v19\. ]]; then
    echo -e "${YELLOW}⚠️  Node.js version is old (v18/v19). Recommended: v20+${NC}"
    echo "To upgrade: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
else
    echo -e "${RED}❌ Node.js not installed or too old${NC}"
fi

echo ""

# Check 3: Nginx status
echo -e "${YELLOW}[3] Checking Nginx...${NC}"
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx is installed${NC}"

    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "${GREEN}✅ Nginx is running${NC}"
    else
        echo -e "${RED}❌ Nginx is not running${NC}"
        echo "Start it: sudo systemctl start nginx"
    fi

    echo ""
    echo "Current nginx configuration:"
    nginx -T 2>/dev/null | grep -A 5 "server_name" | head -20
else
    echo -e "${RED}❌ Nginx not installed${NC}"
fi

echo ""

# Check 4: Django/Gunicorn status
echo -e "${YELLOW}[4] Checking Django/Gunicorn...${NC}"
if pgrep -f "gunicorn" > /dev/null; then
    echo -e "${YELLOW}⚠️  Gunicorn is still running${NC}"
    echo "Processes:"
    pgrep -fa "gunicorn"
    echo ""
    echo "Stop it with: sudo systemctl stop gunicorn"
else
    echo -e "${GREEN}✅ Gunicorn is not running (good for Supabase migration)${NC}"
fi

if systemctl is-active --quiet gunicorn 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Gunicorn service is enabled${NC}"
    echo "Disable it: sudo systemctl disable gunicorn"
fi

echo ""

# Check 5: Environment variables
echo -e "${YELLOW}[5] Checking environment variables...${NC}"
if [ -f "/home/VeriCV/frontend/.env" ]; then
    echo -e "${GREEN}✅ Frontend .env file exists${NC}"
    echo "Contents (redacted):"
    cat /home/VeriCV/frontend/.env | sed 's/=.*/=***REDACTED***/'
else
    echo -e "${RED}❌ Frontend .env file NOT found${NC}"
    echo "Create it with: sudo /home/VeriCV/scripts/setup_frontend_env.sh"
fi

echo ""

# Check 6: Listening ports
echo -e "${YELLOW}[6] Checking listening ports...${NC}"
echo "Port 80 (HTTP):"
if netstat -tln 2>/dev/null | grep -q ":80 " || ss -tln 2>/dev/null | grep -q ":80 "; then
    echo -e "${GREEN}✅ Port 80 is listening${NC}"
    netstat -tlnp 2>/dev/null | grep ":80 " || ss -tlnp 2>/dev/null | grep ":80 "
else
    echo -e "${RED}❌ Port 80 is not listening${NC}"
fi

echo ""
echo "Port 8000 (Django - should be closed):"
if netstat -tln 2>/dev/null | grep -q ":8000 " || ss -tln 2>/dev/null | grep -q ":8000 "; then
    echo -e "${YELLOW}⚠️  Port 8000 is listening (Django still running?)${NC}"
    netstat -tlnp 2>/dev/null | grep ":8000 " || ss -tlnp 2>/dev/null | grep ":8000 "
else
    echo -e "${GREEN}✅ Port 8000 is not listening (good)${NC}"
fi

echo ""
echo "============================================================================"
echo "STATUS CHECK COMPLETE"
echo "============================================================================"

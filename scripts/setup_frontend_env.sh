#!/bin/bash

echo "Setting up frontend environment variables..."

cd /home/VeriCV/frontend

# Create .env file with Supabase credentials
cat > .env << 'EOF'
VITE_API_BASE_URL=https://prod.vericv.app/api/
VITE_SUPABASE_URL=https://pllzfnekiebxsiuoyeuu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbHpmbmVraWVieHNpdW95ZXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjA0NDIsImV4cCI6MjA3NzI5NjQ0Mn0.6n_K4ZLtsDavElVkpdR6lNlQ9F_uyaHAzOIW4lcauwo
EOF

echo "✓ Created .env file with Supabase credentials"

# Install Supabase client if not already installed
if ! grep -q "@supabase/supabase-js" package.json; then
  echo "Installing @supabase/supabase-js..."
  npm install @supabase/supabase-js
fi

echo "✓ Supabase client installed"

# Rebuild frontend
echo "Rebuilding frontend..."
npm run build

echo "✓ Frontend rebuilt successfully"
echo ""
echo "All services now use Supabase directly!"
echo "- CV data: Saved to Supabase cv_cv table"
echo "- Quiz data: Saved to Supabase quiz_quiz table"
echo "- Results: Saved to Supabase quiz_result table"
echo "- Dashboard: Fetches from Supabase directly"

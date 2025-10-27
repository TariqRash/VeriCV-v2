# Server Configuration Changes

## Django Settings Changes (backend/core/settings.py)

### Database Configuration
Changed from SQLite to PostgreSQL for production use.

### Static & Media Files
Configured proper paths for static files and media uploads.

### ALLOWED_HOSTS
Updated to use environment variables for flexibility.

### CORS Configuration
Configured to allow requests from production domain.

## Environment Variables Required

The application requires two .env files:

1. backend/.env - Backend configuration (database, API keys, etc.)
2. frontend/.env - Frontend API URLs

These files are NOT committed to git for security.
See DEPLOYMENT.md for configuration examples.

## Database Migration to Supabase

To migrate from local PostgreSQL to Supabase:

1. Create Supabase project
2. Get connection string from Supabase dashboard
3. Update backend/.env with Supabase credentials
4. Run migrations: python manage.py migrate
5. Restart service: sudo systemctl restart vericv

No code changes required - just update environment variables.

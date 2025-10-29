# VeriCV Supabase Migration Guide

This guide will help you migrate the VeriCV Django backend from a local/traditional PostgreSQL database to Supabase PostgreSQL.

## Prerequisites

- Supabase project created (supabase-green-book)
- Access to the production server (104.248.136.7)
- Backup of existing database (if migrating from existing data)

## Step 1: Install Required Dependencies

SSH into your server and install the new dependency:

\`\`\`bash
cd /home/VeriCV/backend
source venv/bin/activate  # If using virtual environment
pip install dj-database-url>=2.1.0
\`\`\`

## Step 2: Update Environment Variables

The Django settings now automatically use Supabase environment variables. The following variables are already set in your Vercel project:

- `SUPABASE_POSTGRES_URL` - Main connection URL (pooled)
- `SUPABASE_POSTGRES_URL_NON_POOLING` - Direct connection URL (for migrations)
- `SUPABASE_POSTGRES_HOST` - Database host
- `SUPABASE_POSTGRES_USER` - Database user
- `SUPABASE_POSTGRES_PASSWORD` - Database password
- `SUPABASE_POSTGRES_DATABASE` - Database name

### For Production Server

Create or update `/home/VeriCV/backend/.env`:

\`\`\`bash
# Supabase Database Configuration
SUPABASE_POSTGRES_URL_NON_POOLING=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
SUPABASE_POSTGRES_HOST=aws-0-[REGION].pooler.supabase.com
SUPABASE_POSTGRES_USER=postgres.[PROJECT-REF]
SUPABASE_POSTGRES_PASSWORD=[YOUR-PASSWORD]
SUPABASE_POSTGRES_DATABASE=postgres

# Supabase API Configuration (optional, for future features)
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Other existing variables
SECRET_KEY=[YOUR-SECRET-KEY]
DEBUG=False
ALLOWED_HOSTS=vericv.app,prod.vericv.app,104.248.136.7
GROQ_API_KEY=[YOUR-GROQ-KEY]
\`\`\`

**Get your Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → Database
3. Copy the connection string (use the "Direct connection" for migrations)

## Step 3: Run Database Migrations

### Option A: Using Django Migrations (Recommended)

Django will automatically create all tables using its migration system:

\`\`\`bash
cd /home/VeriCV/backend

# Create migration files (if not already created)
python manage.py makemigrations

# Apply migrations to Supabase
python manage.py migrate
\`\`\`

This will create:
- All Django system tables (auth_user, sessions, etc.)
- All VeriCV custom tables (cv_cv, quiz_quiz, etc.)

### Option B: Using SQL Scripts (Alternative)

If you prefer to run the SQL directly:

\`\`\`bash
# Install psql if not already installed
sudo apt-get install postgresql-client

# Run the migration script
psql "$SUPABASE_POSTGRES_URL_NON_POOLING" -f /home/VeriCV/scripts/01_create_tables.sql
\`\`\`

## Step 4: Verify Database Connection

Test the connection:

\`\`\`bash
cd /home/VeriCV/backend
python manage.py shell
\`\`\`

In the Python shell:

\`\`\`python
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT version();")
print(cursor.fetchone())
# Should print PostgreSQL version from Supabase
\`\`\`

## Step 5: Create Superuser (if needed)

\`\`\`bash
python manage.py createsuperuser
\`\`\`

## Step 6: Migrate Existing Data (if applicable)

If you have existing data in a previous database:

### Export from old database:

\`\`\`bash
# Dump data from old database
python manage.py dumpdata --natural-foreign --natural-primary \
  -e contenttypes -e auth.Permission \
  --indent 2 > data_backup.json
\`\`\`

### Import to Supabase:

\`\`\`bash
# Load data into Supabase
python manage.py loaddata data_backup.json
\`\`\`

## Step 7: Restart Services

\`\`\`bash
# Restart Gunicorn
sudo systemctl restart gunicorn

# Or if using a different service name
sudo systemctl restart vericv

# Check status
sudo systemctl status gunicorn
\`\`\`

## Step 8: Verify Application

1. Check backend health: `https://prod.vericv.app/api/health/`
2. Try logging in to the application
3. Upload a test CV
4. Check Supabase dashboard to see data appearing

## Troubleshooting

### Connection Refused

- Verify Supabase credentials are correct
- Check if IP address is whitelisted in Supabase (Settings → Database → Connection Pooling)
- Ensure SSL mode is enabled (already configured in settings.py)

### Migration Errors

\`\`\`bash
# Reset migrations (CAUTION: This will delete data)
python manage.py migrate --fake-initial

# Or manually drop tables and re-run migrations
\`\`\`

### Check Logs

\`\`\`bash
# Django logs
tail -f /var/log/gunicorn/error.log

# System logs
sudo journalctl -u gunicorn -f
\`\`\`

## Supabase Dashboard

Monitor your database in real-time:
- **Table Editor**: View and edit data directly
- **SQL Editor**: Run custom queries
- **Database**: Monitor performance and connections
- **Logs**: View database logs

## Performance Optimization

Supabase provides connection pooling by default. For Django:

1. Use `SUPABASE_POSTGRES_URL` (pooled) for application connections
2. Use `SUPABASE_POSTGRES_URL_NON_POOLING` (direct) for migrations only
3. Configure `conn_max_age=600` in settings.py (already done)

## Security Best Practices

1. Never commit `.env` file to Git
2. Use Row Level Security (RLS) in Supabase for additional protection
3. Rotate database passwords regularly
4. Monitor database access logs in Supabase dashboard

## Rollback Plan

If you need to rollback to the old database:

1. Update `.env` to use old database credentials
2. Restart Gunicorn: `sudo systemctl restart gunicorn`
3. Verify connection

## Next Steps

After successful migration:

1. Set up automated backups in Supabase (Settings → Database → Backups)
2. Configure database alerts and monitoring
3. Review and optimize slow queries using Supabase performance insights
4. Consider enabling Point-in-Time Recovery (PITR) for production

## Support

- Supabase Documentation: https://supabase.com/docs
- Django Database Documentation: https://docs.djangoproject.com/en/5.0/ref/databases/
- VeriCV Issues: Contact your development team

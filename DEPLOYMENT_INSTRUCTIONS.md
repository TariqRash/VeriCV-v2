# VeriCV Backend Deployment Instructions

## Quick Deploy

Run this single command on your server:

\`\`\`bash
bash scripts/deploy_and_test.sh
\`\`\`

## Manual Deployment Steps

If the automated script fails, follow these steps:

### 1. Navigate to Backend Directory
\`\`\`bash
cd /home/VeriCV/backend
\`\`\`

### 2. Activate Virtual Environment
\`\`\`bash
source venv/bin/activate
# or
source env/bin/activate
\`\`\`

### 3. Install Dependencies
\`\`\`bash
pip install psycopg2-binary dj-database-url groq
\`\`\`

### 4. Run Migrations
\`\`\`bash
python manage.py makemigrations quiz
python manage.py migrate
\`\`\`

### 5. Test Database Connection
\`\`\`bash
python scripts/test_database.py
\`\`\`

This will:
- Test Supabase connection
- Check all tables exist
- Create a test quiz to verify writes work
- Show you the quiz_id and result_id

### 6. Restart Backend Service
\`\`\`bash
sudo systemctl restart gunicorn
\`\`\`

### 7. Check Service Status
\`\`\`bash
sudo systemctl status gunicorn
\`\`\`

### 8. Monitor Logs
\`\`\`bash
sudo journalctl -u gunicorn -f
\`\`\`

Look for `[v0]` prefixed log messages that show:
- Quiz creation
- Question creation
- Result creation with ID
- Response data with result_id and quiz_id

## Troubleshooting

### Issue: Tables are empty after quiz submission

**Check logs:**
\`\`\`bash
sudo journalctl -u gunicorn -n 100 | grep "\[v0\]"
\`\`\`

Look for:
- `[v0] ✓ CREATED RESULT WITH ID: X` - Result was saved
- `[v0] ✗ Error saving result` - Error occurred

**Verify database connection:**
\`\`\`bash
python scripts/test_database.py
\`\`\`

### Issue: "Server did not return a result ID"

This means the backend response doesn't include `result_id`. Check:

1. Backend logs show result creation:
\`\`\`bash
sudo journalctl -u gunicorn -n 50 | grep "CREATED RESULT"
\`\`\`

2. Response includes result_id:
\`\`\`bash
sudo journalctl -u gunicorn -n 50 | grep "result_id"
\`\`\`

### Issue: 502 Bad Gateway

Backend crashed. Check error logs:
\`\`\`bash
sudo journalctl -u gunicorn -n 100 --no-pager
\`\`\`

Common causes:
- Import errors
- Database connection failed
- Missing dependencies

## Verify Deployment Success

After deployment, test the complete flow:

1. **Upload CV:**
\`\`\`bash
curl -X POST http://localhost:8000/api/cv/upload/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "cv=@test.pdf"
\`\`\`

2. **Generate Questions:**
\`\`\`bash
curl -X POST http://localhost:8000/api/ai/generate/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cv_id": 1}'
\`\`\`

3. **Submit Answers:**
\`\`\`bash
curl -X POST http://localhost:8000/api/ai/submit/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quiz_id": 1, "cv_id": 1, "answers": [{"question": "Q1", "answer": 0}]}'
\`\`\`

The response MUST include:
\`\`\`json
{
  "score": 75,
  "result_id": 1,
  "quiz_id": 1,
  "feedback": "...",
  "correct": 3,
  "total": 4,
  "answers": [...]
}
\`\`\`

## Database Verification

Check Supabase tables have data:

\`\`\`sql
-- Check quiz table
SELECT COUNT(*) FROM quiz_quiz;

-- Check questions table
SELECT COUNT(*) FROM quiz_question;

-- Check results table
SELECT COUNT(*) FROM quiz_result;

-- View latest result
SELECT * FROM quiz_result ORDER BY created_at DESC LIMIT 1;
\`\`\`

All tables should have records after quiz submission.

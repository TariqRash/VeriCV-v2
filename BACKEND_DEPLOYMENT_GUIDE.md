# Backend Deployment Guide

## Problem
The quiz submission is not saving data to Supabase. The backend returns:
\`\`\`json
{
  "score": 0,
  "result_id": null,
  "quiz_id": null
}
\`\`\`

## Root Cause
The deployed backend code is outdated and doesn't have the database save logic.

## Solution

### Step 1: Deploy Updated Backend

Run this command on your server:

\`\`\`bash
cd /home/VeriCV
bash scripts/redeploy_backend.sh
\`\`\`

This will:
1. Activate the virtual environment
2. Install dependencies
3. Run database migrations
4. Collect static files
5. Restart gunicorn
6. Test the database connection

### Step 2: Verify Deployment

After deployment, check the logs:

\`\`\`bash
sudo journalctl -u gunicorn -f
\`\`\`

You should see `[v0]` prefixed log messages when you submit a quiz.

### Step 3: Test the Quiz Flow

1. Go to https://prod.vericv.app/upload
2. Upload a CV
3. Go to the quiz page
4. Answer the questions
5. Submit the quiz

You should see:
- A success message
- Real scores based on correct answers
- Data saved in Supabase tables: `quiz_quiz`, `quiz_question`, `quiz_result`

### Step 4: Check Supabase

Go to your Supabase dashboard and verify:
- `quiz_quiz` table has new records
- `quiz_question` table has questions
- `quiz_result` table has results with proper scores

## Troubleshooting

### If gunicorn fails to start:

\`\`\`bash
sudo systemctl status gunicorn
sudo journalctl -u gunicorn -n 50
\`\`\`

### If database test fails:

\`\`\`bash
cd /home/VeriCV/backend
source /home/VeriCV/venv/bin/activate
python manage.py test_quiz_db
\`\`\`

### If migrations fail:

\`\`\`bash
cd /home/VeriCV/backend
source /home/VeriCV/venv/bin/activate
python manage.py showmigrations
python manage.py migrate --fake-initial
\`\`\`

## Expected Behavior After Fix

### Backend Response:
\`\`\`json
{
  "score": 73,
  "result_id": 1,
  "quiz_id": 1,
  "feedback": "...",
  "correct": 11,
  "total": 15,
  "answers": [...]
}
\`\`\`

### Frontend:
- Shows real scores
- Navigates to results page with result_id
- Displays skill breakdown
- Shows AI feedback

### Database:
- quiz_quiz: Contains quiz records
- quiz_question: Contains all questions
- quiz_result: Contains results with scores and answers

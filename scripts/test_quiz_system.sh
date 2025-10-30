#!/bin/bash

echo "========================================="
echo "Testing VeriCV Quiz System"
echo "========================================="
echo ""

cd /home/VeriCV/backend

# Activate virtual environment
source /home/VeriCV/venv/bin/activate

# Run the test command
python manage.py test_quiz_db

echo ""
echo "========================================="
echo "Checking gunicorn logs for quiz submissions..."
echo "========================================="
echo ""

# Show recent logs with quiz-related entries
sudo journalctl -u gunicorn -n 100 --no-pager | grep -i "quiz\|submit\|result" || echo "No quiz-related logs found yet"

echo ""
echo "========================================="
echo "Test complete!"
echo "========================================="

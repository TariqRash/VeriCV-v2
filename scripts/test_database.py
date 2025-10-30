#!/usr/bin/env python
"""
Test script to verify Supabase database connection and create test records
Run with: python scripts/test_database.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from cv.models import CV
from quiz.models import Quiz, Question, Result
from feedback.models import Feedback
from django.db import connection

User = get_user_model()

def test_database_connection():
    """Test basic database connectivity"""
    print("\n" + "="*60)
    print("TESTING DATABASE CONNECTION")
    print("="*60)
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✓ Database connected successfully!")
            print(f"  PostgreSQL version: {version[0]}")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

def test_tables_exist():
    """Check if all required tables exist"""
    print("\n" + "="*60)
    print("CHECKING TABLES")
    print("="*60)
    
    tables = {
        'cv_cv': CV,
        'quiz_quiz': Quiz,
        'quiz_question': Question,
        'quiz_result': Result,
        'feedback_feedback': Feedback,
    }
    
    for table_name, model in tables.items():
        try:
            count = model.objects.count()
            print(f"✓ {table_name}: {count} records")
        except Exception as e:
            print(f"✗ {table_name}: ERROR - {e}")

def create_test_quiz():
    """Create a test quiz to verify database writes"""
    print("\n" + "="*60)
    print("CREATING TEST QUIZ")
    print("="*60)
    
    try:
        # Get or create test user
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={'email': 'test@vericv.app'}
        )
        if created:
            user.set_password('testpass123')
            user.save()
        print(f"✓ Test user: {user.username} (ID: {user.id})")
        
        # Create test quiz
        quiz = Quiz.objects.create(
            user=user,
            title="Test Quiz - Database Verification"
        )
        print(f"✓ Created quiz with ID: {quiz.id}")
        
        # Create test questions
        for i in range(3):
            question = Question.objects.create(
                quiz=quiz,
                text=f"Test Question {i+1}",
                options=["Option A", "Option B", "Option C", "Option D"],
                correct_answer=i % 4
            )
            print(f"✓ Created question {i+1} with ID: {question.id}")
        
        # Create test result
        result = Result.objects.create(
            quiz=quiz,
            user=user,
            score=75,
            answers=[
                {"question": "Test Q1", "answer": 0, "isCorrect": True},
                {"question": "Test Q2", "answer": 1, "isCorrect": False},
                {"question": "Test Q3", "answer": 2, "isCorrect": True}
            ]
        )
        print(f"✓ Created result with ID: {result.id}")
        
        print("\n✓ TEST QUIZ CREATED SUCCESSFULLY!")
        print(f"  Quiz ID: {quiz.id}")
        print(f"  Result ID: {result.id}")
        print(f"  Questions: {quiz.questions.count()}")
        
        return True
        
    except Exception as e:
        print(f"\n✗ ERROR creating test quiz: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_data():
    """Remove test data"""
    print("\n" + "="*60)
    print("CLEANING UP TEST DATA")
    print("="*60)
    
    try:
        # Delete test quizzes
        deleted = Quiz.objects.filter(title__contains="Test Quiz").delete()
        print(f"✓ Deleted test quizzes: {deleted[0]} records")
        
        # Delete test user if exists
        User.objects.filter(username='test_user').delete()
        print(f"✓ Deleted test user")
        
    except Exception as e:
        print(f"✗ Cleanup error: {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("VERICV DATABASE TEST SCRIPT")
    print("="*60)
    
    # Test 1: Database connection
    if not test_database_connection():
        print("\n✗ FAILED: Cannot connect to database")
        sys.exit(1)
    
    # Test 2: Check tables
    test_tables_exist()
    
    # Test 3: Create test data
    if create_test_quiz():
        print("\n✓ ALL TESTS PASSED!")
        
        # Ask if user wants to cleanup
        response = input("\nCleanup test data? (y/n): ")
        if response.lower() == 'y':
            cleanup_test_data()
    else:
        print("\n✗ TEST FAILED!")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60 + "\n")

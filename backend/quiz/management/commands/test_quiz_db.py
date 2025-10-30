from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from quiz.models import Quiz, Question, Result
from cv.models import CV
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Test quiz database operations'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== Testing Quiz Database ===\n'))
        
        try:
            # Check if tables exist
            self.stdout.write('1. Checking tables...')
            quiz_count = Quiz.objects.count()
            question_count = Question.objects.count()
            result_count = Result.objects.count()
            cv_count = CV.objects.count()
            
            self.stdout.write(self.style.SUCCESS(f'   ✓ Quiz table: {quiz_count} records'))
            self.stdout.write(self.style.SUCCESS(f'   ✓ Question table: {question_count} records'))
            self.stdout.write(self.style.SUCCESS(f'   ✓ Result table: {result_count} records'))
            self.stdout.write(self.style.SUCCESS(f'   ✓ CV table: {cv_count} records'))
            
            # Try to create a test quiz
            self.stdout.write('\n2. Creating test quiz...')
            
            # Get or create a test user
            test_user, created = User.objects.get_or_create(
                username='test_user',
                defaults={'email': 'test@example.com'}
            )
            
            # Get or create a test CV
            test_cv = None
            if cv_count > 0:
                test_cv = CV.objects.first()
                self.stdout.write(f'   Using existing CV: {test_cv.id}')
            
            # Create test quiz
            test_quiz = Quiz.objects.create(
                user=test_user,
                cv=test_cv,
                title='Test Quiz'
            )
            self.stdout.write(self.style.SUCCESS(f'   ✓ Created quiz with ID: {test_quiz.id}'))
            
            # Create test questions
            for i in range(3):
                question = Question.objects.create(
                    quiz=test_quiz,
                    text=f'Test question {i+1}?',
                    option_a='Option A',
                    option_b='Option B',
                    option_c='Option C',
                    option_d='Option D',
                    correct_answer=0,
                    skill=f'Skill {i+1}'
                )
                self.stdout.write(self.style.SUCCESS(f'   ✓ Created question {i+1} with ID: {question.id}'))
            
            # Create test result
            test_answers = [
                {"question_id": 1, "user_answer": 0, "correct_answer": 0, "is_correct": True, "skill": "Skill 1"},
                {"question_id": 2, "user_answer": 1, "correct_answer": 0, "is_correct": False, "skill": "Skill 2"},
                {"question_id": 3, "user_answer": 0, "correct_answer": 0, "is_correct": True, "skill": "Skill 3"}
            ]
            
            test_result = Result.objects.create(
                user=test_user,
                quiz=test_quiz,
                score=66.67,
                answers=json.dumps(test_answers)
            )
            self.stdout.write(self.style.SUCCESS(f'   ✓ Created result with ID: {test_result.id}'))
            
            # Verify we can read the data back
            self.stdout.write('\n3. Verifying data...')
            retrieved_quiz = Quiz.objects.get(id=test_quiz.id)
            retrieved_questions = Question.objects.filter(quiz=test_quiz)
            retrieved_result = Result.objects.get(id=test_result.id)
            
            self.stdout.write(self.style.SUCCESS(f'   ✓ Retrieved quiz: {retrieved_quiz.title}'))
            self.stdout.write(self.style.SUCCESS(f'   ✓ Retrieved {retrieved_questions.count()} questions'))
            self.stdout.write(self.style.SUCCESS(f'   ✓ Retrieved result with score: {retrieved_result.score}%'))
            
            # Parse answers JSON
            answers_data = json.loads(retrieved_result.answers)
            self.stdout.write(self.style.SUCCESS(f'   ✓ Parsed {len(answers_data)} answers from JSON'))
            
            # Clean up test data
            self.stdout.write('\n4. Cleaning up test data...')
            test_result.delete()
            test_quiz.delete()  # This will cascade delete questions
            if created:
                test_user.delete()
            
            self.stdout.write(self.style.SUCCESS('   ✓ Test data cleaned up'))
            
            self.stdout.write(self.style.SUCCESS('\n=== All Tests Passed! ===\n'))
            self.stdout.write(self.style.SUCCESS('Database is working correctly and ready to store quiz data.\n'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ Error: {str(e)}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))

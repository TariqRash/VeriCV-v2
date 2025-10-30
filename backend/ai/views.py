# backend/ai/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from cv.models import CV
from quiz.models import Quiz, Question, Result
from feedback.models import Feedback
from .ai_logic import extract_text_from_pdf, generate_questions_from_cv, detect_cv_language, generate_feedback_from_ai
import json
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def generate_questions_view(request):
    """
    POST:
      JSON:  { "cv_id": <int> }               -> uses a server-stored CV file
      OR multipart/form-data with file under one of:
              'cv' | 'file' | 'pdf' | 'cv_file' | 'resume' | 'document'
    RESP: { "questions": [ {question, options?, answer?}, ... ], "quiz_id": <int> }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    cv_file = None
    cv_obj = None

    # Try JSON body with cv_id
    try:
        if request.content_type and "application/json" in request.content_type:
            body = request.body.decode("utf-8") or "{}"
            data = json.loads(body)
            cv_id = data.get("cv_id")
            if cv_id is not None:
                try:
                    cv_obj = CV.objects.get(pk=cv_id)
                    cv_file = cv_obj.file  # FileField
                    logger.info(f"Using CV ID: {cv_id}")
                except CV.DoesNotExist:
                    return JsonResponse({"error": "CV not found."}, status=404)
    except Exception as e:
        logger.error(f"Error parsing JSON: {e}")
        pass

    # Try multipart with a file under common keys
    if cv_file is None:
        for key in ["cv", "file", "pdf", "cv_file", "resume", "document"]:
            if key in request.FILES:
                cv_file = request.FILES[key]
                logger.info(f"Using uploaded file from key: {key}")
                break

        if not cv_file:
            return JsonResponse({"error": "Please upload a valid PDF file or provide cv_id."}, status=400)

    # Extract text & generate questions
    try:
        text = extract_text_from_pdf(cv_file)
        logger.info(f"Extracted text length: {len(text)}")

        # Detect language for quiz generation
        language = 'en'  # default
        try:
            if cv_obj:
                language = cv_obj.detected_language or 'en'
            else:
                language = detect_cv_language(text)
            logger.info(f"Detected language: {language}")
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            language = 'en'

        questions_data = generate_questions_from_cv(text, language=language)
        questions = _normalize_questions(questions_data)
        logger.info(f"Generated {len(questions)} questions")

        if request.user.is_authenticated:
            try:
                # Use existing CV or create a temporary one
                if not cv_obj and cv_file:
                    cv_obj = CV.objects.create(
                        user=request.user,
                        title="Quick Quiz CV",
                        file=cv_file
                    )
                
                quiz = Quiz.objects.create(
                    user=request.user,
                    title=f"Quiz for {cv_obj.title if cv_obj else 'CV'}",
                    cv=cv_obj
                )
                
                for idx, q in enumerate(questions):
                    Question.objects.create(
                        quiz=quiz,
                        text=q.get('question', ''),
                        options=q.get('options', []),
                        correct_answer=q.get('correctAnswer', 0)
                    )
                
                logger.info(f"Created quiz with ID: {quiz.id}")
                
                return JsonResponse({
                    "questions": questions,
                    "language": language,
                    "quiz_id": quiz.id,
                    "cv_id": cv_obj.id if cv_obj else None
                }, status=200)
            except Exception as e:
                logger.error(f"Error saving quiz: {e}")
                return JsonResponse({
                    "questions": questions,
                    "language": language,
                    "error": "Quiz saved with errors"
                }, status=200)
        
        return JsonResponse({"questions": questions, "language": language}, status=200)
    except Exception as e:
        logger.error(f"Error generating questions: {e}", exc_info=True)
        return JsonResponse({"error": f"Failed to generate questions: {str(e)}"}, status=500)


@csrf_exempt
def submit_answers_view(request):
    """
    POST /api/ai/submit/
    Body: { "quiz_id": <int>, "cv_id": <int>, "answers": [...] }
    Responds with score, result_id, quiz_id, and feedback
    """
    logger.critical("=" * 80)
    logger.critical("[v0] SUBMIT_ANSWERS_VIEW CALLED - REQUEST RECEIVED")
    logger.critical(f"[v0] Method: {request.method}")
    logger.critical(f"[v0] Path: {request.path}")
    logger.critical(f"[v0] Content-Type: {request.content_type}")
    logger.critical("=" * 80)
    
    if request.method != "POST":
        logger.error(f"[v0] Invalid method: {request.method}")
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        body = request.body.decode("utf-8") or "{}"
        logger.critical(f"[v0] Raw body length: {len(body)} chars")
        
        data = json.loads(body)
        answers = data.get("answers", [])
        quiz_id = data.get("quiz_id")
        cv_id = data.get("cv_id")

        logger.critical(f"[v0] === SUBMIT ANSWERS START ===")
        logger.critical(f"[v0] quiz_id: {quiz_id}, cv_id: {cv_id}, answers count: {len(answers)}")

        quiz_obj = None
        cv_obj = None
        
        if cv_id:
            try:
                cv_obj = CV.objects.get(id=cv_id)
                logger.info(f"[v0] Found CV: {cv_obj.id} - {cv_obj.title}")
            except CV.DoesNotExist:
                logger.warning(f"[v0] CV {cv_id} not found")
        
        if quiz_id:
            try:
                quiz_obj = Quiz.objects.get(id=quiz_id)
                logger.info(f"[v0] Found existing quiz: {quiz_obj.id}")
            except Quiz.DoesNotExist:
                logger.warning(f"[v0] Quiz {quiz_id} not found, will create new one")
        
        # If no quiz found, create one
        if not quiz_obj and request.user.is_authenticated:
            quiz_obj = Quiz.objects.create(
                user=request.user,
                title=f"Quiz for {cv_obj.title if cv_obj else 'CV'}",
                cv=cv_obj
            )
            logger.info(f"[v0] Created new quiz: {quiz_obj.id}")
            
            for idx, ans in enumerate(answers):
                correct_ans = ans.get('correctAnswer', 0)
                # Ensure it's an integer
                if isinstance(correct_ans, str):
                    try:
                        correct_ans = int(correct_ans)
                    except:
                        correct_ans = 0
                
                Question.objects.create(
                    quiz=quiz_obj,
                    text=ans.get('question', f'Question {idx+1}'),
                    options=ans.get('options', []),
                    correct_answer=correct_ans
                )
            logger.info(f"[v0] Created {len(answers)} questions for quiz {quiz_obj.id}")

        if quiz_obj:
            questions = list(quiz_obj.questions.all().order_by('id'))
            logger.info(f"[v0] Found {len(questions)} questions in quiz")
            
            # Mark each answer as correct or incorrect
            for i, ans in enumerate(answers):
                if i < len(questions):
                    question = questions[i]
                    user_answer = ans.get('answer')
                    correct_answer = question.correct_answer
                    
                    # Compare answers (both should be integers now)
                    if isinstance(user_answer, str):
                        try:
                            user_answer = int(user_answer)
                        except:
                            user_answer = -1
                    
                    ans['isCorrect'] = (user_answer == correct_answer)
                    ans['correctAnswer'] = correct_answer
                    
                    logger.info(f"[v0] Q{i+1}: User={user_answer}, Correct={correct_answer}, IsCorrect={ans['isCorrect']}")
                else:
                    ans['isCorrect'] = False
                    logger.warning(f"[v0] No question found for answer {i}")

        total_questions = len(answers)
        correct_count = sum(1 for ans in answers if ans.get('isCorrect') == True)
        
        score = round((correct_count / total_questions * 100)) if total_questions > 0 else 0
        logger.info(f"[v0] CALCULATED SCORE: {score}% ({correct_count}/{total_questions} correct)")

        result_obj = None
        feedback_text = ""
        
        if request.user.is_authenticated:
            try:
                result_obj = Result.objects.create(
                    quiz=quiz_obj,
                    user=request.user,
                    score=score,
                    answers=answers
                )
                logger.info(f"[v0] ✓ CREATED RESULT WITH ID: {result_obj.id}")
                
                # Generate AI feedback
                wrong_answers = [ans for ans in answers if not ans.get('isCorrect')]
                feedback_text = generate_feedback_from_ai(wrong_answers, score)
                logger.info(f"[v0] Generated feedback: {len(feedback_text)} chars")
                
                # Save feedback
                if cv_obj:
                    Feedback.objects.create(
                        user=request.user,
                        cv=cv_obj,
                        result=result_obj,
                        content=feedback_text,
                        rating=5 if score >= 80 else 4 if score >= 70 else 3
                    )
                    logger.info(f"[v0] ✓ Created feedback for result {result_obj.id}")
                
            except Exception as e:
                logger.error(f"[v0] ✗ Error saving result: {e}", exc_info=True)

        response_data = {
            "score": score,
            "result_id": result_obj.id if result_obj else None,
            "quiz_id": quiz_obj.id if quiz_obj else None,
            "feedback": feedback_text,
            "correct": correct_count,
            "total": total_questions,
            "answers": answers
        }
        
        logger.critical(f"[v0] === RESPONSE DATA ===")
        logger.critical(f"[v0] result_id: {response_data['result_id']}")
        logger.critical(f"[v0] quiz_id: {response_data['quiz_id']}")
        logger.critical(f"[v0] score: {response_data['score']}")
        logger.critical(f"[v0] === SUBMIT ANSWERS END ===")
        logger.critical("=" * 80)
        
        return JsonResponse(response_data, status=200)
        
    except Exception as e:
        logger.critical(f"[v0] ✗ FATAL ERROR submitting answers: {e}", exc_info=True)
        return JsonResponse({"error": f"Failed to submit answers: {str(e)}"}, status=500)

# -----------------
# Helpers
# -----------------
def _normalize_questions(raw):
    """
    Accepts:
      - dict with 'questions'
      - list at root
      - JSON string containing list or {questions: [...]}
    Returns: list[dict]
    """
    if raw is None:
        return []

    if isinstance(raw, list):
        return raw

    if isinstance(raw, dict):
        q = raw.get("questions")
        if isinstance(q, list):
            return q
        d = raw.get("data")
        if isinstance(d, list):
            return d
        return []

    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return _normalize_questions(parsed)
        except Exception:
            return [{"question": raw}]

    return []

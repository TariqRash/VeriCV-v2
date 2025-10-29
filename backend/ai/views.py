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
    Responds with score, result_id, and feedback
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        body = request.body.decode("utf-8") or "{}"
        data = json.loads(body)
        answers = data.get("answers", [])
        quiz_id = data.get("quiz_id")
        cv_id = data.get("cv_id")

        logger.info(f"Submitting answers for quiz_id: {quiz_id}, cv_id: {cv_id}")
        logger.info(f"Received {len(answers)} answers")

        # Normalize answers to a list
        if isinstance(answers, dict):
            answers_list = [{"question": q, "answer": a} for q, a in answers.items()]
        elif isinstance(answers, list):
            answers_list = answers
        else:
            answers_list = []

        total_questions = len(answers_list)
        correct_count = sum(1 for ans in answers_list if ans.get('isCorrect') == True)
        
        score = round((correct_count / total_questions * 100)) if total_questions > 0 else 0
        logger.info(f"Calculated score: {score}% ({correct_count}/{total_questions})")

        result_obj = None
        feedback_text = ""
        
        if request.user.is_authenticated:
            try:
                quiz = None
                cv = None
                
                if quiz_id:
                    quiz = Quiz.objects.get(id=quiz_id, user=request.user)
                if cv_id:
                    cv = CV.objects.get(id=cv_id, user=request.user)
                
                # Create result with answers stored as JSON
                result_obj = Result.objects.create(
                    quiz=quiz,
                    user=request.user,
                    score=score,
                    answers=answers_list  # Django JSONField will handle this
                )
                logger.info(f"Created result with ID: {result_obj.id}")
                
                # Generate AI feedback
                wrong_answers = [ans for ans in answers_list if not ans.get('isCorrect')]
                feedback_text = generate_feedback_from_ai(wrong_answers, score)
                
                # Save feedback
                Feedback.objects.create(
                    user=request.user,
                    cv=cv,
                    result=result_obj,
                    content=feedback_text,
                    rating=5 if score >= 80 else 4 if score >= 70 else 3
                )
                logger.info(f"Created feedback for result {result_obj.id}")
                
            except Exception as e:
                logger.error(f"Error saving result: {e}", exc_info=True)

        return JsonResponse({
            "score": score,
            "result_id": result_obj.id if result_obj else None,
            "feedback": feedback_text,
            "correct": correct_count,
            "total": total_questions
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error submitting answers: {e}", exc_info=True)
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

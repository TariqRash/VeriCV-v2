# import json
# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# from .ai_logic import extract_text_from_pdf, generate_questions_from_cv, generate_feedback_from_ai


# @csrf_exempt
# def generate_questions_view(request):
#     """API endpoint to upload CV and generate interview questions."""
#     if request.method == "POST" and request.FILES.get("cv"):
#         pdf_file = request.FILES["cv"]
#         cv_text = extract_text_from_pdf(pdf_file)
#         questions = generate_questions_from_cv(cv_text)
#         return JsonResponse({"questions": questions}, status=200)
#     return JsonResponse({"error": "Please upload a valid PDF file."}, status=400)


# @csrf_exempt
# def submit_answers_view(request):
#     """API endpoint to submit answers and get AI feedback."""
#     if request.method == "POST":
#         try:
#             data = json.loads(request.body)
#             answers = data.get("answers", [])
#             percent = data.get("percent", 0)

#             wrong_answers = [a for a in answers if a["chosen"] != a["correct"]]
#             feedback = generate_feedback_from_ai(wrong_answers, percent)

#             return JsonResponse({"score": percent, "feedback": feedback}, status=200)
#         except Exception as e:
#             return JsonResponse({"error": str(e)}, status=500)

#     return JsonResponse({"error": "Invalid request method."}, status=400)

# backend/ai/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils.datastructures import MultiValueDictKeyError
from django.core.files.uploadedfile import UploadedFile
from cv.models import CV  # adjust if your model name/app differs
from .ai_logic import extract_text_from_pdf, generate_questions_from_cv  # keep your existing functions
import json

@csrf_exempt
def generate_questions_view(request):
    """
    POST:
      JSON:  { "cv_id": <int> }               -> uses a server-stored CV file
      OR multipart/form-data with file under one of:
              'cv' | 'file' | 'pdf' | 'cv_file' | 'resume' | 'document'
    RESP: { "questions": [ {question, options?, answer?}, ... ] }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    cv_file = None

    # Try JSON body with cv_id
    try:
        if request.content_type and "application/json" in request.content_type:
            body = request.body.decode("utf-8") or "{}"
            data = json.loads(body)
            cv_id = data.get("cv_id")
            if cv_id is not None:
                try:
                    obj = CV.objects.get(pk=cv_id)
                    cv_file = obj.file  # FileField
                except CV.DoesNotExist:
                    return JsonResponse({"error": "CV not found."}, status=404)
    except Exception:
        # Fall back to file upload
        pass

    # Try multipart with a file under common keys
    if cv_file is None:
        for key in ["cv", "file", "pdf", "cv_file", "resume", "document"]:
            if key in request.FILES:
                cv_file = request.FILES[key]
                break

        if not cv_file:
            return JsonResponse({"error": "Please upload a valid PDF file or provide cv_id."}, status=400)

    # Extract text & generate questions
    try:
        from ai.ai_logic import detect_cv_language

        text = extract_text_from_pdf(cv_file)

        # Detect language for quiz generation
        language = 'en'  # default
        if cv_file and hasattr(cv_file, 'instance'):
            # If we have a CV instance from database, use its detected language
            try:
                cv_obj = CV.objects.get(file=cv_file)
                language = cv_obj.detected_language
            except:
                language = detect_cv_language(text)
        else:
            language = detect_cv_language(text)

        questions = generate_questions_from_cv(text, language=language)

        # Normalize to list[dict]
        questions = _normalize_questions(questions)

        return JsonResponse({"questions": questions, "language": language}, status=200, safe=False)
    except Exception as e:
        return JsonResponse({"error": f"Failed to generate questions: {e}"}, status=500)


@csrf_exempt
def submit_answers_view(request):
    """
    POST /api/ai/submit/
    Body can be:
      { "answers": [ {"question": "...", "answer": "A"}, ... ] }
      or { "answers": { "<q1>": "A", "<q2>": "B", ... } }

    Responds with a simple score + normalized results so the Results page can render.
    (You can later replace this with real grading against correct keys.)
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        body = request.body.decode("utf-8") or "{}"
        data = json.loads(body)
        answers = data.get("answers")

        # Normalize answers to a list of {question, answer}
        if isinstance(answers, dict):
            answers_list = [{"question": q, "answer": a} for q, a in answers.items()]
        elif isinstance(answers, list):
            # ensure shape
            answers_list = []
            for item in answers:
                if isinstance(item, dict) and "question" in item and "answer" in item:
                    answers_list.append({"question": item["question"], "answer": item["answer"]})
        else:
            answers_list = []

        # Dummy scoring: give 75 if we received any answers, else 0
        score = 75 if answers_list else 0

        # Turn answers into "results" entries for UI (you can enrich later)
        results = [
            {
                "skill": _infer_skill_from_question(a["question"]),
                "score": 80,  # placeholder per item; replace with real grading later
                "category": "technical",
                "status": "good",
            }
            for a in answers_list
        ]

        return JsonResponse(
            {
                "score": score,
                "results": results,
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse({"error": f"Failed to submit answers: {e}"}, status=500)


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
        # sometimes model returns {"data":[...]}
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


def _infer_skill_from_question(q: str) -> str:
    """Very rough mapping to make Results UI look nice. Adjust as needed."""
    s = (q or "").lower()
    if "react" in s:
        return "React"
    if "python" in s:
        return "Python"
    if "sql" in s or "database" in s:
        return "SQL"
    if "project management" in s:
        return "Project Management"
    if "communication" in s:
        return "Communication"
    return "General"


# Voice Interview Endpoints
@csrf_exempt
def start_voice_interview(request):
    """
    POST /api/ai/interview/start/
    Body: { "cv_id": <int>, "result_id": <int> (optional) }
    Returns: { "questions": [...], "language": "en" }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        from ai.ai_logic import generate_interview_questions
        from quiz.models import VoiceInterview

        body = request.body.decode("utf-8") or "{}"
        data = json.loads(body)
        cv_id = data.get("cv_id")
        result_id = data.get("result_id")

        if not cv_id:
            return JsonResponse({"error": "cv_id is required"}, status=400)

        # Get CV
        try:
            cv_obj = CV.objects.get(pk=cv_id)
        except CV.DoesNotExist:
            return JsonResponse({"error": "CV not found"}, status=404)

        # Extract text and generate questions
        cv_text = extract_text_from_pdf(cv_obj.file)
        language = cv_obj.detected_language or 'en'

        questions = generate_interview_questions(cv_text, language=language)

        # Create interview record
        from django.contrib.auth.models import User
        from quiz.models import Result

        user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        result_obj = None

        if result_id:
            try:
                result_obj = Result.objects.get(pk=result_id)
                user = result_obj.user
            except Result.DoesNotExist:
                pass

        if user:
            interview = VoiceInterview.objects.create(
                user=user,
                result=result_obj,
                language=language,
                questions_asked=questions
            )

            return JsonResponse({
                "interview_id": interview.id,
                "questions": questions,
                "language": language,
                "duration": 180  # 3 minutes
            }, status=200)
        else:
            return JsonResponse({
                "questions": questions,
                "language": language,
                "duration": 180
            }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Failed to start interview: {e}"}, status=500)


@csrf_exempt
def submit_voice_interview(request):
    """
    POST /api/ai/interview/submit/
    Body: multipart/form-data with 'audio' file and 'interview_id'
    Returns: { "transcription": "...", "evaluation": {...} }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        from ai.ai_logic import transcribe_audio_whisper, evaluate_interview_response
        from quiz.models import VoiceInterview
        import tempfile
        import os
        from datetime import datetime

        interview_id = request.POST.get('interview_id')
        audio_file = request.FILES.get('audio')

        if not audio_file:
            return JsonResponse({"error": "Audio file is required"}, status=400)

        # Save audio temporarily for transcription
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_audio:
            for chunk in audio_file.chunks():
                tmp_audio.write(chunk)
            tmp_audio_path = tmp_audio.name

        try:
            # Transcribe audio
            transcription = transcribe_audio_whisper(tmp_audio_path)

            # Get interview record if available
            interview = None
            evaluation = None

            if interview_id:
                try:
                    interview = VoiceInterview.objects.get(pk=interview_id)

                    # Evaluate response
                    evaluation = evaluate_interview_response(
                        transcription,
                        interview.questions_asked,
                        interview.language
                    )

                    # Update interview record
                    interview.transcription = transcription
                    interview.completed_at = datetime.now()

                    if evaluation:
                        interview.soft_skills_score = evaluation['soft_skills_score']
                        interview.communication_score = evaluation['communication_score']
                        interview.confidence_score = evaluation['confidence_score']
                        interview.ai_feedback = evaluation['feedback']
                        interview.improvement_suggestions = evaluation['suggestions']

                    # Save audio file permanently
                    interview.audio_file.save(f"interview_{interview.id}.webm", audio_file)
                    interview.save()

                except VoiceInterview.DoesNotExist:
                    pass

            return JsonResponse({
                "transcription": transcription,
                "evaluation": evaluation,
                "status": "completed"
            }, status=200)

        finally:
            # Clean up temp file
            if os.path.exists(tmp_audio_path):
                os.remove(tmp_audio_path)

    except Exception as e:
        return JsonResponse({"error": f"Failed to process interview: {e}"}, status=500)


@csrf_exempt
def generate_pdf_report(request):
    """
    POST /api/ai/report/pdf/
    Body: { "cv_id": <int>, "result_id": <int>, "interview_id": <int> (optional) }
    Returns: PDF file
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        from ai.ai_logic import generate_assessment_pdf
        from quiz.models import Result, VoiceInterview
        from django.http import HttpResponse

        body = request.body.decode("utf-8") or "{}"
        data = json.loads(body)
        cv_id = data.get("cv_id")
        result_id = data.get("result_id")
        interview_id = data.get("interview_id")

        if not cv_id or not result_id:
            return JsonResponse({"error": "cv_id and result_id are required"}, status=400)

        # Get CV
        try:
            cv_obj = CV.objects.get(pk=cv_id)
        except CV.DoesNotExist:
            return JsonResponse({"error": "CV not found"}, status=404)

        # Get Result
        try:
            result = Result.objects.get(pk=result_id)
        except Result.DoesNotExist:
            return JsonResponse({"error": "Result not found"}, status=404)

        # Get Interview (if available)
        interview_data = None
        if interview_id:
            try:
                interview = VoiceInterview.objects.get(pk=interview_id)
                interview_data = {
                    'soft_skills_score': interview.soft_skills_score or 0,
                    'communication_score': interview.communication_score or 0,
                    'confidence_score': interview.confidence_score or 0,
                    'feedback': interview.ai_feedback or '',
                    'suggestions': interview.improvement_suggestions or ''
                }
            except VoiceInterview.DoesNotExist:
                pass

        # Prepare user data
        user_data = {
            'name': cv_obj.extracted_name or result.user.first_name or result.user.username,
            'phone': cv_obj.extracted_phone or '',
            'city': cv_obj.extracted_city or cv_obj.ip_detected_city or '',
            'job_titles': cv_obj.extracted_job_titles or []
        }

        # Generate PDF
        pdf_content = generate_assessment_pdf(user_data, result.score, interview_data)

        if pdf_content:
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="vericv_assessment_{result.user.username}.pdf"'
            return response
        else:
            return JsonResponse({"error": "Failed to generate PDF"}, status=500)

    except Exception as e:
        return JsonResponse({"error": f"Failed to generate report: {e}"}, status=500)

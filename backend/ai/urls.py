# backend/ai/urls.py
from django.urls import path
from .views import (
    generate_questions_view,
    submit_answers_view,
    start_voice_interview,
    submit_voice_interview,
    generate_pdf_report
)

urlpatterns = [
    path("generate/", generate_questions_view, name="ai-generate"),
    path("submit/", submit_answers_view, name="ai-submit"),
    path("interview/start/", start_voice_interview, name="interview-start"),
    path("interview/submit/", submit_voice_interview, name="interview-submit"),
    path("report/pdf/", generate_pdf_report, name="generate-pdf"),
]

import os
import json
import requests
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from pdf2image import convert_from_path
import pytesseract
import tempfile
import re
from langdetect import detect, DetectorFactory

# Ensure consistent language detection
DetectorFactory.seed = 0

# Load API key
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
print(" API Key Loaded:", GROQ_API_KEY)

#  Extract Text
def extract_text_from_pdf(file):
    """Extract text from a PDF file (supports OCR for scanned resumes)."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        for chunk in file.chunks():
            tmp_file.write(chunk)
        temp_path = tmp_file.name

    text = ""
    try:
        reader = PdfReader(temp_path)
        for page in reader.pages:
            text += page.extract_text() or ""

        if not text.strip():
            print(" No text detected — switching to OCR mode...")
            images = convert_from_path(temp_path)
            for img in images:
                text += pytesseract.image_to_string(img)

        print(" Extracted text preview:", text[:400])
        return text[:4000]
    finally:
        os.remove(temp_path)


# Detect Language from CV
def detect_cv_language(cv_text):
    """Detect the primary language of the CV (English or Arabic)."""
    try:
        # Clean text and detect language
        cleaned_text = cv_text.strip()[:1000]  # Use first 1000 chars for detection
        detected_lang = detect(cleaned_text)

        # Map to supported languages
        if detected_lang == 'ar':
            return 'ar'
        else:
            return 'en'  # Default to English
    except Exception as e:
        print(f"Language detection error: {e}")
        return 'en'  # Default to English on error


# Extract CV Information using AI
def extract_cv_information(cv_text):
    """Extract name, phone, city, and job titles from CV using Groq AI."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = f"""
You are an expert CV parser. Extract the following information from this CV:

CV Content:
---
{cv_text}
---

Extract and return ONLY a JSON object with these fields:
1. "name": Full name of the person
2. "phone": Phone number (with country code if available)
3. "city": City of residence
4. "job_titles": Array of top 3 most relevant job titles this person would be suitable for (based on their experience and skills)

Return ONLY pure JSON in this exact format:
{{
  "name": "John Doe",
  "phone": "+1234567890",
  "city": "New York",
  "job_titles": ["Software Engineer", "Backend Developer", "Full Stack Developer"]
}}

Do NOT include any markdown, explanations, or extra text. Just the JSON object.
"""

    data = {
        "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,  # Lower temperature for more precise extraction
        "max_tokens": 500,
        "top_p": 0.9
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)

        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]
            print(" Raw extraction output:", content[:300])

            # Clean and parse JSON
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                content = match.group(0).strip()

            try:
                extracted_data = json.loads(content)
                return {
                    'name': extracted_data.get('name', ''),
                    'phone': extracted_data.get('phone', ''),
                    'city': extracted_data.get('city', ''),
                    'job_titles': extracted_data.get('job_titles', [])[:3]  # Limit to 3 titles
                }
            except json.JSONDecodeError as e:
                print(f"JSON parsing failed: {e}")
                # Attempt basic regex extraction as fallback
                return extract_cv_info_fallback(cv_text)
        else:
            print(f" Groq API Error ({response.status_code}): {response.text}")
            return extract_cv_info_fallback(cv_text)
    except Exception as e:
        print(f"Error extracting CV information: {e}")
        return extract_cv_info_fallback(cv_text)


def extract_cv_info_fallback(cv_text):
    """Fallback extraction using regex patterns."""
    info = {
        'name': '',
        'phone': '',
        'city': '',
        'job_titles': []
    }

    # Extract phone number (various formats)
    phone_patterns = [
        r'\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
        r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, cv_text)
        if phone_match:
            info['phone'] = phone_match.group(0)
            break

    # Extract name (first line after common headers)
    name_match = re.search(r'^[\s\n]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', cv_text, re.MULTILINE)
    if name_match:
        info['name'] = name_match.group(1).strip()

    return info


# Detect City from IP Address
def detect_city_from_ip(ip_address):
    """Detect city from IP address using ipapi service."""
    try:
        # Using ipapi.co free service
        response = requests.get(f'https://ipapi.co/{ip_address}/json/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data.get('city', '')
        return ''
    except Exception as e:
        print(f"IP geolocation error: {e}")
        return ''


# Generate Questions (Multilingual)
def generate_questions_from_cv(cv_text, language='en'):
    """Send resume text to Groq API and generate professional questions in specified language."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    # Language-specific instructions
    if language == 'ar':
        lang_instruction = """
يجب أن تكون جميع الأسئلة والخيارات باللغة العربية.
استخدم اللغة العربية الفصحى المهنية.
"""
        example_format = """
[
  {{
    "question": "ما هو...؟",
    "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
    "answer": "الإجابة الصحيحة"
  }}
]
"""
    else:
        lang_instruction = "All questions and options must be in English."
        example_format = """
[
  {{
    "question": "Example question...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Correct answer"
  }}
]
"""

    prompt = f"""
You are a professional HR and technical interviewer.

Analyze the following resume content carefully:
---
{cv_text}
---
Identify all technical, behavioral, and soft skills mentioned.
Then generate 15 multiple-choice interview questions (MCQs) that evaluate
the candidate's ability to apply these skills in real job settings.

Rules:
- Include 5 easy, 5 intermediate, 5 advanced questions.
- Each question must have 4 options, 1 correct answer.
- Avoid referencing the resume directly.
- Keep it professional and realistic.
{lang_instruction}

Return ONLY pure JSON in this format:
{example_format}

Do NOT include markdown, code blocks, or extra text.
"""

    data = {
        "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.8,
        "max_tokens": 3500,  # Increased for Arabic (longer text)
        "top_p": 0.9
    }

    response = requests.post(url, headers=headers, json=data, timeout=45)

    if response.status_code == 200:
        content = response.json()["choices"][0]["message"]["content"]
        print(" Raw model output:", content[:500])

        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            content = match.group(0).strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            print("JSON parsing failed. Attempting cleanup...")
            cleaned = content.strip().replace("```json", "").replace("```", "")
            try:
                return json.loads(cleaned)
            except Exception:
                print("\n Invalid JSON after cleanup:\n", cleaned[:500])
                return []
    else:
        print(f" Groq API Error ({response.status_code}): {response.text}")
        return []


# Generate Feedback
def generate_feedback_from_ai(wrong_answers, percent):
    """Generate professional feedback based on user's wrong answers."""
    if not wrong_answers:
        return "Excellent work! You answered all questions correctly. "

    summary = f"Score: {percent:.1f}%\nIncorrect answers:\n"
    for w in wrong_answers:
        summary += f"- Question: {w['question']}\nYour answer: {w['chosen']}\nCorrect: {w['correct']}\n"

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}

    prompt = f"""
You are a career coach and HR expert.

The candidate scored {percent:.1f}% on a professional interview test.
Here are the incorrect questions:
{summary}

Write feedback that:
- Identifies improvement areas.
- Gives clear, practical advice.
- Encourages and motivates the candidate.
"""

    data = {
    "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.7,
    "max_tokens": 1000,
    "top_p": 0.9
}
    response = requests.post(url, headers=headers, json=data, timeout=30)
    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        return f" Error while generating feedback: {response.text}"


# Voice Interview Functions
def generate_interview_questions(cv_text, language='en'):
    """Generate interview questions for voice interview based on CV."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    if language == 'ar':
        lang_instruction = "أنشئ 5 أسئلة مقابلة باللغة العربية"
        format_example = '["السؤال 1", "السؤال 2", "السؤال 3", "السؤال 4", "السؤال 5"]'
    else:
        lang_instruction = "Create 5 interview questions in English"
        format_example = '["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]'

    prompt = f"""
Based on this CV, generate 5 open-ended interview questions to assess:
1. Technical knowledge
2. Problem-solving abilities
3. Communication skills
4. Past experience
5. Career goals

CV Content:
---
{cv_text}
---

{lang_instruction}

Return ONLY a JSON array of strings:
{format_example}

No markdown, no explanations.
"""

    data = {
        "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 1000,
        "top_p": 0.9
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]

            # Extract JSON array
            match = re.search(r"\[.*\]", content, re.DOTALL)
            if match:
                content = match.group(0).strip()

            return json.loads(content)
        else:
            print(f"Error generating questions: {response.text}")
            return []
    except Exception as e:
        print(f"Error: {e}")
        return []


def transcribe_audio_whisper(audio_file_path):
    """Transcribe audio file using OpenAI Whisper API."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        with open(audio_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )

        return transcript
    except Exception as e:
        print(f"Whisper transcription error: {e}")
        return ""


def evaluate_interview_response(transcription, questions, language='en'):
    """Evaluate voice interview responses and provide scores."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    if language == 'ar':
        eval_prompt = f"""
قيّم هذه المقابلة الصوتية:

الأسئلة المطروحة:
{json.dumps(questions, ensure_ascii=False)}

إجابات المرشح (النص المنسوخ):
---
{transcription}
---

قدم تقييماً شاملاً يتضمن:
1. درجة المهارات الناعمة (0-100)
2. درجة التواصل (0-100)
3. درجة الثقة (0-100)
4. ملاحظات عامة
5. اقتراحات للتحسين

أرجع JSON فقط:
{{
  "soft_skills_score": 85,
  "communication_score": 90,
  "confidence_score": 80,
  "feedback": "تقييم عام...",
  "suggestions": "اقتراحات..."
}}
"""
    else:
        eval_prompt = f"""
Evaluate this voice interview:

Questions asked:
{json.dumps(questions)}

Candidate's responses (transcribed):
---
{transcription}
---

Provide comprehensive evaluation with:
1. Soft skills score (0-100)
2. Communication score (0-100)
3. Confidence score (0-100)
4. General feedback
5. Improvement suggestions

Return ONLY JSON:
{{
  "soft_skills_score": 85,
  "communication_score": 90,
  "confidence_score": 80,
  "feedback": "General assessment...",
  "suggestions": "Suggestions..."
}}
"""

    data = {
        "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "messages": [{"role": "user", "content": eval_prompt}],
        "temperature": 0.5,
        "max_tokens": 1500,
        "top_p": 0.9
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=45)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]

            # Extract JSON
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                content = match.group(0).strip()

            evaluation = json.loads(content)
            return {
                'soft_skills_score': evaluation.get('soft_skills_score', 0),
                'communication_score': evaluation.get('communication_score', 0),
                'confidence_score': evaluation.get('confidence_score', 0),
                'feedback': evaluation.get('feedback', ''),
                'suggestions': evaluation.get('suggestions', '')
            }
        else:
            print(f"Error evaluating interview: {response.text}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None


# PDF Report Generation
def generate_assessment_pdf(user_data, quiz_score, interview_data=None):
    """Generate comprehensive PDF assessment report."""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
        from reportlab.pdfgen import canvas
        from io import BytesIO
        from datetime import datetime

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=18)

        # Container for the 'Flowable' objects
        elements = []

        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=30,
            alignment=TA_CENTER
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12
        )

        # Add title
        elements.append(Paragraph("VeriCV Assessment Report", title_style))
        elements.append(Spacer(1, 12))

        # Add date
        date_text = f"Generated on: {datetime.now().strftime('%B %d, %Y')}"
        elements.append(Paragraph(date_text, styles['Normal']))
        elements.append(Spacer(1, 20))

        # Candidate Information
        elements.append(Paragraph("Candidate Information", heading_style))

        candidate_data = [
            ['Name:', user_data.get('name', 'N/A')],
            ['Phone:', user_data.get('phone', 'N/A')],
            ['City:', user_data.get('city', 'N/A')],
        ]

        candidate_table = Table(candidate_data, colWidths=[2*inch, 4*inch])
        candidate_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(candidate_table)
        elements.append(Spacer(1, 20))

        # Quiz Results
        elements.append(Paragraph("Technical Assessment Results", heading_style))
        elements.append(Paragraph(f"Overall Score: {quiz_score}%", styles['Normal']))
        elements.append(Spacer(1, 20))

        # Interview Results (if available)
        if interview_data:
            elements.append(Paragraph("Voice Interview Evaluation", heading_style))

            interview_scores = [
                ['Soft Skills:', f"{interview_data.get('soft_skills_score', 0)}/100"],
                ['Communication:', f"{interview_data.get('communication_score', 0)}/100"],
                ['Confidence:', f"{interview_data.get('confidence_score', 0)}/100"],
            ]

            interview_table = Table(interview_scores, colWidths=[2*inch, 2*inch])
            interview_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey)
            ]))
            elements.append(interview_table)
            elements.append(Spacer(1, 20))

            # Feedback
            if interview_data.get('feedback'):
                elements.append(Paragraph("AI Feedback", heading_style))
                elements.append(Paragraph(interview_data['feedback'], styles['Normal']))
                elements.append(Spacer(1, 12))

            # Suggestions
            if interview_data.get('suggestions'):
                elements.append(Paragraph("Improvement Suggestions", heading_style))
                elements.append(Paragraph(interview_data['suggestions'], styles['Normal']))
                elements.append(Spacer(1, 12))

        # Recommended Job Titles
        if user_data.get('job_titles'):
            elements.append(Paragraph("Recommended Job Titles", heading_style))
            for title in user_data.get('job_titles', []):
                elements.append(Paragraph(f"• {title}", styles['Normal']))
            elements.append(Spacer(1, 12))

        # Build PDF
        doc.build(elements)

        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()

        return pdf_content

    except Exception as e:
        print(f"Error generating PDF: {e}")
        return None

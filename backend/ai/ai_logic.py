import os
import json
import requests
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from pdf2image import convert_from_path
import pytesseract
import tempfile
import re

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


# Generate Questions
def generate_questions_from_cv(cv_text):
    """Send resume text to Groq API and generate professional questions."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

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
Return ONLY pure JSON:
[
  {{
    "question": "Example question...",
    "options": ["A", "B", "C", "D"],
    "answer": "Correct answer"
  }}
]
Do NOT include markdown or extra text.
"""

    data = {
    "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.8,
    "max_tokens": 2500,
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

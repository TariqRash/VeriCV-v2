# VeriCV 2.0 Implementation Guide

## Overview

This implementation adds comprehensive multilingual support, smart CV information extraction, AI voice interviews, job matching, and PDF reports to VeriCV.

## Features Implemented

### 1. Multilingual Support (Arabic & English)
- ✅ React i18next integration
- ✅ Complete translation files for Arabic and English
- ✅ RTL layout support for Arabic
- ✅ Language switcher in navigation
- ✅ Language detection from CV content
- ✅ Quiz generation in CV's detected language

### 2. Smart CV Information Extraction
- ✅ Automatic extraction of name, phone, city from CV
- ✅ Job titles extraction (top 3 recommendations)
- ✅ Language detection (Arabic/English)
- ✅ IP-based city detection as fallback
- ✅ Verification popup to confirm extracted information

### 3. AI Voice Interview (3 minutes)
- ✅ Voice recording with RecordRTC
- ✅ 5 interview questions generated from CV
- ✅ Audio transcription with OpenAI Whisper
- ✅ AI evaluation of soft skills, communication, confidence
- ✅ Feedback generation (hidden scores from user)
- ✅ Interview transcript and audio storage

### 4. LinkedIn Job Search Integration
- ✅ 3 job title buttons extracted from CV
- ✅ Direct LinkedIn job search with city
- ✅ Beautiful button layout with external link icons

### 5. PDF Report Generation
- ✅ Professional PDF reports with ReportLab
- ✅ Includes candidate info, quiz scores, interview results
- ✅ Recommendations and improvement suggestions
- ✅ Downloadable from results page

## Installation Steps

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd /home/VeriCV/backend
   pip install -r requirements.txt
   ```

2. **Create database migrations:**
   ```bash
   python manage.py makemigrations cv quiz
   python manage.py migrate
   ```

3. **Add environment variables to `.env`:**
   ```bash
   # Existing
   GROQ_API_KEY=your_groq_api_key

   # New (Required for voice interview)
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Restart Django server:**
   ```bash
   systemctl restart vericv
   # or
   gunicorn core.wsgi:application --bind 0.0.0.0:8000
   ```

### Frontend Setup

1. **Install Node.js dependencies:**
   ```bash
   cd /home/VeriCV/frontend
   npm install
   ```

   New packages installed:
   - `react-i18next` - Internationalization
   - `i18next` - i18n core
   - `i18next-browser-languagedetector` - Auto language detection
   - `i18next-http-backend` - Load translations
   - `recordrtc` - Audio recording

2. **Build frontend:**
   ```bash
   npm run build
   ```

3. **Deploy built files:**
   ```bash
   # Copy dist/ contents to Nginx serving directory
   cp -r dist/* /var/www/vericv/
   ```

## Database Schema Changes

### CV Model (Extended)
- `extracted_name` - CharField (255)
- `extracted_phone` - CharField (50)
- `extracted_city` - CharField (100)
- `detected_language` - CharField (10) choices: en/ar
- `extracted_job_titles` - JSONField (array of strings)
- `info_confirmed` - BooleanField
- `ip_detected_city` - CharField (100)

### VoiceInterview Model (New)
- `user` - ForeignKey to User
- `result` - OneToOneField to Result
- `audio_file` - FileField
- `transcription` - TextField
- `duration` - IntegerField (default 180 seconds)
- `language` - CharField (en/ar)
- `soft_skills_score` - FloatField
- `communication_score` - FloatField
- `confidence_score` - FloatField
- `ai_feedback` - TextField
- `improvement_suggestions` - TextField
- `questions_asked` - JSONField
- `started_at` - DateTimeField
- `completed_at` - DateTimeField

### Result Model (Extended)
- `answers` - JSONField
- `ai_recommendations` - TextField

## API Endpoints Added

### CV Endpoints
- `POST /api/cv/{id}/confirm_info/` - Confirm extracted CV information

### AI/Interview Endpoints
- `POST /api/ai/interview/start/` - Start voice interview
  - Request: `{ "cv_id": int, "result_id": int (optional) }`
  - Response: `{ "interview_id": int, "questions": [...], "language": "en", "duration": 180 }`

- `POST /api/ai/interview/submit/` - Submit voice interview
  - Request: multipart/form-data with `audio` file and `interview_id`
  - Response: `{ "transcription": "...", "evaluation": {...}, "status": "completed" }`

- `POST /api/ai/report/pdf/` - Generate PDF report
  - Request: `{ "cv_id": int, "result_id": int, "interview_id": int (optional) }`
  - Response: PDF file download

### Updated Endpoints
- `POST /api/ai/generate/` - Now returns `language` field
- CV upload now auto-extracts information

## Frontend Components Created

### New Components
1. **`CVVerificationPopup.tsx`**
   - Shows extracted CV information
   - Allows user to confirm or correct
   - Smart popup after CV upload

2. **`VoiceInterview.tsx`**
   - 3-minute timer
   - Audio recording with RecordRTC
   - Question navigation
   - Progress bar
   - Submit to backend

3. **`LinkedInJobSearch.tsx`**
   - 3 job title buttons
   - Direct LinkedIn search
   - City-based job filtering

4. **`LanguageSwitcher.tsx`**
   - Globe icon dropdown
   - Switch between English/Arabic
   - Updates HTML dir and lang attributes

### i18n Setup
- **Config**: `src/i18n/config.ts`
- **English**: `src/i18n/locales/en.json`
- **Arabic**: `src/i18n/locales/ar.json`

## Usage Flow

### For Users

1. **Upload CV**
   - User uploads PDF
   - System extracts: name, phone, city, job titles, language
   - Verification popup appears: "Is your name X and phone Y?"
   - User confirms or corrects information

2. **Take Quiz**
   - Quiz language matches CV language (Arabic or English)
   - 15 questions personalized to CV skills
   - 10-minute timer
   - Submit answers

3. **Voice Interview (Optional)**
   - After quiz, prompt: "Ready for AI interview?"
   - 3-minute interview with 5 questions
   - Record audio responses
   - AI evaluates: soft skills, communication, confidence
   - Transcription saved

4. **View Results**
   - Quiz score displayed
   - Interview evaluation (if completed)
   - AI recommendations
   - 3 LinkedIn job search buttons (job title + city)
   - Download PDF report button

5. **Find Jobs**
   - Click any of the 3 job title buttons
   - Opens LinkedIn with: job title + city pre-filled
   - User can apply directly

## Configuration

### Language Detection
The system automatically detects the CV language using `langdetect` library:
- Analyzes first 1000 characters of CV text
- Maps to supported languages (en, ar)
- Falls back to English if detection fails

### RTL Support
Arabic language automatically:
- Sets `dir="rtl"` on document
- Applies RTL-specific CSS styles
- Mirrors layout components

### City Detection
Two-step city detection:
1. Extract from CV text (primary)
2. Detect from user IP (fallback)
3. If both match → high confidence
4. If mismatch → ask user to confirm

## Testing Checklist

### Backend
- [ ] CV upload extracts information correctly
- [ ] Language detection works for Arabic and English CVs
- [ ] Quiz generation returns questions in correct language
- [ ] Voice interview starts and generates questions
- [ ] Audio transcription works with Whisper API
- [ ] Interview evaluation returns scores
- [ ] PDF generation includes all data
- [ ] LinkedIn URL generation is correct

### Frontend
- [ ] Language switcher changes UI language
- [ ] RTL layout works for Arabic
- [ ] Verification popup shows after CV upload
- [ ] User can edit extracted information
- [ ] Quiz displays in correct language
- [ ] Voice interview records audio
- [ ] Timer counts down correctly
- [ ] Interview submits successfully
- [ ] Results page shows all data
- [ ] LinkedIn buttons open correct URLs
- [ ] PDF downloads successfully

## Troubleshooting

### Issue: Migrations fail
**Solution**: Run migrations in order:
```bash
python manage.py makemigrations cv
python manage.py migrate cv
python manage.py makemigrations quiz
python manage.py migrate quiz
```

### Issue: Language detection returns wrong language
**Solution**: Check CV text extraction quality. OCR may be needed for scanned PDFs.

### Issue: Voice interview doesn't start
**Solution**:
1. Check OPENAI_API_KEY is set
2. Verify microphone permissions in browser
3. Check audio file format compatibility

### Issue: Arabic text appears broken
**Solution**:
1. Check font supports Arabic characters
2. Verify `dir="rtl"` is set on HTML element
3. Clear browser cache

### Issue: LinkedIn buttons don't work
**Solution**:
1. Check job titles were extracted from CV
2. Verify city is detected
3. Check URL encoding is correct

## Performance Optimization

### Caching
Consider caching:
- Language detection results
- CV extraction results
- Interview questions

### Async Processing
For production:
- Move CV processing to Celery task
- Process voice transcription asynchronously
- Generate PDFs in background

### Rate Limiting
Implement rate limiting for:
- CV uploads (e.g., 5 per hour per user)
- Voice interviews (e.g., 1 per quiz result)
- PDF generation (e.g., 10 per day per user)

## Security Considerations

1. **File Upload**: Already validated (PDF only)
2. **Audio Files**: Validate WebM format, limit size
3. **Personal Data**: Extracted info should be encrypted at rest
4. **API Keys**: Never expose GROQ_API_KEY or OPENAI_API_KEY to frontend
5. **CORS**: Ensure production domain is in ALLOWED_HOSTS and CORS settings

## Next Steps

1. **Deploy to Production**:
   ```bash
   # On server (104.248.248.95)
   cd /home/VeriCV
   git pull origin dev
   cd backend && pip install -r requirements.txt
   python manage.py migrate
   systemctl restart vericv

   cd ../frontend
   npm install
   npm run build
   cp -r dist/* /var/www/vericv/
   systemctl restart nginx
   ```

2. **Test All Features**:
   - Upload English and Arabic CVs
   - Verify extraction accuracy
   - Test voice interview end-to-end
   - Try LinkedIn job search
   - Download PDF reports

3. **Monitor**:
   - Check Django logs for errors
   - Monitor API usage (Groq, OpenAI)
   - Track user completion rates

## Support

For issues or questions:
- Backend: Check `/home/VeriCV/backend/logs/`
- Frontend: Check browser console
- Database: `python manage.py dbshell`

## Credits

Built with:
- Django + Django REST Framework
- React + TypeScript
- Groq AI (Llama 4 Maverick)
- OpenAI Whisper
- ReportLab
- RecordRTC
- react-i18next

---

**Version**: 2.0
**Last Updated**: 2025-10-29

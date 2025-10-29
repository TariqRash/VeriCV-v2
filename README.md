# VeriCV - AI-Powered Resume Analyzer & Skill Quiz

VeriCV is an AI-powered platform that analyzes resumes and generates personalized skill quizzes to help tech professionals be job-ready.

## Live Demo

🌐 **Website:** https://vericv.app  

## Features

- 📄 **CV Upload & Analysis** - Upload your resume for AI-powered feedback
- 🤖 **AI-Powered Feedback** - Get intelligent suggestions using Groq AI
- 📝 **Personalized Skill Quiz** - Generated based on your CV analysis
- 📊 **Results Dashboard** - View your scores and improvement areas
- 🔒 **User Authentication** - Secure JWT-based authentication

## Tech Stack

### Backend
- Django 5.0
- Django REST Framework
- PostgreSQL
- JWT Authentication
- Groq AI API
- Tesseract OCR

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Axios

### Infrastructure
- Nginx (reverse proxy)
- Gunicorn (WSGI server)
- Let's Encrypt (SSL)
- Ubuntu 22.04 LTS

## Project Structure

## 📁 Project Structure

\`\`\`text
VeriCV-v2/
├── backend/              # Django backend application
│   ├── ai/               # Core AI logic for CV analysis
│   ├── cv/               # CV creation and management modules
│   ├── quiz/             # Automated quiz/question generation
│   ├── feedback/         # Feedback collection and storage
│   ├── users/            # Authentication and user management
│   └── core/             # Global settings and Django configuration
│
├── frontend/             # React frontend application
│   └── src/
│       ├── pages/        # Application pages and routes
│       ├── components/   # Reusable UI components
│       └── api/          # API client and service handlers
│
└── deploy.sh             # Deployment automation script


## Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL

### Backend Setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

### Frontend Setup
cd frontend
npm install
npm run dev

## Deployment

See DEPLOYMENT.md for detailed deployment instructions.

## Environment Variables

Create .env files (not tracked in git):
- backend/.env - Backend configuration
- frontend/.env - Frontend API URLs

See DEPLOYMENT.md for examples.

## Team

- **Backend & Database:** Django REST API, PostgreSQL, migrations
- **AI & Integration:** Groq AI, OCR, quiz generation
- **Frontend:** React, TypeScript, UI/UX

See backend/TEAM_GUIDE.md for role details.

## Contributing

1. Create a feature branch: git checkout -b feature/your-feature
2. Make changes and test
3. Commit: git commit -m "feat: description"
4. Push: git push origin feature/your-feature
5. Create Pull Request

## License

Copyright © 2025 VeriCV Team

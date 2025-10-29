## Team Roles & Responsibilities

### 1. Backend & Database Engineer
**Focus:** Django backend logic + data architecture  
**Main Tasks:**
- Set up Django project, apps, and environment  
- Implement RESTful APIs (`users`, `cv`, `feedback`, `quiz`)  
- Manage authentication (JWT)  
- Design and maintain database schema  
- Write migrations, connect PostgreSQL later  
- Integrate file uploads & permissions  
- Build and maintain the **`quiz` app** (models: `Quiz`, `Question`, `Result`)  
- Create endpoints for quiz creation, retrieval, and result submission  
- Ensure smooth integration between AI-generated quiz content and database  
- Expose clean endpoints for frontend  

**Deliverables:**
- Verified `/api/*` endpoints (tested in Postman)  
- Clean ERD and migration files  
- Ready connection to cloud DB (Supabase / Render)  
- Functional quiz endpoints connected to AI pipeline  

---

### 2. AI & Integration Engineer
**Focus:** Build and integrate the AI feedback and quiz generation layers  
**Main Tasks:**
- Extract CV text (PDF/DOCX parsing)  
- Connect backend to AI service (OpenAI / FastAPI / n8n)  
- Implement feedback generation pipeline  
- Prepare structured skill extraction (JSON output)  
- Generate skill-based **quiz questions** from analyzed CVs  
- Format and send quiz data to backend (JSON structure for storage)  
- Automate result evaluation and scoring logic  
- Optimize prompts and model parameters  

**Deliverables:**
- Working AI module (`ai_services.py` or separate service)  
- Endpoint that returns AI-generated feedback and quiz questions  
- Documentation of AI process (prompts, flow, and data structure)  

---

### 3. Frontend Engineer
**Focus:** React-based user interface  
**Main Tasks:**
- Create `vericv_frontend` using Vite + React  
- Implement pages: Login, Dashboard, UploadCV, Feedback, **Quiz**  
- Handle authentication (token storage, refresh, logout)  
- Integrate API endpoints with Axios  
- Display AI feedback, quiz questions, and progress  
- Show quiz results and improvement suggestions  
- Maintain responsive, minimal design  

**Deliverables:**
- Functional UI with working upload + feedback + quiz flow  
- Connection to backend APIs  
- Deployed frontend (Netlify / Vercel)  

---

## Branching Strategy (GitHub Flow)

| Branch | Purpose |
|--------|----------|
| `main` | Stable production-ready code |
| `dev` | Active integration branch |
| `feature/backend-api` | Backend work |
| `feature/ai-feedback` | AI & Quiz service work |
| `feature/frontend-ui` | Frontend work |

**Workflow**
1. Each developer works in their own `feature/*` branch.  
2. Push and create a **pull request** into `dev`.  
3. Team reviews and merges.  
4. Merge `dev` → `main` when tested & stable.  

---

## Tech Stack

| Area | Tools |
|------|-------|
| Backend | Django + Django REST Framework + SimpleJWT |
| Database | SQLite (dev), PostgreSQL (prod) |
| Frontend | React + Vite + Axios |
| AI Layer | OpenAI / FastAPI / n8n workflow |
| Deployment | Render (backend), Netlify/Vercel (frontend) |
| Version Control | GitHub |

---

## Workflow & Communication

- **Daily Sync (10 minutes):**  
  Quick stand-up: what’s done, blockers, next step.  
- **Weekly Review:**  
  Integration test + progress review.  
- **Board (Trello / GitHub Projects):**  
  Columns: 📝 *To Do* | 🔧 *In Progress* | 🧪 *Testing* | ✅ *Done*

---

## Testing Protocol

| Area | Test Tool | Goal |
|------|------------|------|
| Backend | Postman | Verify all API endpoints |
| Frontend | Browser + Axios | Check data rendering & auth |
| AI | Local script / FastAPI | Validate model responses |
| DB | Django Shell / pgAdmin | Ensure migrations & data integrity |
| Quiz | Postman + Browser | Validate question generation & scoring |

---

## Stage Timeline (2 Weeks)

| Week | Stage | Focus |
|------|--------|-------|
| Week 1 | Stage 1–3 | Backend setup + API + React integration |
| Week 2 | Stage 4–6 | AI integration + **quiz generation** + polish + deployment |

---

## Definition of Done (MVP)

| Feature | Criteria |
|----------|-----------|
| Auth | Users can log in & get tokens |
| CV Upload | Users can upload PDF/DOCX |
| AI Feedback | System auto-generates feedback |
| Quiz | Personalized quiz generated from CV analysis + user score saved |
| Feedback Display | Users can view feedback list |
| Deployment | Working online version with sample user |

---

**Created by:** VeriCV Team  
**Version:** 1.1 — 12 October 2025

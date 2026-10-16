# Hacktober 2026 — Cybersecurity Quiz Challenge
### Guru Nanak Dev Engineering College, Bidar, Karnataka, India
**Department of CSE – IoT and Cybersecurity including Blockchain Technology**  
*Organized by Cyber Samurai Association*

---

## 🛡️ Project Overview
**Hacktober 2026 — CyberQuiz** is a production-ready, proctored college quiz competition platform featuring:
- **Full Tournament Engine:** 3 configurable rounds (Awareness, Tech Challenge, Masters Finale).
- **Uncapped Participant Capacity:** Designed for horizontal scaling, database indexing, and bulk CSV enrollment without hard-coded participant limits.
- **Strict Proctoring Mode:** Fullscreen requirement, document visibility loss/tab switch detection, and server-side termination.
- **Server-Controlled Timers & Autosave:** Real-time answer synchronization with zero loss on reload or network interruption.
- **Subtle Hidden Admin Portal:** Accessible via a minimal shield icon in the footer with bootstrap credentials (`Quiz@Cyber26` / `CyberHack@2026`).
- **Premium White Spatial UI:** Neomorphism, Glassmorphism, and spatial depth styling adhering to high accessibility and clean aesthetics.

---

## 🚀 Quick Start Guide (Windows)

### Prerequisites
- **Python 3.10+** (tested with Python 3.14)
- **Node.js 18+** & **npm**

### Step 1: Start the Backend Server (FastAPI)
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API is live at: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/api/docs`
- Health check: `http://localhost:8000/api/health`

### Step 2: Start the Frontend Application (Vite + React)
In a separate terminal:
```powershell
cd frontend
npm run dev
```
- Website is live at: `http://localhost:5173`

---

## 🔑 Administrative Access
- **Trigger:** Scroll to the bottom of any public page and click the small shield icon (**🛡️**) in the footer.
- **Default Bootstrap Admin ID:** `Quiz@Cyber26`
- **Default Bootstrap Password:** `CyberHack@2026`
*(On first login, the administrator is prompted to update their password before proceeding)*.

### Admin Capabilities
- **Overview Dashboard:** Live counters for active attempts, submissions, and violations.
- **Round Control:** Open, Pause, Close rounds, and Publish official leaderboards.
- **Participant Manager:** Search by USN, toggle student eligibility, and bulk import student rosters via CSV.
- **Question Bank:** Browse, add, and manage 50 questions with point values and explanations across rounds.
- **Violations & Appeals:** Audit proctoring events and respond directly to participant technical disputes.
- **Announcements:** Broadcast live pinned notices directly onto the landing page.

---

## 🧪 Testing & Verification

### Running Automated Unit & Integration Tests
```powershell
cd backend
python -m pytest tests/test_cyberquiz.py -v
```
Verified workflows:
1. `test_health_and_public_event`: Event branding and health checks.
2. `test_admin_bootstrap_login`: Bootstrap authentication, password policies, and admin routes.
3. `test_participant_workflow`: Case-insensitive USN entry, mandatory rules consent recording, and round access.
4. `test_quiz_attempt_autosave_and_violation`: Attempt start, question randomization, answer autosave, and strict proctoring violation termination.

### Running Concurrency Load Tests
```powershell
cd backend
python tests/load_test.py --concurrency 25
```
Simulates concurrent participant logins, rules consent, quiz launches, and live autosave requests.

---

## 📁 Repository Structure
```
CyberQuiz/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Public, Participant, Quiz, and Admin routers
│   │   ├── core/            # Config, Database, Security, Seeder, and 50-Question Bank
│   │   ├── models/          # SQLAlchemy async database models
│   │   ├── schemas/         # Pydantic validation schemas
│   │   └── static/          # College & event logo assets
│   ├── tests/               # Pytest suite & load testing script
│   ├── cyberquiz.db         # SQLite database (development)
│   └── .env                 # Environment variables & admin secrets
├── frontend/
│   ├── src/
│   │   ├── assets/          # Logo and vector assets
│   │   ├── components/      # Navbar, Footer, Modals, Timers, Proctoring notices
│   │   ├── pages/           # Landing, Rules, Entry, Dashboard, QuizArena, Leaderboard, Admin
│   │   ├── services/        # Axios API service client with auth interceptors
│   │   ├── types/           # TypeScript interfaces matching backend models
│   │   ├── App.tsx          # Main React router
│   │   ├── index.css        # Premium White Spatial UI Design System
│   │   └── main.tsx         # React DOM entry point
│   └── package.json
└── README.md
```

---

## 🔒 Security Architecture
- **JWT Authentication:** Strict separation between participant sessions and administrative access tokens.
- **Answer Concealment:** Correct answers and explanations are never sent to participant browsers during active rounds.
- **Server-Side Scoring:** Answers are evaluated exclusively on the server upon attempt completion.
- **Audit Logging:** Every administrative action (login, round status change, eligibility toggle) is recorded with timestamps and client IP addresses.

---

## 🌐 Production Deployment Guide
1. **Database:** Replace `sqlite+aiosqlite` with PostgreSQL:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/cyberquiz
   ```
2. **Reverse Proxy:** Configure Nginx with HTTPS (Let's Encrypt SSL) to serve frontend static builds from `frontend/dist` and proxy `/api` requests to Uvicorn.
3. **Environment:** Set `APP_ENV=production` in `.env` to disable Swagger docs and enforce strict HTTPS cookies.

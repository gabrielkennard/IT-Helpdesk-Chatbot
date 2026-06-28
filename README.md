# IT Helpdesk Chatbot — Agentic RAG Pipeline

> A full-stack AI-powered IT helpdesk system built with **FastAPI**, **React**, **Groq (Llama 3.3 70B)**, and **SQLite**. Features a 7-node agentic RAG workflow engine, role-based authentication, self-learning knowledge base, and a staff case management dashboard.

---

## Features

| Feature | Details |
|---|---|
| 🤖 Agentic RAG Pipeline | 7-node workflow with shared state and conditional routing |
| 🔍 Knowledge Base Search | Fuzzy matching + keyword scoring against `om_faq.txt` (30 Q&A entries) |
| 🧠 Self-Learning | AutoLearnNode writes resolved staff answers back to the KB |
| 🎫 Case Management | Escalated questions are logged, resolved, or deleted by staff |
| 🔐 Auth | Role-based login (user / staff / admin) with PBKDF2 hashed passwords |
| 📊 Confidence Scoring | Every answer is scored High / Medium / Low with visible badge |
| 💬 Chat UI | Full-page React chat with suggested questions and node trace viewer |
| 🛠️ Staff Dashboard | Separate view for staff to manage and resolve escalated cases |

---

## Workflow Architecture

```
User Question
      │
      ▼
┌─────────────────────────┐
│ Node 1: QueryRewriter   │  Groq API call #1
│ Rewrites question +     │  Extracts keywords
│ extracts keywords       │  Falls back if API fails
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Node 2: KBSearchNode    │  Reads om_faq.txt directly
│ Fuzzy match + keyword   │  SequenceMatcher + keyword bonus
│ scoring                 │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Node 3: ConfidenceGate  │  ≥ 0.75 → High
│ Routes based on score   │  ≥ 0.60 → Medium  → generate
└──────────┬──────────────┘  < 0.60 → Low     → escalate
           │
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────────┐
│ Node 4a │  │ Node 4b      │  Groq API call #2
│ Escalate│  │ Generate     │  Different prompt from Node 1
│ fallback│  │ polished     │
│ message │  │ answer       │
└────┬────┘  └──────┬───────┘
     │              │
     ▼              ▼
┌─────────┐  ┌──────────────┐
│ Node 5a │  │ Node 5b      │
│ LogCase │  │ AutoLearn    │  Triggered when staff
│ SQLite  │  │ → om_faq.txt │  resolves a case
└─────────┘  └──────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Groq — Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| Backend | Python 3.14, FastAPI, SQLAlchemy, SQLite |
| Frontend | React 18, no UI library (pure inline styles) |
| Auth | PBKDF2-HMAC-SHA256 password hashing (stdlib only) |
| KB Search | Python `difflib.SequenceMatcher` + keyword overlap |

---

## Project Structure

```
IT-Helpdesk-Chatbot/
├── Backend/
│   ├── main.py                        # FastAPI entry point + startup
│   ├── requirements.txt
│   ├── .env.example                   # Copy to .env and fill in keys
│   ├── knowledge_base/
│   │   └── om_faq.txt                 # 30 Q&A entries (auto-updated by AutoLearnNode)
│   └── app/
│       ├── database/
│       │   └── db.py                  # SQLite engine + session
│       ├── models/
│       │   ├── case.py                # Escalated case model
│       │   └── user.py                # User model with hashed password
│       └── routes/
│           ├── workflow.py            # 7-node agentic RAG engine ← core file
│           ├── chat.py                # POST /api/chat
│           ├── cases.py               # Case CRUD endpoints
│           └── auth.py                # Login, register, seed default users
│
└── Frontend/
    └── src/
        ├── App.js                     # Role-based routing (login → chat or dashboard)
        ├── index.js
        ├── index.css
        └── pages/
            ├── Login.js               # Hits real backend auth
            ├── Register.js            # Hidden page — not linked from login
            ├── Chat.js                # Full-page chat UI with confidence badges
            └── Cases.js               # Staff dashboard with resolve + delete
```

---

## Setup

### Prerequisites
- Python 3.14
- Node.js 18+
- Free Groq API key: https://console.groq.com
- (Optional) Free Gemini API key: https://aistudio.google.com/apikey

### Backend

```bash
cd Backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the server
python -m uvicorn main:app --reload
```

On first run the server will:
- Create `helpdesk.db` with all tables
- Seed 3 default accounts (see below)
- Print `✅ Database initialised + default users seeded`

API docs available at: **http://localhost:8000/docs**

### Frontend

```bash
cd Frontend
npm install
npm install react-router-dom
npm start
```

App opens at: **http://localhost:3000**

---

## Default Accounts

| Username | Password | Role | Access |
|---|---|---|---|
| `user` | `user123` | user | Chat only |
| `staff` | `staff123` | staff | Staff dashboard + chat |
| `admin` | `admin123` | admin | Staff dashboard + chat |

> Passwords are stored as PBKDF2-HMAC-SHA256 hashes — never in plain text.

---

## Creating New Accounts

The register page is intentionally **not linked from the login page**. To access it, navigate directly to the app and set the page state to `register` — or share the register route with trusted users.

- **User accounts** — no key required
- **Staff/Admin accounts** — require the `ADMIN_SECRET` from `.env` (default: `supersecret123`, change before deploying)

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with username + password |
| POST | `/api/auth/register` | Create new account |
| POST | `/api/chat` | Send question through 7-node pipeline |
| GET | `/api/cases` | List cases (`?status=open\|resolved`) |
| GET | `/api/cases/{id}` | Get single case |
| POST | `/api/cases/{id}/resolve` | Resolve case + optional KB learn |
| DELETE | `/api/cases/{id}` | Delete a case |

---

## Confidence Thresholds

| Score | Level | Action |
|---|---|---|
| ≥ 0.75 | 🟢 High | Generate polished answer (Node 4b) |
| 0.60 – 0.74 | 🟡 Medium | Generate polished answer (Node 4b) |
| < 0.60 | 🔴 Low | Escalate → log to database (Nodes 4a + 5a) |

---

## Self-Learning Loop

1. User asks a question with low KB match → escalated + logged to SQLite
2. Staff opens dashboard → sees the open case
3. Staff types resolution → checks "Add to knowledge base"
4. **AutoLearnNode** appends `Q: ... / A: ...` to `om_faq.txt`
5. Next time the same question is asked → KB match score is higher → answered automatically

---

## Known Limitations

- Authentication uses session state only (no JWT tokens) — suitable for demo/university use
- SQLite is single-file; for production use PostgreSQL
- Groq free tier: 30 requests/minute, 14,400/day — sufficient for demos

---

## Built With

- [FastAPI](https://fastapi.tiangolo.com/)
- [Groq](https://console.groq.com/)
- [React](https://react.dev/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
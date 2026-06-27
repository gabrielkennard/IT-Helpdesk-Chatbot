"""
IT Helpdesk Chatbot — FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.db import init_db, SessionLocal
from app.routes.chat  import router as chat_router
from app.routes.cases import router as cases_router
from app.routes.auth  import router as auth_router, seed_default_users

app = FastAPI(
    title="IT Helpdesk Chatbot API",
    description="Agentic RAG pipeline with 7-node workflow engine powered by Groq",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Routers
app.include_router(chat_router,  prefix="/api", tags=["Chat"])
app.include_router(cases_router, prefix="/api", tags=["Cases"])
app.include_router(auth_router,  prefix="/api", tags=["Auth"])


#Startup
@app.on_event("startup")
def startup_event():
    init_db()
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()
    print("✅ Database initialised + default users seeded")
    print("🚀 IT Helpdesk Chatbot API is running")


@app.get("/")
def root():
    return {"message": "IT Helpdesk Chatbot API — visit /docs"}
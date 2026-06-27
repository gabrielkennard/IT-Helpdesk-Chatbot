from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.routes.workflow import run_workflow

router = APIRouter()


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    confidence_level: str       # "high" | "medium" | "low"
    confidence_score: float
    rewritten_question: str
    keywords: list[str]
    route: str                  # "generate" | "escalate"
    case_id: int | None = None
    node_trace: list[str]
    errors: list[str]


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Accepts a user question, runs the full 7-node agentic RAG pipeline,
    and returns the answer with confidence metadata.
    """
    state = run_workflow(user_question=request.question.strip(), db=db)

    return ChatResponse(
        answer=state.final_answer,
        confidence_level=state.confidence_level,
        confidence_score=state.confidence_score,
        rewritten_question=state.rewritten_question,
        keywords=state.keywords,
        route=state.route,
        case_id=state.case_id,
        node_trace=state.node_trace,
        errors=state.errors,
    )

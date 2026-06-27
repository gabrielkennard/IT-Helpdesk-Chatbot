"""
Cases management routes — staff resolves escalated cases, triggering AutoLearnNode.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.case import Case
from app.routes.workflow import WorkflowState, auto_learn_node

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class CaseOut(BaseModel):
    id: int
    original_question: str
    rewritten_question: str | None
    keywords: str | None
    best_match_question: str | None
    best_match_answer: str | None
    confidence_score: float | None
    confidence_level: str | None
    status: str
    resolution: str | None
    learned: bool
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class ResolveRequest(BaseModel):
    resolution: str             # staff-provided answer
    learn: bool = True          # whether to write it back to om_faq.txt


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.get("/cases", response_model=list[CaseOut])
def list_cases(status: str | None = None, db: Session = Depends(get_db)):
    """Return all cases, optionally filtered by status (open / resolved)."""
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status)
    return query.order_by(Case.created_at.desc()).all()


@router.get("/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/cases/{case_id}/resolve", response_model=CaseOut)
def resolve_case(case_id: int, body: ResolveRequest, db: Session = Depends(get_db)):
    """
    Staff resolves an open case with an answer.
    If body.learn is True, the Q&A is written back to om_faq.txt via AutoLearnNode
    — closing the self-learning feedback loop.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status == "resolved":
        raise HTTPException(status_code=400, detail="Case is already resolved")

    case.resolution = body.resolution.strip()
    case.status = "resolved"
    case.resolved_at = datetime.now(timezone.utc)

    # ── AutoLearnNode (Node 5b) ──────────────────────────────────────────────
    if body.learn and case.original_question:
        state = WorkflowState()
        auto_learn_node(
            state,
            new_question=case.original_question,
            new_answer=body.resolution,
        )
        case.learned = state.learned

    db.commit()
    db.refresh(case)
    return case


@router.delete("/cases/{case_id}")
def delete_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()
    return {"message": f"Case {case_id} deleted"}

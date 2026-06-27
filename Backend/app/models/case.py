from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.database.db import Base


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    original_question = Column(Text, nullable=False)
    rewritten_question = Column(Text, nullable=True)
    keywords = Column(String(500), nullable=True)
    best_match_question = Column(Text, nullable=True)
    best_match_answer = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    confidence_level = Column(String(20), nullable=True)  # high / medium / low
    status = Column(String(20), default="open")           # open / resolved
    resolution = Column(Text, nullable=True)              # staff-provided answer
    learned = Column(Boolean, default=False)              # written back to KB
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

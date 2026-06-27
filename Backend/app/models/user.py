from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database.db import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String(80), unique=True, nullable=False, index=True)
    email      = Column(String(150), unique=True, nullable=False, index=True)
    password   = Column(String(255), nullable=False)   # bcrypt hash — never stored plain
    role       = Column(String(20), default="user")    # "user" | "staff" | "admin"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
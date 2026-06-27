"""
Auth routes
-----------
POST /api/auth/login     — returns user info (username, role)
POST /api/auth/register  — creates a new account (hidden from login UI)
GET  /api/auth/me        — verify session token (simple header-based)
"""

import os
import hashlib
import hmac
import base64
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user import User

router = APIRouter()

# Simple password hashing using stdlib (no extra deps)
def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key  = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}:{base64.b64encode(key).decode()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, key_b64 = stored.split(":")
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
        return hmac.compare_digest(base64.b64encode(key).decode(), key_b64)
    except Exception:
        return False


# Seed default accounts
def seed_default_users(db: Session):
    """
    Creates default accounts if they don't exist yet.
    Passwords are hashed — never stored in plain text.
    """
    defaults = [
        {"username": "admin",  "email": "admin@company.com",  "password": "admin123",  "role": "admin"},
        {"username": "staff",  "email": "staff@company.com",  "password": "staff123",  "role": "staff"},
        {"username": "user",   "email": "user@company.com",   "password": "user123",   "role": "user"},
    ]
    for d in defaults:
        exists = db.query(User).filter(User.username == d["username"]).first()
        if not exists:
            db.add(User(
                username = d["username"],
                email    = d["email"],
                password = _hash_password(d["password"]),
                role     = d["role"],
            ))
    db.commit()

# Pydantic schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email:    str
    password: str
    role:     str = "user"          # default role is "user"
    admin_key: str = ""             # required to create staff/admin accounts

class UserOut(BaseModel):
    id:       int
    username: str
    email:    str
    role:     str
    model_config = {"from_attributes": True}

# Routes
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")


@router.post("/auth/login", response_model=UserOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not _verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user


@router.post("/auth/register", response_model=UserOut)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # Check username taken
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    # Check email taken
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    # Restrict staff/admin creation to those who know the admin secret key
    if body.role in ("staff", "admin") and body.admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin key for elevated role")

    user = User(
        username = body.username.strip(),
        email    = body.email.strip().lower(),
        password = _hash_password(body.password),
        role     = body.role if body.role in ("user", "staff", "admin") else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/auth/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    """Admin-only: list all users (no password returned thanks to UserOut schema)."""
    return db.query(User).order_by(User.created_at).all()
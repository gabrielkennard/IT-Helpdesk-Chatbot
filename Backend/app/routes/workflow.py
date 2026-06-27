"""
7-node pipeline with shared WorkflowState and conditional routing.

Node 1: QueryRewriterNode  — Gemini API call: rewrites question + extracts keywords
Node 2: KBSearchNode       — reads om_faq.txt, fuzzy match + keyword scoring
Node 3: ConfidenceGateNode — scores match, routes → Escalate OR Generate
Node 4a: EscalateNode      — prepares fallback message
Node 4b: GenerateNode      — Gemini API call: formats KB answer using retrieved content
Node 5a: LogCaseNode       — writes unresolved case to SQLite
Node 5b: AutoLearnNode     — writes new Q&A back to om_faq.txt (feedback loop)
"""

from groq import Groq
import os
import re
import json
import logging
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from dataclasses import dataclass, field
from typing import Optional
from difflib import SequenceMatcher

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.case import Case

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
KB_PATH        = os.getenv("KB_PATH", "./knowledge_base/om_faq.txt")
GEMINI_MODEL   = "gemini-2.0-flash-lite"
GEMINI_TIMEOUT = 15   # seconds — fail fast, fallback kicks in

HIGH_CONFIDENCE   = 0.75
MEDIUM_CONFIDENCE = 0.55

GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ---------------------------------------------------------------------------
# Gemini helper — uses stdlib urllib so no SDK timeout issue
# ---------------------------------------------------------------------------
def _call_gemini(prompt: str) -> str:
    """
    Calls Groq API (Llama 3) — fast, free, no SSL issues.
    Falls back gracefully if unavailable.
    """
    if not groq_client:
        raise Exception("No GROQ_API_KEY set")

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        timeout=15,
    )
    return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Shared Workflow State
# ---------------------------------------------------------------------------
@dataclass
class WorkflowState:
    # ── Inputs ──────────────────────────────────────────────────────────────
    user_question: str = ""
    db: Optional[object] = None

    # ── Node 1 outputs ──────────────────────────────────────────────────────
    rewritten_question: str = ""
    keywords: list[str] = field(default_factory=list)

    # ── Node 2 outputs ──────────────────────────────────────────────────────
    best_match_question: str = ""
    best_match_answer:   str = ""
    raw_score:           float = 0.0

    # ── Node 3 outputs ──────────────────────────────────────────────────────
    confidence_score: float = 0.0
    confidence_level: str   = "low"      # "high" | "medium" | "low"
    route:            str   = "escalate" # "generate" | "escalate"

    # ── Node 4a / 4b outputs ────────────────────────────────────────────────
    final_answer: str = ""

    # ── Node 5a / 5b outputs ────────────────────────────────────────────────
    case_id: Optional[int] = None
    learned: bool = False

    # ── Meta ────────────────────────────────────────────────────────────────
    errors:     list[str] = field(default_factory=list)
    node_trace: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Node 1 — QueryRewriterNode
# ---------------------------------------------------------------------------
def query_rewriter_node(state: WorkflowState) -> WorkflowState:
    """
    Gemini API call #1 (15s timeout):
    Rewrites question into a clear searchable form + extracts keywords.
    Falls back to original question if API fails — system never crashes.
    """
    state.node_trace.append("QueryRewriterNode")
    logger.info("[Node 1] QueryRewriterNode — rewriting: %r", state.user_question)

    if not GEMINI_API_KEY:
        state.rewritten_question = state.user_question
        state.keywords = _simple_keywords(state.user_question)
        state.errors.append("Node1: No GEMINI_API_KEY set — using fallback")
        return state

    prompt = f"""You are an IT helpdesk query processor.

Given this user question, do TWO things:
1. Rewrite it as a clear, concise search query (fix typos, expand abbreviations, make it formal).
2. Extract 3-6 short keywords most relevant for searching an IT FAQ.

User question: "{state.user_question}"

Respond ONLY in this exact format (no extra text):
REWRITTEN: <rewritten question here>
KEYWORDS: <keyword1>, <keyword2>, <keyword3>"""

    try:
        text = _call_gemini(prompt)
        rewritten = state.user_question
        keywords: list[str] = []

        for line in text.splitlines():
            if line.startswith("REWRITTEN:"):
                rewritten = line.replace("REWRITTEN:", "").strip()
            elif line.startswith("KEYWORDS:"):
                raw = line.replace("KEYWORDS:", "").strip()
                keywords = [k.strip().lower() for k in raw.split(",") if k.strip()]

        state.rewritten_question = rewritten or state.user_question
        state.keywords = keywords
        logger.info("[Node 1] Rewritten: %r | Keywords: %s", rewritten, keywords)

    except Exception as exc:
        state.errors.append(f"Node1 Gemini error: {exc}")
        state.rewritten_question = state.user_question
        state.keywords = _simple_keywords(state.user_question)
        logger.warning("[Node 1] Gemini failed (%s), using keyword fallback", type(exc).__name__)

    return state


def _simple_keywords(text: str) -> list[str]:
    stopwords = {"i", "my", "the", "a", "is", "are", "can", "how", "do",
                 "does", "what", "when", "where", "why", "to", "it", "not"}
    tokens = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    return [t for t in tokens if t not in stopwords][:6]


# ---------------------------------------------------------------------------
# Node 2 — KBSearchNode
# ---------------------------------------------------------------------------
def kb_search_node(state: WorkflowState) -> WorkflowState:
    """
    Reads om_faq.txt directly.
    Scores each Q&A entry using fuzzy ratio + keyword overlap bonus.
    """
    state.node_trace.append("KBSearchNode")
    logger.info("[Node 2] KBSearchNode — searching KB")

    try:
        entries = _parse_faq(KB_PATH)
    except FileNotFoundError:
        state.errors.append(f"KB file not found: {KB_PATH}")
        return state

    if not entries:
        state.errors.append("KB file is empty or could not be parsed.")
        return state

    query    = state.rewritten_question.lower()
    keywords = set(state.keywords)

    best_score = 0.0
    best_q, best_a = "", ""

    for q, a in entries:
        q_lower = q.lower()
        fuzzy   = SequenceMatcher(None, query, q_lower).ratio()
        kw_hits = sum(1 for kw in keywords if kw in q_lower or kw in a.lower())
        score   = fuzzy + min(kw_hits * 0.08, 0.40)

        if score > best_score:
            best_score, best_q, best_a = score, q, a

    state.best_match_question = best_q
    state.best_match_answer   = best_a
    state.raw_score           = round(best_score, 4)
    logger.info("[Node 2] Best match score: %.4f | Q: %r", best_score, best_q)
    return state


def _parse_faq(path: str) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    current_q = ""
    current_a_lines: list[str] = []

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("Q:"):
                if current_q and current_a_lines:
                    entries.append((current_q, " ".join(current_a_lines).strip()))
                current_q = line[2:].strip()
                current_a_lines = []
            elif line.startswith("A:"):
                current_a_lines = [line[2:].strip()]
            elif current_a_lines and line.strip():
                current_a_lines.append(line.strip())

    if current_q and current_a_lines:
        entries.append((current_q, " ".join(current_a_lines).strip()))
    return entries


# ---------------------------------------------------------------------------
# Node 3 — ConfidenceGateNode
# ---------------------------------------------------------------------------
def confidence_gate_node(state: WorkflowState) -> WorkflowState:
    state.node_trace.append("ConfidenceGateNode")
    normalised = min(state.raw_score, 1.0)
    state.confidence_score = round(normalised, 4)

    if normalised >= HIGH_CONFIDENCE:
        state.confidence_level = "high"
        state.route = "generate"
    elif normalised >= MEDIUM_CONFIDENCE:
        state.confidence_level = "medium"
        state.route = "generate"
    else:
        state.confidence_level = "low"
        state.route = "escalate"

    logger.info("[Node 3] Score: %.4f → level=%s route=%s",
                normalised, state.confidence_level, state.route)
    return state


# ---------------------------------------------------------------------------
# Node 4a — EscalateNode
# ---------------------------------------------------------------------------
def escalate_node(state: WorkflowState) -> WorkflowState:
    state.node_trace.append("EscalateNode")
    logger.info("[Node 4a] EscalateNode — escalating to human agent")
    state.final_answer = (
        "I'm sorry, I wasn't able to find a confident answer to your question in "
        "the knowledge base. Your case has been logged and an IT support agent will "
        "follow up with you shortly.\n\n"
        "For urgent issues, please contact IT directly:\n"
        "• 📧 it-support@company.com\n"
        "• 📞 Extension 5555\n"
        "• 🌐 it-portal.company.com"
    )
    return state


# ---------------------------------------------------------------------------
# Node 4b — GenerateNode
# ---------------------------------------------------------------------------
def generate_node(state: WorkflowState) -> WorkflowState:
    """
    Gemini API call #2 (15s timeout, completely different prompt from Node 1).
    Falls back to raw KB answer if API fails.
    """
    state.node_trace.append("GenerateNode")
    logger.info("[Node 4b] GenerateNode — generating answer with Gemini")

    if not GEMINI_API_KEY:
        state.final_answer = state.best_match_answer
        state.errors.append("Node4b: No GEMINI_API_KEY — using raw KB answer")
        return state

    prompt = f"""You are a friendly and professional IT helpdesk assistant.

A user asked: "{state.user_question}"

The knowledge base has this relevant entry:
Question: {state.best_match_question}
Answer: {state.best_match_answer}

Write a helpful, clear, and friendly response to the user based on the knowledge base answer.
- Keep it concise (3-6 sentences or bullet points)
- Use plain English, avoid jargon unless necessary
- If there are steps, format them as a numbered list
- End with an offer to help further
- Do NOT mention "knowledge base" or "FAQ" to the user"""

    try:
        state.final_answer = _call_gemini(prompt)
        logger.info("[Node 4b] Answer generated successfully")
    except Exception as exc:
        state.errors.append(f"Node4b Gemini error: {exc}")
        state.final_answer = state.best_match_answer
        logger.warning("[Node 4b] Gemini failed (%s), using raw KB answer", type(exc).__name__)

    return state


# ---------------------------------------------------------------------------
# Node 5a — LogCaseNode
# ---------------------------------------------------------------------------
def log_case_node(state: WorkflowState) -> WorkflowState:
    state.node_trace.append("LogCaseNode")
    logger.info("[Node 5a] LogCaseNode — writing case to DB")

    if state.db is None:
        state.errors.append("No DB session available for LogCaseNode")
        return state

    try:
        case = Case(
            original_question   = state.user_question,
            rewritten_question  = state.rewritten_question,
            keywords            = ", ".join(state.keywords),
            best_match_question = state.best_match_question or None,
            best_match_answer   = state.best_match_answer   or None,
            confidence_score    = state.confidence_score,
            confidence_level    = state.confidence_level,
            status              = "open",
        )
        state.db.add(case)
        state.db.commit()
        state.db.refresh(case)
        state.case_id = case.id
        logger.info("[Node 5a] Case logged with id=%d", case.id)
    except Exception as exc:
        state.errors.append(f"Node5a DB error: {exc}")
        state.db.rollback()
        logger.error("[Node 5a] DB error: %s", exc)

    return state


# ---------------------------------------------------------------------------
# Node 5b — AutoLearnNode
# ---------------------------------------------------------------------------
def auto_learn_node(state: WorkflowState, new_question: str, new_answer: str) -> WorkflowState:
    state.node_trace.append("AutoLearnNode")
    logger.info("[Node 5b] AutoLearnNode — writing new Q&A to KB")

    try:
        with open(KB_PATH, "a", encoding="utf-8") as f:
            f.write(f"\nQ: {new_question.strip()}\n")
            f.write(f"A: {new_answer.strip()}\n")
        state.learned = True
        logger.info("[Node 5b] Knowledge base updated")
    except Exception as exc:
        state.errors.append(f"Node5b KB write error: {exc}")
        logger.error("[Node 5b] Failed to update KB: %s", exc)

    return state


# ---------------------------------------------------------------------------
# Workflow Orchestrator
# ---------------------------------------------------------------------------
def run_workflow(user_question: str, db: Session) -> WorkflowState:
    """
    Executes the full 7-node pipeline with conditional edges.

    Graph:
      Node1 → Node2 → Node3 ─┬─(confidence≥0.35)→ Node4b
                              └─(confidence<0.35) → Node4a → Node5a
    """
    state = WorkflowState(user_question=user_question, db=db)

    state = query_rewriter_node(state)   # Node 1
    state = kb_search_node(state)        # Node 2
    state = confidence_gate_node(state)  # Node 3

    if state.route == "generate":
        state = generate_node(state)     # Node 4b
    else:
        state = escalate_node(state)     # Node 4a
        state = log_case_node(state)     # Node 5a

    logger.info("[Workflow] Complete. Trace: %s", " → ".join(state.node_trace))
    return state
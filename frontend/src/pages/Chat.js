import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000/api";

const CONFIDENCE_CONFIG = {
  high: {
    label: "High Confidence",
    color: "#22c55e",
    bg: "#f0fdf4",
    border: "#86efac",
    dot: "#16a34a",
  },
  medium: {
    label: "Medium Confidence",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fcd34d",
    dot: "#d97706",
  },
  low: {
    label: "Escalated",
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fca5a5",
    dot: "#dc2626",
  },
};

const SUGGESTED = [
  "How do I reset my password?",
  "I can't connect to VPN",
  "How do I set up MFA?",
  "My computer is running slow",
  "How do I request new software?",
  "I accidentally deleted a file",
  "How do I connect to the office printer?",
  "What should I do with a phishing email?",
  "How do I access the intranet from home?",
  "My email is not syncing on my phone",
  "How do I request a new laptop?",
  "How do I onboard a new employee?",
];

const NodeTraceChip = ({ node }) => {
  const colors = {
    QueryRewriterNode: "#6366f1",
    KBSearchNode: "#0ea5e9",
    ConfidenceGateNode: "#8b5cf6",
    EscalateNode: "#ef4444",
    GenerateNode: "#10b981",
    LogCaseNode: "#f59e0b",
    AutoLearnNode: "#ec4899",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 600,
        background: colors[node] || "#94a3b8",
        color: "#fff",
        marginRight: 4,
        marginBottom: 4,
        fontFamily: "monospace",
      }}
    >
      {node}
    </span>
  );
};

const ConfidenceBadge = ({ level, score }) => {
  const cfg = CONFIDENCE_CONFIG[level] || CONFIDENCE_CONFIG.low;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        border: `1.5px solid ${cfg.border}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          display: "inline-block",
        }}
      />
      {cfg.label} ({Math.round(score * 100)}%)
    </span>
  );
};

const Message = ({ msg, user }) => {
  const isUser = msg.role === "user";
  const [showTrace, setShowTrace] = useState(false);
  const initial = user?.username?.[0]?.toUpperCase() || "U";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 20,
        alignItems: "flex-end",
        gap: 10,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            flexShrink: 0,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
          }}
        >
          IT
        </div>
      )}

      <div
        style={{
          maxWidth: "70%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: isUser ? "flex-end" : "flex-start",
        }}
      >
        {/* Bubble */}
        <div
          style={{
            background: isUser
              ? "linear-gradient(135deg, #3b82f6, #6366f1)"
              : "#fff",
            color: isUser ? "#fff" : "#1e293b",
            borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
            padding: "13px 17px",
            fontSize: 14.5,
            lineHeight: 1.65,
            boxShadow: isUser
              ? "0 4px 14px rgba(99,102,241,0.35)"
              : "0 2px 8px rgba(0,0,0,0.07)",
            border: isUser ? "none" : "1px solid #f1f5f9",
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.content}
        </div>

        {/* Confidence + trace (bot only) */}
        {!isUser && msg.meta && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <ConfidenceBadge
                level={msg.meta.confidence_level}
                score={msg.meta.confidence_score}
              />
              {msg.meta.case_id && (
                <span
                  style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}
                >
                  🎫 Case #{msg.meta.case_id} logged
                </span>
              )}
              <button
                onClick={() => setShowTrace((v) => !v)}
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                {showTrace ? "▲ hide" : "▼ pipeline"}
              </button>
            </div>

            {showTrace && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    fontWeight: 700,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Node Trace
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {msg.meta.node_trace.map((n, i) => (
                    <NodeTraceChip key={i} node={n} />
                  ))}
                </div>
                {msg.meta.rewritten_question !== msg.meta.original && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                    <strong>Rewritten:</strong> {msg.meta.rewritten_question}
                  </div>
                )}
                {msg.meta.keywords?.length > 0 && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                    <strong>Keywords:</strong> {msg.meta.keywords.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            flexShrink: 0,
            background: "linear-gradient(135deg, #64748b, #475569)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
};

export default function Chat({ user, onLogout, onGoStaff }) {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: `👋 Hi ${user?.username || "there"}! I'm your IT Helpdesk Assistant.\n\nI can help with password resets, VPN issues, MFA setup, software requests, and more. What can I help you with today?`,
      meta: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (q) => {
    const question = (q || input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question, meta: null },
    ]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.answer,
          meta: {
            confidence_level: data.confidence_level,
            confidence_score: data.confidence_score,
            rewritten_question: data.rewritten_question,
            keywords: data.keywords,
            node_trace: data.node_trace,
            case_id: data.case_id,
            route: data.route,
            original: question,
          },
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `⚠️ ${err.message}\n\nMake sure the backend is running at http://localhost:8000`,
          meta: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#f0f4ff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
          color: "#fff",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
          }}
        >
          🛟
        </div>
        <div>
          <div
            style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}
          >
            IT Helpdesk Assistant
          </div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>
            Powered by Groq · Agentic RAG · 7-Node Pipeline
          </div>
        </div>

        {/* User info + logout */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {onGoStaff && (
            <button
              onClick={onGoStaff}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🛠️ Staff Dashboard
            </button>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "6px 14px",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {user?.username}
            </span>
            <span
              style={{
                fontSize: 10,
                background: "rgba(99,102,241,0.4)",
                padding: "2px 7px",
                borderRadius: 9999,
                color: "#c7d2fe",
              }}
            >
              {user?.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: "rgba(239,68,68,0.2)",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Messages area — full width ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px 8px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} user={user} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                IT
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "20px 20px 20px 4px",
                  padding: "14px 18px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                  border: "1px solid #f1f5f9",
                  display: "flex",
                  gap: 5,
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#94a3b8",
                      display: "inline-block",
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Suggestions ── */}
      {!loading && (
        <div
          style={{
            padding: "0 24px 12px",
            maxWidth: 900,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Common Questions
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SUGGESTED.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                style={{
                  background: "#fff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12.5,
                  color: "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontWeight: 500,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.color = "#6366f1";
                  e.currentTarget.style.background = "#f5f3ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.color = "#475569";
                  e.currentTarget.style.background = "#fff";
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar — full width ── */}
      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          padding: "16px 24px",
          flexShrink: 0,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your IT question here… (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{
              flex: 1,
              border: "2px solid #e2e8f0",
              borderRadius: 14,
              padding: "13px 18px",
              fontSize: 14.5,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#6366f1";
              e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              border: "none",
              flexShrink: 0,
              background:
                input.trim() && !loading
                  ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                  : "#e2e8f0",
              color: input.trim() && !loading ? "#fff" : "#94a3b8",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              fontSize: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                input.trim() && !loading
                  ? "0 4px 12px rgba(99,102,241,0.35)"
                  : "none",
              transition: "all 0.2s",
            }}
          >
            ➤
          </button>
        </div>
        <div
          style={{
            maxWidth: 900,
            margin: "6px auto 0",
            fontSize: 11,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          Responses are AI-generated. For urgent issues call ext. 5555 or email
          it-support@company.com
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </div>
  );
}
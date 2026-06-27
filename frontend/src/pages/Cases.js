import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000/api";

const LEVEL_CONFIG = {
  high: { label: "High", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  low: { label: "Low", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

function CaseCard({ c, onResolve, onDelete }) {
  const [resolution, setResolution] = useState("");
  const [learn, setLearn]           = useState(true);
  const [resolving, setResolving]   = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const cfg = LEVEL_CONFIG[c.confidence_level] || LEVEL_CONFIG.low;

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/cases/${c.id}`, { method: "DELETE" });
      if (res.ok) onDelete(c.id);
    } finally {
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) return;
    setResolving(true);
    try {
      const res = await fetch(`${API_BASE}/cases/${c.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: resolution.trim(), learn }),
      });
      if (res.ok) {
        const updated = await res.json();
        onResolve(updated);
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
      overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: "16px 20px", cursor: "pointer", display: "flex",
          alignItems: "flex-start", gap: 14,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: "#1e40af",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>
          #{c.id}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 15, marginBottom: 4 }}>
            {c.original_question}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{
              padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            }}>
              {cfg.label} Confidence ({Math.round((c.confidence_score || 0) * 100)}%)
            </span>
            <span style={{
              padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
              background: c.status === "resolved" ? "#f0fdf4" : "#fff7ed",
              color: c.status === "resolved" ? "#16a34a" : "#c2410c",
              border: `1px solid ${c.status === "resolved" ? "#86efac" : "#fed7aa"}`,
            }}>
              {c.status === "resolved" ? "✅ Resolved" : "🔴 Open"}
            </span>
            {c.learned && (
              <span style={{
                padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                background: "#fdf4ff", color: "#9333ea", border: "1px solid #e9d5ff",
              }}>
                🧠 Learned
              </span>
            )}
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {new Date(c.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: confirmDel ? "#ef4444" : "rgba(239,68,68,0.1)",
              color: confirmDel ? "#fff" : "#ef4444",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
            onMouseLeave={() => setConfirmDel(false)}
          >
            {deleting ? "Deleting…" : confirmDel ? "Confirm?" : "🗑️ Delete"}
          </button>
          <span
            onClick={() => setExpanded(v => !v)}
            style={{ color: "#94a3b8", fontSize: 18, cursor: "pointer", padding: "4px" }}
          >{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f1f5f9" }}>
          {c.rewritten_question && c.rewritten_question !== c.original_question && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>
                Rewritten by Node 1
              </div>
              <div style={{ fontSize: 14, color: "#475569", background: "#f8fafc", padding: "8px 12px", borderRadius: 8 }}>
                {c.rewritten_question}
              </div>
            </div>
          )}

          {c.keywords && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>Keywords</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.keywords.split(", ").map((k, i) => (
                  <span key={i} style={{
                    padding: "2px 8px", borderRadius: 6, background: "#f1f5f9",
                    color: "#475569", fontSize: 12, fontFamily: "monospace",
                  }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {c.best_match_question && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>
                Best KB Match (Node 2)
              </div>
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
                  Q: {c.best_match_question}
                </div>
                <div style={{ fontSize: 13, color: "#78350f" }}>A: {c.best_match_answer}</div>
              </div>
            </div>
          )}

          {/* Resolved view */}
          {c.status === "resolved" && c.resolution && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" }}>
                Staff Resolution
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#166534" }}>
                {c.resolution}
              </div>
            </div>
          )}

          {/* Resolve form (open cases only) */}
          {c.status === "open" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
                Resolve This Case
              </div>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="Type the resolution / correct answer here…"
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0",
                  borderRadius: 8, padding: "10px 12px", fontSize: 14,
                  resize: "vertical", fontFamily: "inherit", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "#1e40af"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={learn}
                    onChange={e => setLearn(e.target.checked)}
                    style={{ accentColor: "#9333ea", width: 15, height: 15 }}
                  />
                  <span>🧠 Write to knowledge base (AutoLearnNode)</span>
                </label>
                <button
                  onClick={handleResolve}
                  disabled={!resolution.trim() || resolving}
                  style={{
                    marginLeft: "auto",
                    background: resolution.trim() && !resolving ? "#1e40af" : "#e2e8f0",
                    color: resolution.trim() && !resolving ? "#fff" : "#94a3b8",
                    border: "none", borderRadius: 8, padding: "9px 20px",
                    fontSize: 13, fontWeight: 600, cursor: resolution.trim() && !resolving ? "pointer" : "not-allowed",
                  }}
                >
                  {resolving ? "Resolving…" : "Mark Resolved"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Cases({ user, onLogout, onGoChat }) {
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, learned: 0 });

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const [filtered, all] = await Promise.all([
        fetch(`${API_BASE}/cases${filter !== "all" ? `?status=${filter}` : ""}`).then(r => r.json()),
        fetch(`${API_BASE}/cases`).then(r => r.json()),
      ]);
      setCases(filtered);
      setStats({
        total: all.length,
        open: all.filter(c => c.status === "open").length,
        resolved: all.filter(c => c.status === "resolved").length,
        learned: all.filter(c => c.learned).length,
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleResolve = (updated) => {
    setCases(prev => prev.filter(c => c.id !== updated.id));
    fetchCases();
  };
  const handleDelete = (id) => {
    setCases(prev => prev.filter(c => c.id !== id));
    fetchCases(); // refresh stats
  };

  const StatCard = ({ label, value, color }) => (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
      padding: "16px 20px", flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f0f4ff", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "#fff",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
        }}>🎫</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Staff Dashboard</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>Resolve cases · AutoLearnNode updates KB</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {onGoChat && (
            <button onClick={onGoChat} style={{
              background: "rgba(255,255,255,0.1)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
              padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>💬 Chat</button>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.1)", borderRadius: 20,
            padding: "6px 14px", border: "1px solid rgba(255,255,255,0.15)",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800,
            }}>{user?.username?.[0]?.toUpperCase() || "S"}</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.username}</span>
            <span style={{ fontSize: 10, background: "rgba(99,102,241,0.4)", padding: "2px 7px", borderRadius: 9999, color: "#c7d2fe" }}>{user?.role}</span>
          </div>
          <button onClick={onLogout} style={{
            background: "rgba(239,68,68,0.2)", color: "#fca5a5",
            border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
            padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}><div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Total Cases" value={stats.total} color="#1e40af" />
          <StatCard label="Open" value={stats.open} color="#c2410c" />
          <StatCard label="Resolved" value={stats.resolved} color="#16a34a" />
          <StatCard label="KB Learned" value={stats.learned} color="#9333ea" />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["open", "resolved", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "1.5px solid",
              borderColor: filter === f ? "#1e40af" : "#e2e8f0",
              background: filter === f ? "#1e40af" : "#fff",
              color: filter === f ? "#fff" : "#475569",
              cursor: "pointer", textTransform: "capitalize",
            }}>
              {f === "open" ? `🔴 Open (${stats.open})` : f === "resolved" ? `✅ Resolved (${stats.resolved})` : "All"}
            </button>
          ))}
          <button onClick={fetchCases} style={{
            marginLeft: "auto", padding: "8px 14px", borderRadius: 8,
            background: "#fff", border: "1px solid #e2e8f0",
            color: "#64748b", cursor: "pointer", fontSize: 13,
          }}>
            🔄 Refresh
          </button>
        </div>

        {/* Cases list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 16 }}>
            Loading cases…
          </div>
        ) : cases.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0", color: "#94a3b8",
            background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No {filter !== "all" ? filter : ""} cases</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>The helpdesk is all clear!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cases.map(c => (
              <CaseCard key={c.id} c={c} onResolve={handleResolve} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
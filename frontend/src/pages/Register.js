import { useState } from "react";

const API_BASE = "http://localhost:8000/api";

const ROLES = [
  { value: "user",  label: "👤 User",  desc: "Can use the chat helpdesk" },
  { value: "staff", label: "🛠️ Staff", desc: "Can resolve escalated cases" },
];

export default function Register({ onBack }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user", admin_key: "" });
  const [showPass,     setShowPass]     = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [loading,      setLoading]      = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Please fill in all required fields."); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      setSuccess(`✅ Account "${data.username}" created successfully! You can now sign in.`);
      setForm({ username: "", email: "", password: "", role: "user", admin_key: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, value, onChange, type = "text", placeholder, rightEl }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: rightEl ? "13px 46px 13px 16px" : "13px 16px",
            fontSize: 15, color: "#fff", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.7)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
        {rightEl}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden",
    }}>
      <div style={{ position: "fixed", top: "10%", left: "15%", width: 350, height: 350, borderRadius: "50%", background: "rgba(99,102,241,0.12)", filter: "blur(80px)", animation: "float 6s ease-in-out infinite" }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: 280, height: 280, borderRadius: "50%", background: "rgba(59,130,246,0.12)", filter: "blur(80px)", animation: "float 8s ease-in-out infinite reverse" }} />

      <div style={{
        background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24,
        padding: "44px 40px", width: "100%", maxWidth: 460,
        boxShadow: "0 30px 60px rgba(0,0,0,0.5)", position: "relative", zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: "0 auto 14px",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, boxShadow: "0 8px 24px rgba(99,102,241,0.45)",
          }}>🛟</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>Create Account</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>IT Helpdesk Portal</div>
        </div>

        <Field label="Username *" value={form.username} onChange={v => set("username", v)} placeholder="Choose a username" />
        <Field label="Email *" value={form.email} onChange={v => set("email", v)} placeholder="your@company.com" />
        <Field
          label="Password *" value={form.password} onChange={v => set("password", v)}
          type={showPass ? "text" : "password"} placeholder="Min. 6 characters"
          rightEl={
            <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(255,255,255,0.35)", padding: 0 }}>
              {showPass ? "🙈" : "👁️"}
            </button>
          }
        />

        {/* Role selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 }}>Role *</label>
          <div style={{ display: "flex", gap: 10 }}>
            {ROLES.map(r => (
              <div key={r.value} onClick={() => set("role", r.value)} style={{
                flex: 1, padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                border: `2px solid ${form.role === r.value ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)"}`,
                background: form.role === r.value ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin key — only shown for staff role */}
        {form.role === "staff" && (
          <Field
            label="Admin Key (required for Staff role)"
            value={form.admin_key} onChange={v => set("admin_key", v)}
            type={showAdminKey ? "text" : "password"} placeholder="Enter admin key"
            rightEl={
              <button onClick={() => setShowAdminKey(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(255,255,255,0.35)", padding: 0 }}>
                {showAdminKey ? "🙈" : "👁️"}
              </button>
            }
          />
        )}

        {/* Messages */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#fca5a5" }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#86efac" }}>
            {success}
          </div>
        )}

        {/* Buttons */}
        <button onClick={handleRegister} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "#fff", fontSize: 16, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 16px rgba(99,102,241,0.35)", marginBottom: 12,
        }}>
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <button onClick={onBack} style={{
          width: "100%", padding: "12px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          ← Back to Sign In
        </button>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
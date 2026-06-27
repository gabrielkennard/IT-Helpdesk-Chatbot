import { useState } from "react";

const API_BASE = "http://localhost:8000/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }
      const user = await res.json();
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative", overflow: "hidden",
    }}>
      {/* Background blobs */}
      <div style={{ position: "fixed", top: "10%", left: "15%", width: 350, height: 350, borderRadius: "50%", background: "rgba(99,102,241,0.12)", filter: "blur(80px)", animation: "float 6s ease-in-out infinite" }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: 280, height: 280, borderRadius: "50%", background: "rgba(59,130,246,0.12)", filter: "blur(80px)", animation: "float 8s ease-in-out infinite reverse" }} />

      <div style={{
        background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24,
        padding: "48px 40px", width: "100%", maxWidth: 420,
        boxShadow: "0 30px 60px rgba(0,0,0,0.5)", position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, boxShadow: "0 8px 24px rgba(99,102,241,0.45)",
          }}>🛟</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>IT Helpdesk</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>Sign in to your account</div>
        </div>

        {/* Username */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>Username</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter your username"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: 12, padding: "13px 16px", fontSize: 15, color: "#fff", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.7)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter your password"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: "13px 46px 13px 16px", fontSize: 15, color: "#fff", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.7)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
            <button onClick={() => setShowPass(v => !v)} style={{
              position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", fontSize: 18,
              color: "rgba(255,255,255,0.35)", padding: 0,
            }}>{showPass ? "🙈" : "👁️"}</button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 18,
            fontSize: 13, color: "#fca5a5", textAlign: "center",
          }}>⚠️ {error}</div>
        )}

        {/* Sign in button */}
        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "#fff", fontSize: 16, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
          transition: "transform 0.1s",
        }}
          onMouseEnter={e => !loading && (e.target.style.transform = "translateY(-1px)")}
          onMouseLeave={e => (e.target.style.transform = "translateY(0)")}
        >
          {loading ? "Signing in…" : "Sign In →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          Powered by Groq · Agentic RAG · 7-Node Pipeline
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
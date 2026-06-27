import { useState } from "react";
import Login    from "./pages/Login";
import Register from "./pages/Register";
import Chat     from "./pages/Chat";
import Cases    from "./pages/Cases";

export default function App() {
  const [user,   setUser]   = useState(null);
  const [page,   setPage]   = useState("login"); // "login" | "register" | "chat" | "cases"

  const handleLogin = (userData) => {
    setUser(userData);
    // Route by role: staff/admin go to cases dashboard, users go to chat
    setPage(userData.role === "user" ? "chat" : "cases");
  };

  const handleLogout = () => { setUser(null); setPage("login"); };

  if (!user) {
    if (page === "register") return <Register onBack={() => setPage("login")} />;
    return <Login onLogin={handleLogin} onRegister={() => setPage("register")} />;
  }

  // Logged-in routing
  if (page === "cases") return <Cases user={user} onLogout={handleLogout} onGoChat={() => setPage("chat")} />;
  return <Chat user={user} onLogout={handleLogout} onGoStaff={user.role !== "user" ? () => setPage("cases") : null} />;
}
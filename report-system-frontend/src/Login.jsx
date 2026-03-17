import { useState, useEffect } from "react";
import { api } from "./api";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleSubmit(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/api/auth/login", {
        username: formData.username,
        password: formData.password,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login muvaffaqiyatsiz bo'ldi");

      localStorage.setItem("token", data.token || "");
      localStorage.setItem("username", formData.username);

      let role = data.role || null;
      if (!role && data.token) {
        try {
          const payload = JSON.parse(atob(data.token.split(".")[1]));
          role = payload.role || payload.Role || payload.ROLE || null;
        } catch {}
      }
      if (role) localStorage.setItem("role", role);
      onLogin(formData.username);
    } catch (err) {
      setError(err.message || "Serverga ulanishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .lg-input {
          width: 100%;
          padding: 13px 16px;
          background: #f1f5f9;
          border: 1.5px solid transparent;
          border-radius: 10px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }
        .lg-input::placeholder { color: #94a3b8; }
        .lg-input:focus {
          background: #fff;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.1);
        }
        .lg-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(37,99,235,0.38);
        }
        .lg-btn:active:not(:disabled) { transform: translateY(0); }
        .lg-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      {/* Page background */}
      <div style={{
        height: "100vh",
        width: "100vw",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #0d1b45 0%, #1e3a8a 45%, #1d4ed8 75%, #1a56c4 100%)",
        position: "fixed",
        top: 0, left: 0,
        overflow: "auto",
      }}>

        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg,rgba(255,255,255,0.02) 0,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 40px)," +
            "repeating-linear-gradient(90deg,rgba(255,255,255,0.02) 0,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 40px)",
        }} />

        {/* White card */}
        <div style={{
          position: "relative",
          background: "#fff",
          borderRadius: 22,
          padding: "clamp(28px, 5vw, 46px) clamp(24px, 5vw, 42px)",
          width: "100%",
          maxWidth: 420,
          margin: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.4)",
          animation: mounted ? "fadeUp 0.5s ease both" : "none",
        }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>📊</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
              Report System
            </span>
          </div>

          <h1 style={{ margin: "0 0 5px", fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
            Xush kelibsiz
          </h1>
         {/* <p style={{ margin: "0 0 30px", fontSize: 14, color: "#64748b" }}>
            Davom etish uchun tizimga kiring
          </p>*/}

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                Foydalanuvchi nomi
              </label>
              <input
                className="lg-input"
                type="text" name="username"
                placeholder="username kiriting"
                value={formData.username}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                required
                autoComplete="username"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                Parol
              </label>
              <input
                className="lg-input"
                type="password" name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: "#fef2f2", color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: 10, padding: "11px 14px",
                fontSize: 13, display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button className="lg-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{
                    width: 15, height: 15,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Yuklanmoqda...
                </span>
              ) : "Kirish →"}
            </button>
          </div>

          <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
              © 2026 Report System
            </span>
          </div>

        </div>
      </div>
    </>
  );
};

export default Login;
import { useState } from "react";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": "UZ" },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login muvaffaqiyatsiz bo'ldi");

      // Token va ma'lumotlarni saqlash
      localStorage.setItem("token", data.token || "");
      localStorage.setItem("username", formData.username);

      // Role ni tokendan yoki responsdan olish
      let role = data.role || null;
      if (!role && data.token) {
        try {
          const payload = JSON.parse(atob(data.token.split(".")[1]));
          role = payload.role || payload.Role || payload.ROLE || null;
        } catch {}
      }
      if (role) localStorage.setItem("role", role);

      // App.jsx ga xabar berish
      onLogin(formData.username);

    } catch (err) {
      setError(err.message || "Serverga ulanishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.left}>
        <div style={s.leftContent}>
          <div style={s.bigIcon}>📊</div>
          <h2 style={s.leftTitle}>Report System</h2>
          <p style={s.leftDesc}>
            Hisobotlarni boshqarish, foydalanuvchilar va bajarilish jurnallarini kuzatish uchun markazlashgan platforma.
          </p>
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <h1 style={s.title}>Xush kelibsiz 👋</h1>
          <p style={s.subtitle}>Davom etish uchun kiring</p>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Foydalanuvchi nomi</label>
              <input
                type="text" name="username" placeholder="username"
                value={formData.username} onChange={handleChange} required
                style={s.input}
                onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Parol</label>
              <input
                type="password" name="password" placeholder="••••••••"
                value={formData.password} onChange={handleChange} required
                style={s.input}
                onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {error && <div style={s.error}>⚠ {error}</div>}

            <button
              type="submit" disabled={loading}
              style={{ ...s.btn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={s.spinner} /> Yuklanmoqda...
                </span>
              ) : "Kirish →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const s = {
  wrapper: { display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" },
  left: { flex: 1, background: "linear-gradient(145deg, #1e3a8a, #1d4ed8, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 40px" },
  leftContent: { color: "#fff", maxWidth: 360 },
  bigIcon: { fontSize: 56, marginBottom: 24 },
  leftTitle: { fontSize: 32, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-1px" },
  leftDesc: { fontSize: 16, lineHeight: 1.7, opacity: 0.85, margin: 0 },
  right: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "40px 20px" },
  card: { background: "#fff", borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  title: { margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#111827" },
  subtitle: { margin: "0 0 32px", fontSize: 14, color: "#6b7280" },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: { padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", transition: "all 0.2s", color: "#111827" },
  btn: { padding: "14px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700 },
  error: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 14 },
  spinner: { width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "loginSpin 0.7s linear infinite" },
};

const st = document.createElement("style");
st.id = "login-styles";
st.innerHTML = `@keyframes loginSpin{to{transform:rotate(360deg)}}`;
if (!document.getElementById("login-styles")) document.head.appendChild(st);

export default Login;

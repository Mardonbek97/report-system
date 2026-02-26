import { useState, useEffect } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ReportExecutePage from "./pages/ReportExecutePage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  // Sahifa ochilganda token borligini tekshir
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    if (token) {
      setIsLoggedIn(true);
      setUsername(savedUsername || "");
    }
  }, []);

  // Execute sahifasini URL bo'yicha aniqlash
  const isExecutePage = window.location.pathname === "/execute" ||
    window.location.search.includes("repId");

  // Execute sahifasi — token bo'lsa ko'rsat
  if (isExecutePage) {
    const token = localStorage.getItem("token");
    if (!token) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f1f5f9" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 40px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <p style={{ color: "#dc2626", fontWeight: 600, margin: 0 }}>Kirish talab etiladi</p>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>Avval tizimga kiring</p>
          </div>
        </div>
      );
    }
    return <ReportExecutePage />;
  }

  // Login sahifasi
  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(uname) => {
          setIsLoggedIn(true);
          setUsername(uname);
        }}
      />
    );
  }

  // Dashboard
  return (
    <Dashboard
      username={username}
      onLogout={() => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        setIsLoggedIn(false);
        setUsername("");
      }}
    />
  );
}

export default App;

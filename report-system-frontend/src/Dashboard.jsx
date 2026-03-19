import { useState, useEffect, useCallback } from "react";
import { api } from "./api";
import { useNotifications } from "./useNotifications";
import UsersPage from "./pages/UsersPage";
import ReportsPage from "./pages/ReportsPage";
import LogsPage from "./pages/LogsPage";
import GenerateReportPage from "./pages/GenerateReportPage";
import ScheduledLogsPage from "./pages/ScheduledLogsPage";

const getRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || payload.Role || payload.ROLE || null;
  } catch {
    return localStorage.getItem("role") || null;
  }
};

const ClockIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ADMIN_MENU = [
  { key: "users",         label: "Users",          icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4a4 4 0 110-8 4 4 0 010 8zm6 4a2 2 0 10-4 0m-8 0a2 2 0 10-4 0" /></svg> },
  { key: "reports",       label: "Reports",        icon: <svg width="15" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6M4 6h16M4 10h16M4 14h8M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> },
  { key: "generate",      label: "Generate Report",icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: "logs",          label: "Execution Logs", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h10M4 18h6" /></svg> },
  { key: "schedule-logs", label: "Scheduled Logs", icon: <ClockIcon /> },
];

const USER_MENU = [
  { key: "generate",      label: "Generate Report",icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: "logs",          label: "Execution Logs", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h10M4 18h6" /></svg> },
  { key: "schedule-logs", label: "Scheduled Logs", icon: <ClockIcon /> },
];

const PAGE_SUBS = {
  users:           "Foydalanuvchilarni boshqaring",
  reports:         "Hisobotlarni ko'ring va boshqaring",
  generate:        "Reportni tanlang va ishga tushiring",
  logs:            "Bajarilish jurnallarini kuzating",
  "schedule-logs": "Scheduled reportlar tarixi va yuklab olish",
};

const Dashboard = ({ onLogout, username }) => {
  const role    = getRole();
  const isAdmin = role === "ROLE_ADMIN";
  const MENU    = isAdmin ? ADMIN_MENU : USER_MENU;

  const [active,    setActive]    = useState(isAdmin ? "users" : "generate");
  const [collapsed, setCollapsed] = useState(false);

  // ── Clock ──────────────────────────────────────────────────────────────────
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, "0");
  const formatted = `${pad(time.getDate())}.${pad(time.getMonth() + 1)}.${time.getFullYear()} ${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

  // ── Update password modal ──────────────────────────────────────────────────
  const [pwModal,   setPwModal]   = useState(false);
  const [pwValue,   setPwValue]   = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // ── WebSocket notifications ───────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);

  const handleWsMessage = useCallback((data) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title: data.title, body: data.body }]);
    // 5 soniyadan keyin avtomatik yopiladi
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  useNotifications(handleWsMessage);

  const openPwModal  = () => { setPwValue(""); setPwError(""); setPwSuccess(""); setPwModal(true); };
  const closePwModal = () => { if (pwLoading) return; setPwModal(false); };

  const handleUpdatePw = async () => {
    if (!pwValue || pwValue.length < 5) {
      setPwError("Parol kamida 5 ta belgidan iborat bo'lishi kerak");
      return;
    }
    setPwLoading(true); setPwError(""); setPwSuccess("");
    try {
      const res  = await api.post("/api/auth/update", { username, password: pwValue });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setPwSuccess("Parol muvaffaqiyatli yangilandi!");
      setTimeout(() => closePwModal(), 1500);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  // ── Render content ─────────────────────────────────────────────────────────
  const renderContent = () => {
    if (active === "users"          && isAdmin) return <UsersPage />;
    if (active === "reports"        && isAdmin) return <ReportsPage />;
    if (active === "generate")                  return <GenerateReportPage />;
    if (active === "logs")                      return <LogsPage />;
    if (active === "schedule-logs")             return <ScheduledLogsPage />;
    const item = MENU.find(m => m.key === active);
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#334155", margin: "0 0 8px" }}>{item?.label}</h2>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>Bu bo'lim hozircha bo'sh.</p>
        </div>
      </div>
    );
  };

  const activeItem = MENU.find(m => m.key === active);

  return (
    <>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes modalIn  { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>

      <div style={s.shell}>
        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside style={{ ...s.sidebar, width: collapsed ? 68 : 240 }}>
          <div style={s.brand}>
            <div style={s.brandIcon}>R</div>
            {!collapsed && <span style={s.brandName}>ReportSystem</span>}
          </div>

          <nav style={s.nav}>
            {MENU.map((item) => {
              const isActive = active === item.key;
              return (
                <button key={item.key} onClick={() => setActive(item.key)}
                  style={{ ...s.navItem, ...(isActive ? s.navItemActive : {}) }}
                  title={collapsed ? item.label : ""}>
                  <span style={s.navIcon}>{item.icon}</span>
                  {!collapsed && <span style={s.navLabel}>{item.label}</span>}
                  {isActive && <span style={s.activeDot} />}
                </button>
              );
            })}
          </nav>

          <div style={s.sidebarBottom}>
            <div style={s.userBadge}>
              <div style={s.avatar}>{username?.[0]?.toUpperCase() || "U"}</div>
              {!collapsed && (
                <div>
                  <div style={s.userName}>{username || "User"}</div>
                  <div style={s.userRole}>{isAdmin ? "Administrator" : "User"}</div>
                </div>
              )}
            </div>
            <button onClick={onLogout} style={s.logoutBtn} title="Exit">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              {!collapsed && <span style={{ marginLeft: 8 }}>Exit</span>}
            </button>
          </div>

          <button onClick={() => setCollapsed(!collapsed)} style={s.collapseBtn}>
            {collapsed ? "›" : "‹"}
          </button>
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────────── */}
        <main style={s.main}>
          <header style={s.topbar}>
            <div>
              <h1 style={s.pageTitle}>{activeItem?.label || ""}</h1>
              <p style={s.pageSub}>{PAGE_SUBS[active] || ""}</p>
            </div>

            {/* Right side: clock + buttons */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={s.topbarDate}>{formatted}</div>
              <div style={{ display: "flex", gap: 6 }}>
<button onClick={openPwModal} style={s.pwBtn}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Parolni o'zgartirish
                </button>
              </div>
            </div>
          </header>

          <div style={s.content}>{renderContent()}</div>
        </main>
      </div>

      {/* ── Update Password Modal ──────────────────────────────────────────── */}
      {pwModal && (
        <div style={s.overlay} onClick={closePwModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div style={s.modalTitle}>Parolni o'zgartirish</div>
                <div style={s.modalSub}>@{username}</div>
              </div>
              <button style={s.modalClose} onClick={closePwModal}>✕</button>
            </div>

            <div style={s.modalBody}>
              <label style={s.label}>Yangi parol</label>
              <div style={s.inputWrap}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="password"
                  value={pwValue}
                  onChange={e => { setPwValue(e.target.value); setPwError(""); setPwSuccess(""); }}
                  onKeyDown={e => e.key === "Enter" && handleUpdatePw()}
                  placeholder="Kamida 5 ta belgi..."
                  style={s.modalInput}
                  autoFocus
                />
              </div>
              {pwError   && <div style={s.modalError}>⚠ {pwError}</div>}
              {pwSuccess && <div style={s.modalSuccess}>✓ {pwSuccess}</div>}
              <div style={s.modalHint}>Parol kamida <strong>5 ta belgi</strong>dan iborat bo'lishi kerak</div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closePwModal} disabled={pwLoading}>Bekor qilish</button>
              <button style={{ ...s.saveBtn, opacity: pwLoading ? 0.7 : 1 }} onClick={handleUpdatePw} disabled={pwLoading}>
                {pwLoading
                  ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={s.btnSpinner} /> Saqlanmoqda...</span>
                  : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Toast Notifications ── */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            background: "#fff", borderRadius: 12, padding: "12px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)", border: "1px solid #e2e8f0",
            minWidth: 280, maxWidth: 360, animation: "modalIn 0.2s ease",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>
              {n.title.startsWith("✅") ? "✅" : "❌"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                {n.title.replace("✅ ", "").replace("❌ ", "")}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{n.body}</div>
            </div>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
              style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0 }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

const s = {
  shell:         { display: "flex", height: "100vh", overflow: "hidden", background: "#f1f5f9", fontFamily: "'Segoe UI', sans-serif" },
  sidebar:       { background: "#0f172a", display: "flex", flexDirection: "column", position: "relative", transition: "width 0.25s ease", flexShrink: 0, boxShadow: "4px 0 20px rgba(0,0,0,0.15)", height: "100vh", overflowY: "auto", overflowX: "hidden" },
  brand:         { display: "flex", alignItems: "center", gap: 12, padding: "24px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  brandIcon:     { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 },
  brandName:     { color: "#fff", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" },
  nav:           { flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 },
  navItem:       { display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.15s", position: "relative", fontSize: 14 },
  navItemActive: { background: "rgba(37,99,235,0.2)", color: "#fff" },
  navIcon:       { flexShrink: 0, display: "flex" },
  navLabel:      { whiteSpace: "nowrap", fontWeight: 500 },
  activeDot:     { width: 6, height: 6, borderRadius: "50%", background: "#2563eb", marginLeft: "auto", flexShrink: 0 },
  sidebarBottom: { padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" },
  userBadge:     { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 8 },
  avatar:        { width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 },
  userName:      { color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  userRole:      { color: "rgba(255,255,255,0.4)", fontSize: 11, whiteSpace: "nowrap" },
  logoutBtn:     { display: "flex", alignItems: "center", width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  collapseBtn:   { position: "absolute", top: "50%", right: -14, transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: "2px solid #1e293b", background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 },
  main:          { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100vh" },
  topbar:        { background: "#fff", padding: "14px 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flexShrink: 0 },
  pageTitle:     { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  pageSub:       { margin: "4px 0 0", fontSize: 13, color: "#94a3b8" },
  topbarDate:    { fontSize: 13, color: "#64748b", fontWeight: 500 },
  pwBtn:         { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#475569", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  content:       { flex: 1, overflow: "auto" },

  // Modal
  overlay:      { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:        { background: "#fff", borderRadius: 20, width: 400, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", overflow: "hidden", animation: "modalIn 0.2s ease" },
  modalHeader:  { display: "flex", alignItems: "center", gap: 14, padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", position: "relative" },
  modalTitle:   { fontSize: 17, fontWeight: 700, color: "#0f172a" },
  modalSub:     { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  modalClose:   { position: "absolute", right: 16, top: 16, border: "none", background: "#f1f5f9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" },
  modalBody:    { padding: "20px 24px" },
  label:        { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 },
  inputWrap:    { display: "flex", alignItems: "center", gap: 10, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", background: "#f8fafc" },
  modalInput:   { flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent" },
  modalError:   { marginTop: 12, padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13, border: "1px solid #fecaca" },
  modalSuccess: { marginTop: 12, padding: "10px 14px", background: "#dcfce7", color: "#16a34a", borderRadius: 8, fontSize: 13, border: "1px solid #bbf7d0" },
  modalHint:    { marginTop: 10, fontSize: 12, color: "#94a3b8" },
  modalFooter:  { display: "flex", gap: 10, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" },
  cancelBtn:    { border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "9px 20px", fontSize: 14, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  saveBtn:      { border: "none", background: "linear-gradient(135deg, #2563eb, #7c3aed)", borderRadius: 10, padding: "9px 24px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 },
  btnSpinner:   { width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
};

export default Dashboard;
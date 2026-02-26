import { useState } from "react";
import UsersPage from "./pages/UsersPage";
import ReportsPage from "./pages/ReportsPage";
import LogsPage from "./pages/LogsPage";
import GenerateReportPage from "./pages/GenerateReportPage";

// ── Role helper ──────────────────────────────────────────
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

// ── Menu items ────────────────────────────────────────────
const ADMIN_MENU = [
  {
    key: "users",
    label: "Users",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4a4 4 0 110-8 4 4 0 010 8zm6 4a2 2 0 10-4 0m-8 0a2 2 0 10-4 0" />
      </svg>
    ),
  },
  {
    key: "reports",
    label: "Reports",
    icon: (
      <svg width="15" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 17v-2m3 2v-4m3 4v-6M4 6h16M4 10h16M4 14h8M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    key: "generate",
    label: "Generate Report",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "logs",
    label: "Report Execution Logs",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 6h16M4 10h16M4 14h10M4 18h6" />
      </svg>
    ),
  },
];

const USER_MENU = [
  {
    key: "generate",
    label: "Generate Report",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "logs",
    label: "Report Execution Logs",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 6h16M4 10h16M4 14h10M4 18h6" />
      </svg>
    ),
  },
];

const PAGE_SUBS = {
  users: "Foydalanuvchilarni boshqaring",
  reports: "Hisobotlarni ko'ring va boshqaring",
  generate: "Reportni tanlang va ishga tushiring",
  logs: "Bajarilish jurnallarini kuzating",
};

const Dashboard = ({ onLogout, username }) => {
  const role = getRole();
  const isAdmin = role === "ROLE_ADMIN";
  const MENU = isAdmin ? ADMIN_MENU : USER_MENU;

  console.log("ROLE FROM TOKEN:", role);
  console.log("IS ADMIN:", isAdmin);

  const [active, setActive] = useState(isAdmin ? "users" : "generate");
  const [collapsed, setCollapsed] = useState(false);

  const renderContent = () => {
    if (active === "users" && isAdmin) return <UsersPage />;
    if (active === "reports" && isAdmin) return <ReportsPage />;
    if (active === "generate") return <GenerateReportPage />;
    if (active === "logs") return <LogsPage />;
    const item = MENU.find((m) => m.key === active);
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#334155", margin: "0 0 8px" }}>{item?.label}</h2>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>Bu bo'lim hozircha bo'sh.</p>
        </div>
      </div>
    );
  };

  return (
    <div style={s.shell}>
      {/* ── Sidebar ── */}
      <aside style={{ ...s.sidebar, width: collapsed ? 68 : 240 }}>
        <div style={s.brand}>
          <div style={s.brandIcon}>R</div>
          {!collapsed && <span style={s.brandName}>ReportSystem</span>}
        </div>

        <nav style={s.nav}>
          {MENU.map((item) => (
            <button key={item.key} onClick={() => setActive(item.key)}
              style={{ ...s.navItem, ...(active === item.key ? s.navItemActive : {}) }}
              title={collapsed ? item.label : ""}>
              <span style={s.navIcon}>{item.icon}</span>
              {!collapsed && <span style={s.navLabel}>{item.label}</span>}
              {active === item.key && <span style={s.activeDot} />}
            </button>
          ))}
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

      {/* ── Main ── */}
      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>{MENU.find((m) => m.key === active)?.label}</h1>
            <p style={s.pageSub}>{PAGE_SUBS[active] || ""}</p>
          </div>
          <div style={s.topbarDate}>
            {new Date().toLocaleDateString("uz-UZ", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </div>
        </header>
        <div style={s.content}>{renderContent()}</div>
      </main>
    </div>
  );
};

const s = {
  shell: { display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', sans-serif" },
  sidebar: { background: "#0f172a", display: "flex", flexDirection: "column", position: "relative", transition: "width 0.25s ease", flexShrink: 0, boxShadow: "4px 0 20px rgba(0,0,0,0.15)" },
  brand: { display: "flex", alignItems: "center", gap: 12, padding: "24px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" },
  brandIcon: { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 },
  brandName: { color: "#fff", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" },
  nav: { flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4 },
  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.15s", position: "relative", fontSize: 14 },
  navItemActive: { background: "rgba(37,99,235,0.2)", color: "#fff" },
  navIcon: { flexShrink: 0, display: "flex" },
  navLabel: { whiteSpace: "nowrap", fontWeight: 500 },
  activeDot: { width: 6, height: 6, borderRadius: "50%", background: "#2563eb", marginLeft: "auto", flexShrink: 0 },
  sidebarBottom: { padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" },
  userBadge: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 },
  userName: { color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" },
  userRole: { color: "rgba(255,255,255,0.4)", fontSize: 11, whiteSpace: "nowrap" },
  logoutBtn: { display: "flex", alignItems: "center", width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  collapseBtn: { position: "absolute", top: "50%", right: -14, transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: "2px solid #1e293b", background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "100vh" },
  topbar: { background: "#fff", padding: "20px 32px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flexShrink: 0 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  pageSub: { margin: "4px 0 0", fontSize: 13, color: "#94a3b8" },
  topbarDate: { fontSize: 13, color: "#64748b", fontWeight: 500 },
  content: { flex: 1, overflow: "auto" },
};

export default Dashboard;

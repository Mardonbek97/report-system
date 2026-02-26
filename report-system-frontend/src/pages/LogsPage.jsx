import { useState, useEffect, useRef } from "react";

const STATUS_CONFIG = {
  SUCCESS:    { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", label: "Muvaffaqiyat" },
  RUNNING:    { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", label: "Jarayonda"   },
  ERROR:      { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", label: "Xatolik"     },
  PENDING:    { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "Kutilmoqda"  },
  CANCELLED:  { color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", label: "Bekor qilindi" },
};

const fmt = (dt) => {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const duration = (begin, end) => {
  if (!begin || !end) return "—";
  const ms = new Date(end) - new Date(begin);
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", label: status };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color,
        boxShadow: status === "RUNNING" ? `0 0 0 3px ${cfg.border}` : "none",
        animation: status === "RUNNING" ? "pulse 1.4s ease-in-out infinite" : "none",
      }} />
      {cfg.label}
    </span>
  );
};

const ProgressBar = ({ percentage }) => {
  const pct = parseFloat(percentage) || 0;
  const color = pct >= 100 ? "#22c55e" : pct >= 50 ? "#3b82f6" : "#f59e0b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99,
          transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 12, color: "#64748b", fontVariantNumeric: "tabular-nums", minWidth: 34 }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
};

const ReportLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedRow, setExpandedRow] = useState(null);
  const [username, setUsername] = useState("admin");
  const inputRef = useRef();

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/reports/report/logs?username=${encodeURIComponent(username)}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Xatolik: ${res.status} ${res.statusText}`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter((r) => {
    const matchSearch =
      r.reportName?.toLowerCase().includes(search.toLowerCase()) ||
      r.username?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ["ALL", ...Object.keys(STATUS_CONFIG)];

  return (
    <div style={s.wrapper}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        tr.log-row:hover td { background: #f8fafc !important; }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Report Logs</h1>
          <p style={s.subtitle}>Barcha report ijro tarixi va holatlari</p>
        </div>
        <button onClick={fetchLogs} style={s.refreshBtn} title="Yangilash">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          Yangilash
        </button>
      </div>

      {/* Filters */}
      <div style={s.filtersRow}>
        {/* Search */}
        <div style={s.searchWrap}>
          <svg style={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Report nomi yoki foydalanuvchi..."
            style={s.searchInput}
          />
          {search && (
            <button onClick={() => { setSearch(""); inputRef.current?.focus(); }} style={s.clearBtn}>✕</button>
          )}
        </div>

        {/* Username */}
        <div style={s.usernameWrap}>
          <svg style={{ flexShrink: 0, color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            placeholder="username"
            style={s.usernameInput}
          />
          <button onClick={fetchLogs} style={s.goBtn}>Yuborish</button>
        </div>

        {/* Status filter */}
        <div style={s.statusFilter}>
          {statuses.map((st) => {
            const cfg = STATUS_CONFIG[st];
            const active = statusFilter === st;
            return (
              <button key={st} onClick={() => setStatusFilter(st)} style={{
                ...s.filterBtn,
                background: active ? (cfg ? cfg.bg : "#f1f5f9") : "transparent",
                color: active ? (cfg ? cfg.color : "#0f172a") : "#64748b",
                border: `1.5px solid ${active ? (cfg ? cfg.border : "#cbd5e1") : "transparent"}`,
                fontWeight: active ? 700 : 500,
              }}>
                {st === "ALL" ? "Barchasi" : (cfg?.label || st)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <p style={{ color: "#94a3b8", marginTop: 14, fontSize: 14 }}>Yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div style={s.center}>
          <div style={s.errorBox}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <span>{error}</span>
          </div>
        </div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.theadRow}>
                  {["#", "ID", "Report nomi", "Foydalanuvchi", "Boshlanish", "Tugash", "Davomiylik", "Progress", "Holat", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={s.emptyRow}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/>
                        </svg>
                        <span>Log topilmadi</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((r, i) => (
                  <>
                    <tr key={r.id} className="log-row" style={{ ...s.tr, animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}>
                      <td style={{ ...s.td, color: "#94a3b8", fontSize: 12 }}>{i + 1}</td>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>{r.id}</td>
                      <td style={{ ...s.td, fontWeight: 500, color: "#0f172a" }}>{r.reportName || "—"}</td>
                      <td style={s.td}>
                        <span style={s.userChip}>
                          <span style={s.userDot}>{(r.username || "?")[0].toUpperCase()}</span>
                          {r.username || "—"}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#475569" }}>{fmt(r.beginTime)}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#475569" }}>{fmt(r.endTime)}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{duration(r.beginTime, r.endTime)}</td>
                      <td style={s.td}><ProgressBar percentage={r.percentage} /></td>
                      <td style={s.td}><StatusBadge status={r.status} /></td>
                      <td style={s.td}>
                        {r.errorMessage && (
                          <button onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)} style={s.detailBtn} title="Xatolikni ko'rish">
                            {expandedRow === r.id ? "▲" : "▼"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRow === r.id && r.errorMessage && (
                      <tr key={`${r.id}-err`}>
                        <td colSpan={10} style={{ padding: 0, background: "#fef2f2" }}>
                          <div style={s.errorDetail}>
                            <strong style={{ color: "#dc2626", fontSize: 12 }}>Xatolik xabari:</strong>
                            <pre style={s.errorPre}>{r.errorMessage}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.footer}>
            <span>Jami: <strong>{filtered.length}</strong> ta log{search && ` (qidiruv: "${search}")`}</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span>Muvaffaqiyat: <strong style={{ color: "#22c55e" }}>{filtered.filter(r => r.status === "SUCCESS").length}</strong></span>
            <span>Xatolik: <strong style={{ color: "#ef4444" }}>{filtered.filter(r => r.status === "ERROR").length}</strong></span>
            <span>Jarayonda: <strong style={{ color: "#3b82f6" }}>{filtered.filter(r => r.status === "RUNNING").length}</strong></span>
          </div>
        </>
      )}
    </div>
  );
};

const s = {
  wrapper: { padding: 28, height: "100%", overflowY: "auto", boxSizing: "border-box", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" },
  subtitle: { margin: "4px 0 0", fontSize: 13, color: "#94a3b8" },
  refreshBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" },
  filtersRow: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 12px", flex: "1 1 220px", minWidth: 200 },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" },
  clearBtn: { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 },
  usernameWrap: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "6px 10px 6px 12px" },
  usernameInput: { border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent", width: 110 },
  goBtn: { padding: "5px 12px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  statusFilter: { display: "flex", gap: 4, flexWrap: "wrap" },
  filterBtn: { padding: "5px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer", transition: "all 0.15s" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200 },
  spinner: { width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox: { display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 20px", fontSize: 14 },
  tableWrap: { background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 10px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { background: "#f8fafc" },
  th: { padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "13px 14px", fontSize: 13, color: "#334155", verticalAlign: "middle", background: "#fff", transition: "background 0.1s" },
  emptyRow: { textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 13 },
  userChip: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 },
  userDot: { width: 22, height: 22, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailBtn: { border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 },
  errorDetail: { padding: "12px 16px", borderTop: "1px solid #fecaca" },
  errorPre: { margin: "6px 0 0", fontSize: 12, color: "#dc2626", whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#fff", border: "1px solid #fecaca", borderRadius: 6, padding: 10 },
  footer: { marginTop: 12, fontSize: 13, color: "#94a3b8", display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end" },
};

export default ReportLogsPage;

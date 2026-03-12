import { useState, useEffect, useRef } from "react";
import { api } from "../api";

const STATUS_CONFIG = {
  Running:  { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", label: "Jarayonda"   },
  Finished: { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", label: "Muvaffaqiyat" },
  Error:    { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", label: "Xatolik"     },
};

const fmt = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const duration = (begin, end) => {
  if (!begin || !end) return "—";
  const ms = new Date(end) - new Date(begin);
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const getRole = () => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return (payload.role || payload.roles?.[0] || "USER").toString().toUpperCase();
    }
  } catch {}
  return (localStorage.getItem("role") || "USER").toUpperCase();
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", label: status };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, boxShadow: status === "Running" ? `0 0 0 3px ${cfg.border}` : "none", animation: status === "Running" ? "logPulse 1.4s ease-in-out infinite" : "none" }} />
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
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 12, color: "#64748b", minWidth: 34 }}>{pct.toFixed(0)}%</span>
    </div>
  );
};

const Pagination = ({ page, totalPages, totalElements, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  const delta = 1;
  const left = page - delta, right = page + delta;
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || (i >= left && i <= right)) pages.push(i);
    else if (i === left - 1 || i === right + 1) pages.push("...");
  }
  const dedupPages = pages.filter((p, i) => p !== "..." || pages[i - 1] !== "...");
  return (
    <div style={ps.wrap}>
      <span style={ps.info}>Jami: <strong>{totalElements}</strong> ta</span>
      <div style={ps.btns}>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 0} style={{ ...ps.btn, ...(page === 0 ? ps.disabled : {}) }}>‹</button>
        {dedupPages.map((p, i) =>
          p === "..." ? <span key={`dots-${i}`} style={ps.dots}>…</span> :
          <button key={p} onClick={() => onPageChange(p)} style={{ ...ps.btn, ...(p === page ? ps.active : {}) }}>{p + 1}</button>
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} style={{ ...ps.btn, ...(page >= totalPages - 1 ? ps.disabled : {}) }}>›</button>
      </div>
    </div>
  );
};

const ps = {
  wrap:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 },
  info:     { fontSize: 13, color: "#94a3b8" },
  btns:     { display: "flex", gap: 4, alignItems: "center" },
  btn:      { minWidth: 34, height: 34, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  active:   { background: "#2563eb", color: "#fff", border: "1.5px solid #2563eb", fontWeight: 700 },
  disabled: { opacity: 0.35, cursor: "not-allowed" },
  dots:     { padding: "0 4px", color: "#94a3b8", fontSize: 13 },
};

const PAGE_SIZE = 18;

const ReportLogsPage = () => {
  const isAdmin = getRole() === "ROLE_ADMIN";
  const currentUser = localStorage.getItem("username") || "";

  const [logs, setLogs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedRow, setExpandedRow]   = useState(null);
  const [username, setUsername]         = useState(currentUser);
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const inputRef = useRef();

  const fetchLogs = async (uname, p = 0) => {
    const queryUser = isAdmin ? (uname ?? username) : currentUser;
    setLoading(true); setError("");
    try {
      const res = await api.get(
        `/api/reports/report/logs?username=${encodeURIComponent(queryUser)}&page=${p}&size=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error(`Xatolik: ${res.status} ${res.statusText}`);
      const data = await res.json();
      setLogs(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
      setPage(data.number ?? 0);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handlePageChange = (newPage) => fetchLogs(username, newPage);
  const handleSearch = () => { setPage(0); fetchLogs(username, 0); };

  const filtered = logs.filter((r) => {
    const matchSearch = r.reportName?.toLowerCase().includes(search.toLowerCase()) || r.username?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ["ALL", ...Object.keys(STATUS_CONFIG)];

  return (
    <div style={s.wrapper}>
      <style>{`
        @keyframes logPulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes logSpin   { to{transform:rotate(360deg)} }
        @keyframes logFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        tr.log-row:hover td  { background: #f8fafc !important; }
      `}</style>

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Report Logs</h1>
          <p style={s.subtitle}>Barcha report ijro tarixi va holatlari</p>
        </div>
        <button onClick={() => fetchLogs(username, page)} style={s.refreshBtn}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          Yangilash
        </button>
      </div>

      <div style={s.filtersRow}>
        <div style={s.searchWrap}>
          <svg style={{ flexShrink: 0 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input ref={inputRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Report nomi bo'yicha qidirish..." style={s.searchInput} />
          {search && <button onClick={() => { setSearch(""); inputRef.current?.focus(); }} style={s.clearBtn}>✕</button>}
        </div>

        {isAdmin ? (
          <div style={s.usernameWrap}>
            <svg style={{ flexShrink: 0, color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="username kiriting..." style={s.usernameInput} />
            <button onClick={handleSearch} style={s.goBtn}>Qidirish</button>
          </div>
        ) : (
          <div style={{ ...s.usernameWrap, background: "#f8fafc", cursor: "default" }}>
            <svg style={{ flexShrink: 0, color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 600, padding: "2px 4px" }}>{currentUser}</span>
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 2, padding: "2px 8px", background: "#f1f5f9", borderRadius: 6 }}>faqat o'zingiz</span>
          </div>
        )}

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

      {loading ? (
        <div style={s.center}><div style={s.spinner} /><p style={{ color: "#94a3b8", marginTop: 14, fontSize: 14 }}>Yuklanmoqda...</p></div>
      ) : error ? (
        <div style={s.center}><div style={s.errorBox}><span style={{ fontSize: 18 }}>⚠</span><span>{error}</span></div></div>
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
                  <tr><td colSpan={10} style={s.emptyRow}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="9" y1="13" x2="15" y2="13"/>
                        <line x1="9" y1="17" x2="11" y2="17"/>
                      </svg>
                      <span>Log topilmadi</span>
                    </div>
                  </td></tr>
                ) : filtered.map((r, i) => (
                  <>
                    <tr key={r.id} className="log-row" style={{ ...s.tr, animation: `logFadeIn 0.2s ease ${i * 0.03}s both` }}>
                      <td style={{ ...s.td, color: "#94a3b8", fontSize: 12 }}>{page * PAGE_SIZE + i + 1}</td>
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
                          <button onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)} style={s.detailBtn}>
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
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
};

const s = {
  wrapper:      { padding: 14, height: "100%", overflowY: "auto", boxSizing: "border-box", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif" },
  header:       { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  title:        { margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" },
  subtitle:     { margin: "4px 0 0", fontSize: 13, color: "#94a3b8" },
  refreshBtn:   { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  filtersRow:   { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" },
  searchWrap:   { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 12px", flex: "1 1 220px", minWidth: 200 },
  searchInput:  { flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" },
  clearBtn:     { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0 },
  usernameWrap: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "6px 10px 6px 12px" },
  usernameInput:{ border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent", width: 130 },
  goBtn:        { padding: "5px 12px", borderRadius: 7, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  statusFilter: { display: "flex", gap: 4, flexWrap: "wrap" },
  filterBtn:    { padding: "5px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer", transition: "all 0.15s" },
  center:       { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200 },
  spinner:      { width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "logSpin 0.8s linear infinite" },
  errorBox:     { display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 20px", fontSize: 14 },
  tableWrap:    { background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 10px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  table:        { width: "100%", borderCollapse: "collapse" },
  theadRow:     { background: "#f8fafc" },
  th:           { padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr:           { borderBottom: "1px solid #f1f5f9" },
  td:           { padding: "7px 10px", fontSize: 12, color: "#334155", verticalAlign: "middle", background: "#fff", transition: "background 0.1s" },
  emptyRow:     { textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 13 },
  userChip:     { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 },
  userDot:      { width: 18, height: 18, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailBtn:    { border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 },
  errorDetail:  { padding: "12px 16px", borderTop: "1px solid #fecaca" },
  errorPre:     { margin: "6px 0 0", fontSize: 12, color: "#dc2626", whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#fff", border: "1px solid #fecaca", borderRadius: 6, padding: 10 },
};

export default ReportLogsPage;
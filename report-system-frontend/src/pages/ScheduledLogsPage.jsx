import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

const PAGE_SIZE = 18;

const STATUS_COLORS = {
  SUCCESS: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Success" },
  ERROR:   { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Xatolik" },
};
const FORMAT_COLORS = {
  xlsx: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  docx: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  txt:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  zip:  { color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
};

const fmtDate = dt => dt
  ? new Date(dt).toLocaleString("uz-UZ", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" })
  : "—";

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
  if (!status) return <span style={{ color: "#94a3b8", fontSize: 12 }}>Kutilmoqda</span>;
  const cfg = STATUS_COLORS[status] || { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", label: status };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color }} />
      {cfg.label}
    </span>
  );
};

const ScheduledLogsPage = () => {
  const isAdmin = getRole() === "ROLE_ADMIN";

  const [schedules, setSchedules]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId]     = useState(null);
  const [downloading, setDownloading]   = useState({});
  const [downloadErrors, setDownloadErrors] = useState({});

  // Pagination
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchData = useCallback(async (pg = 0, q = "") => {
    setLoading(true); setError("");
    try {
      const res = await api.get(
        `/api/schedules?page=${pg}&size=${PAGE_SIZE}&search=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Yuklashda xatolik");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSchedules(data);
        setTotalPages(1);
        setTotalElements(data.length);
        setPage(0);
      } else {
        setSchedules(data.content ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalElements(data.totalElements ?? 0);
        setPage(data.number ?? 0);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(0, ""); }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      fetchData(0, searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const goPage = (p) => fetchData(p, search);

  const getPageRange = () => {
    const delta = 2, range = [];
    for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++)
      range.push(i);
    return range;
  };

  const handleDownload = async (scheduleId, filePath) => {
    if (!filePath) return;
    setDownloading(prev => ({ ...prev, [scheduleId]: true }));
    setDownloadErrors(prev => ({ ...prev, [scheduleId]: "" }));
    try {
      const res = await api.download(`/api/schedules/download?filePath=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error("Yuklab olishda xatolik: " + res.status);
      const blob = await res.blob();
      const fileName = filePath.split(/[\\/]/).pop();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadErrors(prev => ({ ...prev, [scheduleId]: e.message }));
    } finally {
      setDownloading(prev => ({ ...prev, [scheduleId]: false }));
    }
  };

  // Status filter — frontend da (server search bilan birga)
  const filtered = schedules.filter(sc => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING") return !sc.lastStatus && sc.active;
    if (statusFilter === "PAUSED")  return !sc.active;
    return sc.lastStatus === statusFilter;
  });

  const statuses = ["ALL", "SUCCESS", "ERROR", "PENDING", "PAUSED"];
  const statusLabels = { ALL: "Barchasi", SUCCESS: "Success", ERROR: "Xatolik", PENDING: "Kutilmoqda", PAUSED: "To'xtatilgan" };

  return (
    <div style={s.wrapper}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        tr.slog-row:hover td { background: #f8fafc !important; }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Scheduled Report Logs</h2>
          <p style={s.subtitle}>Avtomatik ishga tushirilgan reportlar tarixi</p>
        </div>
        <button onClick={() => fetchData(page, search)} style={s.refreshBtn}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 21v-5h5"/>
          </svg>
          Yangilash
        </button>
      </div>

      {/* Filters */}
      <div style={s.filtersRow}>
        <div style={s.searchWrap}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Report yoki foydalanuvchi nomi..." style={s.searchInput} />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); fetchData(0, ""); }} style={s.clearBtn}>✕</button>
          )}
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {statuses.map(st => {
            const cfg = STATUS_COLORS[st];
            const active = statusFilter === st;
            return (
              <button key={st} onClick={() => setStatusFilter(st)} style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer", fontWeight: active ? 700 : 500,
                background: active ? (cfg ? cfg.bg : "#f1f5f9") : "transparent",
                color: active ? (cfg ? cfg.color : "#0f172a") : "#64748b",
                border: `1.5px solid ${active ? (cfg ? cfg.border : "#cbd5e1") : "transparent"}`,
              }}>
                {statusLabels[st] || st}
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
          {filtered.length} / {totalElements} ta
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <p style={{ color: "#94a3b8", marginTop: 12, fontSize: 14 }}>Yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div style={s.center}><div style={s.errBox}>⚠ {error}</div></div>
      ) : filtered.length === 0 ? (
        <div style={s.center}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth="1.2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <p style={{ color: "#94a3b8", marginTop: 10, fontSize: 14 }}>Log topilmadi</p>
        </div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {["#", "Report", ...(isAdmin ? ["Foydalanuvchi"] : []), "Jadval", "Oxirgi run", "Holat", "Format", "Fayl", ""].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((sc, i) => {
                  const fc = FORMAT_COLORS[sc.fileFormat] || FORMAT_COLORS.xlsx;
                  const hasFile = !!sc.lastFile;
                  const isDownloading = downloading[sc.id];
                  const dlError = downloadErrors[sc.id];

                  return (
                    <>
                      <tr key={sc.id} className="slog-row"
                        style={{ ...s.tr, animation: `fadeIn 0.2s ease ${i * 0.02}s both` }}>
                        <td style={{ ...s.td, color: "#94a3b8" }}>{page * PAGE_SIZE + i + 1}</td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{sc.repName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                            {sc.cronExpr ? `🔁 ${sc.cronExpr}` : `⏱ ${fmtDate(sc.runAt)}`}
                          </div>
                        </td>
                        {isAdmin && (
                          <td style={s.td}>
                            <span style={s.userChip}>
                              <span style={s.userDot}>{(sc.username || "?")[0].toUpperCase()}</span>
                              {sc.username}
                            </span>
                          </td>
                        )}
                        <td style={s.td}>
                          {(() => {
                            if (!sc.cronExpr && sc.lastRun) {
                              if (sc.lastStatus === "SUCCESS") return <StatusChip color="#16a34a" bg="#f0fdf4" border="#bbf7d0" label="Finished" />;
                              if (sc.lastStatus === "ERROR")   return <StatusChip color="#dc2626" bg="#fef2f2" border="#fecaca" label="Error" />;
                            }
                            if (!sc.active)  return <StatusChip color="#94a3b8" bg="#f8fafc" border="#e2e8f0" label="Paused" />;
                            if (!sc.lastRun) return <StatusChip color="#d97706" bg="#fffbeb" border="#fde68a" label="Pending" />;
                            if (sc.lastStatus === "ERROR") return <StatusChip color="#dc2626" bg="#fef2f2" border="#fecaca" label="Error" />;
                            return <StatusChip color="#2563eb" bg="#eff6ff" border="#bfdbfe" label="Active" spin />;
                          })()}
                        </td>
                        <td style={{ ...s.td, fontSize: 12, color: "#475569" }}>{fmtDate(sc.lastRun)}</td>
                        <td style={s.td}><StatusBadge status={sc.lastStatus} /></td>
                        <td style={s.td}>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}` }}>
                            .{sc.fileFormat}
                          </span>
                        </td>
                        <td style={s.td}>
                          {hasFile ? (
                            <div>
                              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontFamily: "monospace", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                title={sc.lastFile}>
                                📄 {sc.lastFile.split(/[\\/]/).pop()}
                              </div>
                              <button onClick={() => handleDownload(sc.id, sc.lastFile)} disabled={isDownloading}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${fc.border}`, background: isDownloading ? "#f8fafc" : fc.bg, color: isDownloading ? "#94a3b8" : fc.color, opacity: isDownloading ? 0.7 : 1 }}>
                                {isDownloading
                                  ? <><span style={s.btnSpinner} /> Yuklanmoqda...</>
                                  : <><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Yuklab olish</>}
                              </button>
                              {dlError && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 3 }}>⚠ {dlError}</div>}
                            </div>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: 12 }}>{sc.lastStatus === "ERROR" ? "Fayl yaratilmadi" : "—"}</span>
                          )}
                        </td>
                        <td style={s.td}>
                          {sc.lastError && (
                            <button onClick={() => setExpandedId(expandedId === sc.id ? null : sc.id)}
                              style={{ border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>
                              {expandedId === sc.id ? "▲" : "▼"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {expandedId === sc.id && sc.lastError && (
                        <tr key={sc.id + "-err"}>
                          <td colSpan={isAdmin ? 9 : 8} style={{ padding: 0, background: "#fef2f2" }}>
                            <div style={{ padding: "10px 16px", borderTop: "1px solid #fecaca" }}>
                              <strong style={{ fontSize: 12, color: "#dc2626" }}>Xatolik xabari:</strong>
                              <pre style={{ margin: "5px 0 0", fontSize: 12, color: "#dc2626", whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#fff", border: "1px solid #fecaca", borderRadius: 6, padding: 10 }}>
                                {sc.lastError}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <span style={s.pageInfo}>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} / {totalElements} ta
              </span>
              <div style={s.pageButtons}>
                <button onClick={() => goPage(0)} disabled={page === 0}
                  style={{ ...s.pageBtn, ...(page === 0 ? s.pageBtnDisabled : {}) }}>«</button>
                <button onClick={() => goPage(page - 1)} disabled={page === 0}
                  style={{ ...s.pageBtn, ...(page === 0 ? s.pageBtnDisabled : {}) }}>‹</button>
                {getPageRange()[0] > 0 && <span style={s.ellipsis}>…</span>}
                {getPageRange().map(p => (
                  <button key={p} onClick={() => goPage(p)}
                    style={{ ...s.pageBtn, ...(p === page ? s.pageBtnActive : {}) }}>
                    {p + 1}
                  </button>
                ))}
                {getPageRange()[getPageRange().length - 1] < totalPages - 1 && <span style={s.ellipsis}>…</span>}
                <button onClick={() => goPage(page + 1)} disabled={page >= totalPages - 1}
                  style={{ ...s.pageBtn, ...(page >= totalPages - 1 ? s.pageBtnDisabled : {}) }}>›</button>
                <button onClick={() => goPage(totalPages - 1)} disabled={page >= totalPages - 1}
                  style={{ ...s.pageBtn, ...(page >= totalPages - 1 ? s.pageBtnDisabled : {}) }}>»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Mini status chip helper
const StatusChip = ({ color, bg, border, label, spin }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: bg, color, border: `1px solid ${border}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, ...(spin ? { animation: "spin 1.5s linear infinite" } : {}) }} />
    {label}
  </span>
);

const s = {
  wrapper:    { padding: "16px 20px", height: "100%", overflowY: "auto", boxSizing: "border-box", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header:     { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 },
  title:      { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" },
  subtitle:   { margin: "3px 0 0", fontSize: 12, color: "#94a3b8" },
  refreshBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  filtersRow: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "7px 12px", flex: "1 1 220px", minWidth: 200 },
  searchInput:{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" },
  clearBtn:   { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0 },
  center:     { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260 },
  spinner:    { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errBox:     { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 20px", fontSize: 14 },
  tableWrap:  { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse" },
  thead:      { background: "#f8fafc" },
  th:         { padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr:         { borderBottom: "1px solid #f1f5f9", background: "#fff" },
  td:         { padding: "10px 12px", fontSize: 13, color: "#334155", verticalAlign: "middle", background: "inherit", transition: "background 0.1s" },
  userChip:   { display: "inline-flex", alignItems: "center", gap: 6 },
  userDot:    { width: 20, height: 20, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  btnSpinner: { width: 10, height: 10, border: "2px solid #e2e8f0", borderTop: "2px solid #94a3b8", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  pagination:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 },
  pageInfo:        { fontSize: 12, color: "#64748b" },
  pageButtons:     { display: "flex", alignItems: "center", gap: 4 },
  pageBtn:         { minWidth: 32, height: 32, padding: "0 8px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  pageBtnActive:   { background: "#2563eb", color: "#fff", border: "1.5px solid #2563eb" },
  pageBtnDisabled: { opacity: 0.35, cursor: "not-allowed" },
  ellipsis:        { fontSize: 14, color: "#94a3b8", padding: "0 4px" },
};

export default ScheduledLogsPage;
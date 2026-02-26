import { useState, useEffect } from "react";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Accept-Language": "UZ",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const GenerateReportPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("http://localhost:8080/api/reports", {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Ma'lumotlarni yuklashda xatolik");
        const data = await res.json();
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const filtered = reports.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (report) => {
    // Report ma'lumotini localStorage ga saqlab yangi tab ochamiz
    localStorage.setItem(`exec_report_${report.id}`, JSON.stringify(report));
    window.open(`/report-execute.html?repId=${report.id}`, "_blank");
  };

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: "#94a3b8", marginTop: 16 }}>Yuklanmoqda...</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={s.errorBox}>⚠ {error}</div>
    </div>
  );

  return (
    <div style={s.wrapper}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Generate Report</h2>
          <p style={s.pageSubtitle}>Reportni tanlang — yangi oynada parametrlarni kiriting va ishga tushiring</p>
        </div>
        <div style={s.reportCount}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {reports.length} ta report
        </div>
      </div>

      {/* Search */}
      <div style={s.searchBar}>
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Report nomi bo'yicha qidirish..."
          style={s.searchInput}
        />
        {search && <button onClick={() => setSearch("")} style={s.clearBtn}>✕</button>}
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.theadRow}>
              <th style={s.th}>#</th>
              <th style={s.th}>Report nomi</th>
              <th style={s.th}>Amal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} style={s.emptyRow}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#e2e8f0" style={{ display: "block", margin: "0 auto 10px" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Report topilmadi
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={r.id} style={s.tr}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <td style={{ ...s.td, width: 56 }}>
                    <span style={s.idBadge}>{i + 1}</span>
                  </td>
                  <td style={s.td}>
                    <div style={s.reportCell}>
                      <div style={s.reportIcon}>
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div style={s.reportName}>{r.name}</div>
                        {r.description && <div style={s.reportDesc}>{r.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...s.td, width: 160 }}>
                    <button onClick={() => handleOpen(r)} style={s.openBtn}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ochish
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={s.tableFooter}>
        Jami: <strong>{filtered.length}</strong> ta report
        {search && ` (qidiruv: "${search}")`}
      </div>
    </div>
  );
};

const s = {
  wrapper: { padding: 32, height: "100%", overflowY: "auto", boxSizing: "border-box" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" },
  spinner: { width: 38, height: 38, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "grSpin 0.8s linear infinite" },
  errorBox: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "16px 24px", fontSize: 14 },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  pageSubtitle: { margin: "4px 0 0", fontSize: 13, color: "#94a3b8" },
  reportCount: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#2563eb" },
  searchBar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 16px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent" },
  clearBtn: { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: 0 },
  tableWrap: { background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" },
  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { background: "#f8fafc" },
  th: { padding: "13px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background 0.1s", background: "#fff", cursor: "default" },
  td: { padding: "14px 16px", fontSize: 14, color: "#334155", verticalAlign: "middle" },
  idBadge: { display: "inline-block", width: 28, height: 28, borderRadius: 8, background: "#f1f5f9", color: "#64748b", fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: "28px" },
  reportCell: { display: "flex", alignItems: "center", gap: 12 },
  reportIcon: { width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  reportName: { fontWeight: 600, color: "#0f172a", fontSize: 14 },
  reportDesc: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  openBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "1.5px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a",
    borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700,
    cursor: "pointer", transition: "all 0.15s",
  },
  emptyRow: { textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 },
  tableFooter: { marginTop: 12, fontSize: 13, color: "#94a3b8", textAlign: "right" },
};

// CSS animation
const st = document.createElement("style");
st.id = "gr-styles";
st.innerHTML = `@keyframes grSpin{to{transform:rotate(360deg)}}`;
if (!document.getElementById("gr-styles")) document.head.appendChild(st);

export default GenerateReportPage;

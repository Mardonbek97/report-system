import { useState, useEffect } from "react";

const ReportPages = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedReport, setSelectedReport] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [userSearch, setUserSearch] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true); setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8080/api/reports", {
          headers: { "Content-Type": "application/json", "Accept-Language": "UZ", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) throw new Error("Ma'lumotlarni yuklashda xatolik");
        setReports(await res.json());
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchReports();
  }, []);

  const filtered = reports.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()));

  const openReportModal = async (report) => {
    setSelectedReport(report); setSelectedIds(new Set()); setUserSearch("");
    setSaveError(""); setSaveSuccess(""); setUsersLoading(true); setUsersError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/admin/userslist", {
        headers: { "Content-Type": "application/json", "Accept-Language": "UZ", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("Foydalanuvchilarni yuklashda xatolik");
      setUsers(await res.json());
    } catch (err) { setUsersError(err.message); }
    finally { setUsersLoading(false); }
  };

  const closeReportModal = () => {
    if (saveLoading) return;
    setSelectedReport(null); setUsers([]); setSelectedIds(new Set());
    setUserSearch(""); setSaveError(""); setSaveSuccess("");
  };

  const toggleUser = (id) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setSaveError(""); setSaveSuccess("");
  };

  const filteredUsers = users.filter(
    (u) => u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const allVisible = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      allVisible ? filteredUsers.forEach((u) => n.delete(u.id)) : filteredUsers.forEach((u) => n.add(u.id));
      return n;
    });
    setSaveError(""); setSaveSuccess("");
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) { setSaveError("Kamida 1 ta foydalanuvchi tanlang"); return; }
    setSaveLoading(true); setSaveError(""); setSaveSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/access/addReport", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": "UZ", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userIds: Array.from(selectedIds), repId: selectedReport.id }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setSaveSuccess(text || "Muvaffaqiyatli saqlandi!");
      setTimeout(() => closeReportModal(), 1600);
    } catch (err) { setSaveError(err.message); }
    finally { setSaveLoading(false); }
  };

  if (loading) return (
    <div style={s.center}><div style={s.spinner} /><p style={{ color: "#94a3b8", marginTop: 12, fontSize: 13 }}>Yuklanmoqda...</p></div>
  );
  if (error) return (
    <div style={s.center}><div style={s.errorBox}>⚠ {error}</div></div>
  );

  return (
    <div style={s.wrapper}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Reportlar</h2>
          <p style={s.pageSubtitle}>Reportni tanlang va foydalanuvchilarga ulang</p>
        </div>
      </div>

      <div style={s.searchBar}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
        </svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Report nomi bo'yicha qidirish..." style={s.searchInput} />
        {search && <button onClick={() => setSearch("")} style={s.clearBtn}>✕</button>}
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.theadRow}>
              {["#", "Report nomi", "Amal"].map((h) => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} style={s.emptyRow}>Report topilmadi</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id} style={s.tr}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                <td style={s.td}><span style={s.idBadge}>{i + 1}</span></td>
                <td style={s.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={s.reportIcon}>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span style={s.reportName}>{r.name}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <button onClick={() => openReportModal(r)} style={s.assignBtn}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ulash
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.tableFooter}>Jami: <strong>{filtered.length}</strong> ta report{search && ` (qidiruv: "${search}")`}</div>

      {selectedReport && (
        <div style={s.overlay} onClick={closeReportModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={s.modalIconWrap}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.modalTitle}>{selectedReport.name}</div>
                <div style={s.modalSub}>Foydalanuvchilarni tanlang</div>
              </div>
              <button style={s.modalClose} onClick={closeReportModal}>✕</button>
            </div>

            <div style={s.modalToolbar}>
              <div style={s.userSearchWrap}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Qidirish..." style={s.userSearchInput} />
                {userSearch && <button onClick={() => setUserSearch("")} style={s.clearBtn}>✕</button>}
              </div>
              <button onClick={toggleAll} style={allVisible ? s.deselectAllBtn : s.selectAllBtn} disabled={filteredUsers.length === 0}>
                {allVisible ? "Hammasini olib tashlash" : "Hammasini tanlash"}
              </button>
            </div>

            {selectedIds.size > 0 && (
              <div style={s.selectedBadge}>✓ {selectedIds.size} ta tanlangan</div>
            )}

            <div style={s.userList}>
              {usersLoading ? (
                <div style={s.usersCenter}><div style={s.spinner} /></div>
              ) : usersError ? (
                <div style={{ ...s.modalError, margin: 12 }}>⚠ {usersError}</div>
              ) : filteredUsers.length === 0 ? (
                <div style={s.usersCenter}><p style={{ color: "#94a3b8", fontSize: 13 }}>Foydalanuvchi topilmadi</p></div>
              ) : filteredUsers.map((user) => {
                const isSelected = selectedIds.has(user.id);
                return (
                  <div key={user.id}
                    style={{ ...s.userRow, background: isSelected ? "#eff6ff" : "#fff", borderColor: isSelected ? "#bfdbfe" : "#f1f5f9" }}
                    onClick={() => toggleUser(user.id)}>
                    <div style={{ ...s.checkbox, background: isSelected ? "#2563eb" : "#fff", borderColor: isSelected ? "#2563eb" : "#cbd5e1" }}>
                      {isSelected && <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div style={s.userAvatar}>{user.username?.[0]?.toUpperCase() || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.userName}>{user.username}</div>
                      <div style={s.userEmail}>{user.email}</div>
                    </div>
                    <span style={{ ...s.statusBadge, ...(user.status === "ACTIVE" ? s.statusActive : user.status === "BLOCKED" ? s.statusBlocked : s.statusInactive) }}>
                      {user.status}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={s.modalFooter}>
              {saveError && <div style={{ ...s.modalError, flex: 1, marginTop: 0 }}>⚠ {saveError}</div>}
              {saveSuccess && <div style={{ ...s.modalSuccess, flex: 1, marginTop: 0 }}>✓ {saveSuccess}</div>}
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button style={s.cancelBtn} onClick={closeReportModal} disabled={saveLoading}>Bekor qilish</button>
                <button style={{ ...s.saveBtn, opacity: saveLoading || selectedIds.size === 0 ? 0.6 : 1 }} onClick={handleSave} disabled={saveLoading || selectedIds.size === 0}>
                  {saveLoading
                    ? <><span style={s.btnSpinner} /> Saqlanmoqda...</>
                    : <>✓ Saqlash {selectedIds.size > 0 && `(${selectedIds.size})`}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  wrapper:    { padding: "16px 20px", height: "100%", overflowY: "auto", boxSizing: "border-box" },
  center:     { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" },
  spinner:    { width: 30, height: 30, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox:   { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 20px", fontSize: 13 },

  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  pageTitle:  { margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" },
  pageSubtitle: { margin: "2px 0 0", fontSize: 12, color: "#94a3b8" },

  searchBar:   { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "6px 10px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" },
  clearBtn:    { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0 },

  tableWrap: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  table:     { width: "100%", borderCollapse: "collapse" },
  theadRow:  { background: "#f8fafc" },
  th:        { padding: "6px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" },
  tr:        { borderBottom: "1px solid #f1f5f9", transition: "background 0.1s", background: "#fff" },
  td:        { padding: "6px 12px", fontSize: 12, color: "#334155", verticalAlign: "middle" },
  idBadge:   { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: "#f1f5f9", color: "#64748b", fontSize: 11, fontWeight: 700 },
  reportIcon:  { width: 24, height: 24, borderRadius: 6, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  reportName:  { fontWeight: 600, color: "#0f172a", fontSize: 13 },
  assignBtn:   { display: "inline-flex", alignItems: "center", gap: 4, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 7, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  emptyRow:    { textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 },
  tableFooter: { marginTop: 8, fontSize: 12, color: "#94a3b8", textAlign: "right" },

  overlay:  { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:    { background: "#fff", borderRadius: 18, width: 480, maxWidth: "94vw", maxHeight: "86vh", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader:   { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 },
  modalIconWrap: { width: 36, height: 36, borderRadius: 9, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  modalTitle:    { fontSize: 15, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  modalSub:      { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  modalClose:    { border: "none", background: "#f1f5f9", borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  modalToolbar:   { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 },
  userSearchWrap: { display: "flex", alignItems: "center", gap: 7, flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "6px 10px" },
  userSearchInput: { flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" },

  selectAllBtn:   { display: "inline-flex", alignItems: "center", gap: 4, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  deselectAllBtn: { display: "inline-flex", alignItems: "center", gap: 4, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  selectedBadge:  { display: "flex", alignItems: "center", gap: 5, margin: "6px 14px 0", padding: "4px 10px", background: "#dcfce7", color: "#16a34a", borderRadius: 7, fontSize: 11, fontWeight: 600, width: "fit-content" },

  userList:   { flex: 1, overflowY: "auto", padding: "4px 0" },
  usersCenter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 },
  userRow:    { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", borderBottom: "1px solid", transition: "background 0.1s" },
  checkbox:   { width: 16, height: 16, borderRadius: 4, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" },
  userAvatar: { width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userName:   { fontSize: 13, fontWeight: 600, color: "#0f172a" },
  userEmail:  { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  statusBadge:   { display: "inline-block", padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 600, flexShrink: 0 },
  statusActive:  { background: "#dcfce7", color: "#16a34a" },
  statusBlocked: { background: "#fef2f2", color: "#dc2626" },
  statusInactive: { background: "#f1f5f9", color: "#64748b" },

  modalFooter: { display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", flexShrink: 0 },
  modalError:  { padding: "6px 10px", background: "#fef2f2", color: "#dc2626", borderRadius: 7, fontSize: 12, border: "1px solid #fecaca" },
  modalSuccess: { padding: "6px 10px", background: "#dcfce7", color: "#16a34a", borderRadius: 7, fontSize: 12, border: "1px solid #bbf7d0" },
  cancelBtn:   { border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  saveBtn:     { border: "none", background: "linear-gradient(135deg, #2563eb, #7c3aed)", borderRadius: 8, padding: "6px 16px", fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 },
  btnSpinner:  { width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
};

const styleTag = document.createElement("style");
styleTag.innerHTML = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
`;
if (!document.getElementById("report-page-styles")) {
  styleTag.id = "report-page-styles";
  document.head.appendChild(styleTag);
}

export default ReportPages;
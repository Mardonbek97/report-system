import { useState, useEffect } from "react";

const ReportPages = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Report users modal
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
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8080/api/reports", {
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": "UZ",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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

  const filtered = reports.filter(
    (r) => r.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Open report modal & fetch users ─────────────────────
  const openReportModal = async (report) => {
    setSelectedReport(report);
    setSelectedIds(new Set());
    setUserSearch("");
    setSaveError("");
    setSaveSuccess("");
    setUsersLoading(true);
    setUsersError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/admin/userslist", {
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "UZ",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Foydalanuvchilarni yuklashda xatolik");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setUsersError(err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const closeReportModal = () => {
    if (saveLoading) return;
    setSelectedReport(null);
    setUsers([]);
    setSelectedIds(new Set());
    setUserSearch("");
    setSaveError("");
    setSaveSuccess("");
  };

  // ── Select logic ─────────────────────────────────────────
  const toggleUser = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaveError("");
    setSaveSuccess("");
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const allVisible = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));

  const toggleAll = () => {
    if (allVisible) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredUsers.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredUsers.forEach((u) => next.add(u.id));
        return next;
      });
    }
    setSaveError("");
    setSaveSuccess("");
  };

  // ── Save / Add Report ────────────────────────────────────
  const handleSave = async () => {
    if (selectedIds.size === 0) {
      setSaveError("Kamida 1 ta foydalanuvchi tanlang");
      return;
    }
    setSaveLoading(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/access/addReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "UZ",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          repId: selectedReport.id,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setSaveSuccess(text || "Muvaffaqiyatli saqlandi!");
      setTimeout(() => closeReportModal(), 1600);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────
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
          <h2 style={s.pageTitle}>Reportlar</h2>
          <p style={s.pageSubtitle}>Reportni tanlang va foydalanuvchilarga ulang</p>
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
              {["#", "Report nomi", "Amal"].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} style={s.emptyRow}>Report topilmadi</td></tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  style={s.tr}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <td style={s.td}><span style={s.idBadge}>{i + 1}</span></td>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={s.reportIcon}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span style={s.reportName}>{r.name}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <button
                      onClick={() => openReportModal(r)}
                      style={s.assignBtn}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Ulash
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

      {/* ── Users Assignment Modal ── */}
      {selectedReport && (
        <div style={s.overlay} onClick={closeReportModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={s.modalHeader}>
              <div style={s.modalIconWrap}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.modalTitle}>{selectedReport.name}</div>
                <div style={s.modalSub}>Foydalanuvchilarni tanlang</div>
              </div>
              <button style={s.modalClose} onClick={closeReportModal}>✕</button>
            </div>

            {/* User search + select all */}
            <div style={s.modalToolbar}>
              <div style={s.userSearchWrap}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Qidirish..."
                  style={s.userSearchInput}
                />
                {userSearch && <button onClick={() => setUserSearch("")} style={s.clearBtn}>✕</button>}
              </div>
              <button
                onClick={toggleAll}
                style={allVisible ? s.deselectAllBtn : s.selectAllBtn}
                disabled={filteredUsers.length === 0}
              >
                {allVisible ? (
                  <>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Hammasini olib tashlash
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hammasini tanlash
                  </>
                )}
              </button>
            </div>

            {/* Selected count badge */}
            {selectedIds.size > 0 && (
              <div style={s.selectedBadge}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {selectedIds.size} ta tanlangan
              </div>
            )}

            {/* Users list */}
            <div style={s.userList}>
              {usersLoading ? (
                <div style={s.usersCenter}>
                  <div style={s.spinner} />
                  <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>Yuklanmoqda...</p>
                </div>
              ) : usersError ? (
                <div style={{ ...s.modalError, margin: 16 }}>⚠ {usersError}</div>
              ) : filteredUsers.length === 0 ? (
                <div style={s.usersCenter}>
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>Foydalanuvchi topilmadi</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      style={{ ...s.userRow, background: isSelected ? "#eff6ff" : "#fff", borderColor: isSelected ? "#bfdbfe" : "#f1f5f9" }}
                      onClick={() => toggleUser(user.id)}
                    >
                      {/* Checkbox */}
                      <div style={{ ...s.checkbox, background: isSelected ? "#2563eb" : "#fff", borderColor: isSelected ? "#2563eb" : "#cbd5e1" }}>
                        {isSelected && (
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#fff">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Avatar */}
                      <div style={s.userAvatar}>{user.username?.[0]?.toUpperCase() || "?"}</div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.userName}>{user.username}</div>
                        <div style={s.userEmail}>{user.email}</div>
                      </div>
                      {/* Status */}
                      <span style={{ ...s.statusBadge, ...(user.status === "ACTIVE" ? s.statusActive : user.status === "BLOCKED" ? s.statusBlocked : s.statusInactive) }}>
                        {user.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={s.modalFooter}>
              {saveError && <div style={{ ...s.modalError, flex: 1, marginTop: 0 }}>⚠ {saveError}</div>}
              {saveSuccess && <div style={{ ...s.modalSuccess, flex: 1, marginTop: 0 }}>✓ {saveSuccess}</div>}
              <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                <button style={s.cancelBtn} onClick={closeReportModal} disabled={saveLoading}>Bekor qilish</button>
                <button
                  style={{ ...s.saveBtn, opacity: saveLoading || selectedIds.size === 0 ? 0.6 : 1 }}
                  onClick={handleSave}
                  disabled={saveLoading || selectedIds.size === 0}
                >
                  {saveLoading
                    ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={s.btnSpinner} /> Saqlanmoqda...</span>
                    : <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Saqlash {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </>
                  }
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
  wrapper: { padding: 32, height: "100%", overflowY: "auto", boxSizing: "border-box" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" },
  spinner: { width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "16px 24px", fontSize: 14 },

  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  pageSubtitle: { margin: "2px 0 0", fontSize: 13, color: "#94a3b8" },

  searchBar: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 16px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent" },
  clearBtn: { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: 0 },

  tableWrap: { background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" },
  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { background: "#f8fafc" },
  th: { padding: "13px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background 0.1s", background: "#fff" },
  td: { padding: "14px 16px", fontSize: 14, color: "#334155", verticalAlign: "middle" },
  idBadge: { display: "inline-block", width: 24, height: 24, borderRadius: 6, background: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: "24px" },
  reportIcon: { width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  reportName: { fontWeight: 600, color: "#0f172a" },
  assignBtn: { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  emptyRow: { textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 },
  tableFooter: { marginTop: 12, fontSize: 13, color: "#94a3b8", textAlign: "right" },

  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 20, width: 500, maxWidth: "94vw", maxHeight: "88vh", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", animation: "modalIn 0.2s ease", overflow: "hidden" },
  modalHeader: { display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 },
  modalIconWrap: { width: 42, height: 42, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  modalSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  modalClose: { border: "none", background: "#f1f5f9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  modalToolbar: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 },
  userSearchWrap: { display: "flex", alignItems: "center", gap: 8, flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px" },
  userSearchInput: { flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" },

  selectAllBtn: { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  deselectAllBtn: { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },

  selectedBadge: { display: "flex", alignItems: "center", gap: 6, margin: "8px 16px 0", padding: "6px 12px", background: "#dcfce7", color: "#16a34a", borderRadius: 8, fontSize: 12, fontWeight: 600, width: "fit-content" },

  userList: { flex: 1, overflowY: "auto", padding: "8px 0" },
  usersCenter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 },

  userRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid", transition: "background 0.1s" },
  checkbox: { width: 18, height: 18, borderRadius: 5, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" },
  userAvatar: { width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userName: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
  userEmail: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  statusBadge: { display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 },
  statusActive: { background: "#dcfce7", color: "#16a34a" },
  statusBlocked: { background: "#fef2f2", color: "#dc2626" },
  statusInactive: { background: "#f1f5f9", color: "#64748b" },

  modalFooter: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", flexShrink: 0 },
  modalError: { padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13, border: "1px solid #fecaca" },
  modalSuccess: { padding: "8px 12px", background: "#dcfce7", color: "#16a34a", borderRadius: 8, fontSize: 13, border: "1px solid #bbf7d0" },
  cancelBtn: { border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "8px 18px", fontSize: 13, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  saveBtn: { border: "none", background: "linear-gradient(135deg, #2563eb, #7c3aed)", borderRadius: 10, padding: "8px 20px", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 },
  btnSpinner: { width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
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

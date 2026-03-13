import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

const PAGE_SIZE = 18;

const UsersPage = () => {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Pagination
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalUser, setModalUser]   = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError]   = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const [blockTarget, setBlockTarget] = useState(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError]   = useState("");

  const [addModal, setAddModal]     = useState(false);
  const [addForm, setAddForm]       = useState({ username: "", mail: "", password: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const fetchUsers = useCallback(async (pg = page, q = search) => {
    setLoading(true); setError("");
    try {
      const res = await api.get(
        `/api/admin/userslist?page=${pg}&size=${PAGE_SIZE}&search=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Ma'lumotlarni yuklashda xatolik");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(1);
        setTotalElements(data.length);
        setPage(0);
      } else {
        setUsers(data.content ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalElements(data.totalElements ?? 0);
        setPage(data.number ?? 0);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(0, ""); }, []);

  // Search — 400ms debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      fetchUsers(0, searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const goPage = (p) => { fetchUsers(p, search); };

  // Pagination range helper
  const getPageRange = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }
    return range;
  };

  const statusColor = (status) => {
    const map = {
      ACTIVE:   { bg: "#dcfce7", color: "#16a34a" },
      CLOSED:   { bg: "#f1f5f9", color: "#64748b" },
      BLOCKED:  { bg: "#fef2f2", color: "#dc2626" },
    };
    return map[status] || { bg: "#f1f5f9", color: "#64748b" };
  };

  const roleColor = (role) => {
    const map = {
      ADMIN:   { bg: "#ede9fe", color: "#7c3aed" },
      USER:    { bg: "#dbeafe", color: "#2563eb" },
      MANAGER: { bg: "#fef9c3", color: "#ca8a04" },
    };
    return map[role] || { bg: "#f1f5f9", color: "#64748b" };
  };

  const formatDate = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleDateString("uz-UZ", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  const openModal    = (user) => { setModalUser(user); setNewPassword(""); setModalError(""); setModalSuccess(""); };
  const closeModal   = () => { if (modalLoading) return; setModalUser(null); };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 7) { setModalError("Parol kamida 7 ta belgidan iborat bo'lishi kerak"); return; }
    setModalLoading(true); setModalError(""); setModalSuccess("");
    try {
      const res = await api.post("/api/admin/update", { username: modalUser.username, password: newPassword });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setModalSuccess(text || "Muvaffaqiyatli yangilandi!");
      setTimeout(() => closeModal(), 1500);
    } catch (err) { setModalError(err.message); }
    finally { setModalLoading(false); }
  };

  const openBlockConfirm = (e, user) => {
    e.stopPropagation();
    setBlockTarget({ user, action: user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED" });
    setBlockError("");
  };
  const closeBlockModal = () => { if (blockLoading) return; setBlockTarget(null); setBlockError(""); };

  const handleBlockUser = async () => {
    setBlockLoading(true); setBlockError("");
    try {
      const res = await api.post("/api/admin/block", {
        username: blockTarget.user.username, statusEnum: blockTarget.action,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setUsers(prev => prev.map(u =>
        u.username === blockTarget.user.username ? { ...u, status: blockTarget.action } : u
      ));
      closeBlockModal();
    } catch (err) { setBlockError(err.message); }
    finally { setBlockLoading(false); }
  };

  const openAddModal  = () => { setAddForm({ username: "", mail: "", password: "" }); setAddError(""); setAddSuccess(""); setAddModal(true); };
  const closeAddModal = () => { if (addLoading) return; setAddModal(false); };

  const handleAddUser = async () => {
    if (!addForm.username.trim()) { setAddError("Username kiritilishi shart"); return; }
    if (!addForm.mail.trim() || !addForm.mail.includes("@")) { setAddError("To'g'ri email kiriting"); return; }
    if (!addForm.password || addForm.password.length < 7) { setAddError("Parol kamida 7 ta belgidan iborat bo'lishi kerak"); return; }
    setAddLoading(true); setAddError(""); setAddSuccess("");
    try {
      const res = await api.post("/api/admin/add", {
        username: addForm.username, mail: addForm.mail, password: addForm.password,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setAddSuccess(text || "Foydalanuvchi muvaffaqiyatli qo'shildi!");
      fetchUsers(0, search);
      setTimeout(() => closeAddModal(), 1500);
    } catch (err) { setAddError(err.message); }
    finally { setAddLoading(false); }
  };

  return (
    <div style={s.wrapper}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Foydalanuvchilar</h2>
          <p style={s.pageSubtitle}>
            Jami <strong>{totalElements}</strong> ta foydalanuvchi
          </p>
        </div>
        <button style={s.addBtn} onClick={openAddModal}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Foydalanuvchi qo'shish
        </button>
      </div>

      {/* Search */}
      <div style={s.searchBar}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
        </svg>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Username yoki email bo'yicha qidirish..."
          style={s.searchInput}
        />
        {searchInput && (
          <button onClick={() => { setSearchInput(""); setSearch(""); fetchUsers(0, ""); }} style={s.clearBtn}>✕</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <p style={{ color: "#94a3b8", marginTop: 16 }}>Yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div style={s.center}><div style={s.errorBox}>⚠ {error}</div></div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.theadRow}>
                  {["#", "Username", "Email", "Status", "Role", "Yaratilgan", "Amal"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} style={s.emptyRow}>Foydalanuvchi topilmadi</td></tr>
                ) : users.map((user, i) => {
                  const sc = statusColor(user.status);
                  const rc = roleColor(user.role);
                  const isBlocked = user.status === "BLOCKED";
                  return (
                    <tr key={user.id} style={{ ...s.tr, cursor: "pointer" }}
                      onClick={() => openModal(user)}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      <td style={s.td}>
                        <span style={s.idBadge}>{page * PAGE_SIZE + i + 1}</span>
                      </td>
                      <td style={s.td}>
                        <div style={s.userCell}>
                          <div style={s.userAvatar}>{user.username?.[0]?.toUpperCase() || "?"}</div>
                          <span style={s.usernameText}>{user.username}</span>
                        </div>
                      </td>
                      <td style={s.td}><span style={s.emailText}>{user.email}</span></td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>{user.status}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: rc.bg, color: rc.color }}>{user.role}</span>
                      </td>
                      <td style={s.td}><span style={s.dateText}>{formatDate(user.createdAt)}</span></td>
                      <td style={s.td}>
                        <button onClick={e => openBlockConfirm(e, user)}
                          style={isBlocked ? s.unblockBtn : s.blockBtn}>
                          {isBlocked
                            ? <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Ochish</>
                            : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> Bloklash</>}
                        </button>
                      </td>
                    </tr>
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
                {/* First */}
                <button onClick={() => goPage(0)} disabled={page === 0} style={{ ...s.pageBtn, ...(page === 0 ? s.pageBtnDisabled : {}) }}>«</button>
                {/* Prev */}
                <button onClick={() => goPage(page - 1)} disabled={page === 0} style={{ ...s.pageBtn, ...(page === 0 ? s.pageBtnDisabled : {}) }}>‹</button>

                {/* Ellipsis left */}
                {getPageRange()[0] > 0 && (
                  <span style={s.ellipsis}>…</span>
                )}

                {/* Page numbers */}
                {getPageRange().map(p => (
                  <button key={p} onClick={() => goPage(p)}
                    style={{ ...s.pageBtn, ...(p === page ? s.pageBtnActive : {}) }}>
                    {p + 1}
                  </button>
                ))}

                {/* Ellipsis right */}
                {getPageRange()[getPageRange().length - 1] < totalPages - 1 && (
                  <span style={s.ellipsis}>…</span>
                )}

                {/* Next */}
                <button onClick={() => goPage(page + 1)} disabled={page >= totalPages - 1}
                  style={{ ...s.pageBtn, ...(page >= totalPages - 1 ? s.pageBtnDisabled : {}) }}>›</button>
                {/* Last */}
                <button onClick={() => goPage(totalPages - 1)} disabled={page >= totalPages - 1}
                  style={{ ...s.pageBtn, ...(page >= totalPages - 1 ? s.pageBtnDisabled : {}) }}>»</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Password Modal */}
      {modalUser && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={s.modalAvatar}>{modalUser.username?.[0]?.toUpperCase() || "?"}</div>
              <div>
                <div style={s.modalTitle}>New Password</div>
                <div style={s.modalSub}>@{modalUser.username}</div>
              </div>
              <button style={s.modalClose} onClick={closeModal}>✕</button>
            </div>
            <div style={s.modalBody}>
              <label style={s.label}>Yangi parol</label>
              <div style={s.inputWrap}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input type="password" value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setModalError(""); setModalSuccess(""); }}
                  onKeyDown={e => e.key === "Enter" && handleUpdatePassword()}
                  placeholder="Kamida 7 ta belgi..." style={s.modalInput} autoFocus />
              </div>
              {modalError   && <div style={s.modalError}>⚠ {modalError}</div>}
              {modalSuccess && <div style={s.modalSuccess}>✓ {modalSuccess}</div>}
              <div style={s.modalHint}>Parol kamida <strong>7 ta belgi</strong>dan iborat bo'lishi kerak</div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeModal} disabled={modalLoading}>Bekor qilish</button>
              <button style={{ ...s.saveBtn, opacity: modalLoading ? 0.7 : 1 }}
                onClick={handleUpdatePassword} disabled={modalLoading}>
                {modalLoading
                  ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={s.btnSpinner} /> Saqlanmoqda...</span>
                  : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockTarget && (
        <div style={s.overlay} onClick={closeBlockModal}>
          <div style={{ ...s.modal, width: 380 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: blockTarget.action === "BLOCKED" ? "#fef2f2" : "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {blockTarget.action === "BLOCKED"
                  ? <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#dc2626"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  : <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#16a34a"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              </div>
              <div>
                <div style={s.modalTitle}>{blockTarget.action === "BLOCKED" ? "Foydalanuvchini bloklash" : "Blokdan chiqarish"}</div>
                <div style={s.modalSub}>@{blockTarget.user.username}</div>
              </div>
              <button style={s.modalClose} onClick={closeBlockModal}>✕</button>
            </div>
            <div style={s.modalBody}>
              <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                {blockTarget.action === "BLOCKED"
                  ? <><strong>@{blockTarget.user.username}</strong> foydalanuvchini bloklashni tasdiqlaysizmi?</>
                  : <><strong>@{blockTarget.user.username}</strong> foydalanuvchini blokdan chiqarishni tasdiqlaysizmi?</>}
              </p>
              {blockError && <div style={{ ...s.modalError, marginTop: 14 }}>⚠ {blockError}</div>}
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeBlockModal} disabled={blockLoading}>Bekor qilish</button>
              <button disabled={blockLoading} onClick={handleBlockUser}
                style={{ ...s.saveBtn, background: blockTarget.action === "BLOCKED" ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#22c55e,#16a34a)", opacity: blockLoading ? 0.7 : 1 }}>
                {blockLoading
                  ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={s.btnSpinner} /> Bajarilmoqda...</span>
                  : blockTarget.action === "BLOCKED" ? "Bloklash" : "Ochish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {addModal && (
        <div style={s.overlay} onClick={closeAddModal}>
          <div style={{ ...s.modal, width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </div>
              <div>
                <div style={s.modalTitle}>Yangi foydalanuvchi</div>
                <div style={s.modalSub}>Tizimga yangi user qo'shish</div>
              </div>
              <button style={s.modalClose} onClick={closeAddModal}>✕</button>
            </div>
            <div style={s.modalBody}>
              {[
                { label: "Username", key: "username", type: "text",     placeholder: "username kiriting...",  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                { label: "Email",    key: "mail",     type: "email",    placeholder: "email@example.com",    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                { label: "Parol",    key: "password", type: "password", placeholder: "Kamida 7 ta belgi...", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
              ].map((f, idx) => (
                <div key={f.key} style={{ marginBottom: idx < 2 ? 16 : 4 }}>
                  <label style={s.label}>{f.label}</label>
                  <div style={s.inputWrap}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                    </svg>
                    <input type={f.type} value={addForm[f.key]}
                      onChange={e => { setAddForm(p => ({ ...p, [f.key]: e.target.value })); setAddError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleAddUser()}
                      placeholder={f.placeholder} style={s.modalInput}
                      autoFocus={idx === 0} />
                  </div>
                </div>
              ))}
              <div style={s.modalHint}>Parol kamida <strong>7 ta belgi</strong>dan iborat bo'lishi kerak</div>
              {addError   && <div style={{ ...s.modalError,   marginTop: 12 }}>⚠ {addError}</div>}
              {addSuccess && <div style={{ ...s.modalSuccess, marginTop: 12 }}>✓ {addSuccess}</div>}
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeAddModal} disabled={addLoading}>Bekor qilish</button>
              <button style={{ ...s.saveBtn, opacity: addLoading ? 0.7 : 1 }} onClick={handleAddUser} disabled={addLoading}>
                {addLoading
                  ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={s.btnSpinner} /> Qo'shilmoqda...</span>
                  : <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg> Qo'shish</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  wrapper:      { padding: 16, height: "100%", overflowY: "auto", boxSizing: "border-box" },
  center:       { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300 },
  spinner:      { width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox:     { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "16px 24px", fontSize: 14 },
  pageHeader:   { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  pageTitle:    { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  pageSubtitle: { margin: "2px 0 0", fontSize: 13, color: "#94a3b8" },
  addBtn:       { display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" },
  searchBar:    { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 16px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  searchInput:  { flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a", background: "transparent" },
  clearBtn:     { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: 0 },
  tableWrap:    { background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  table:        { width: "100%", borderCollapse: "collapse" },
  theadRow:     { background: "#f8fafc" },
  th:           { padding: "8px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" },
  tr:           { borderBottom: "1px solid #f1f5f9", transition: "background 0.1s", background: "#fff" },
  td:           { padding: "8px 12px", fontSize: 13, color: "#334155", verticalAlign: "middle" },
  idBadge:      { display: "inline-block", width: 28, height: 24, borderRadius: 6, background: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: "24px" },
  userCell:     { display: "flex", alignItems: "center", gap: 10 },
  userAvatar:   { width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  usernameText: { fontWeight: 600, color: "#0f172a" },
  emailText:    { color: "#64748b", fontSize: 13 },
  badge:        { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  dateText:     { fontSize: 12, color: "#94a3b8" },
  emptyRow:     { textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 },
  blockBtn:     { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  unblockBtn:   { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #bbf7d0", background: "#dcfce7", color: "#16a34a", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },

  // Pagination
  pagination:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 },
  pageInfo:       { fontSize: 13, color: "#64748b" },
  pageButtons:    { display: "flex", alignItems: "center", gap: 4 },
  pageBtn:        { minWidth: 32, height: 32, padding: "0 8px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  pageBtnActive:  { background: "#2563eb", color: "#fff", border: "1.5px solid #2563eb" },
  pageBtnDisabled:{ opacity: 0.35, cursor: "not-allowed" },
  ellipsis:       { fontSize: 14, color: "#94a3b8", padding: "0 4px" },

  overlay:      { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:        { background: "#fff", borderRadius: 20, width: 420, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", overflow: "hidden", animation: "modalIn 0.2s ease" },
  modalHeader:  { display: "flex", alignItems: "center", gap: 14, padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", position: "relative" },
  modalAvatar:  { width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
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

export default UsersPage;
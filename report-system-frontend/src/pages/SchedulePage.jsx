import { useState, useEffect, useRef } from "react";
import { api } from "../api";

const FORMATS = ["xlsx", "docx", "txt"];
const FORMAT_COLORS = {
  xlsx: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  docx: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  txt:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
};
const STATUS_COLORS = {
  SUCCESS: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  ERROR:   { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};
const CRON_PRESETS = [
  { label: "Har kuni 08:00",        value: "0 8 * * *"        },
  { label: "Har dushanba 09:00",    value: "0 9 * * MON"      },
  { label: "Har ish kuni 08:00",    value: "0 8 * * MON-FRI"  },
  { label: "Har oyning 1-si 08:00", value: "0 8 1 * *"        },
  { label: "Har soatda",            value: "0 * * * *"        },
];

// ── Helpers ────────────────────────────────────────────────────
const resolveInputType = (paramType) => {
  if (!paramType) return "text";
  const t = paramType.toUpperCase().trim();
  if (t === "UPLOAD" || t === "FILE") return "upload";
  if (t.startsWith("TIMESTAMP")) return "datetime";
  if (t === "DATE") return "date";
  if (["BOOLEAN","BOOL"].includes(t)) return "boolean";
  if (["NUMBER","INTEGER","INT","FLOAT","BINARY_FLOAT","BINARY_DOUBLE",
       "BIGINT","LONG","SMALLINT","DECIMAL","NUMERIC","REAL"].includes(t)) return "number";
  return "text";
};

// ── FileUploadInput ─────────────────────────────────────────────
const FileUploadInput = ({ param, value, onChange, hasError, repId }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const uploadFile = async (file) => {
    setUploading(true); setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("repId", repId);
      formData.append("username", localStorage.getItem("username") || "");
      const res = await api.upload("/api/reports/upload", formData);
      if (!res.ok) throw new Error(await res.text() || "Fayl yuklashda xatolik");
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("spreadsheetml") || contentType.includes("octet-stream")) {
        const blob = await res.blob();
        const disposition = res.headers.get("content-disposition") || "";
        const match = disposition.match(/filename="?([^"]+)"?/);
        const fileName = match ? match[1] : `result_${file.name}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        onChange({ file, serverData: { status: "success" }, name: file.name, size: file.size });
      } else {
        onChange({ file, serverData: await res.json(), name: file.name, size: file.size });
      }
    } catch (err) { setUploadError(err.message); onChange(null); }
    finally { setUploading(false); }
  };

  const fmt = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  if (value?.name) return (
    <div style={{ border: `1.5px solid ${hasError ? "#fca5a5" : "#a3e635"}`, borderRadius: 8, background: "#f7fee7", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#d9f99d", display: "flex", alignItems: "center", justifyContent: "center", color: "#4d7c0f", flexShrink: 0 }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2e05", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.name}</div>
        <div style={{ fontSize: 11, color: "#65a30d" }}>{fmt(value.size)} {value.serverData && <span>✓ Yuklandi</span>}</div>
      </div>
      <button onClick={() => { onChange(null); setUploadError(""); if (inputRef.current) inputRef.current.value = ""; }}
        style={{ width: 22, height: 22, borderRadius: 5, border: "1.5px solid #bbf7d0", background: "#fff", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );

  return (
    <div>
      <div onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
        style={{ border: `2px dashed ${hasError ? "#fca5a5" : dragOver ? "#2563eb" : "#cbd5e1"}`, borderRadius: 8, background: dragOver ? "#eff6ff" : "#fafafa", padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: uploading ? "wait" : "pointer" }}>
        {uploading ? (
          <><div style={{ width: 22, height: 22, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>Yuklanmoqda...</span></>
        ) : (
          <><div style={{ color: dragOver ? "#2563eb" : "#94a3b8" }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: dragOver ? "#2563eb" : "#334155", textAlign: "center" }}>
            Faylni tashlang yoki <span style={{ color: "#2563eb", textDecoration: "underline" }}>tanlang</span>
          </div></>
        )}
      </div>
      {uploadError && <div style={{ marginTop: 4, padding: "4px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: 6, fontSize: 11 }}>⚠ {uploadError}</div>}
      <input ref={inputRef} type="file" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} style={{ display: "none" }} tabIndex={-1} />
    </div>
  );
};

// ── ParamInput ─────────────────────────────────────────────────
const ParamInput = ({ param, value, onChange, hasError, repId }) => {
  const type = resolveInputType(param.paramType);
  const label = param.paramView || param.paramName;
  const hasOptions = Array.isArray(param.options) && param.options.length > 0;
  const base = {
    width: "100%", boxSizing: "border-box", fontSize: 13,
    border: `1.5px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`,
    borderRadius: 8, padding: "7px 10px", color: "#0f172a",
    background: hasError ? "#fff8f8" : "#fafafa", outline: "none", fontFamily: "inherit",
  };

  if (type === "upload") return <FileUploadInput param={param} value={value} onChange={onChange} hasError={hasError} repId={repId} />;

  if (hasOptions) return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: "pointer" }}>
      <option value="">— Tanlang —</option>
      {param.options.map(opt => <option key={String(opt.id)} value={String(opt.id)}>{opt.name}</option>)}
    </select>
  );

  if (type === "boolean") return (
    <div style={{ display: "flex", gap: 7 }}>
      {[{ val: "true", label: "✓ Ha" }, { val: "false", label: "✕ Yo'q" }].map(opt => (
        <label key={opt.val} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "7px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, border: `1.5px solid ${value === opt.val ? "#2563eb" : "#e2e8f0"}`, background: value === opt.val ? "#eff6ff" : "#fafafa", color: value === opt.val ? "#2563eb" : "#64748b" }}>
          <input type="radio" name={param.paramName} value={opt.val} checked={value === opt.val} onChange={() => onChange(opt.val)} style={{ display: "none" }} />
          {opt.label}
        </label>
      ))}
    </div>
  );

  if (type === "date") {
    const toISO   = v => { if (!v) return ""; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const p = v.split("."); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ""; };
    const fromISO = v => { if (!v) return ""; const [y,m,d] = v.split("-"); return `${d}.${m}.${y}`; };
    const handleText = e => {
      let raw = e.target.value.replace(/\D/g,"").slice(0,8), fmt = raw;
      if (raw.length>=3&&raw.length<=4) fmt = raw.slice(0,2)+"."+raw.slice(2);
      else if (raw.length>=5) fmt = raw.slice(0,2)+"."+raw.slice(2,4)+"."+raw.slice(4);
      onChange(fmt);
    };
    return (
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input type="text" value={value||""} onChange={handleText} placeholder="DD.MM.YYYY" maxLength={10} style={{ ...base, paddingRight: 36 }} />
        <span style={{ position: "absolute", right: 8, cursor: "pointer", color: "#94a3b8" }}
          onClick={() => document.getElementById("sp-date-"+param.paramName)?.showPicker?.()}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </span>
        <input id={"sp-date-"+param.paramName} type="date" value={toISO(value)} onChange={e => onChange(fromISO(e.target.value))}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} tabIndex={-1} />
      </div>
    );
  }
  if (type === "datetime") return <input type="datetime-local" value={value||""} onChange={e => onChange(e.target.value)} style={base} />;
  if (type === "number")   return <input type="number" value={value||""} onChange={e => onChange(e.target.value)} placeholder={`${label} kiriting...`} style={base} />;
  return <input type="text" value={value||""} onChange={e => onChange(e.target.value)} placeholder={`${label} kiriting...`} style={base} />;
};

// ── SchedulePage ───────────────────────────────────────────────
const SchedulePage = () => {
  const [schedules, setSchedules]   = useState([]);
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId]     = useState(null);

  // Modal state
  const [form, setForm]             = useState({ repId: "", fileFormat: "xlsx", scheduleType: "cron", cronExpr: "0 8 * * MON-FRI", runAt: "" });
  const [paramDefs, setParamDefs]   = useState([]);
  const [paramValues, setParamValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [paramsLoading, setParamsLoading] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true); setError("");
    try {
      const [sRes, rRes] = await Promise.all([api.get("/api/schedules"), api.get("/api/reports")]);
      if (!sRes.ok || !rRes.ok) throw new Error("Yuklashda xatolik");
      setSchedules(await sRes.json());
      setReports(await rRes.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Report tanlanganda parametrlarni yukla
  const handleRepIdChange = async (repId) => {
    setForm(p => ({ ...p, repId }));
    setParamDefs([]); setParamValues({}); setFieldErrors({});
    if (!repId) return;
    setParamsLoading(true);
    try {
      const res = await api.get(`/api/reports/report?repId=${repId}`);
      if (!res.ok) throw new Error("Parametrlarni yuklashda xatolik");
      const data = await res.json();
      setParamDefs(data);
      const init = {};
      data.forEach(p => { init[p.paramName] = p.defaultValue != null ? String(p.defaultValue) : ""; });
      setParamValues(init);
    } catch (e) { setFormError(e.message); }
    finally { setParamsLoading(false); }
  };

  const handleToggle = async (id, active) => {
    await api.post(`/api/schedules/${id}/toggle`, { active: !active });
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !active } : s));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/schedules/${deleteId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) { setSchedules(prev => prev.filter(s => s.id !== deleteId)); setDeleteId(null); }
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.repId) return setFormError("Report tanlang");

    // Param validatsiya (upload tiplar o'tkazib yuboriladi)
    const errors = {};
    paramDefs
      .filter(p => resolveInputType(p.paramType) !== "upload")
      .forEach(p => {
        const val = paramValues[p.paramName];
        if (!val?.toString().trim()) errors[p.paramName] = true;
      });
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); setFormError("Barcha parametrlarni to'ldiring"); return; }

    if (form.scheduleType === "cron"    && !form.cronExpr) return setFormError("Cron expression kiriting");
    if (form.scheduleType === "onetime" && !form.runAt)    return setFormError("Vaqt kiriting");

    setSaving(true);
    try {
      // paramValues → JSON
      const paramsJson = JSON.stringify(paramValues);
      const payload = {
        repId: form.repId, params: paramsJson, fileFormat: form.fileFormat,
        cronExpr: form.scheduleType === "cron"    ? form.cronExpr : null,
        runAt:    form.scheduleType === "onetime" ? form.runAt    : null,
      };
      const res = await api.post("/api/schedules", payload);
      if (!res.ok) throw new Error(await res.text());
      setShowModal(false);
      fetchAll();
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const openModal = () => {
    setForm({ repId: "", fileFormat: "xlsx", scheduleType: "cron", cronExpr: "0 8 * * MON-FRI", runAt: "" });
    setParamDefs([]); setParamValues({}); setFieldErrors({}); setFormError("");
    setShowModal(true);
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleString("uz-UZ") : "—";

  return (
    <div style={s.wrapper}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Jadval (Schedule)</h2>
          <p style={s.subtitle}>Reportlarni avtomatik ishga tushirish</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchAll} style={s.refreshBtn}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 21v-5h5"/></svg>
          </button>
          <button onClick={openModal} style={s.addBtn}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Yangi jadval
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={s.center}><div style={s.spinner}/></div>
      ) : error ? (
        <div style={s.center}><div style={s.errBox}>⚠ {error}</div></div>
      ) : schedules.length === 0 ? (
        <div style={s.emptyState}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <p style={{ color: "#94a3b8", marginTop: 12, fontSize: 14 }}>Hech qanday jadval yo'q</p>
          <button onClick={openModal} style={{ ...s.addBtn, marginTop: 8 }}>+ Yaratish</button>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              {["#","Report","Foydalanuvchi","Tur","Jadval","Format","Holat","Oxirgi run",""].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {schedules.map((sc, i) => {
                const fc = FORMAT_COLORS[sc.fileFormat] || FORMAT_COLORS.xlsx;
                const sc_status = STATUS_COLORS[sc.lastStatus];
                return (
                  <>
                    <tr key={sc.id} style={{ ...s.tr, opacity: sc.active ? 1 : 0.55 }}>
                      <td style={s.td}><span style={s.numBadge}>{i+1}</span></td>
                      <td style={{ ...s.td, fontWeight: 600, color: "#0f172a" }}>{sc.repName}</td>
                      <td style={s.td}>
                        <span style={s.userChip}>
                          <span style={s.userDot}>{(sc.username||"?")[0].toUpperCase()}</span>
                          {sc.username}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.chip, background: sc.cronExpr ? "#eff6ff" : "#faf5ff", color: sc.cronExpr ? "#2563eb" : "#7c3aed", border: `1px solid ${sc.cronExpr ? "#bfdbfe" : "#ddd6fe"}` }}>
                          {sc.cronExpr ? "🔁 Cron" : "⏱ Bir marta"}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12, color: "#475569" }}>
                        {sc.cronExpr || fmtDate(sc.runAt)}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.chip, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}` }}>.{sc.fileFormat}</span>
                      </td>
                      <td style={s.td}>
                        {sc.lastStatus ? (
                          <span style={{ ...s.chip, background: sc_status?.bg, color: sc_status?.color, border: `1px solid ${sc_status?.border}` }}>
                            {sc.lastStatus === "SUCCESS" ? "✓" : "✕"} {sc.lastStatus}
                          </span>
                        ) : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{fmtDate(sc.lastRun)}</td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => handleToggle(sc.id, sc.active)} title={sc.active ? "To'xtatish" : "Yoqish"}
                            style={{ ...s.iconBtn, background: sc.active ? "#f0fdf4" : "#f8fafc", color: sc.active ? "#16a34a" : "#94a3b8" }}>
                            {sc.active
                              ? <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M10 9v6m4-6v6"/></svg>
                              : <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 3l14 9-14 9V3z"/></svg>
                            }
                          </button>
                          {sc.lastError && (
                            <button onClick={() => setExpandedId(expandedId === sc.id ? null : sc.id)}
                              style={{ ...s.iconBtn, background: "#fef2f2", color: "#ef4444" }}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                            </button>
                          )}
                          <button onClick={() => setDeleteId(sc.id)} style={{ ...s.iconBtn, background: "#fef2f2", color: "#ef4444" }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === sc.id && sc.lastError && (
                      <tr key={sc.id+"-err"}>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div style={{ padding: "10px 14px", background: "#fef2f2", borderTop: "1px solid #fecaca" }}>
                            <strong style={{ fontSize: 12, color: "#dc2626" }}>Xatolik:</strong>
                            <pre style={{ margin: "4px 0 0", fontSize: 12, color: "#dc2626", whiteSpace: "pre-wrap" }}>{sc.lastError}</pre>
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
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Yangi jadval yaratish</span>
              <button onClick={() => setShowModal(false)} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.modalBody}>

              {/* Report tanlash */}
              <div style={s.field}>
                <label style={s.label}>Report</label>
                <select value={form.repId} onChange={e => handleRepIdChange(e.target.value)} style={s.select}>
                  <option value="">— Tanlang —</option>
                  {reports.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              {/* Parametrlar — dinamik */}
              {paramsLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, border: "2px solid #e2e8f0", borderTop: "2px solid #7c3aed", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Parametrlar yuklanmoqda...
                </div>
              )}

              {!paramsLoading && paramDefs.length > 0 && (
                <div style={{ border: "1.5px solid #ede9fe", borderRadius: 10, padding: "12px 14px", background: "#faf5ff", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Parametrlar ({paramDefs.length} ta)
                  </div>
                  {paramDefs
                    .filter(param => resolveInputType(param.paramType) !== "upload")
                    .map((param, idx) => {
                    const isDropdown = Array.isArray(param.options) && param.options.length > 0;
                    return (
                      <div key={param.paramName}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                          <span style={{ width: 17, height: 17, borderRadius: "50%", background: "#ede9fe", color: "#7c3aed", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx+1}</span>
                          <label style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{param.paramView || param.paramName}</label>
                          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: isDropdown ? "#eff6ff" : "#f1f5f9", color: isDropdown ? "#2563eb" : "#64748b" }}>
                            {isDropdown ? "ro'yxat" : param.paramType}
                          </span>
                          {fieldErrors[param.paramName] && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "#fef2f2", color: "#dc2626" }}>Majburiy</span>
                          )}
                        </div>
                        <ParamInput
                          param={param}
                          value={paramValues[param.paramName] || ""}
                          onChange={val => {
                            setParamValues(prev => ({ ...prev, [param.paramName]: val }));
                            setFieldErrors(prev => ({ ...prev, [param.paramName]: false }));
                            setFormError("");
                          }}
                          hasError={!!fieldErrors[param.paramName]}
                          repId={form.repId}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Format */}
              <div style={s.field}>
                <label style={s.label}>Format</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {FORMATS.map(fmt => {
                    const fc = FORMAT_COLORS[fmt];
                    const active = form.fileFormat === fmt;
                    return (
                      <button key={fmt} onClick={() => setForm(p => ({ ...p, fileFormat: fmt }))} style={{ flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, border: `1.5px solid ${active ? fc.border : "#e2e8f0"}`, background: active ? fc.bg : "#fafafa", color: active ? fc.color : "#94a3b8" }}>
                        .{fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jadval turi */}
              <div style={s.field}>
                <label style={s.label}>Jadval turi</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ val:"cron", icon:"🔁", label:"Takroriy (Cron)" }, { val:"onetime", icon:"⏱", label:"Bir martalik" }].map(t => (
                    <button key={t.val} onClick={() => setForm(p => ({ ...p, scheduleType: t.val }))} style={{ flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, border: `1.5px solid ${form.scheduleType===t.val ? "#2563eb" : "#e2e8f0"}`, background: form.scheduleType===t.val ? "#eff6ff" : "#fafafa", color: form.scheduleType===t.val ? "#2563eb" : "#64748b" }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cron yoki datetime */}
              {form.scheduleType === "cron" ? (
                <div style={s.field}>
                  <label style={s.label}>Cron expression</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
                    {CRON_PRESETS.map(p => (
                      <button key={p.value} onClick={() => setForm(prev => ({ ...prev, cronExpr: p.value }))} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: `1px solid ${form.cronExpr===p.value ? "#2563eb" : "#e2e8f0"}`, background: form.cronExpr===p.value ? "#eff6ff" : "#f8fafc", color: form.cronExpr===p.value ? "#2563eb" : "#475569" }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input value={form.cronExpr} onChange={e => setForm(p => ({ ...p, cronExpr: e.target.value }))} style={s.select} placeholder="0 8 * * MON-FRI" />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Format: daqiqa soat kun-oy oy hafta-kuni</div>
                </div>
              ) : (
                <div style={s.field}>
                  <label style={s.label}>Ishlash vaqti</label>
                  <input type="datetime-local" value={form.runAt} onChange={e => setForm(p => ({ ...p, runAt: e.target.value }))} style={s.select} />
                </div>
              )}

              {formError && <div style={s.errInline}>⚠ {formError}</div>}
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setShowModal(false)} style={s.cancelBtn}>Bekor qilish</button>
              <button onClick={handleSave} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={s.overlay} onClick={() => setDeleteId(null)}>
          <div style={{ ...s.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>O'chirishni tasdiqlang</span>
              <button onClick={() => setDeleteId(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ padding: "16px 20px", color: "#475569", fontSize: 14 }}>
              Bu jadvalni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
            </div>
            <div style={s.modalFoot}>
              <button onClick={() => setDeleteId(null)} style={s.cancelBtn}>Bekor</button>
              <button onClick={handleDelete} style={{ ...s.saveBtn, background: "#dc2626" }}>O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  wrapper:    { padding: "16px 20px", height: "100%", overflowY: "auto", boxSizing: "border-box", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header:     { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 },
  title:      { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" },
  subtitle:   { margin: "3px 0 0", fontSize: 12, color: "#94a3b8" },
  addBtn:     { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  refreshBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  center:     { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 },
  spinner:    { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errBox:     { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 16px", fontSize: 13 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 },
  tableWrap:  { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse" },
  thead:      { background: "#f8fafc" },
  th:         { padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr:         { borderBottom: "1px solid #f1f5f9" },
  td:         { padding: "8px 12px", fontSize: 13, color: "#334155", verticalAlign: "middle" },
  numBadge:   { width: 22, height: 22, borderRadius: 6, background: "#f1f5f9", color: "#64748b", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  chip:       { display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 },
  userChip:   { display: "inline-flex", alignItems: "center", gap: 5 },
  userDot:    { width: 20, height: 20, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  iconBtn:    { width: 26, height: 26, borderRadius: 6, border: "1.5px solid #e2e8f0", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 },
  modal:      { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" },
  modalHead:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9" },
  modalTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  closeBtn:   { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 },
  modalBody:  { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "72vh", overflowY: "auto" },
  modalFoot:  { padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 8 },
  field:      {},
  label:      { display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 5 },
  select:     { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fafafa", outline: "none", boxSizing: "border-box" },
  errInline:  { padding: "7px 10px", background: "#fef2f2", color: "#dc2626", borderRadius: 7, fontSize: 12, border: "1px solid #fecaca" },
  cancelBtn:  { padding: "7px 16px", background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  saveBtn:    { padding: "7px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
};

export default SchedulePage;
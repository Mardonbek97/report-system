import { useState, useEffect, useRef } from "react";
import { api } from "../api";

// ── Helpers ────────────────────────────────────────────────────
const resolveInputType = (paramType) => {
  if (!paramType) return "text";
  const t = paramType.toUpperCase().trim();
  if (t === "UPLOAD" || t === "FILE") return "upload";
  if (t.startsWith("TIMESTAMP")) return "datetime";
  if (t === "DATE") return "date";
  if (["BOOLEAN", "BOOL"].includes(t)) return "boolean";
  if (["NUMBER","INTEGER","INT","FLOAT","BINARY_FLOAT","BINARY_DOUBLE",
       "BIGINT","LONG","SMALLINT","DECIMAL","NUMERIC","REAL"].includes(t)) return "number";
  return "text";
};

const FORMATS = ["xlsx", "docx", "txt"];
const FORMAT_COLORS = {
  xlsx: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  docx: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  txt:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
};
const CRON_PRESETS = [
  { label: "Har kuni 08:00",        value: "0 8 * * *"       },
  { label: "Har dushanba 09:00",    value: "0 9 * * MON"     },
  { label: "Har ish kuni 08:00",    value: "0 8 * * MON-FRI" },
  { label: "Har oyning 1-si 08:00", value: "0 8 1 * *"       },
];

// ── FileUploadInput ────────────────────────────────────────────
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
        style={{ border: `2px dashed ${hasError ? "#fca5a5" : dragOver ? "#2563eb" : "#cbd5e1"}`, borderRadius: 8, background: dragOver ? "#eff6ff" : "#fafafa", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: uploading ? "wait" : "pointer" }}>
        {uploading
          ? <><div style={{ width: 22, height: 22, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "grSpin 0.8s linear infinite" }} /><span style={{ fontSize: 12, color: "#64748b" }}>Yuklanmoqda...</span></>
          : <><div style={{ color: dragOver ? "#2563eb" : "#94a3b8" }}><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
            <div style={{ fontSize: 12, fontWeight: 600, color: dragOver ? "#2563eb" : "#334155", textAlign: "center" }}>Faylni tashlang yoki <span style={{ color: "#2563eb", textDecoration: "underline" }}>tanlang</span></div></>
        }
      </div>
      {uploadError && <div style={{ marginTop: 4, padding: "4px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: 6, fontSize: 11 }}>⚠ {uploadError}</div>}
      <input ref={inputRef} type="file" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} style={{ display: "none" }} tabIndex={-1} />
    </div>
  );
};

// ── ParamInput — schedule modal uchun ─────────────────────────
const ParamInput = ({ param, value, onChange, hasError, repId }) => {
  const type = resolveInputType(param.paramType);
  const label = param.paramView || param.paramName;
  const hasOptions = Array.isArray(param.options) && param.options.length > 0;

  const base = {
    width: "100%", boxSizing: "border-box", fontSize: 13,
    border: `1.5px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`,
    borderRadius: 8, padding: "7px 10px", color: "#0f172a",
    background: hasError ? "#fff8f8" : "#fafafa",
    outline: "none", fontFamily: "inherit",
  };

  if (type === "upload") return <FileUploadInput param={param} value={value} onChange={onChange} hasError={hasError} repId={repId} />;

  if (hasOptions) return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: "pointer" }}>
      <option value="">— Tanlang —</option>
      {param.options.map(opt => (
        <option key={String(opt.id)} value={String(opt.id)}>{opt.name}</option>
      ))}
    </select>
  );

  if (type === "boolean") return (
    <div style={{ display: "flex", gap: 7 }}>
      {[{ val: "true", label: "✓ Ha" }, { val: "false", label: "✕ Yo'q" }].map(opt => (
        <label key={opt.val} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: "7px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
          border: `1.5px solid ${value === opt.val ? "#2563eb" : "#e2e8f0"}`,
          background: value === opt.val ? "#eff6ff" : "#fafafa",
          color: value === opt.val ? "#2563eb" : "#64748b",
        }}>
          <input type="radio" name={param.paramName} value={opt.val}
            checked={value === opt.val} onChange={() => onChange(opt.val)}
            style={{ display: "none" }} />
          {opt.label}
        </label>
      ))}
    </div>
  );

  if (type === "date") {
    const toISO   = v => { if (!v) return ""; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const p = v.split("."); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ""; };
    const fromISO = v => { if (!v) return ""; const [y, m, d] = v.split("-"); return `${d}.${m}.${y}`; };
    const handleText = e => {
      let raw = e.target.value.replace(/\D/g, "").slice(0, 8);
      let fmt = raw;
      if (raw.length >= 3 && raw.length <= 4) fmt = raw.slice(0,2) + "." + raw.slice(2);
      else if (raw.length >= 5) fmt = raw.slice(0,2) + "." + raw.slice(2,4) + "." + raw.slice(4);
      onChange(fmt);
    };
    return (
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input type="text" value={value || ""} onChange={handleText}
          placeholder="DD.MM.YYYY" maxLength={10} style={{ ...base, paddingRight: 36 }} />
        <span style={{ position: "absolute", right: 8, cursor: "pointer", color: "#94a3b8" }}
          onClick={() => document.getElementById("sched-date-" + param.paramName)?.showPicker?.()}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        <input id={"sched-date-" + param.paramName} type="date" value={toISO(value)}
          onChange={e => onChange(fromISO(e.target.value))}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
          tabIndex={-1} />
      </div>
    );
  }

  if (type === "datetime") return (
    <input type="datetime-local" value={value || ""} onChange={e => onChange(e.target.value)} style={base} />
  );
  if (type === "number") return (
    <input type="number" value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={`${label} kiriting...`} style={base} />
  );
  return (
    <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={`${label} kiriting...`} style={base} />
  );
};

// ── Schedule Modal ─────────────────────────────────────────────
const ScheduleModal = ({ report, onClose }) => {
  const [step, setStep]                 = useState(1); // 1=params, 2=schedule
  const [paramDefs, setParamDefs]       = useState([]);
  const [paramValues, setParamValues]   = useState({});
  const [fieldErrors, setFieldErrors]   = useState({});
  const [paramsLoading, setParamsLoading] = useState(true);

  const [fileFormat, setFileFormat]     = useState("xlsx");
  const [scheduleType, setScheduleType] = useState("cron");
  const [cronExpr, setCronExpr]         = useState("0 8 * * MON-FRI");
  const [runAt, setRunAt]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  useEffect(() => {
    const load = async () => {
      setParamsLoading(true);
      try {
        const res = await api.get(`/api/reports/report?repId=${report.id}`);
        if (!res.ok) throw new Error("Parametrlarni yuklashda xatolik");
        const data = await res.json();
        const nonUploadParams = data.filter(p => resolveInputType(p.paramType) !== "upload");
        // Barcha parametrlar upload bo'lsa jadval qo'yib bo'lmaydi
        if (data.length > 0 && nonUploadParams.length === 0) {
          setError("Bu report faqat fayl yuklash parametrini talab qiladi — jadval qo'yib bo'lmaydi.");
          setParamsLoading(false);
          return;
        }
        setParamDefs(data);
        const init = {};
        data.forEach(p => { init[p.paramName] = p.defaultValue != null ? String(p.defaultValue) : ""; });
        setParamValues(init);
      } catch (e) { setError(e.message); }
      finally { setParamsLoading(false); }
    };
    load();
  }, [report.id]);

  const handleNextStep = () => {
    // Validatsiya
    const errors = {};
    paramDefs
      .filter(p => resolveInputType(p.paramType) !== "upload")
      .forEach(p => {
        if (resolveInputType(p.paramType) === "upload") {
          if (!paramValues[p.paramName]?.serverData) errors[p.paramName] = true;
        } else if (!paramValues[p.paramName]?.toString().trim()) errors[p.paramName] = true;
      });
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setStep(2);
  };

  const handleSave = async () => {
    setError("");
    if (scheduleType === "cron"    && !cronExpr.trim()) return setError("Cron expression kiriting");
    if (scheduleType === "onetime" && !runAt)           return setError("Vaqt kiriting");

    setSaving(true);
    try {
      // paramValues → JSON string
      const paramsJson = JSON.stringify(paramValues);

      const res = await api.post("/api/schedules", {
        repId:      report.id,
        params:     paramsJson,
        fileFormat,
        cronExpr:   scheduleType === "cron"    ? cronExpr : null,
        runAt:      scheduleType === "onetime" ? runAt    : null,
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.modal} onClick={e => e.stopPropagation()}>

        {/* Head */}
        <div style={m.head}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={m.headIcon}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <div>
              <div style={m.headTitle}>Jadval sozlash</div>
              <div style={m.headSub}>{report.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={m.closeBtn}>✕</button>
        </div>

        {/* Steps indicator */}
        <div style={m.steps}>
          {[{ n: 1, label: "Parametrlar" }, { n: 2, label: "Jadval" }].map(st => (
            <div key={st.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                background: step >= st.n ? "#7c3aed" : "#f1f5f9",
                color: step >= st.n ? "#fff" : "#94a3b8",
              }}>{st.n}</div>
              <span style={{ fontSize: 12, fontWeight: step === st.n ? 700 : 500,
                color: step === st.n ? "#0f172a" : "#94a3b8" }}>{st.label}</span>
              {st.n < 2 && <div style={{ width: 32, height: 1, background: step > st.n ? "#7c3aed" : "#e2e8f0", margin: "0 4px" }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={m.body}>

          {/* STEP 1: Parametrlar */}
          {step === 1 && (
            paramsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 24, gap: 8 }}>
                <div style={m.spinner} />
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Yuklanmoqda...</span>
              </div>
            ) : error ? (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>{error}</div>
              </div>
            ) : paramDefs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>
                Bu report uchun parametr yo'q
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {paramDefs
                  .filter(param => resolveInputType(param.paramType) !== "upload")
                  .map((param, idx) => {
                  const isDropdown = Array.isArray(param.options) && param.options.length > 0;
                  return (
                    <div key={param.paramName}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        <span style={m.orderBadge}>{idx + 1}</span>
                        <label style={m.label}>{param.paramView || param.paramName}</label>
                        <span style={{
                          marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "1px 6px",
                          borderRadius: 5, background: isDropdown ? "#eff6ff" : "#f1f5f9",
                          color: isDropdown ? "#2563eb" : "#64748b",
                        }}>
                          {isDropdown ? "ro'yxat" : param.paramType}
                        </span>
                        {fieldErrors[param.paramName] && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "#fef2f2", color: "#dc2626" }}>
                            Majburiy
                          </span>
                        )}
                      </div>
                      <ParamInput
                        param={param}
                        value={paramValues[param.paramName] || ""}
                        onChange={val => {
                          setParamValues(prev => ({ ...prev, [param.paramName]: val }));
                          setFieldErrors(prev => ({ ...prev, [param.paramName]: false }));
                        }}
                        hasError={!!fieldErrors[param.paramName]}
                        repId={report.id}
                      />
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* STEP 2: Jadval sozlamalari */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Format */}
              <div>
                <label style={m.label}>Fayl formati</label>
                <div style={{ display: "flex", gap: 7 }}>
                  {FORMATS.map(fmt => {
                    const fc = FORMAT_COLORS[fmt];
                    const active = fileFormat === fmt;
                    return (
                      <button key={fmt} onClick={() => setFileFormat(fmt)} style={{
                        flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                        fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${active ? fc.border : "#e2e8f0"}`,
                        background: active ? fc.bg : "#fafafa",
                        color: active ? fc.color : "#94a3b8",
                      }}>.{fmt}</button>
                    );
                  })}
                </div>
              </div>

              {/* Tur */}
              <div>
                <label style={m.label}>Jadval turi</label>
                <div style={{ display: "flex", gap: 7 }}>
                  {[
                    { val: "cron",    icon: "🔁", label: "Takroriy (Cron)" },
                    { val: "onetime", icon: "⏱", label: "Bir martalik"    },
                  ].map(t => (
                    <button key={t.val} onClick={() => setScheduleType(t.val)} style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${scheduleType === t.val ? "#7c3aed" : "#e2e8f0"}`,
                      background: scheduleType === t.val ? "#faf5ff" : "#fafafa",
                      color: scheduleType === t.val ? "#7c3aed" : "#64748b",
                    }}>{t.icon} {t.label}</button>
                  ))}
                </div>
              </div>

              {/* Cron */}
              {scheduleType === "cron" && (
                <div>
                  <label style={m.label}>Cron expression</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
                    {CRON_PRESETS.map(p => (
                      <button key={p.value} onClick={() => setCronExpr(p.value)} style={{
                        padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
                        border: `1px solid ${cronExpr === p.value ? "#7c3aed" : "#e2e8f0"}`,
                        background: cronExpr === p.value ? "#faf5ff" : "#f8fafc",
                        color: cronExpr === p.value ? "#7c3aed" : "#475569",
                      }}>{p.label}</button>
                    ))}
                  </div>
                  <input value={cronExpr} onChange={e => setCronExpr(e.target.value)}
                    style={m.input} placeholder="0 8 * * MON-FRI" />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    Format: daqiqa soat kun-oy oy hafta-kuni
                  </div>
                </div>
              )}

              {/* One-time */}
              {scheduleType === "onetime" && (
                <div>
                  <label style={m.label}>Ishlash vaqti</label>
                  <input type="datetime-local" value={runAt} onChange={e => setRunAt(e.target.value)} style={m.input} />
                </div>
              )}

              {/* Params summary */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Parametrlar (1-qadamda kiritilgan)
                </div>
                {Object.entries(paramValues).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ color: "#64748b" }}>{k}</span>
                    <span style={{ color: "#0f172a", fontWeight: 600 }}>{String(v) || "—"}</span>
                  </div>
                ))}
              </div>

              {error   && <div style={m.errBox}>⚠ {error}</div>}
              {success && <div style={m.successBox}>✓ Jadval muvaffaqiyatli yaratildi!</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={m.foot}>
          {step === 1 ? (
            <>
              <button onClick={onClose} style={m.cancelBtn}>Bekor qilish</button>
              <button onClick={handleNextStep} disabled={paramsLoading || !!error}
                style={{ ...m.nextBtn, opacity: (paramsLoading || !!error) ? 0.4 : 1 }}>
                Keyingi →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} style={m.cancelBtn}>← Orqaga</button>
              <button onClick={handleSave} disabled={saving || success}
                style={{ ...m.nextBtn, opacity: saving || success ? 0.7 : 1 }}>
                {saving ? "Saqlanmoqda..." : "✓ Jadval yaratish"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
const PAGE_SIZE = 18;

const GenerateReportPage = () => {
  const [reports, setReports]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [searchInput, setSearchInput]       = useState("");
  const [search, setSearch]                 = useState("");
  const [scheduleReport, setScheduleReport] = useState(null);

  // Pagination
  const [page, setPage]                     = useState(0);
  const [totalPages, setTotalPages]         = useState(0);
  const [totalElements, setTotalElements]   = useState(0);

  const fetchReports = async (pg = 0, q = "") => {
    setLoading(true); setError("");
    try {
      const res = await api.get(
        `/api/reports?page=${pg}&size=${PAGE_SIZE}&search=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Ma'lumotlarni yuklashda xatolik");
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data);
        setTotalPages(1);
        setTotalElements(data.length);
        setPage(0);
      } else {
        setReports(data.content ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalElements(data.totalElements ?? 0);
        setPage(data.number ?? 0);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(0, ""); }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput === "") return;
      setSearch(searchInput);
      fetchReports(0, searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const goPage = (p) => fetchReports(p, search);

  const getPageRange = () => {
    const delta = 2, range = [];
    for (let i = Math.max(0, page - delta); i <= Math.min(totalPages - 1, page + delta); i++)
      range.push(i);
    return range;
  };

  const handleOpen = (report) => {
    localStorage.setItem(`exec_report_${report.id}`, JSON.stringify(report));
    window.open(`/?repId=${report.id}`, "_blank");
  };

  return (
    <div style={s.wrapper}>
      <style>{`@keyframes grSpin{to{transform:rotate(360deg)}}`}</style>

      {scheduleReport && (
        <ScheduleModal report={scheduleReport} onClose={() => setScheduleReport(null)} />
      )}

      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Generate Report</h2>
          <p style={s.pageSubtitle}>Reportni tanlang — ochish yoki jadvalga qo'shing</p>
        </div>
        <div style={s.reportCount}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {totalElements} ta
        </div>
      </div>

      <div style={s.searchBar}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
        </svg>
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="Report nomi bo'yicha qidirish..." style={s.searchInput} />
        {searchInput && (
          <button onClick={() => {    
           setSearchInput(""); setSearch(""); fetchReports(0, ""); }}
            style={s.clearBtn}>✕</button>
        )}
      </div>

      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <p style={{ color: "#94a3b8", marginTop: 12, fontSize: 13 }}>Yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div style={s.center}><div style={s.errorBox}>⚠ {error}</div></div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <colgroup>
                <col style={{ width: "52px" }} />
                <col />
                <col style={{ width: "240px" }} />
              </colgroup>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Report nomi</th>
                  <th style={{ ...s.th, textAlign: "left", paddingLeft: 8 }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={3} style={s.emptyRow}>Report topilmadi</td></tr>
                ) : reports.map((r, i) => (
                  <tr key={r.id} style={s.tr}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <td style={s.td}>
                      <span style={s.idBadge}>{page * PAGE_SIZE + i + 1}</span>
                    </td>
                    <td style={s.td}>
                      <div style={s.reportCell}>
                        <div style={s.reportIcon}>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <div style={s.reportName}>{r.name}</div>
                          {r.description && <div style={s.reportDesc}>{r.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...s.td, paddingLeft: 8 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleOpen(r)} style={s.openBtn}>
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Ochish
                        </button>
                        <button onClick={() => setScheduleReport(r)} style={s.scheduleBtn}>
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 2v4M8 2v4M3 10h18"/>
                          </svg>
                          Jadval
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

          <div style={s.tableFooter}>
            Jami: <strong>{totalElements}</strong> ta report
            {search && ` (qidiruv: "${search}")`}
          </div>
        </>
      )}
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────
const s = {
  wrapper:      { padding: "16px 20px", height: "100%", overflowY: "auto", boxSizing: "border-box" },
  center:       { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" },
  spinner:      { width: 28, height: 28, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "grSpin 0.8s linear infinite" },
  errorBox:     { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 16px", fontSize: 13 },
  pageHeader:   { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  pageTitle:    { margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" },
  pageSubtitle: { margin: "2px 0 0", fontSize: 12, color: "#94a3b8" },
  reportCount:  { display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#2563eb" },
  searchBar:    { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  searchInput:  { flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent" },
  clearBtn:     { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0 },
  tableWrap:    { background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  table:        { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  theadRow:     { background: "#f8fafc" },
  th:           { padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" },
  tr:           { borderBottom: "1px solid #f1f5f9", transition: "background 0.1s", background: "#fff" },
  td:           { padding: "7px 12px", fontSize: 13, color: "#334155", verticalAlign: "middle" },
  idBadge:      { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: "#f1f5f9", color: "#64748b", fontSize: 11, fontWeight: 700 },
  reportCell:   { display: "flex", alignItems: "center", gap: 8 },
  reportIcon:   { width: 26, height: 26, borderRadius: 7, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  reportName:   { fontWeight: 600, color: "#0f172a", fontSize: 13 },
  reportDesc:   { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  openBtn:      { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  scheduleBtn:  { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #ddd6fe", background: "#faf5ff", color: "#7c3aed", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  emptyRow:     { textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 13 },
  tableFooter:  { marginTop: 8, fontSize: 12, color: "#94a3b8", textAlign: "right" },
  pagination:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 6 },
  pageInfo:        { fontSize: 12, color: "#64748b" },
  pageButtons:     { display: "flex", alignItems: "center", gap: 3 },
  pageBtn:         { minWidth: 28, height: 28, padding: "0 6px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  pageBtnActive:   { background: "#2563eb", color: "#fff", border: "1.5px solid #2563eb" },
  pageBtnDisabled: { opacity: 0.35, cursor: "not-allowed" },
  ellipsis:        { fontSize: 13, color: "#94a3b8", padding: "0 2px" },
};

const m = {
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 },
  modal:      { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" },
  head:       { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9" },
  headIcon:   { width: 32, height: 32, borderRadius: 8, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headTitle:  { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  headSub:    { fontSize: 11, color: "#7c3aed", marginTop: 1 },
  closeBtn:   { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 },
  steps:      { display: "flex", alignItems: "center", padding: "10px 20px", background: "#fafafa", borderBottom: "1px solid #f1f5f9", gap: 4 },
  body:       { padding: "16px 20px", maxHeight: "58vh", overflowY: "auto" },
  foot:       { padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 8 },
  label:      { display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 5 },
  orderBadge: { width: 18, height: 18, borderRadius: "50%", background: "#ede9fe", color: "#7c3aed", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  input:      { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fafafa", outline: "none", boxSizing: "border-box" },
  spinner:    { width: 24, height: 24, border: "3px solid #e2e8f0", borderTop: "3px solid #7c3aed", borderRadius: "50%", animation: "grSpin 0.8s linear infinite" },
  errBox:     { padding: "7px 10px", background: "#fef2f2", color: "#dc2626", borderRadius: 7, fontSize: 12, border: "1px solid #fecaca" },
  successBox: { padding: "7px 10px", background: "#f0fdf4", color: "#16a34a", borderRadius: 7, fontSize: 12, border: "1px solid #bbf7d0", fontWeight: 600 },
  cancelBtn:  { padding: "7px 16px", background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  nextBtn:    { padding: "7px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
};

export default GenerateReportPage;
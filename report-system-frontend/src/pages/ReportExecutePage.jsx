import { useState, useEffect, useRef } from "react";
import { api } from "../api";

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

const FORMAT_COLORS = {
  xlsx: { active: "#16a34a", activeBg: "#f0fdf4", activeBorder: "#16a34a", badge: "#dcfce7", badgeText: "#15803d" },
  docx: { active: "#2563eb", activeBg: "#eff6ff", activeBorder: "#2563eb", badge: "#dbeafe", badgeText: "#1d4ed8" },
  txt:  { active: "#d97706", activeBg: "#fffbeb", activeBorder: "#d97706", badge: "#fef3c7", badgeText: "#b45309" },
};

const FormatIcon = ({ fmt }) => {
  const icons = {
    xlsx: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M3 3h18v18H3z" /></svg>,
    docx: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    txt:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h6" /></svg>,
  };
  return icons[fmt] || null;
};

const FormatDropdown = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const fmts = ["xlsx", "docx", "txt"];
  const c = FORMAT_COLORS[selected];

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div style={{ position: "relative" }} onMouseDown={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 8, cursor: "pointer",
        fontWeight: 700, fontSize: 12,
        border: `1.5px solid ${c.activeBorder}`,
        background: c.activeBg, color: c.active,
        minWidth: 100, justifyContent: "space-between",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <FormatIcon fmt={selected} />.{selected}
        </span>
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 5px)", left: 0,
          background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", zIndex: 200, minWidth: 100,
        }}>
          {fmts.map((fmt) => {
            const fc = FORMAT_COLORS[fmt];
            const isActive = selected === fmt;
            return (
              <button key={fmt} onClick={() => { onChange(fmt); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 7, width: "100%",
                padding: "8px 12px", border: "none", cursor: "pointer", fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? fc.activeBg : "#fff",
                color: isActive ? fc.active : "#475569",
                borderLeft: isActive ? `3px solid ${fc.active}` : "3px solid transparent",
              }}>
                <FormatIcon fmt={fmt} />.{fmt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
        const a = document.createElement("a");
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        onChange({ file, serverData: { status: "success" }, name: file.name, size: file.size });
      } else {
        onChange({ file, serverData: await res.json(), name: file.name, size: file.size });
      }
    } catch (err) { setUploadError(err.message); onChange(null); }
    finally { setUploading(false); }
  };

  const formatSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  if (value && value.name) {
    return (
      <div style={{ border: `1.5px solid ${hasError ? "#fca5a5" : "#a3e635"}`, borderRadius: 8, background: hasError ? "#fff8f8" : "#f7fee7", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: "#d9f99d", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#4d7c0f" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2e05", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.name}</div>
          <div style={{ fontSize: 11, color: "#65a30d", marginTop: 1 }}>
            {formatSize(value.size)}
            {value.serverData && <span style={{ marginLeft: 5, color: "#84cc16" }}>✓ Yuklandi</span>}
          </div>
        </div>
        <button onClick={() => { onChange(null); setUploadError(""); if (inputRef.current) inputRef.current.value = ""; }}
          style={{ width: 24, height: 24, borderRadius: 6, border: "1.5px solid #bbf7d0", background: "#fff", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
        style={{ border: `2px dashed ${hasError ? "#fca5a5" : dragOver ? "#2563eb" : "#cbd5e1"}`, borderRadius: 8, background: hasError ? "#fff8f8" : dragOver ? "#eff6ff" : "#fafafa", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: uploading ? "wait" : "pointer", transition: "all 0.15s" }}>
        {uploading ? (
          <><div style={{ width: 26, height: 26, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "execSpin 0.8s linear infinite" }} /><span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Yuklanmoqda...</span></>
        ) : (
          <>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: dragOver ? "#dbeafe" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: dragOver ? "#2563eb" : "#94a3b8" }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: dragOver ? "#2563eb" : "#334155" }}>Faylni tashlang yoki <span style={{ color: "#2563eb", textDecoration: "underline" }}>tanlang</span></div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Har qanday fayl formati</div>
            </div>
          </>
        )}
      </div>
      {uploadError && <div style={{ marginTop: 5, padding: "5px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: 6, fontSize: 11, border: "1px solid #fecaca" }}>⚠ {uploadError}</div>}
      <input ref={inputRef} type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} style={{ display: "none" }} tabIndex={-1} />
    </div>
  );
};

const ParamInput = ({ param, value, onChange, hasError, repId }) => {
  const type = resolveInputType(param.paramType);
  const label = param.paramView || param.paramName;
  const hasOptions = Array.isArray(param.options) && param.options.length > 0;
  const base = { width: "100%", boxSizing: "border-box", border: `1.5px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "#0f172a", background: hasError ? "#fff8f8" : "#fafafa", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" };

  if (type === "upload") return <FileUploadInput param={param} value={value} onChange={onChange} hasError={hasError} repId={repId} />;
  if (hasOptions) return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={{ ...base, cursor: "pointer" }}>
      <option value="">— Tanlang —</option>
      {param.options.map((opt) => <option key={String(opt.id)} value={String(opt.id)}>{opt.name}</option>)}
    </select>
  );
  if (type === "boolean") return (
    <div style={{ display: "flex", gap: 8 }}>
      {[{ val: "true", label: "✓  Ha" }, { val: "false", label: "✕  Yo'q" }].map((opt) => (
        <label key={opt.val} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "8px 0", borderRadius: 8, border: `1.5px solid ${value === opt.val ? "#2563eb" : (hasError ? "#fca5a5" : "#e2e8f0")}`, background: value === opt.val ? "#eff6ff" : (hasError ? "#fff8f8" : "#fafafa"), color: value === opt.val ? "#2563eb" : "#64748b", fontWeight: 700, fontSize: 13, transition: "all 0.15s" }}>
          <input type="radio" name={param.paramName} value={opt.val} checked={value === opt.val} onChange={() => onChange(opt.val)} style={{ display: "none" }} />
          {opt.label}
        </label>
      ))}
    </div>
  );
  if (type === "date") {
    const toISO = (v) => { if (!v) return ""; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const p = v.split("."); if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`; return ""; };
    const fromISO = (v) => { if (!v) return ""; const [y, m, d] = v.split("-"); return `${d}.${m}.${y}`; };
    const handleTextInput = (e) => {
      let raw = e.target.value.replace(/\D/g, "").slice(0, 8);
      let fmt = raw;
      if (raw.length >= 3 && raw.length <= 4) fmt = raw.slice(0, 2) + "." + raw.slice(2);
      else if (raw.length >= 5) fmt = raw.slice(0, 2) + "." + raw.slice(2, 4) + "." + raw.slice(4);
      onChange(fmt);
    };
    return (
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input type="text" value={value || ""} onChange={handleTextInput} placeholder="DD.MM.YYYY" maxLength={10} style={{ ...base, paddingRight: 36 }} />
        <span style={{ position: "absolute", right: 8, cursor: "pointer", display: "flex", alignItems: "center", color: "#94a3b8" }} onClick={() => document.getElementById("hidden-date-" + param.paramName)?.showPicker?.()}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </span>
        <input id={"hidden-date-" + param.paramName} type="date" value={toISO(value)} onChange={(e) => onChange(fromISO(e.target.value))} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} tabIndex={-1} />
      </div>
    );
  }
  if (type === "datetime") return <input type="datetime-local" value={value || ""} onChange={(e) => onChange(e.target.value)} style={base} />;
  if (type === "number") return <input type="number" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={`${label} kiriting...`} style={base} />;
  return <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={`${label} kiriting...`} style={base} />;
};

const ReportExecutePage = () => {
  const repId = new URLSearchParams(window.location.search).get("repId");
  const [reportName, setReportName] = useState("Report");
  const [params, setParams] = useState([]);
  const [paramValues, setParamValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [paramsLoading, setParamsLoading] = useState(true);
  const [paramsError, setParamsError] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("xlsx");
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");
  const [result, setResult] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!repId) { setParamsError("repId topilmadi"); setParamsLoading(false); return; }
    try {
      const stored = localStorage.getItem(`exec_report_${repId}`);
      if (stored) setReportName(JSON.parse(stored).name || "Report");
    } catch {}

    const fetchParams = async () => {
      setParamsLoading(true); setParamsError("");
      try {
        const res = await api.get(`/api/reports/report?repId=${repId}`);
        if (!res.ok) throw new Error("Parametrlarni yuklashda xatolik");
        const data = await res.json();
        setParams(data);
        const init = {};
        data.forEach((p) => { init[p.paramName] = p.defaultValue != null ? String(p.defaultValue) : ""; });
        setParamValues(init);
      } catch (err) { setParamsError(err.message); }
      finally { setParamsLoading(false); }
    };
    fetchParams();
  }, [repId]);

  const handleChange = (name, value) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: false }));
    setExecError("");
  };

  const handleReset = () => {
    const init = {};
    params.forEach((p) => { init[p.paramName] = p.defaultValue != null ? String(p.defaultValue) : ""; });
    setParamValues(init); setFieldErrors({}); setExecError(""); setResult(null); setDownloadError("");
  };

  const handleExecute = async () => {
    const errors = {};
    params.forEach((p) => {
      const val = paramValues[p.paramName];
      if (resolveInputType(p.paramType) === "upload") { if (!val?.serverData) errors[p.paramName] = true; }
      else { if (!val?.toString().trim()) errors[p.paramName] = true; }
    });
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); setExecError("Barcha maydonlarni to'ldiring"); return; }

    setExecLoading(true); setExecError(""); setResult(null); setDownloadError("");
    try {
      const stringParams = {};
      params.forEach((p) => {
        if (resolveInputType(p.paramType) === "upload") {
          stringParams[p.paramName] = paramValues[p.paramName]?.serverData ? JSON.stringify(paramValues[p.paramName].serverData) : "";
        } else {
          stringParams[p.paramName] = String(paramValues[p.paramName]);
        }
      });
      const res = await api.post("/api/reports/generate", {
        username: localStorage.getItem("username") || "", repId, params: stringParams, fileFormat: selectedFormat,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setResult(text.replace(/^Fayl saqlandi:\s*/i, "").trim());
    } catch (err) { setExecError(err.message); }
    finally { setExecLoading(false); }
  };

  const handleDownload = async (filePath) => {
    setDownloadLoading(true); setDownloadError("");
    try {
      const res = await api.download(`/api/reports/download?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error("Yuklab olishda xatolik: " + res.status);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filePath.split(/[\\/]/).pop();
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { setDownloadError(err.message); }
    finally { setDownloadLoading(false); }
  };

  const fmtColor = FORMAT_COLORS[selectedFormat];

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <div style={s.topIcon}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#2563eb"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <div style={s.topName}>{reportName}</div>
            <div style={s.topSub}>Report bajarish sahifasi</div>
          </div>
        </div>
        <button style={s.closeBtn} onClick={() => window.close()}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          Yopish
        </button>
      </div>

      <div style={s.body}>
        <div style={s.card}>
          <div style={s.cardHead}>
            <div style={s.cardHeadIcon}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#7c3aed"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <span style={s.cardTitle}>Parametrlar</span>
            {!paramsLoading && !paramsError && <span style={s.badge}>{params.length} ta</span>}
          </div>

          {paramsLoading ? (
            <div style={s.centered}><div style={s.spinner} /><span style={s.hint}>Yuklanmoqda...</span></div>
          ) : paramsError ? (
            <div style={s.errMsg}>⚠ {paramsError}</div>
          ) : params.length === 0 ? (
            <div style={s.centered}><span style={s.hint}>Bu report uchun parametr yo'q</span></div>
          ) : (
            <div style={s.paramsGrid}>
              {params.map((param, idx) => {
                const isDropdown = Array.isArray(param.options) && param.options.length > 0;
                const isUpload = resolveInputType(param.paramType) === "upload";
                return (
                  <div key={param.paramName} style={isUpload ? { ...s.fieldWrap, gridColumn: "1 / -1" } : s.fieldWrap}>
                    <div style={s.labelRow}>
                      <span style={s.orderBadge}>{idx + 1}</span>
                      <label style={s.fieldLabel}>{param.paramView || param.paramName}</label>
                      <span style={{ ...s.typeBadge, background: isUpload ? "#fef9c3" : isDropdown ? "#eff6ff" : "#f1f5f9", color: isUpload ? "#a16207" : isDropdown ? "#2563eb" : "#64748b" }}>
                        {isUpload ? "fayl yuklash" : isDropdown ? "ro'yxat" : param.paramType}
                      </span>
                      {fieldErrors[param.paramName] && <span style={s.reqBadge}>Majburiy</span>}
                    </div>
                    <ParamInput param={param} value={paramValues[param.paramName] || ""} onChange={(val) => handleChange(param.paramName, val)} hasError={!!fieldErrors[param.paramName]} repId={repId} />
                  </div>
                );
              })}
            </div>
          )}

          {execError && <div style={{ ...s.errMsg, margin: "0 16px 12px" }}>⚠ {execError}</div>}

          {!paramsLoading && !paramsError && (
            <div style={s.actions}>
              <FormatDropdown selected={selectedFormat} onChange={(fmt) => { setSelectedFormat(fmt); setResult(null); setDownloadError(""); }} />
              <div style={{ flex: 1 }} />
              <button style={s.resetBtn} onClick={handleReset} disabled={execLoading}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Tozalash
              </button>
              <button style={{ ...s.execBtn, opacity: execLoading ? 0.7 : 1, background: `linear-gradient(135deg, ${fmtColor.active}, ${fmtColor.active}cc)`, boxShadow: `0 3px 10px ${fmtColor.active}44` }} onClick={handleExecute} disabled={execLoading}>
                {execLoading
                  ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={s.btnSpinner} /> Bajarilmoqda...</span>
                  : <><FormatIcon fmt={selectedFormat} /> .{selectedFormat} yaratish</>}
              </button>
            </div>
          )}
        </div>

        {result !== null && (
          <div style={s.card}>
            <div style={s.cardHead}>
              <div style={{ ...s.cardHeadIcon, background: "#f0fdf4" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#16a34a"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span style={s.cardTitle}>Natija</span>
              <span style={{ ...s.badge, background: "#dcfce7", color: "#16a34a" }}>Muvaffaqiyatli</span>
            </div>
            <div style={s.successBox}>
              <div style={{ ...s.fileIcon, background: fmtColor.badge, border: `2px solid ${fmtColor.activeBorder}22`, color: fmtColor.active }}>
                <FormatIcon fmt={selectedFormat} />
              </div>
              <div style={s.successText}>
                <div style={{ ...s.successTitle, color: fmtColor.active }}>.{selectedFormat} fayl yaratildi!</div>
                <div style={s.successPath}>{result}</div>
                {downloadError && <div style={{ ...s.errMsg, marginTop: 8 }}>⚠ {downloadError}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button style={{ ...s.downloadBtn, opacity: downloadLoading ? 0.7 : 1, background: `linear-gradient(135deg, ${fmtColor.active}, ${fmtColor.active}cc)`, boxShadow: `0 3px 10px ${fmtColor.active}44` }} onClick={() => handleDownload(result)} disabled={downloadLoading}>
                    {downloadLoading
                      ? <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={s.btnSpinner} /> Yuklanmoqda...</span>
                      : <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Yuklab olish</>}
                  </button>
                  <button id="copy-path-btn" style={s.copyBtn} onClick={() => {
                    navigator.clipboard.writeText(result).then(() => {
                      const btn = document.getElementById("copy-path-btn");
                      if (btn) { btn.textContent = "✓ Nusxalandi!"; setTimeout(() => { btn.textContent = "Yo'lni nusxalash"; }, 2000); }
                    });
                  }}>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Yo'lni nusxalash
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  page:    { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  topBar:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", position: "sticky", top: 0, zIndex: 100 },
  topLeft: { display: "flex", alignItems: "center", gap: 10 },
  topIcon: { width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  topName: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  topSub:  { fontSize: 10, color: "#94a3b8", marginTop: 1 },
  closeBtn: { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 7, padding: "5px 12px", fontSize: 12, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  body:    { maxWidth: 900, margin: "0 auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 },
  card:    { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden" },
  cardHead: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #f1f5f9", background: "#fafafa", flexWrap: "wrap" },
  cardHeadIcon: { width: 28, height: 28, borderRadius: 7, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
  badge:   { display: "inline-block", padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#ede9fe", color: "#7c3aed" },
  paramsGrid: { padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 },
  fieldWrap: {},
  labelRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" },
  orderBadge: { width: 18, height: 18, borderRadius: "50%", background: "#ede9fe", color: "#7c3aed", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "#1e293b" },
  typeBadge: { marginLeft: "auto", display: "inline-block", padding: "1px 6px", borderRadius: 5, fontSize: 10, fontWeight: 700 },
  reqBadge: { display: "inline-block", padding: "1px 6px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#dc2626" },
  actions:  { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid #f1f5f9", background: "#fafafa" },
  resetBtn: { display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  execBtn:  { display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 700 },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 16px" },
  hint:     { color: "#94a3b8", fontSize: 12, textAlign: "center" },
  errMsg:   { margin: 14, padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: 7, fontSize: 12, border: "1px solid #fecaca" },
  spinner:  { width: 26, height: 26, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "execSpin 0.8s linear infinite", marginBottom: 10 },
  btnSpinner: { width: 12, height: 12, border: "2px solid rgba(255,255,255,0.35)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "execSpin 0.7s linear infinite" },
  successBox:   { display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "#f8fafc" },
  fileIcon:     { width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  successText:  { flex: 1, minWidth: 0 },
  successTitle: { fontSize: 13, fontWeight: 700, marginBottom: 5 },
  successPath:  { fontSize: 12, color: "#334155", fontFamily: "monospace", background: "#f1f5f9", padding: "5px 10px", borderRadius: 7, wordBreak: "break-all", border: "1px solid #e2e8f0" },
  downloadBtn:  { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" },
  copyBtn:      { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
};

const st = document.createElement("style");
st.id = "exec-styles";
st.innerHTML = `@keyframes execSpin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`;
if (!document.getElementById("exec-styles")) document.head.appendChild(st);

export default ReportExecutePage;
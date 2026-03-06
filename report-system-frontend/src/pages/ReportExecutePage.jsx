import { useState, useEffect } from "react";

// ── Helpers ──────────────────────────────────────────────
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Accept-Language": "UZ",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const resolveInputType = (paramType) => {
  if (!paramType) return "text";
  const t = paramType.toUpperCase().trim();
  if (t.startsWith("TIMESTAMP")) return "datetime";
  if (t === "DATE") return "date";
  if (["BOOLEAN", "BOOL"].includes(t)) return "boolean";
  if ([
    "NUMBER", "INTEGER", "INT", "FLOAT", "BINARY_FLOAT", "BINARY_DOUBLE",
    "BIGINT", "LONG", "SMALLINT", "DECIMAL", "NUMERIC", "REAL",
  ].includes(t)) return "number";
  return "text";
};

// dd.MM.yyyy → yyyy-MM-dd (input type=date uchun)
const toInputDate = (val) => {
  if (!val) return "";
  // Allaqachon yyyy-MM-dd formatda bo'lsa
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // dd.MM.yyyy formatdan convert
  const parts = val.split(".");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return val;
};

// yyyy-MM-dd → dd.MM.yyyy (backendga yuborish uchun)
const toBackendDate = (val) => {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-");
    return `${d}.${m}.${y}`;
  }
  return val;
};

// ── Param Input ───────────────────────────────────────────
const ParamInput = ({ param, value, onChange, hasError }) => {
  const type = resolveInputType(param.paramType);
  const label = param.paramView || param.paramName;
  const hasOptions = Array.isArray(param.options) && param.options.length > 0;

  const base = {
    width: "100%", boxSizing: "border-box",
    border: `1.5px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`,
    borderRadius: 10, padding: "11px 14px", fontSize: 14,
    color: "#0f172a", background: hasError ? "#fff8f8" : "#fafafa",
    outline: "none", fontFamily: "inherit",
    transition: "border-color 0.15s",
  };

  // ── Dropdown ──
  if (hasOptions) {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...base, cursor: "pointer" }}
      >
        <option value="">— Tanlang —</option>
        {param.options.map((opt) => (
          <option key={String(opt.id)} value={String(opt.id)}>
            {opt.name}
          </option>
        ))}
      </select>
    );
  }

  // ── Boolean ──
  if (type === "boolean") {
    return (
      <div style={{ display: "flex", gap: 10 }}>
        {[{ val: "true", label: "✓  Ha" }, { val: "false", label: "✕  Yo'q" }].map((opt) => (
          <label key={opt.val} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: "11px 0", borderRadius: 10,
            border: `1.5px solid ${value === opt.val ? "#2563eb" : (hasError ? "#fca5a5" : "#e2e8f0")}`,
            background: value === opt.val ? "#eff6ff" : (hasError ? "#fff8f8" : "#fafafa"),
            color: value === opt.val ? "#2563eb" : "#64748b",
            fontWeight: 700, fontSize: 14, transition: "all 0.15s",
          }}>
            <input type="radio" name={param.paramName} value={opt.val}
              checked={value === opt.val} onChange={() => onChange(opt.val)}
              style={{ display: "none" }} />
            {opt.label}
          </label>
        ))}
      </div>
    );
  }

  // ── Date — dd.MM.yyyy mask + calendar picker ──
  if (type === "date") {
    const toISO = (v) => {
      if (!v) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const p = v.split(".");
      if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
      return "";
    };
    const fromISO = (v) => {
      if (!v) return "";
      const [y, m, d] = v.split("-");
      return `${d}.${m}.${y}`;
    };
    const handleTextInput = (e) => {
      let raw = e.target.value.replace(/\D/g, "");
      if (raw.length > 8) raw = raw.slice(0, 8);
      let fmt = raw;
      if (raw.length >= 3 && raw.length <= 4) fmt = raw.slice(0, 2) + "." + raw.slice(2);
      else if (raw.length >= 5) fmt = raw.slice(0, 2) + "." + raw.slice(2, 4) + "." + raw.slice(4);
      onChange(fmt);
    };

    return (
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          type="text"
          value={value || ""}
          onChange={handleTextInput}
          placeholder="DD.MM.YYYY"
          maxLength={10}
          style={{ ...base, paddingRight: 42 }}
        />
        <span
          title="Kalendar"
          style={{
            position: "absolute", right: 10, cursor: "pointer",
            display: "flex", alignItems: "center", color: "#94a3b8",
            userSelect: "none",
          }}
          onClick={() => {
            const inp = document.getElementById("hidden-date-" + param.paramName);
            if (inp) inp.showPicker?.();
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        <input
          id={"hidden-date-" + param.paramName}
          type="date"
          value={toISO(value)}
          onChange={(e) => onChange(fromISO(e.target.value))}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
          tabIndex={-1}
        />
      </div>
    );
  }

  if (type === "datetime") return (
    <input type="datetime-local" value={value || ""} onChange={(e) => onChange(e.target.value)} style={base} />
  );

  if (type === "number") return (
    <input type="number" value={value || ""} onChange={(e) => onChange(e.target.value)}
      placeholder={`${label} kiriting...`} style={base} />
  );

  return (
    <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)}
      placeholder={`${label} kiriting...`} style={base} />
  );
};

// ════════════════════════════════════════════════════════
const ReportExecutePage = () => {
  const repId = new URLSearchParams(window.location.search).get("repId");

  const [reportName, setReportName] = useState("Report");
  const [params, setParams] = useState([]);
  const [paramValues, setParamValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [paramsLoading, setParamsLoading] = useState(true);
  const [paramsError, setParamsError] = useState("");

  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");

  const [result, setResult] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // ── Load params ───────────────────────────────────────
  useEffect(() => {
    if (!repId) { setParamsError("repId topilmadi"); setParamsLoading(false); return; }

    try {
      const stored = localStorage.getItem(`exec_report_${repId}`);
      if (stored) {
        const obj = JSON.parse(stored);
        setReportName(obj.name || "Report");
      }
    } catch {}

    const fetchParams = async () => {
      setParamsLoading(true);
      setParamsError("");
      try {
        const res = await fetch(
          `http://localhost:8080/api/reports/report?repId=${repId}`,
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error("Parametrlarni yuklashda xatolik");
        const data = await res.json();
        setParams(data);

        const init = {};
        data.forEach((p) => {
          // dd.MM.yyyy formatida keladi — o'zgartirishsiz saqlaymiz
          init[p.paramName] = p.defaultValue != null ? String(p.defaultValue) : "";
        });
        setParamValues(init);
      } catch (err) {
        setParamsError(err.message);
      } finally {
        setParamsLoading(false);
      }
    };
    fetchParams();
  }, [repId]);

  // ── Handlers ─────────────────────────────────────────
  const handleChange = (name, value) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: false }));
    setExecError("");
  };

  const handleReset = () => {
    const init = {};
    params.forEach((p) => {
      init[p.paramName] = p.defaultValue != null ? String(p.defaultValue) : "";
    });
    setParamValues(init);
    setFieldErrors({});
    setExecError("");
    setResult(null);
    setDownloadError("");
  };

  const handleExecute = async () => {
    const errors = {};
    params.forEach((p) => {
      if (!paramValues[p.paramName]?.toString().trim()) errors[p.paramName] = true;
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setExecError("Barcha maydonlarni to'ldiring");
      return;
    }

    setExecLoading(true);
    setExecError("");
    setResult(null);
    setDownloadError("");

    try {
      const stringParams = {};
      params.forEach((p) => {
        // dd.MM.yyyy formatida saqlanadi — o'zgartirishsiz yuboramiz
        stringParams[p.paramName] = String(paramValues[p.paramName]);
      });

      const res = await fetch("http://localhost:8080/api/reports/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          username: localStorage.getItem("username") || "",
          repId,
          params: stringParams,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Xatolik yuz berdi");
      setResult(text.replace(/^Fayl saqlandi:\s*/i, "").trim());
    } catch (err) {
      setExecError(err.message);
    } finally {
      setExecLoading(false);
    }
  };

  // ── Download ──────────────────────────────────────────
  const handleDownload = async (filePath) => {
    setDownloadLoading(true);
    setDownloadError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:8080/api/reports/download?path=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${token}`, "Accept-Language": "UZ" } }
      );
      if (!res.ok) throw new Error("Yuklab olishda xatolik: " + res.status);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filePath.split(/[\\/]/).pop();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <div style={s.topIcon}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div style={s.topName}>{reportName}</div>
            <div style={s.topSub}>Report bajarish sahifasi</div>
          </div>
        </div>
        <button style={s.closeBtn} onClick={() => window.close()}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Yopish
        </button>
      </div>

      <div style={s.body}>

        {/* Params Card */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <div style={s.cardHeadIcon}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#7c3aed">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <span style={s.cardTitle}>Parametrlar</span>
            {!paramsLoading && !paramsError && (
              <span style={s.badge}>{params.length} ta</span>
            )}
          </div>

          {paramsLoading ? (
            <div style={s.centered}>
              <div style={s.spinner} />
              <span style={s.hint}>Parametrlar yuklanmoqda...</span>
            </div>
          ) : paramsError ? (
            <div style={s.errMsg}>⚠ {paramsError}</div>
          ) : params.length === 0 ? (
            <div style={s.centered}>
              <span style={s.hint}>Bu report uchun parametr yo'q — to'g'ridan-to'g'ri ishga tushiring</span>
            </div>
          ) : (
            <div style={s.paramsGrid}>
              {params.map((param, idx) => {
                const isDropdown = Array.isArray(param.options) && param.options.length > 0;
                return (
                  <div key={param.paramName} style={s.fieldWrap}>
                    <div style={s.labelRow}>
                      <span style={s.orderBadge}>{idx + 1}</span>
                      <label style={s.fieldLabel}>{param.paramView || param.paramName}</label>
                      <span style={{
                        ...s.typeBadge,
                        background: isDropdown ? "#eff6ff" : "#f1f5f9",
                        color: isDropdown ? "#2563eb" : "#64748b",
                      }}>
                        {isDropdown ? "ro'yxat" : param.paramType}
                      </span>
                      {fieldErrors[param.paramName] && (
                        <span style={s.reqBadge}>Majburiy</span>
                      )}
                    </div>
                    <ParamInput
                      param={param}
                      value={paramValues[param.paramName] || ""}
                      onChange={(val) => handleChange(param.paramName, val)}
                      hasError={!!fieldErrors[param.paramName]}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {execError && (
            <div style={{ ...s.errMsg, margin: "0 20px 16px" }}>⚠ {execError}</div>
          )}

          {!paramsLoading && !paramsError && (
            <div style={s.actions}>
              <button style={s.resetBtn} onClick={handleReset} disabled={execLoading}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tozalash
              </button>
              <button
                style={{ ...s.execBtn, opacity: execLoading ? 0.7 : 1 }}
                onClick={handleExecute}
                disabled={execLoading}
              >
                {execLoading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={s.btnSpinner} /> Bajarilmoqda...
                  </span>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ishga tushirish
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Result Card */}
        {result !== null && (
          <div style={s.card}>
            <div style={s.cardHead}>
              <div style={{ ...s.cardHeadIcon, background: "#f0fdf4" }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#16a34a">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span style={s.cardTitle}>Natija</span>
              <span style={{ ...s.badge, background: "#dcfce7", color: "#16a34a" }}>Muvaffaqiyatli</span>
            </div>

            <div style={s.successBox}>
              <div style={s.excelIcon}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={s.successText}>
                <div style={s.successTitle}>Excel fayl yaratildi!</div>
                <div style={s.successPath}>{result}</div>

                {downloadError && (
                  <div style={{ ...s.errMsg, marginTop: 10 }}>⚠ {downloadError}</div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    style={{ ...s.downloadBtn, opacity: downloadLoading ? 0.7 : 1 }}
                    onClick={() => handleDownload(result)}
                    disabled={downloadLoading}
                  >
                    {downloadLoading ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={s.btnSpinner} /> Yuklanmoqda...
                      </span>
                    ) : (
                      <>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Yuklab olish
                      </>
                    )}
                  </button>

                  <button
                    id="copy-path-btn"
                    style={s.copyBtn}
                    onClick={() => {
                      navigator.clipboard.writeText(result).then(() => {
                        const btn = document.getElementById("copy-path-btn");
                        if (btn) {
                          btn.textContent = "✓ Nusxalandi!";
                          setTimeout(() => { btn.textContent = "Yo'lni nusxalash"; }, 2000);
                        }
                      });
                    }}
                  >
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
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

// ── Styles ────────────────────────────────────────────────
const s = {
  page: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", position: "sticky", top: 0, zIndex: 100 },
  topLeft: { display: "flex", alignItems: "center", gap: 12 },
  topIcon: { width: 38, height: 38, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  topName: { fontSize: 16, fontWeight: 800, color: "#0f172a" },
  topSub: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  closeBtn: { display: "inline-flex", alignItems: "center", gap: 6, border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  body: { maxWidth: 960, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 20 },
  card: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden" },
  cardHead: { display: "flex", alignItems: "center", gap: 10, padding: "15px 20px", borderBottom: "1px solid #f1f5f9", background: "#fafafa", flexWrap: "wrap" },
  cardHeadIcon: { width: 32, height: 32, borderRadius: 8, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  badge: { display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#ede9fe", color: "#7c3aed" },
  paramsGrid: { padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 },
  fieldWrap: {},
  labelRow: { display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" },
  orderBadge: { width: 22, height: 22, borderRadius: "50%", background: "#ede9fe", color: "#7c3aed", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fieldLabel: { fontSize: 14, fontWeight: 600, color: "#1e293b" },
  typeBadge: { marginLeft: "auto", display: "inline-block", padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700 },
  reqBadge: { display: "inline-block", padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#dc2626" },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid #f1f5f9", background: "#fafafa" },
  resetBtn: { display: "inline-flex", alignItems: "center", gap: 6, border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "9px 20px", fontSize: 14, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  execBtn: { display: "inline-flex", alignItems: "center", gap: 8, border: "none", background: "linear-gradient(135deg, #16a34a, #15803d)", borderRadius: 10, padding: "9px 24px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 12px rgba(22,163,74,0.3)" },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 20px" },
  hint: { color: "#94a3b8", fontSize: 13, textAlign: "center" },
  errMsg: { margin: 20, padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13, border: "1px solid #fecaca" },
  spinner: { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "execSpin 0.8s linear infinite", marginBottom: 12 },
  btnSpinner: { width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "execSpin 0.7s linear infinite" },
  successBox: { display: "flex", alignItems: "center", gap: 16, padding: "24px", background: "#f0fdf4" },
  excelIcon: { width: 56, height: 56, borderRadius: 14, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #bbf7d0" },
  successText: { flex: 1, minWidth: 0 },
  successTitle: { fontSize: 16, fontWeight: 800, color: "#15803d", marginBottom: 6 },
  successPath: { fontSize: 13, color: "#166534", fontFamily: "monospace", background: "#dcfce7", padding: "6px 12px", borderRadius: 8, wordBreak: "break-all", border: "1px solid #bbf7d0" },
  downloadBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none", boxShadow: "0 3px 10px rgba(22,163,74,0.35)", cursor: "pointer" },
  copyBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

const st = document.createElement("style");
st.id = "exec-styles";
st.innerHTML = `@keyframes execSpin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`;
if (!document.getElementById("exec-styles")) document.head.appendChild(st);

export default ReportExecutePage;

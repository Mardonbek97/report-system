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

// Oracle + standard type → input type mapping
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
  // VARCHAR2, CHAR, CLOB, NVARCHAR2, NCHAR, TEXT, STRING, VARCHAR, INTERVAL, etc.
  return "text";
};

// ── Single param input component ─────────────────────────
const ParamInput = ({ param, value, onChange, hasError }) => {
  const type = resolveInputType(param.paramType);
  const label = param.paramView || param.paramName;

  const base = {
    width: "100%", boxSizing: "border-box",
    border: `1.5px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`,
    borderRadius: 10, padding: "11px 14px", fontSize: 14,
    color: "#0f172a", background: hasError ? "#fff8f8" : "#fafafa",
    outline: "none", fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

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

  if (type === "datetime") return (
    <input type="datetime-local" value={value || ""} onChange={(e) => onChange(e.target.value)} style={base} />
  );

  if (type === "date") return (
    <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} style={base} />
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
  // repId ni URL query string dan olamiz: ?repId=UUID
  const repId = new URLSearchParams(window.location.search).get("repId");

  const [reportName, setReportName] = useState("Report");
  const [params, setParams] = useState([]);
  const [paramValues, setParamValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [paramsLoading, setParamsLoading] = useState(true);
  const [paramsError, setParamsError] = useState("");

  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");

  const [result, setResult] = useState(null);       // null | Array | string
  const [resultCols, setResultCols] = useState([]);
  const [resultSearch, setResultSearch] = useState("");

  // ── Load report name & params ────────────────────────
  useEffect(() => {
    if (!repId) { setParamsError("repId topilmadi"); setParamsLoading(false); return; }

    // Report nomi va Long id ni localStorage dan olish
    try {
      const stored = localStorage.getItem(`exec_report_${repId}`);
      if (stored) {
        const obj = JSON.parse(stored);
        setReportName(obj.name || "Report");
      }
    } catch {}

    // Parametrlarni backenddan olish
    const fetchParams = async () => {
      setParamsLoading(true);
      setParamsError("");
      try {
        const res = await fetch(
          `http://localhost:8080/api/reports/report?repId=${repId}`,
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error("Parametrlarni yuklashda xatolik");
        const data = await res.json(); // List<ReportParamsDto>
        setParams(data);
        const init = {};
        data.forEach((p) => { init[p.paramName] = ""; });
        setParamValues(init);
      } catch (err) {
        setParamsError(err.message);
      } finally {
        setParamsLoading(false);
      }
    };
    fetchParams();
  }, [repId]);

  // ── Field change ─────────────────────────────────────
  const handleChange = (name, value) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: false }));
    setExecError("");
  };

  // ── Reset ────────────────────────────────────────────
  const handleReset = () => {
    const init = {};
    params.forEach((p) => { init[p.paramName] = ""; });
    setParamValues(init);
    setFieldErrors({});
    setExecError("");
    setResult(null);
    setResultCols([]);
    setResultSearch("");
  };

  // ── Execute ──────────────────────────────────────────
  const handleExecute = async () => {
    // Validate — empty check
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
    setResultCols([]);
    setResultSearch("");

    try {
      // DTO: ExecuteReportRequestDto(UUID repId, Map<String,String> params)
      // Barcha param qiymatlarini String ga aylantiramiz
      const stringParams = {};
      Object.entries(paramValues).forEach(([k, v]) => { stringParams[k] = String(v); });

      const res = await fetch("http://localhost:8080/api/reports/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          username: localStorage.getItem("username") || "",
          repId: repId,
          params: stringParams,
        }),
      });

      // Response: ResponseEntity<String> — "Fayl saqlandi: C:/..." yoki xato matni
      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Xatolik yuz berdi");
      }

      // Muvaffaqiyatli — fayl yo'lini ko'rsatamiz
      // "Fayl saqlandi: C:/..." → faqat fayl yo'lini olamiz
      setResult(text.replace(/^Fayl saqlandi:\s*/i, "").trim());

    } catch (err) {
      setExecError(err.message);
    } finally {
      setExecLoading(false);
    }
  };

  // ── Filter result rows ───────────────────────────────
  const filteredRows = Array.isArray(result)
    ? result.filter((row) =>
        !resultSearch ||
        Object.values(row).some((v) =>
          String(v ?? "").toLowerCase().includes(resultSearch.toLowerCase())
        )
      )
    : null;

  // ── Render ───────────────────────────────────────────
  return (
    <div style={p.page}>

      {/* Top bar */}
      <div style={p.topBar}>
        <div style={p.topLeft}>
          <div style={p.topIcon}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div style={p.topName}>{reportName}</div>
            <div style={p.topSub}>Report bajarish sahifasi</div>
          </div>
        </div>
        <button style={p.closeBtn} onClick={() => window.close()}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Yopish
        </button>
      </div>

      {/* Body */}
      <div style={p.body}>

        {/* ── Params Card ── */}
        <div style={p.card}>
          <div style={p.cardHead}>
            <div style={p.cardHeadIcon}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#7c3aed">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <span style={p.cardTitle}>Parametrlar</span>
            {!paramsLoading && !paramsError && (
              <span style={p.badge}>{params.length} ta</span>
            )}
          </div>

          {paramsLoading ? (
            <div style={p.centered}>
              <div style={p.spinner} />
              <span style={p.hint}>Parametrlar yuklanmoqda...</span>
            </div>
          ) : paramsError ? (
            <div style={p.errMsg}>⚠ {paramsError}</div>
          ) : params.length === 0 ? (
            <div style={p.centered}>
              <svg width="38" height="38" fill="none" viewBox="0 0 24 24" stroke="#e2e8f0" style={{ display: "block", margin: "0 auto 10px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span style={p.hint}>Bu report uchun parametr yo'q — to'g'ridan-to'g'ri ishga tushiring</span>
            </div>
          ) : (
            <div style={p.paramsGrid}>
              {params.map((param, idx) => (
                <div key={param.paramName} style={p.fieldWrap}>
                  <div style={p.labelRow}>
                    <span style={p.orderBadge}>{idx + 1}</span>
                    <label style={p.fieldLabel}>{param.paramView || param.paramName}</label>
                    <span style={p.typeBadge}>{param.paramType}</span>
                    {fieldErrors[param.paramName] && (
                      <span style={p.reqBadge}>Majburiy</span>
                    )}
                  </div>
                  <ParamInput
                    param={param}
                    value={paramValues[param.paramName] || ""}
                    onChange={(val) => handleChange(param.paramName, val)}
                    hasError={!!fieldErrors[param.paramName]}
                  />
                </div>
              ))}
            </div>
          )}

          {execError && (
            <div style={{ ...p.errMsg, margin: "0 20px 16px" }}>⚠ {execError}</div>
          )}

          {/* Action buttons */}
          {!paramsLoading && !paramsError && (
            <div style={p.actions}>
              <button style={p.resetBtn} onClick={handleReset} disabled={execLoading}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tozalash
              </button>
              <button
                style={{ ...p.execBtn, opacity: execLoading ? 0.7 : 1 }}
                onClick={handleExecute}
                disabled={execLoading}
              >
                {execLoading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={p.btnSpinner} /> Bajarilmoqda...
                  </span>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ishga tushirish
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Result Card ── */}
        {result !== null && (
          <div style={p.card}>
            <div style={p.cardHead}>
              <div style={{ ...p.cardHeadIcon, background: "#f0fdf4" }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#16a34a">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span style={p.cardTitle}>Natija</span>
              <span style={{ ...p.badge, background: "#dcfce7", color: "#16a34a" }}>Muvaffaqiyatli</span>
            </div>

            <div style={p.successBox}>
              {/* Excel icon */}
              <div style={p.excelIcon}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={p.successText}>
                <div style={p.successTitle}>Excel fayl yaratildi!</div>
                <div style={p.successPath}>{result}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  {/* Download — backend /download?path=... endpointdan */}
                  <a
                    href={`http://localhost:8080/api/reports/download?path=${encodeURIComponent(result)}`}
                    download
                    style={p.downloadBtn}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Yuklab olish
                  </a>
                  {/* Clipboard copy */}
                  <button
                    style={p.copyBtn}
                    onClick={() => {
                      navigator.clipboard.writeText(result).then(() => {
                        const btn = document.getElementById("copy-path-btn");
                        if (btn) { btn.textContent = "✓ Nusxalandi!"; setTimeout(() => { btn.textContent = "Yo'lni nusxalash"; }, 2000); }
                      });
                    }}
                  >
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span id="copy-path-btn">Yo'lni nusxalash</span>
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

// ── Styles ───────────────────────────────────────────────
const p = {
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
  typeBadge: { marginLeft: "auto", display: "inline-block", padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#64748b" },
  reqBadge: { display: "inline-block", padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#dc2626" },

  actions: { display: "flex", gap: 12, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid #f1f5f9", background: "#fafafa" },
  resetBtn: { display: "inline-flex", alignItems: "center", gap: 6, border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "9px 20px", fontSize: 14, color: "#64748b", cursor: "pointer", fontWeight: 600 },
  execBtn: { display: "inline-flex", alignItems: "center", gap: 8, border: "none", background: "linear-gradient(135deg, #16a34a, #15803d)", borderRadius: 10, padding: "9px 24px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 12px rgba(22,163,74,0.3)" },

  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 20px" },
  hint: { color: "#94a3b8", fontSize: 13, textAlign: "center" },
  errMsg: { margin: 20, padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: 8, fontSize: 13, border: "1px solid #fecaca" },
  spinner: { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "execSpin 0.8s linear infinite", marginBottom: 12 },
  btnSpinner: { width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "execSpin 0.7s linear infinite" },

  resultSearchWrap: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "5px 10px", marginLeft: "auto", minWidth: 200 },
  resultSearchInput: { border: "none", outline: "none", fontSize: 13, color: "#0f172a", background: "transparent", flex: 1 },
  clearBtn: { border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0 },

  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  thead: { background: "#f8fafc" },
  th: { padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f1f5f9", background: "#fff", transition: "background 0.1s" },
  td: { padding: "11px 14px", color: "#334155", verticalAlign: "middle" },
  rawResult: { padding: 20, fontFamily: "monospace", fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#f8fafc", borderTop: "1px solid #f1f5f9" },

  // Success result styles
  successBox: { display: "flex", alignItems: "center", gap: 16, padding: "24px", background: "#f0fdf4" },
  excelIcon: { width: 56, height: 56, borderRadius: 14, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #bbf7d0" },
  successText: { flex: 1, minWidth: 0 },
  successTitle: { fontSize: 16, fontWeight: 800, color: "#15803d", marginBottom: 6 },
  successPath: { fontSize: 13, color: "#166534", fontFamily: "monospace", background: "#dcfce7", padding: "6px 12px", borderRadius: 8, wordBreak: "break-all", border: "1px solid #bbf7d0" },
  downloadBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 3px 10px rgba(22,163,74,0.35)", cursor: "pointer" },
  copyBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fff", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

const st = document.createElement("style");
st.id = "exec-styles";
st.innerHTML = `@keyframes execSpin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`;
if (!document.getElementById("exec-styles")) document.head.appendChild(st);

export default ReportExecutePage;

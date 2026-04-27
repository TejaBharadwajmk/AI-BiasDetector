import { useState, useRef } from "react";
import BiasHeatmap from "../components/BiasHeatmap";
import DivergenceScore from "../components/DivergenceScore";
import TradeoffExplorer from "../components/TradeoffExplorer";
import ClaudeExplainer from "../components/ClaudeExplainer";
import { runAudit, runLLMProbe } from "../api/client";
import { exportPDF } from "../api/client";

const SAMPLES = [
  { key: "adult",   label: "UCI Adult Income",  rows: "48,842 rows", attrs: "gender, race, age",    color: "#ff5f7e" },
  { key: "hiring",  label: "Hiring Decisions",   rows: "12,431 rows", attrs: "gender, race",         color: "#f5a623" },
  { key: "credit",  label: "Credit Approval",    rows: "30,000 rows", attrs: "gender, age, income",  color: "#60a5fa" },
  { key: "medical", label: "Medical Triage",     rows: "8,219 rows",  attrs: "race, gender, age",    color: "#2563eb" },
];

const LOADING_STEPS = [
  "Parsing dataset & detecting columns",
  "Running proxy variable scanner",
  "Computing fairness metrics (AIF360 + Fairlearn)",
  "Building intersectional bias matrix",
  "Cross-validating with community reports",
  "Computing divergence score",
  "Generating Gemini AI explanation",
];

const STEP_DELAYS = [600, 1000, 1400, 1000, 800, 600, 1200];

export default function EngineerPortal() {
  const [view, setView] = useState("upload"); // "upload" | "dashboard"
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [targetCol, setTargetCol] = useState("");
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [llmKey, setLlmKey] = useState("");
  const [llmDomain, setLlmDomain] = useState("");
  const [protectedAttrs, setProtectedAttrs] = useState(["gender", "race"]);
  const fileRef = useRef();
  const fileObjRef = useRef(null);

  const ATTRS = ["gender", "race", "age", "income", "religion"];

  function toggleAttr(a) {
    setProtectedAttrs(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f) { setFileName(f.name); fileObjRef.current = f; setSelectedSample(null); }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFileName(f.name); fileObjRef.current = f; setSelectedSample(null); }
  }

  function loadSample(s) {
    setSelectedSample(s);
    setFileName(s.label + " (sample)");
    fileObjRef.current = null;
  }

  async function animateLoading() {
    setLoading(true);
    setLoadingStep(0);
    setDoneSteps([]);
    for (let i = 0; i < LOADING_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, STEP_DELAYS[i]));
      setDoneSteps(prev => [...prev, i]);
      if (i + 1 < LOADING_STEPS.length) setLoadingStep(i + 1);
    }
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    setLoadingStep(-1);
    setDoneSteps([]);
  }

  async function startAudit(type) {
    console.log("🚀 startAudit called, type:", type);
    console.log("📁 file:", fileObjRef.current);
    console.log("📊 sample:", selectedSample);
    console.log("🎯 targetCol:", targetCol);
    console.log("🔒 protectedAttrs:", protectedAttrs);

    if (!fileObjRef.current && !selectedSample) {
      alert("Please upload a file or select a sample dataset first.");
      return;
    }

    // Run animation and API call in parallel
    const animationPromise = animateLoading();

    let data;
    try {
      if (type === "csv") {
        const formData = new FormData();
        if (fileObjRef.current) {
          formData.append("file", fileObjRef.current);
          console.log("📎 Appended file:", fileObjRef.current.name);
        }
        formData.append("sample", selectedSample?.key || "adult");
        formData.append("target_col", targetCol || "income");
        formData.append("protected_attrs", protectedAttrs.join(","));

        console.log("📡 Sending request to backend...");
        data = await runAudit(formData);
        console.log("✅ API response:", data);
      } else {
        data = await runLLMProbe({
          endpoint: llmEndpoint,
          apiKey: llmKey,
          domain: llmDomain,
          attrs: protectedAttrs,
        });
      }
    } catch (err) {
    console.error("❌ API error:", err.message);
    alert(`Audit failed: ${err.message}`);
    return;
    }

    // Wait for animation to finish before showing dashboard
    await animationPromise;

   const transformedData = {
  // Identity — fixes "unknown" audit ID
  id:      data.audit_id || data.id,
  auditId: data.audit_id || data.id,

  // Dataset info — fixes "undefined" chips
  file:  data.file || data.dataset_name || fileObjRef.current?.name || "Dataset",
  rows:  data.rows || selectedSample?.rows || "N/A",
  attrs: data.attrs ||
         (Array.isArray(data.protected_attributes)
           ? data.protected_attributes.join(", ")
           : data.protected_attributes) || "N/A",

  // Score cards — fixes 0.00 overall bias
  overallBias:      Number(data.overall_bias ?? 0),
  divergenceIndex:  Number(data.divergence?.index ?? data.divergence_index ?? 0),
  proxyCount:       Number(data.proxy_count ?? data.proxy_vars?.length ?? 0),
  communityReports: Number(data.community_reports ?? 0),

  // Panels — fixes empty proxy scanner
  proxyVars:         data.proxy_vars         || data.proxy_variables        || [],
  metrics:           data.metrics            || data.bias_scores            || [],
  heatmap:           data.heatmap            || data.intersectional_matrix  || [],
  divergence:        data.divergence         || null,
  claudeExplanation: data.claude_explanation || "",
  impactStatement:  data.impact_statement  || "",
  complianceScore:  data.compliance_score  || 0,
  complianceStatus: data.compliance_status || "Review Required",
  complianceColor:  data.compliance_color  || "#f5a623",
 };

console.log("✅ transformedData:", transformedData);
setAuditData(transformedData);
setView("dashboard");

setAuditData(transformedData);
    setView("dashboard");
    console.log("✅ Dashboard opened with data:", data);
  }

  function getMockData() {
    return {
      file: fileName || "UCI Adult Income Dataset",
      rows: selectedSample?.rows || "48,842 rows",
      attrs: protectedAttrs.join(", "),
      overallBias: 0.71,
      divergenceIndex: 0.54,
      proxyCount: 4,
      communityReports: 47,
      proxyVars: [
        { col: "zip_code",    protected: "Race / Ethnicity", pct: 87, level: "danger" },
        { col: "first_name",  protected: "Gender",           pct: 94, level: "danger" },
        { col: "occupation",  protected: "Gender",           pct: 71, level: "warning" },
        { col: "browser_type",protected: "Socioeconomic",   pct: 63, level: "warning" },
      ],
      metrics: [
        { name: "Demographic Parity",  score: 0.34, color: "#ff5f7e", desc: "Selection rate differs 34% between groups" },
        { name: "Equalized Odds",      score: 0.28, color: "#f5a623", desc: "False positive rates vary across demographics" },
        { name: "Disparate Impact",    score: 0.61, color: "#ff5f7e", desc: "Below 0.8 threshold — violates 80% rule" },
        { name: "Calibration Error",   score: 0.12, color: "#60a5fa", desc: "Predictions are moderately well-calibrated" },
        { name: "Individual Fairness", score: 0.08, color: "#2563eb", desc: "Similar individuals treated similarly ✓" },
      ],
      divergence: {
        index: 0.54,
        statistical: 0.18,
        community: 0.72,
        confidence: 0.82,
        reportCount: 47,
        type: "math_misses_harm",
        topGroups: "Black women 35–50 (18), Hispanic men under 30 (14), women over 55 (9)",
      },
      claudeExplanation: `Your model shows **critical bias** against multiple intersecting demographic groups. The most severe pattern: **Black women over 40 are rejected 3.2× more often** than white men with identical qualifications — even after controlling for education, experience, and all other factors.\n\n**Why this is happening:** The \`zip_code\` column is 87% correlated with race in your dataset, meaning your model learned zip code as a proxy for race. The \`first_name\` field similarly encodes gender with 94% accuracy, creating compounding disadvantages for women.\n\n**Legal exposure:** Your disparate impact ratio of **0.61** falls below the legal 0.8 threshold — this model would likely violate **Title VII** and **EU AI Act Articles 10 and 13** if deployed.\n\n**Recommended action:** Apply Fix B (reweighing) — it removes proxy variable correlation while maintaining 98.6% of your model's accuracy.`,
      heatmap: [
        { group: "White Men",      vals: [1.00, 1.00, 1.00, 0.98] },
        { group: "White Women",    vals: [0.88, 0.85, 0.79, 0.71] },
        { group: "Black Men",      vals: [0.74, 0.70, 0.65, 0.58] },
        { group: "Black Women",    vals: [0.52, 0.47, 0.31, 0.28] },
        { group: "Hispanic Men",   vals: [0.78, 0.73, 0.67, 0.61] },
        { group: "Hispanic Women", vals: [0.61, 0.56, 0.48, 0.40] },
        { group: "Asian Men",      vals: [0.92, 0.89, 0.84, 0.76] },
        { group: "Asian Women",    vals: [0.81, 0.75, 0.67, 0.58] },
      ],
    };
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0b0f", color: "#e8eaf0", fontFamily: "'DM Sans', sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{ width: 240, background: "#10121a", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50 }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #00a3ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚖</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1rem" }}>Equality<span style={{ color: "#2563eb" }}>Lens</span></span>
        </div>

        <SidebarSection label="Audit">
          <SidebarItem icon="📂" label="New Audit"   active={view === "upload"}    onClick={() => setView("upload")} />
          <SidebarItem icon="📊" label="Dashboard"   active={view === "dashboard"} onClick={() => auditData && setView("dashboard")} muted={!auditData} badge={auditData ? "Live" : null} />
        </SidebarSection>

        <SidebarSection label="Portals">
          <SidebarItem icon="🏠" label="Landing Page"      onClick={() => window.location.href = "/"} />
          <SidebarItem icon="👥" label="Community Portal"  onClick={() => window.location.href = "/community"} />
        </SidebarSection>

        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ padding: "10px 12px", background: "#181b27", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Audit Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: auditData ? "#2563eb" : "#6b7280" }} />
              <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{auditData ? "Audit complete" : "No audit running"}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* TOPBAR */}
        <div style={{ height: 56, background: "rgba(10,11,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", gap: 8 }}>
            Engineer Portal <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
            <span style={{ color: "#e8eaf0", fontWeight: 500 }}>{view === "upload" ? "New Audit" : "Audit Results"}</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => {
  const id = auditData?.id || auditData?.auditId;
  console.log("Exporting with ID:", id);
  if (!id || id === "undefined") {
    alert("No audit ID — please run an audit first");
    return;
  }
  exportPDF(id);
}}>
  Export PDF ↓
</button>
          </div>
        </div>

        <div style={{ padding: 28, flex: 1 }}>

          {/* ── UPLOAD VIEW ── */}
          {view === "upload" && (
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em", marginBottom: 6 }}>Start a New Bias Audit</div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: 28 }}>Upload a dataset or connect an LLM endpoint. The engine handles the rest.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900 }}>

                {/* CSV UPLOAD */}
                <div style={card}>
                  <div style={cardTitle}>📂 Dataset Upload</div>
                  <div style={cardSub}>CSV or JSON — auto-detects protected attributes</div>

                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current.click()}
                    style={{ border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: "#0a0b0f", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: 10 }}>🗃</div>
                    <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}><strong style={{ color: "#2563eb" }}>Click to upload</strong> or drag & drop</div>
                    <div style={{ fontSize: "0.78rem", color: fileName ? "#2563eb" : "#6b7280", marginTop: 4 }}>{fileName || "No file selected"}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "#6b7280", marginTop: 6 }}>CSV · JSON · SQL schema</div>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: "none" }} onChange={handleFileChange} />

                  <Divider />

                  <div style={{ marginBottom: 14 }}>
                    <label style={inputLabel}>Protected Attributes</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {ATTRS.map(a => (
                        <label key={a} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `1px solid ${protectedAttrs.includes(a) ? "#2563eb" : "rgba(255,255,255,0.07)"}`, borderRadius: 100, cursor: "pointer", fontSize: "0.78rem", background: protectedAttrs.includes(a) ? "rgba(0,229,195,0.08)" : "transparent", color: protectedAttrs.includes(a) ? "#2563eb" : "#9ca3af", transition: "all 0.15s" }}>
                          <input type="checkbox" checked={protectedAttrs.includes(a)} onChange={() => toggleAttr(a)} style={{ display: "none" }} />
                          {a}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={inputLabel}>Target / Outcome Column</label>
                    <input value={targetCol} onChange={e => setTargetCol(e.target.value)} placeholder="e.g. hired, loan_approved, diagnosis" style={inputField} />
                  </div>

                  <button onClick={() => startAudit("csv")} style={runBtn}>⚡ Run Bias Audit</button>
                </div>

                {/* LLM PROBE */}
                <div style={card}>
                  <div style={cardTitle}>🤖 LLM Bias Probe</div>
                  <div style={cardSub}>Audit any LLM endpoint — 500+ systematic prompt variations</div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={inputLabel}>LLM API Endpoint</label>
                    <input value={llmEndpoint} onChange={e => setLlmEndpoint(e.target.value)} placeholder="https://api.openai.com/v1/chat/completions" style={{ ...inputField, fontFamily: "'DM Mono', monospace" }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={inputLabel}>API Key</label>
                    <input value={llmKey} onChange={e => setLlmKey(e.target.value)} type="password" placeholder="sk-..." style={{ ...inputField, fontFamily: "'DM Mono', monospace" }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={inputLabel}>Task Domain</label>
                    <select value={llmDomain} onChange={e => setLlmDomain(e.target.value)} style={{ ...inputField, cursor: "pointer" }}>
                      <option value="">Select domain...</option>
                      <option>Hiring / Recruitment</option>
                      <option>Lending / Credit</option>
                      <option>Healthcare Triage</option>
                      <option>Criminal Justice</option>
                      <option>General Chat</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={inputLabel}>Demographics to Probe</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {ATTRS.map(a => (
                        <label key={a} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `1px solid ${protectedAttrs.includes(a) ? "#f5a623" : "rgba(255,255,255,0.07)"}`, borderRadius: 100, cursor: "pointer", fontSize: "0.78rem", background: protectedAttrs.includes(a) ? "rgba(245,166,35,0.08)" : "transparent", color: protectedAttrs.includes(a) ? "#f5a623" : "#9ca3af", transition: "all 0.15s" }}>
                          <input type="checkbox" checked={protectedAttrs.includes(a)} onChange={() => toggleAttr(a)} style={{ display: "none" }} />
                          {a}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => startAudit("llm")} style={{ ...runBtn, background: "#f5a623" }}>🔬 Start LLM Probe</button>
                </div>

                {/* SAMPLE DATASETS */}
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: 10 }}>Quick start with a sample dataset:</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {SAMPLES.map(s => (
                      <div key={s.key} onClick={() => loadSample(s)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: selectedSample?.key === s.key ? "rgba(0,229,195,0.06)" : "#10121a", border: `1px solid ${selectedSample?.key === s.key ? "#2563eb" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.15s", color: selectedSample?.key === s.key ? "#2563eb" : "#e8eaf0" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                        {s.label}
                        <span style={{ color: "#6b7280", fontSize: "0.72rem" }}>{s.rows}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DASHBOARD VIEW ── */}
          {view === "dashboard" && auditData && (
  <Dashboard data={auditData} />
)}
        </div>
      </div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,11,15,0.88)", backdropFilter: "blur(10px)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            {LOADING_STEPS.map((step, i) => (
              <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 8, color: doneSteps.includes(i) ? "#2563eb" : loadingStep === i ? "#e8eaf0" : "#6b7280", opacity: loadingStep >= i || doneSteps.includes(i) ? 1 : 0.3, transition: "all 0.4s" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                {doneSteps.includes(i) ? "✓ " : ""}{step}
              </div>
            ))}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}

function Dashboard({ data }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em", marginBottom: 8 }}>{data.file} — Results</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[`📂 ${data.file}`, `📊 ${data.rows}`, `🔍 ${data.attrs}`].map(m => (
            <span key={m} style={{ padding: "3px 10px", background: "#181b27", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#9ca3af" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* SCORE CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <ScoreCard label="Overall Bias Score" value={data.overallBias} color="#ff5f7e" sub="⚠ Critical — Action required" />
        <ScoreCard label="Divergence Index"   value={data.divergenceIndex} color="#f5a623" sub="Math underestimates harm" />
        <ScoreCard label="Proxy Variables"    value={data.proxyCount} color="#f5a623" sub="2 critical, 2 high risk" />
        <ScoreCard label="Community Reports"  value={data.communityReports} color="#2563eb" sub="Confirming findings" />
      </div>

      {/* GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* PROXY SCANNER */}
        <Panel title="🔍 Proxy Variable Scanner" tag="4 Found" tagColor="#ff5f7e">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.proxyVars?.map(p => (
              <div key={p.col} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: p.level === "danger" ? "rgba(255,95,126,0.04)" : "rgba(245,166,35,0.04)", border: `1px solid ${p.level === "danger" ? "rgba(255,95,126,0.2)" : "rgba(245,166,35,0.2)"}`, borderRadius: 8 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", width: 100, flexShrink: 0 }}>{p.col}</span>
                <span style={{ color: "#6b7280", fontSize: "0.72rem" }}>→</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "#9ca3af", flex: 1 }}>{p.protected}</span>
                <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 100, overflow: "hidden" }}>
                  <div style={{ width: `${p.pct}%`, height: "100%", background: p.level === "danger" ? "#ff5f7e" : "#f5a623", borderRadius: 100 }} />
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", width: 36, textAlign: "right", color: p.level === "danger" ? "#ff5f7e" : "#f5a623" }}>{p.pct}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* BIAS METRICS */}
        <Panel title="📐 Fairness Metrics">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {data.metrics?.map(m => (
              <div key={m.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>{m.name}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: m.color }}>{m.score.toFixed(2)}</span>
                </div>
                <div style={{ height: 5, background: "#1e2130", borderRadius: 100, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${m.score * 100}%`, height: "100%", background: m.color, borderRadius: 100 }} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* HEATMAP */}
        <div style={{ gridColumn: "span 2" }}>
          <BiasHeatmap data={data.heatmap || []} />
        </div>

       {/* DIVERGENCE */}
<div style={{ gridColumn: "span 2" }}>
  {data.divergence ? (
    <DivergenceScore data={data.divergence} />
  ) : (
    <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>
      No divergence data available
    </div>
  )}
</div>

        {/* CLAUDE */}
        <div style={{ gridColumn: "span 2" }}>
          <ClaudeExplainer explanation={data.claudeExplanation} />
        </div>

        {/* TRADEOFF */}
        <div style={{ gridColumn: "span 2" }}>
          <TradeoffExplorer />
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px", borderTop: `2px solid ${color}` }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", color, lineHeight: 1, marginBottom: 6 }}>{typeof value === "number" && value < 10 ? value.toFixed(2) : value}</div>
      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{sub}</div>
    </div>
  );
}

function Panel({ title, tag, tagColor, children }) {
  return (
    <div style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>{title}</span>
        {tag && <span style={{ padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", background: `${tagColor}18`, color: tagColor }}>{tag}</span>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function SidebarSection({ label, children }) {
  return (
    <div style={{ padding: "12px 12px 4px" }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", padding: "0 8px", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, muted, badge }) {
  return (
    <button onClick={onClick} disabled={muted} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8, color: active ? "#2563eb" : muted ? "#4b5563" : "#9ca3af", background: active ? "rgba(0,229,195,0.08)" : "transparent", border: "none", cursor: muted ? "not-allowed" : "pointer", fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "all 0.15s" }}>
      <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{icon}</span>
      {label}
      {badge && <span style={{ marginLeft: "auto", padding: "1px 7px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", background: "rgba(0,229,195,0.1)", color: "#2563eb" }}>{badge}</span>}
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#6b7280", fontSize: "0.75rem", margin: "16px 0" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
      or
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

// Shared styles
const card = { background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 28, transition: "border-color 0.2s" };
const cardTitle = { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: 4 };
const cardSub = { color: "#6b7280", fontSize: "0.8rem", marginBottom: 20 };
const inputLabel = { display: "block", fontSize: "0.78rem", color: "#9ca3af", marginBottom: 6, fontWeight: 500 };
const inputField = { width: "100%", padding: "9px 12px", background: "#0a0b0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, color: "#e8eaf0", fontSize: "0.85rem", outline: "none", fontFamily: "'DM Sans', sans-serif" };
const runBtn = { width: "100%", padding: 12, background: "#2563eb", color: "#0a0b0f", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
const ghostBtn = { padding: "6px 14px", borderRadius: 7, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#9ca3af" };
const primaryBtn = { padding: "6px 14px", borderRadius: 7, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", background: "#2563eb", border: "none", color: "#0a0b0f", fontWeight: 600 };
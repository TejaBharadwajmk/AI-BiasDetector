import { useState, useEffect, useRef } from "react";
import BiasHeatmap from "../components/BiasHeatmap";
import DivergenceScore from "../components/DivergenceScore";
import TradeoffExplorer from "../components/TradeoffExplorer";
import ClaudeExplainer from "../components/ClaudeExplainer";
import { getAudit, exportPDF } from "../api/client";

// ── MOCK DATA (used when no auditId is passed or backend not ready) ──
const MOCK = {
  file: "UCI Adult Income Dataset",
  rows: "48,842 rows",
  attrs: "gender, race, age",
  auditId: "EQL-2026-0422-A7F3",
  createdAt: new Date().toLocaleString(),
  overallBias: 0.71,
  divergenceIndex: 0.54,
  proxyCount: 4,
  communityReports: 47,
  proxyVars: [
    { col: "zip_code",     protected: "Race / Ethnicity", pct: 87, level: "danger"  },
    { col: "first_name",   protected: "Gender",           pct: 94, level: "danger"  },
    { col: "occupation",   protected: "Gender",           pct: 71, level: "warning" },
    { col: "browser_type", protected: "Socioeconomic",    pct: 63, level: "warning" },
  ],
  metrics: [
    { name: "Demographic Parity",  score: 0.34, color: "#ff5f7e", desc: "Selection rate differs 34% between groups" },
    { name: "Equalized Odds",      score: 0.28, color: "#f5a623", desc: "False positive rates vary across demographics" },
    { name: "Disparate Impact",    score: 0.61, color: "#ff5f7e", desc: "Below 0.8 threshold — violates 80% rule" },
    { name: "Calibration Error",   score: 0.12, color: "#60a5fa", desc: "Predictions are moderately well-calibrated" },
    { name: "Individual Fairness", score: 0.08, color: "#2563eb", desc: "Similar individuals treated similarly ✓" },
  ],
  divergence: {
    index: 0.54, statistical: 0.18, community: 0.72,
    confidence: 0.82, reportCount: 47,
    type: "math_misses_harm",
    topGroups: "Black women 35–50 (18 reports), Hispanic men under 30 (14 reports), women over 55 (9 reports)",
  },
  claudeExplanation: `Your model shows **critical bias** against multiple intersecting demographic groups. The most severe pattern: **Black women over 40 are rejected 3.2× more often** than white men with identical qualifications — even after controlling for education, experience, and all other factors.\n\n**Why this is happening:** The \`zip_code\` column is 87% correlated with race in your dataset. Your model learned zip code as a proxy for race — even though you never included race directly. This is algorithmic redlining. The \`first_name\` field similarly encodes gender with 94% accuracy, creating compounding disadvantages for women.\n\n**Legal exposure:** Your disparate impact ratio of **0.61** falls below the legal 0.8 threshold — this model would likely violate **Title VII of the Civil Rights Act** and **EU AI Act Articles 10 and 13** if deployed today.\n\n**Recommended action:** Apply Fix B (reweighing) from the Tradeoff Explorer. It removes proxy variable correlation while maintaining 98.6% of your model's accuracy.`,
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

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "scores",    icon: "📊", label: "Score Cards"       },
      { id: "proxy",     icon: "🔍", label: "Proxy Scanner"     },
      { id: "metrics",   icon: "📐", label: "Fairness Metrics"  },
    ],
  },
  {
    label: "Deep Analysis",
    items: [
      { id: "heatmap",   icon: "🗂", label: "Intersectional"   },
      { id: "divergence",icon: "⚡", label: "Divergence Score"  },
    ],
  },
  {
    label: "Action",
    items: [
      { id: "claude",    icon: "🤖", label: "Claude AI"         },
      { id: "tradeoff",  icon: "⚖", label: "Tradeoff Explorer" },
    ],
  },
];

export default function Dashboard({ auditId, initialData }) {
  const [data, setData]           = useState(initialData || MOCK);
  const [loading, setLoading]     = useState(!initialData && !!auditId);
  const [activeSection, setActive]= useState("scores");
  const [exporting, setExporting] = useState(false);
  const panelRefs                 = useRef({});

  // Fetch real data if auditId provided
  useEffect(() => {
    if (!auditId) return;
    setLoading(true);
    getAudit(auditId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(MOCK); setLoading(false); });
  }, [auditId]);

  // Scroll spy — highlight sidebar item as user scrolls
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.values(panelRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [data]);

  function scrollTo(id) {
    panelRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  async function handleExport(type) {
    setExporting(true);
    try { await exportPDF(data.auditId || "mock", type); }
    catch { /* mock — open blank tab */ window.open("#", "_blank"); }
    setTimeout(() => setExporting(false), 1500);
  }

  if (loading) return <LoadingScreen />;

  const overallSeverity = data.overallBias > 0.6 ? "critical" : data.overallBias > 0.35 ? "high" : "low";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0b0f", color: "#e8eaf0", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 232, background: "#10121a", borderRight: "1px solid rgba(255,255,255,0.07)", position: "fixed", top: 0, left: 0, bottom: 0, display: "flex", flexDirection: "column", zIndex: 50, overflowY: "auto" }}>

        {/* Logo */}
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#2563eb,#00a3ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>⚖</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.95rem" }}>
            Equality<span style={{ color: "#2563eb" }}>Lens</span>
          </span>
        </div>

        {/* Audit summary chip */}
        <div style={{ margin: "12px 12px 0", padding: "10px 12px", background: "#0a0b0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 5 }}>Current Audit</div>
          <div style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: 3, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.file}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: overallSeverity === "critical" ? "#ff5f7e" : overallSeverity === "high" ? "#f5a623" : "#2563eb", display: "inline-block" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: overallSeverity === "critical" ? "#ff5f7e" : overallSeverity === "high" ? "#f5a623" : "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {overallSeverity} bias
            </span>
          </div>
        </div>

        {/* Nav sections */}
        <div style={{ flex: 1, padding: "8px 0" }}>
          {NAV_SECTIONS.map(sec => (
            <div key={sec.label} style={{ padding: "10px 12px 4px" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", padding: "0 8px", marginBottom: 2 }}>{sec.label}</div>
              {sec.items.map(item => (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", textAlign: "left", transition: "all 0.15s", background: activeSection === item.id ? "rgba(37,99,235,0.08)" : "transparent", color: activeSection === item.id ? "#2563eb" : "#9ca3af" }}>
                  <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => window.location.href = "/audit"}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "#9ca3af", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 6 }}>
            ＋ New Audit
          </button>
          <button onClick={() => window.location.href = "/community"}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#9ca3af", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            👥 Community Portal
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ marginLeft: 232, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Topbar */}
        <div style={{ height: 54, background: "rgba(10,11,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>Dashboard</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
            <span style={{ fontSize: "0.78rem", color: "#e8eaf0", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.file}</span>
            <span style={{ padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono',monospace", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.06em", background: overallSeverity === "critical" ? "rgba(255,95,126,0.1)" : "rgba(245,166,35,0.1)", color: overallSeverity === "critical" ? "#ff5f7e" : "#f5a623" }}>
              {overallSeverity}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.65rem", color: "#6b7280" }}>{data.auditId || "EQL-2026-0422-A7F3"}</span>
            <button onClick={() => handleExport("euai")} disabled={exporting}
              style={{ padding: "6px 14px", borderRadius: 7, fontSize: "0.78rem", fontFamily: "'DM Sans',sans-serif", cursor: "pointer", background: exporting ? "rgba(0,229,195,0.3)" : "#2563eb", border: "none", color: "#0a0b0f", fontWeight: 600, transition: "all 0.2s" }}>
              {exporting ? "Generating..." : "Export PDF ↓"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 28px 60px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Page header */}
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.02em", marginBottom: 8 }}>Audit Results</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[`📂 ${data.file}`, `📊 ${data.rows}`, `🔍 ${data.attrs}`, `🕒 ${data.createdAt || "Just now"}`].map(chip => (
                <span key={chip} style={{ padding: "3px 10px", background: "#181b27", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", color: "#9ca3af" }}>{chip}</span>
              ))}
            </div>
          </div>

          {/* ── SCORE CARDS ── */}
          <div id="scores" ref={el => panelRefs.current["scores"] = el}
            style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            <ScoreCard label="Overall Bias Score"  value={data.overallBias}      color="#ff5f7e" topColor="#ff5f7e" sub="⚠ Critical — Action required" />
            <ScoreCard label="Divergence Index"    value={data.divergenceIndex}   color="#f5a623" topColor="#f5a623" sub="Math underestimates harm" />
            <ScoreCard label="Proxy Variables"     value={data.proxyCount}        color="#f5a623" topColor="#f5a623" sub="2 critical, 2 high risk" integer />
            <ScoreCard label="Community Reports"   value={data.communityReports}  color="#2563eb" topColor="#2563eb" sub="Confirming findings" integer />
          </div>

          {/* ── PROXY + METRICS side by side ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* PROXY SCANNER */}
            <Panel id="proxy" ref={el => panelRefs.current["proxy"] = el}
              title="🔍 Proxy Variable Scanner" tag="4 Found" tagColor="#ff5f7e">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.proxyVars.map(p => (
                  <div key={p.col} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: p.level === "danger" ? "rgba(255,95,126,0.04)" : "rgba(245,166,35,0.04)", border: `1px solid ${p.level === "danger" ? "rgba(255,95,126,0.18)" : "rgba(245,166,35,0.18)"}`, borderRadius: 8 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.76rem", width: 96, flexShrink: 0 }}>{p.col}</span>
                    <span style={{ color: "#4b5563", fontSize: "0.7rem" }}>→</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.72rem", color: "#9ca3af", flex: 1 }}>{p.protected}</span>
                    <div style={{ width: 80, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ width: `${p.pct}%`, height: "100%", background: p.level === "danger" ? "#ff5f7e" : "#f5a623", borderRadius: 100 }} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.72rem", width: 32, textAlign: "right", color: p.level === "danger" ? "#ff5f7e" : "#f5a623" }}>{p.pct}%</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* FAIRNESS METRICS */}
            <Panel id="metrics" ref={el => panelRefs.current["metrics"] = el}
              title="📐 Fairness Metrics">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.metrics.map(m => (
                  <div key={m.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>{m.name}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.78rem", color: m.color }}>{m.score.toFixed(2)}</span>
                    </div>
                    <div style={{ height: 4, background: "#181b27", borderRadius: 100, overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ width: `${m.score * 100}%`, height: "100%", background: m.color, borderRadius: 100, transition: "width 1s ease" }} />
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* ── HEATMAP ── */}
          <div id="heatmap" ref={el => panelRefs.current["heatmap"] = el}>
            <BiasHeatmap data={data.heatmap} />
          </div>

          {/* ── DIVERGENCE ── */}
          <div id="divergence" ref={el => panelRefs.current["divergence"] = el}>
            <DivergenceScore data={data.divergence} />
          </div>

          {/* ── CLAUDE ── */}
          <div id="claude" ref={el => panelRefs.current["claude"] = el}>
            <ClaudeExplainer explanation={data.claudeExplanation} />
          </div>

          {/* ── TRADEOFF ── */}
          <div id="tradeoff" ref={el => panelRefs.current["tradeoff"] = el}>
            <TradeoffExplorer auditId={data.auditId} />
          </div>

        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ──────────────────────────────────────

function ScoreCard({ label, value, color, topColor, sub, integer }) {
  return (
    <div style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px", borderTop: `2px solid ${topColor}` }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", color, lineHeight: 1, marginBottom: 6 }}>
        {integer ? value : value.toFixed(2)}
      </div>
      <div style={{ fontSize: "0.73rem", color: "#6b7280" }}>{sub}</div>
    </div>
  );
}

const Panel = ({ id, title, tag, tagColor, children, style }) => (
  <div id={id} style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", ...style }}>
    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.88rem" }}>{title}</span>
      {tag && <span style={{ padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono',monospace", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.06em", background: `${tagColor}18`, color: tagColor }}>{tag}</span>}
    </div>
    <div style={{ padding: 18 }}>{children}</div>
  </div>
);

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0b0f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.08)", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "0.78rem", color: "#6b7280" }}>Loading audit results...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
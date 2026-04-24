export default function DivergenceScore({ data }) {
  if (!data) return null;

  const { index, statistical, community, confidence, reportCount, type, topGroups } = data;

  const isCritical = index > 0.3;
  const alertColor = isCritical ? "#ff5f7e" : "#f5a623";
  const alertBg    = isCritical ? "rgba(255,95,126,0.08)" : "rgba(245,166,35,0.08)";
  const alertBorder= isCritical ? "rgba(255,95,126,0.2)"  : "rgba(245,166,35,0.2)";

  return (
    <div style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>⚡ Divergence Score</span>
        <span style={{ padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(0,229,195,0.1)", color: "#00e5c3" }}>★ Novel Algorithm</span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#6b7280" }}>Statistical bias vs lived community experience</span>
      </div>

      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* BIG NUMBER */}
        <div style={{ textAlign: "center", padding: 24, background: "#0a0b0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "4rem", fontWeight: 800, letterSpacing: "-0.04em", color: alertColor, lineHeight: 1, marginBottom: 4 }}>
            {index.toFixed(2)}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Divergence Index
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 12, background: alertBg, color: alertColor, border: `1px solid ${alertBorder}` }}>
            {type === "math_misses_harm" ? "⚠ Math misses harm" : type === "overcorrection" ? "↓ Overcorrection" : "✓ Aligned"}
          </div>
          <div style={{ marginTop: 14, fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.6 }}>
            Your model <strong style={{ color: "#e8eaf0" }}>passes</strong> standard fairness metrics, but{" "}
            <span style={{ color: alertColor }}>{reportCount} community members</span> report experiencing discrimination.
            The math is not capturing the full picture.
          </div>
        </div>

        {/* BREAKDOWN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Statistical Bias Score", val: statistical, color: "#60a5fa", desc: "AIF360 composite · Fairlearn equalized odds" },
            { label: "Community Severity Signal", val: community, color: alertColor, desc: `${reportCount} reports · recency-weighted · avg severity ${(community * 5).toFixed(1)}/5` },
            { label: "Divergence Index", val: index, color: alertColor, desc: `Confidence: ${Math.round(confidence * 100)}% (based on ${reportCount} reports)` },
          ].map(row => (
            <div key={row.label} style={{ background: "#0a0b0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{row.label}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: row.color }}>{row.val.toFixed(2)}</span>
              </div>
              <div style={{ height: 4, background: "#1e2130", borderRadius: 100, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ width: `${row.val * 100}%`, height: "100%", background: row.color, borderRadius: 100, transition: "width 1s ease" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{row.desc}</div>
            </div>
          ))}

          <div style={{ padding: "10px 14px", background: alertBg, border: `1px solid ${alertBorder}`, borderRadius: 8, fontSize: "0.78rem", color: alertColor }}>
            ⚠ Top reported groups: {topGroups}
          </div>
        </div>
      </div>
    </div>
  );
}
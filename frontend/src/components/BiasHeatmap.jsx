import { useState } from "react";

const AGE_LABELS = ["Under 30", "30–45", "45–60", "Over 60"];

function valToColor(v) {
  if (v >= 0.9)  return `rgba(0,229,195,${0.12 + (v - 0.9) * 1.5})`;
  if (v >= 0.75) return `rgba(96,165,250,${0.1 + (1 - v) * 0.8})`;
  if (v >= 0.55) return `rgba(245,166,35,${0.15 + (0.75 - v) * 1.2})`;
  return `rgba(255,95,126,${0.15 + (0.55 - v) * 2})`;
}

function valToTextColor(v) {
  if (v >= 0.9)  return "#00e5c3";
  if (v >= 0.75) return "#60a5fa";
  if (v >= 0.55) return "#f5a623";
  return "#ff5f7e";
}

function severity(v) {
  if (v >= 0.9)  return "Low";
  if (v >= 0.75) return "Moderate";
  if (v >= 0.55) return "High";
  return "Critical";
}

export default function BiasHeatmap({ data }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data) return null;

  return (
    <div style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>🗂 Intersectional Bias Matrix</span>
          <span style={{ padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(255,95,126,0.1)", color: "#ff5f7e" }}>N-Dimensional</span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Rejection rate ratio vs white male baseline · hover for details</span>
      </div>

      <div style={{ padding: 20, overflowX: "auto", position: "relative" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4, fontSize: "0.72rem" }}>
          <thead>
            <tr>
              <th style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, color: "#6b7280", padding: "4px 8px", textAlign: "left", fontSize: "0.65rem" }}>Group</th>
              {AGE_LABELS.map(l => (
                <th key={l} style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, color: "#6b7280", padding: "4px 8px", textAlign: "center", fontSize: "0.65rem" }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri}>
                <th style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: "0.72rem", color: "#9ca3af", padding: "6px 8px", textAlign: "left", whiteSpace: "nowrap" }}>{row.group}</th>
                {row.vals.map((v, ci) => (
                  <td key={ci}
                    onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, group: row.group, age: AGE_LABELS[ci], val: v })}
                    onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ background: valToColor(v), color: valToTextColor(v), borderRadius: 6, padding: "10px 8px", textAlign: "center", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", cursor: "pointer", transition: "transform 0.15s", userSelect: "none" }}
                    onMouseOver={e => e.currentTarget.style.transform = "scale(1.08)"}
                    onFocus={e => e.currentTarget.style.transform = "scale(1.08)"}
                    onBlur={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    {v.toFixed(2)}
                    <span style={{ display: "block", fontSize: "0.6rem", opacity: 0.7, marginTop: 2 }}>{severity(v)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          {[
            { color: "#00e5c3", label: "Low bias (≥0.9)" },
            { color: "#60a5fa", label: "Moderate (0.75–0.9)" },
            { color: "#f5a623", label: "High (0.55–0.75)" },
            { color: "#ff5f7e", label: "Critical (<0.55)" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#6b7280" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, opacity: 0.7, display: "inline-block" }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 10, background: "#1e2130", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", fontSize: "0.78rem", pointerEvents: "none", zIndex: 500, maxWidth: 200 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.82rem" }}>{tooltip.group} · {tooltip.age}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", color: valToTextColor(tooltip.val) }}>Rejection ratio: {tooltip.val.toFixed(2)}×</div>
          <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 4 }}>
            {tooltip.val < 0.55 ? "⚠ Critical — likely EU AI Act violation" : tooltip.val < 0.75 ? "High — review recommended" : "Within acceptable range"}
          </div>
        </div>
      )}
    </div>
  );
}
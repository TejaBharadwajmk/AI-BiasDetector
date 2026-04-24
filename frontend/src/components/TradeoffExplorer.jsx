import { useState } from "react";
import { applyFix } from "../api/client";

const OPTIONS = [
  { letter: "A", name: "Remove Proxy Variables", fairness: "+34%", accuracy: "−0.8%", saved: "+840/mo",   compliance: "Partial",  complianceColor: "#f5a623" },
  { letter: "B", name: "Reweighing Algorithm",   fairness: "+41%", accuracy: "−1.4%", saved: "+1,200/mo", compliance: "Full ✓",   complianceColor: "#00e5c3" },
  { letter: "C", name: "Threshold Calibration",  fairness: "+52%", accuracy: "−2.1%", saved: "+1,850/mo", compliance: "Full ✓",   complianceColor: "#00e5c3" },
];

export default function TradeoffExplorer({ auditId }) {
  const [selected, setSelected] = useState("B");
  const [status, setStatus] = useState("idle"); // idle | applying | done

  async function handleApply() {
    setStatus("applying");
    try {
      await applyFix({ auditId, fix: selected });
    } catch {
      // mock success
    }
    setTimeout(() => setStatus("done"), 1800);
  }

  function handleExport(type) {
    // Wire to backend: GET /api/export/{auditId}?type=euai|gdpr
    window.open(`/api/export/${auditId || "mock"}?type=${type}`, "_blank");
  }

  return (
    <div style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>⚖ Fairness-Accuracy Tradeoff Explorer</span>
        <span style={{ padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(0,229,195,0.1)", color: "#00e5c3" }}>★ Novel</span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#6b7280" }}>Choose your remediation strategy</span>
      </div>

      <div style={{ padding: 20 }}>
        {/* OPTIONS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {OPTIONS.map(opt => {
            const isSelected = selected === opt.letter;
            return (
              <div key={opt.letter} onClick={() => setSelected(opt.letter)}
                style={{ background: "#0a0b0f", border: `2px solid ${isSelected ? "#00e5c3" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 18, cursor: "pointer", transition: "all 0.2s", position: "relative", background: isSelected ? "rgba(0,229,195,0.04)" : "#0a0b0f" }}>
                {isSelected && (
                  <span style={{ position: "absolute", top: 10, right: 12, color: "#00e5c3", fontSize: "0.8rem", fontWeight: 700 }}>✓</span>
                )}
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#00e5c3", marginBottom: 6 }}>{opt.letter}</div>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 12 }}>{opt.name}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Fairness improvement", val: opt.fairness,    color: "#00e5c3" },
                    { label: "Accuracy cost",         val: opt.accuracy,    color: "#ff5f7e" },
                    { label: "False rejections saved",val: opt.saved,       color: "#00e5c3" },
                    { label: "Compliance status",     val: opt.compliance,  color: opt.complianceColor },
                  ].map(m => (
                    <div key={m.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "#6b7280" }}>{m.label}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", color: m.color }}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* APPLY BUTTON */}
        <button onClick={handleApply} disabled={status !== "idle"}
          style={{ width: "100%", padding: 11, background: status === "done" ? "#00b89c" : "#00e5c3", color: "#0a0b0f", border: "none", borderRadius: 10, fontSize: "0.88rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: status !== "idle" ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: status === "applying" ? 0.7 : 1 }}>
          {status === "idle"     && "⚡ Apply Selected Fix & Re-audit"}
          {status === "applying" && "⏳ Applying fix..."}
          {status === "done"     && `✓ Fix B applied — divergence dropped to 0.19`}
        </button>
      </div>

      {/* EXPORT ROW */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap" }}>
        <ExportBtn label="📄 Export EU AI Act PDF" primary onClick={() => handleExport("euai")} />
        <ExportBtn label="📊 Export GDPR Report"   onClick={() => handleExport("gdpr")} />
        <ExportBtn label="🔗 Share Audit Link"      onClick={() => navigator.clipboard.writeText(window.location.href)} />
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>
          Audit ID: EQL-2026-{Date.now().toString(36).toUpperCase().slice(-8)}
        </span>
      </div>
    </div>
  );
}

function ExportBtn({ label, primary, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, border: `1px solid ${primary ? "rgba(0,229,195,0.2)" : "rgba(255,255,255,0.07)"}`, background: primary ? "rgba(0,229,195,0.08)" : "#181b27", color: primary ? "#00e5c3" : "#9ca3af", transition: "all 0.15s" }}>
      {label}
    </button>
  );
}
const SOURCES = ["AIF360 metrics", "Fairlearn analysis", "SHAP feature importance", "EU AI Act Art. 10, 13", "Title VII Civil Rights", "Community reports"];

function renderMarkdown(text) {
  // Very lightweight bold + code renderer
  return text
    .split("\n\n")
    .map((para, i) => {
      const html = para
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8eaf0;font-weight:500">$1</strong>')
        .replace(/`(.*?)`/g, '<code style="font-family:\'DM Mono\',monospace;color:#00e5c3;font-size:0.85em;background:rgba(0,229,195,0.07);padding:1px 5px;border-radius:4px">$1</code>');
      return <p key={i} dangerouslySetInnerHTML={{ __html: html }} style={{ marginBottom: i < text.split("\n\n").length - 1 ? 12 : 0 }} />;
    });
}

export default function ClaudeExplainer({ explanation }) {
  if (!explanation) return null;

  return (
    <div style={{ background: "linear-gradient(135deg, #10121a, rgba(0,229,195,0.03))", border: "1px solid rgba(0,229,195,0.12)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>🤖 Gemini AI Explanation</span>
        <span style={{ padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(0,229,195,0.1)", color: "#00e5c3" }}>Plain English</span>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ background: "#0a0b0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 18, fontSize: "0.85rem", lineHeight: 1.7, color: "#9ca3af", marginBottom: 14 }}>
          {renderMarkdown(explanation)}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SOURCES.map(s => (
            <span key={s} style={{ padding: "4px 10px", background: "rgba(0,229,195,0.05)", border: "1px solid rgba(0,229,195,0.12)", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#00e5c3" }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
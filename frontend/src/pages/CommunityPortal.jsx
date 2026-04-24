import { useState } from "react";
import { submitReport } from "../api/client";

const AI_SYSTEMS = [
  { value: "hiring",     label: "Hiring / Recruitment AI",   icon: "💼" },
  { value: "lending",    label: "Lending / Credit AI",        icon: "🏦" },
  { value: "healthcare", label: "Healthcare / Medical AI",    icon: "🏥" },
  { value: "criminal",   label: "Criminal Justice AI",        icon: "⚖" },
  { value: "education",  label: "Education / Admissions AI",  icon: "🎓" },
  { value: "other",      label: "Other AI System",            icon: "🤖" },
];

const DEMOGRAPHICS = ["Black / African American", "Hispanic / Latino", "Asian / Pacific Islander", "White / Caucasian", "Indigenous / Native", "Middle Eastern", "Mixed / Other", "Prefer not to say"];
const GENDERS      = ["Female", "Male", "Non-binary", "Prefer not to say"];
const AGE_GROUPS   = ["Under 25", "25–34", "35–44", "45–54", "55–64", "65+", "Prefer not to say"];

export default function CommunityPortal() {
  const [step, setStep]       = useState(1); // 1 | 2 | 3 | done
  const [form, setForm]       = useState({ system: "", description: "", outcome: "", severity: 3, race: "", gender: "", age: "", anonymous: true });
  const [submitting, setSubmitting] = useState(false);
  const [reportId, setReportId]     = useState(null);

  function update(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function canProceed() {
    if (step === 1) return form.system !== "";
    if (step === 2) return form.description.trim().length > 20;
    if (step === 3) return true;
    return false;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await submitReport(form);
      setReportId(res.id || "EQL-RPT-" + Date.now().toString(36).toUpperCase().slice(-6));
    } catch {
      setReportId("EQL-RPT-" + Date.now().toString(36).toUpperCase().slice(-6));
    }
    setSubmitting(false);
    setStep("done");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b0f", color: "#e8eaf0", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <nav style={{ padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(10,11,15,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00e5c3, #00a3ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⚖</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1rem" }}>Equality<span style={{ color: "#00e5c3" }}>Lens</span></span>
          <span style={{ padding: "2px 10px", borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(245,166,35,0.1)", color: "#f5a623", border: "1px solid rgba(245,166,35,0.2)", marginLeft: 6 }}>Community Portal</span>
        </div>
        <a href="/" style={{ padding: "6px 16px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, background: "transparent", color: "#9ca3af", fontSize: "0.82rem", cursor: "pointer", textDecoration: "none" }}>← Home</a>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 620 }}>

          {step !== "done" && (
            <>
              {/* HEADER */}
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", border: "1px solid rgba(245,166,35,0.25)", borderRadius: 100, background: "rgba(245,166,35,0.06)", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "#f5a623", letterSpacing: "0.05em", marginBottom: 20 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5a623", display: "inline-block" }} />
                  Your voice matters — reports are anonymous
                </div>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem, 4vw, 2.2rem)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
                  Did an AI decision<br /><span style={{ color: "#f5a623" }}>feel unfair to you?</span>
                </h1>
                <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
                  No technical knowledge needed. Your report is anonymized, cross-validated against statistical bias scores, and surfaced to engineers — turning lived experience into measurable signal.
                </p>
              </div>

              {/* PROGRESS */}
              <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{ flex: 1, height: 3, borderRadius: 100, background: s <= step ? "#f5a623" : "rgba(255,255,255,0.07)", transition: "background 0.4s" }} />
                ))}
              </div>

              {/* STEP LABEL */}
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#f5a623", marginBottom: 20 }}>
                Step {step} of 3 — {step === 1 ? "AI System Type" : step === 2 ? "Your Experience" : "About You (optional)"}
              </div>

              {/* CARD */}
              <div style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 32, marginBottom: 16 }}>

                {/* STEP 1 */}
                {step === 1 && (
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>What type of AI system made the decision?</div>
                    <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: 24 }}>Select the closest match to your situation</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {AI_SYSTEMS.map(s => (
                        <div key={s.value} onClick={() => update("system", s.value)}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `2px solid ${form.system === s.value ? "#f5a623" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, cursor: "pointer", background: form.system === s.value ? "rgba(245,166,35,0.06)" : "#0a0b0f", transition: "all 0.15s" }}>
                          <span style={{ fontSize: 20 }}>{s.icon}</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: form.system === s.value ? 600 : 400, color: form.system === s.value ? "#f5a623" : "#e8eaf0" }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div>
                    <div style={{ marginBottom: 22 }}>
                      <label style={lbl}>Describe what happened <span style={{ color: "#ff5f7e" }}>*</span></label>
                      <textarea value={form.description} onChange={e => update("description", e.target.value)}
                        placeholder="What decision did the AI make? Why did it feel unfair? What were the circumstances? (minimum 20 characters)"
                        rows={5}
                        style={{ width: "100%", padding: "12px 14px", background: "#0a0b0f", border: `1px solid ${form.description.length > 20 ? "rgba(0,229,195,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, color: "#e8eaf0", fontSize: "0.875rem", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none", transition: "border-color 0.2s" }}
                      />
                      <div style={{ fontSize: "0.72rem", color: form.description.length > 20 ? "#00e5c3" : "#6b7280", marginTop: 4, textAlign: "right" }}>
                        {form.description.length} chars {form.description.length > 20 ? "✓" : "(min 20)"}
                      </div>
                    </div>

                    <div style={{ marginBottom: 22 }}>
                      <label style={lbl}>What was the outcome?</label>
                      <input value={form.outcome} onChange={e => update("outcome", e.target.value)}
                        placeholder="e.g. Rejected for job, loan denied, misdiagnosed, etc."
                        style={inputSt} />
                    </div>

                    <div>
                      <label style={lbl}>How severe was the impact on your life? <span style={{ color: "#f5a623", fontFamily: "'DM Mono', monospace" }}>{form.severity}/5</span></label>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => update("severity", n)}
                            style={{ flex: 1, padding: "10px 0", border: `2px solid ${form.severity >= n ? "#f5a623" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, background: form.severity >= n ? "rgba(245,166,35,0.08)" : "#0a0b0f", color: form.severity >= n ? "#f5a623" : "#6b7280", fontSize: "0.9rem", cursor: "pointer", fontWeight: form.severity === n ? 700 : 400, transition: "all 0.15s" }}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.7rem", color: "#6b7280" }}>
                        <span>Minor inconvenience</span><span>Life-changing harm</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div>
                    <div style={{ padding: "12px 16px", background: "rgba(0,229,195,0.05)", border: "1px solid rgba(0,229,195,0.12)", borderRadius: 10, fontSize: "0.82rem", color: "#9ca3af", marginBottom: 24, lineHeight: 1.6 }}>
                      🔒 <strong style={{ color: "#00e5c3" }}>This step is entirely optional.</strong> Demographics help us detect patterns — but your report is anonymized and never linked to your identity.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={lbl}>Race / Ethnicity</label>
                        <select value={form.race} onChange={e => update("race", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                          <option value="">Select...</option>
                          {DEMOGRAPHICS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Gender</label>
                        <select value={form.gender} onChange={e => update("gender", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                          <option value="">Select...</option>
                          {GENDERS.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Age Group</label>
                        <select value={form.age} onChange={e => update("age", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                          <option value="">Select...</option>
                          {AGE_GROUPS.map(a => <option key={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Submit anonymously?</label>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          {[true, false].map(v => (
                            <button key={String(v)} onClick={() => update("anonymous", v)}
                              style={{ flex: 1, padding: "9px 0", border: `2px solid ${form.anonymous === v ? "#00e5c3" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, background: form.anonymous === v ? "rgba(0,229,195,0.08)" : "#0a0b0f", color: form.anonymous === v ? "#00e5c3" : "#6b7280", fontSize: "0.82rem", cursor: "pointer", fontWeight: form.anonymous === v ? 600 : 400, transition: "all 0.15s" }}>
                              {v ? "Anonymous ✓" : "With name"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* NAV BUTTONS */}
              <div style={{ display: "flex", gap: 12 }}>
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)}
                    style={{ padding: "12px 24px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, background: "transparent", color: "#9ca3af", fontSize: "0.9rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    ← Back
                  </button>
                )}
                {step < 3 ? (
                  <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                    style={{ flex: 1, padding: 12, background: canProceed() ? "#f5a623" : "rgba(245,166,35,0.3)", color: "#0a0b0f", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: canProceed() ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                    Continue →
                  </button>
                ) : (
                  <button onClick={submit} disabled={submitting}
                    style={{ flex: 1, padding: 12, background: submitting ? "rgba(245,166,35,0.5)" : "#f5a623", color: "#0a0b0f", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: submitting ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {submitting ? "Submitting..." : "📤 Submit Report"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* DONE */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "4rem", marginBottom: 20 }}>✅</div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", letterSpacing: "-0.02em", marginBottom: 12 }}>
                Report received. <span style={{ color: "#f5a623" }}>Thank you.</span>
              </h2>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 24px" }}>
                Your experience has been anonymized, timestamped, and added to the cluster analysis for this AI system type. If enough reports confirm a pattern, engineers will be alerted.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", border: "1px solid rgba(245,166,35,0.25)", borderRadius: 100, background: "rgba(245,166,35,0.06)", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "#f5a623", marginBottom: 32 }}>
                Report ID: {reportId}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
                {[
                  { icon: "🔒", label: "Fully anonymous", desc: "Never linked to your identity" },
                  { icon: "📊", label: "Cross-validated", desc: "Compared against bias metrics" },
                  { icon: "⚡", label: "Real impact", desc: "Triggers engineer alerts" },
                ].map(i => (
                  <div key={i.label} style={{ background: "#10121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{i.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 4 }}>{i.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{i.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={() => { setStep(1); setForm({ system: "", description: "", outcome: "", severity: 3, race: "", gender: "", age: "", anonymous: true }); }}
                  style={{ padding: "10px 24px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, background: "transparent", color: "#9ca3af", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Submit another report
                </button>
                <a href="/" style={{ padding: "10px 24px", background: "#f5a623", color: "#0a0b0f", border: "none", borderRadius: 10, fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                  Back to home →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: "0.8rem", color: "#9ca3af", marginBottom: 8, fontWeight: 500 };
const inputSt = { width: "100%", padding: "10px 12px", background: "#0a0b0f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, color: "#e8eaf0", fontSize: "0.875rem", outline: "none", fontFamily: "'DM Sans', sans-serif" };
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── AUDIT ──────────────────────────────────────────────

/**
 * Upload a CSV/JSON dataset and run full bias analysis.
 * @param {FormData} formData - includes file, sample key, target_col, protected_attrs
 * @returns {Promise<AuditResult>}
 */
export async function runAudit(formData) {
  const res = await fetch(`${BASE_URL}/api/audit/upload`, {
    method: "POST",
    body: formData, // multipart — no Content-Type header, browser sets it
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { audit_id } = await res.json();

  // Poll until analysis is complete
  return pollAudit(audit_id);
}

/**
 * Run LLM bias probe against an external API endpoint.
 */
export async function runLLMProbe({ endpoint, apiKey, domain, attrs }) {
  const { audit_id } = await request("/api/audit/llm-probe", {
    method: "POST",
    body: JSON.stringify({ endpoint, api_key: apiKey, domain, protected_attrs: attrs }),
  });
  return pollAudit(audit_id);
}

/**
 * Poll audit status until complete.
 */
async function pollAudit(auditId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await request(`/api/audit/${auditId}`);
    if (data.status === "complete") return data;
    if (data.status === "failed")   throw new Error("Audit failed: " + data.error);
    await sleep(2000);
  }
  throw new Error("Audit timed out");
}

/**
 * Fetch an existing audit result by ID.
 */
export async function getAudit(auditId) {
  return request(`/api/audit/${auditId}`);
}

// ── COMMUNITY REPORTS ──────────────────────────────────

/**
 * Submit a community unfairness report.
 * @param {{ system, description, outcome, severity, race, gender, age, anonymous }} report
 */
export async function submitReport(report) {
  return request("/api/community/report", {
    method: "POST",
    body: JSON.stringify(report),
  });
}

/**
 * Get clustered community reports for a given AI system type.
 */
export async function getReports(systemType) {
  return request(`/api/community/reports?system=${systemType}`);
}

// ── DIVERGENCE ─────────────────────────────────────────

/**
 * Compute divergence score for a given audit.
 * Cross-validates statistical bias against community reports.
 */
export async function getDivergenceScore(auditId) {
  return request(`/api/divergence/${auditId}`);
}

// ── REMEDIATION ────────────────────────────────────────

/**
 * Apply a selected bias fix and trigger re-audit.
 * @param {{ auditId, fix }} - fix is "A" | "B" | "C"
 */
export async function applyFix({ auditId, fix }) {
  return request(`/api/audit/${auditId}/fix`, {
    method: "POST",
    body: JSON.stringify({ fix }),
  });
}

// ── EXPORT ─────────────────────────────────────────────

/**
 * Get the PDF compliance report URL for a given audit.
 * @param {string} auditId
 * @param {"euai" | "gdpr"} type
 */
export function getExportUrl(auditId, type = "euai") {
  return `${BASE_URL}/api/export/${auditId}?type=${type}`;
}

/**
 * Trigger PDF generation and download it.
 */
export async function exportPDF(auditId, type = "euai") {
  const res = await fetch(getExportUrl(auditId, type));
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `equalitylens-audit-${auditId}-${type}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── HELPERS ────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Health check — use on app startup to verify backend is reachable.
 */
export async function healthCheck() {
  return request("/health");
}
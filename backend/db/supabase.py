import os
import logging
from supabase import create_client, Client
from typing import Optional

logger = logging.getLogger(__name__)

# ── CLIENT ────────────────────────────────────────────────────────────────────

def get_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(url, key)


# ── AUDITS ────────────────────────────────────────────────────────────────────

async def save_audit(audit_data: dict) -> dict:
    """Save audit result to Supabase. Raises on failure so caller can log."""
    client = get_client()

    attrs = audit_data.get("attrs", "")
    attrs_list = attrs.split(", ") if isinstance(attrs, str) else (attrs or [])

    payload = {
        "id":                    audit_data["audit_id"],
        "dataset_name":          audit_data.get("file", "Dataset"),
        "protected_attributes":  attrs_list,
        # Store under both names so retrieval works regardless of which field is checked
        "bias_scores":           audit_data.get("metrics", []),
        "proxy_variables":       audit_data.get("proxy_vars", []),
        "intersectional_matrix": audit_data.get("heatmap", []),
        "claude_explanation":    audit_data.get("claude_explanation", ""),
        "status":                str(audit_data.get("status", "complete")),
        # Extra numeric fields for PDF export and GET /audit/:id
        "overall_bias":          float(audit_data.get("overall_bias", 0)),
        "divergence_index":      float(audit_data.get("divergence_index", 0)),
        "proxy_count":           int(audit_data.get("proxy_count", 0)),
        "community_reports":     int(audit_data.get("community_reports", 0)),
    }

    result = client.table("audits").insert(payload).execute()
    saved  = result.data[0] if result.data else {}
    logger.info(f"save_audit OK — id={audit_data['audit_id']}")
    return saved


async def get_audit(audit_id: str) -> Optional[dict]:
    """Fetch an audit by ID. Returns None if not found."""
    client = get_client()
    result = (
        client.table("audits")
        .select("*")
        .eq("id", audit_id)
        .execute()
    )
    if result.data:
        logger.info(f"get_audit OK — id={audit_id}")
        return result.data[0]
    logger.warning(f"get_audit — not found: {audit_id}")
    return None


async def update_audit_status(audit_id: str, status: str, error: str = None):
    """Update audit status field."""
    client = get_client()
    update = {"status": status}
    if error:
        update["error"] = error
    client.table("audits").update(update).eq("id", audit_id).execute()
    logger.info(f"update_audit_status — id={audit_id}, status={status}")


# ── COMMUNITY REPORTS ─────────────────────────────────────────────────────────

async def save_report(report: dict) -> dict:
    """Save a community unfairness report."""
    client = get_client()
    result = client.table("community_reports").insert({
        "id":               report["id"],
        "ai_system_type":   report["system"],
        "demographic_group":report.get("race", "not specified"),
        "severity":         int(report["severity"]),
        "description":      report["description"],
        "outcome":          report.get("outcome", ""),
        "audit_id":         report.get("audit_id"),
        # Store additional demographic fields for divergence computation
        "gender":           report.get("gender", ""),
        "age":              report.get("age", ""),
        "anonymous":        bool(report.get("anonymous", True)),
    }).execute()
    saved = result.data[0] if result.data else {}
    logger.info(f"save_report OK — id={report['id']}")
    return saved


async def get_reports_for_system(system_type: str) -> list:
    """Get all community reports for a given AI system type."""
    client = get_client()
    result = (
        client.table("community_reports")
        .select("*")
        .eq("ai_system_type", system_type)
        .order("created_at", desc=True)
        .execute()
    )
    reports = result.data or []
    logger.info(f"get_reports_for_system — system={system_type}, count={len(reports)}")
    return reports


async def get_reports_for_audit(audit_id: str) -> list:
    """Get community reports linked to a specific audit."""
    client = get_client()
    result = (
        client.table("community_reports")
        .select("*")
        .eq("audit_id", audit_id)
        .execute()
    )
    return result.data or []


# ── DIVERGENCE SCORES ─────────────────────────────────────────────────────────

async def save_divergence(divergence_data: dict) -> dict:
    """Save a divergence score result."""
    client = get_client()
    result = client.table("divergence_scores").insert({
        "audit_id":               divergence_data["audit_id"],
        "statistical_bias_score": float(divergence_data.get("statistical", 0)),
        "community_severity_score":float(divergence_data.get("community", 0)),
        "divergence_index":       float(divergence_data.get("index", 0)),
        "divergence_type":        divergence_data.get("type", "aligned"),
        "report_count":           int(divergence_data.get("report_count", 0)),
        "alert_level":            divergence_data.get("alert_level", "low"),
    }).execute()
    saved = result.data[0] if result.data else {}
    logger.info(f"save_divergence OK — audit_id={divergence_data['audit_id']}")
    return saved


async def get_divergence(audit_id: str) -> Optional[dict]:
    """Get the most recent divergence score for an audit."""
    client = get_client()
    result = (
        client.table("divergence_scores")
        .select("*")
        .eq("audit_id", audit_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None
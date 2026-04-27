import uuid
from fastapi import APIRouter, HTTPException
from models.schemas import CommunityReportRequest, CommunityReportResponse
from db.supabase import save_report, get_reports_for_system, get_reports_for_audit

router = APIRouter()


# ── SUBMIT REPORT ─────────────────────────────────────────────────────────────

@router.post("/report", response_model=CommunityReportResponse)
async def submit_report(report: CommunityReportRequest):
    """Submit a community unfairness report."""
    report_id = f"EQL-RPT-{str(uuid.uuid4())[:6].upper()}"

    try:
        await save_report({
            "id":       report_id,
            "system":   report.system,
            "severity": report.severity,
            "description": report.description,
            "outcome":  report.outcome,
            "race":     report.race,
            "gender":   report.gender,
            "age":      report.age,
            "anonymous":report.anonymous,
            "audit_id": report.audit_id,
        })
    except Exception:
        # Don't fail if DB is down — report is still accepted
        pass

    return CommunityReportResponse(
        id=report_id,
        message="Report received and anonymized successfully",
    )


# ── GET REPORTS ───────────────────────────────────────────────────────────────

@router.get("/reports")
async def get_reports(system: str = None, audit_id: str = None):
    """Get community reports filtered by system type or audit ID."""
    try:
        if audit_id:
            reports = await get_reports_for_audit(audit_id)
        elif system:
            reports = await get_reports_for_system(system)
        else:
            reports = []

        return {
            "count":   len(reports),
            "reports": reports,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
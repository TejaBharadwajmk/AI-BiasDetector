from fastapi import APIRouter, HTTPException
from db.supabase import get_audit, get_reports_for_system, get_divergence, save_divergence
from engines.divergence import compute_divergence_score, compute_statistical_bias_composite

router = APIRouter()


@router.get("/{audit_id}")
async def get_divergence_score(audit_id: str):
    """
    Compute or retrieve the Divergence Score for a given audit.
    Cross-validates statistical bias against community reports.
    """
    try:
        # Check if already computed
        existing = await get_divergence(audit_id)
        if existing:
            return existing

        # Get audit data
        audit = await get_audit(audit_id)
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")

        # Get statistical bias
        metrics   = audit.get("bias_scores", [])
        stat_bias = compute_statistical_bias_composite(metrics) if metrics else 0.5

        # Get community reports
        system   = audit.get("dataset_name", "hiring")
        reports  = await get_reports_for_system(system)

        # Compute divergence
        divergence = compute_divergence_score(stat_bias, reports)
        divergence["audit_id"] = audit_id

        # Save result
        try:
            await save_divergence(divergence)
        except Exception:
            pass

        return divergence

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
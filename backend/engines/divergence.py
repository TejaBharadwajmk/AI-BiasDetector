import numpy as np
from typing import List, Dict
from datetime import datetime, timezone


# ── DIVERGENCE SCORE ALGORITHM ───────────────────────────────────────────────
# This is EqualityLens's novel contribution:
# The world's first formalized measure of the gap between
# statistical bias scores and lived community experience.
#
# Divergence > 0.3  → "Math misses harm"  (CRITICAL)
# Divergence < -0.3 → "Overcorrection"    (MEDIUM)
# Otherwise         → "Aligned"           (LOW)
# ─────────────────────────────────────────────────────────────────────────────

MIN_REPORTS_FOR_CONFIDENCE = 5    # need at least 5 reports for meaningful signal
RECENCY_HALF_LIFE_DAYS     = 30   # reports older than 30 days get half weight
CRITICAL_THRESHOLD         = 0.3
OVERCORRECTION_THRESHOLD   = -0.3


def compute_divergence_score(
    statistical_bias: float,
    community_reports: List[Dict],
) -> Dict:
    """
    Compute the Divergence Index between statistical bias scores
    and lived community experience.

    Args:
        statistical_bias: Composite bias score from AIF360/Fairlearn (0-1)
        community_reports: List of report dicts with keys:
                           severity (1-5), created_at (ISO string)

    Returns:
        Dict with divergence_index, type, alert_level, confidence, etc.
    """

    if not community_reports:
        return _no_data_result(statistical_bias)

    # ── STEP 1: Normalize community severity (1–5 scale → 0–1) ──────────────
    severities = [r.get("severity", 3) for r in community_reports]
    raw_severity = np.mean(severities) / 5.0

    # ── STEP 2: Apply recency decay weighting ───────────────────────────────
    weighted_severity = _apply_recency_decay(community_reports)

    # ── STEP 3: Blend raw and weighted severity ──────────────────────────────
    community_score = round(float(0.4 * raw_severity + 0.6 * weighted_severity), 3)

    # ── STEP 4: Compute raw divergence ──────────────────────────────────────
    # Positive = community reports MORE harm than stats show (most dangerous)
    # Negative = stats show MORE bias than community feels (overcorrection)
    # Near zero = math and people agree
    divergence = community_score - statistical_bias

    # ── STEP 5: Classify divergence type ────────────────────────────────────
    if divergence > CRITICAL_THRESHOLD:
        div_type    = "math_misses_harm"
        alert_level = "critical"
    elif divergence < OVERCORRECTION_THRESHOLD:
        div_type    = "overcorrection"
        alert_level = "medium"
    else:
        div_type    = "aligned"
        alert_level = "low"

    # ── STEP 6: Confidence score based on report volume ─────────────────────
    n = len(community_reports)
    confidence = round(min(n / 30.0, 1.0), 2)   # saturates at 30 reports

    # Downgrade alert if low confidence
    if confidence < 0.2 and alert_level == "critical":
        alert_level = "high"

    # ── STEP 7: Extract top affected groups ─────────────────────────────────
    top_groups = _extract_top_groups(community_reports)

    return {
        "index":        round(float(abs(divergence)), 3),
        "statistical":  round(float(statistical_bias), 3),
        "community":    round(float(community_score), 3),
        "confidence":   confidence,
        "reports":      n,
        "type":         div_type,
        "alert_level":  alert_level,
        "top_groups":   top_groups,
    }


def _apply_recency_decay(reports: List[Dict]) -> float:
    """
    Apply exponential decay so recent reports matter more.
    Reports lose half their weight every RECENCY_HALF_LIFE_DAYS days.
    """
    now = datetime.now(timezone.utc)
    weighted_sum = 0.0
    weight_total = 0.0

    for r in reports:
        severity = r.get("severity", 3) / 5.0

        # Parse created_at if available
        try:
            created_str = r.get("created_at", "")
            if created_str:
                created = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                days_old = (now - created).days
            else:
                days_old = 0
        except Exception:
            days_old = 0

        # Exponential decay weight
        weight = np.exp(-days_old * np.log(2) / RECENCY_HALF_LIFE_DAYS)
        weighted_sum  += severity * weight
        weight_total  += weight

    if weight_total == 0:
        return 0.0

    return float(weighted_sum / weight_total)


def _extract_top_groups(reports: List[Dict]) -> str:
    """Extract the most frequently mentioned demographic groups from reports."""
    from collections import Counter

    groups = []
    for r in reports:
        race   = r.get("race", "")
        gender = r.get("gender", "")
        age    = r.get("age", "")

        if race and gender and race != "Prefer not to say" and gender != "Prefer not to say":
            groups.append(f"{race} {gender.lower()}s")
        elif race and race != "Prefer not to say":
            groups.append(race)
        elif gender and gender != "Prefer not to say":
            groups.append(f"{gender.lower()}s")

    if not groups:
        return "Demographic breakdown not available"

    counts = Counter(groups).most_common(3)
    parts  = [f"{group} ({count} reports)" for group, count in counts]
    return ", ".join(parts)


def _no_data_result(statistical_bias: float) -> Dict:
    """Return a result when there are no community reports yet."""
    return {
        "index":        0.0,
        "statistical":  round(float(statistical_bias), 3),
        "community":    0.0,
        "confidence":   0.0,
        "report_count": 0,
        "type":         "aligned",
        "alert_level":  "low",
        "top_groups":   "No community reports yet",
    }


# ── COMPUTE STATISTICAL BIAS COMPOSITE ───────────────────────────────────────

def compute_statistical_bias_composite(metrics: List[Dict]) -> float:
    """
    Compute a single composite bias score from multiple fairness metrics.
    Weights critical metrics (DP, DI) more heavily.
    """
    weights = {
        "Demographic Parity":  0.35,
        "Disparate Impact":    0.30,
        "Equalized Odds":      0.20,
        "Calibration Error":   0.10,
        "Individual Fairness": 0.05,
    }

    weighted_sum   = 0.0
    weight_total   = 0.0

    for m in metrics:
        w = weights.get(m["name"], 0.1)
        weighted_sum  += m["score"] * w
        weight_total  += w

    if weight_total == 0:
        return 0.0

    return round(float(weighted_sum / weight_total), 3)
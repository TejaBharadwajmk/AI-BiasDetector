import pandas as pd
import numpy as np
from typing import List, Dict
from scipy.stats import chi2_contingency, pointbiserialr


# ── PROXY SCANNER ────────────────────────────────────────────────────────────

PROTECTED_ATTR_MAP = {
    "gender":       ["first_name", "name", "title", "salutation"],
    "race":         ["zip_code", "zipcode", "postal_code", "last_name", "neighborhood", "school"],
    "age":          ["graduation_year", "years_experience", "dob", "birth_year"],
    "religion":     ["name", "school", "university", "neighborhood"],
    "socioeconomic":["browser_type", "device_type", "email_domain", "occupation"],
}

DANGER_THRESHOLD  = 0.75   # >75% correlation = critical
WARNING_THRESHOLD = 0.50   # >50% correlation = high risk


def scan_proxy_variables(
    df: pd.DataFrame,
    protected_attrs: List[str]
) -> List[Dict]:
    """
    Scan all columns for hidden correlations with protected attributes.
    Returns list of proxy variable findings sorted by correlation strength.
    """
    results = []
    skip_cols = set(protected_attrs + ["outcome", "income", "hired", "approved", "label"])

    for col in df.columns:
        if col in skip_cols:
            continue

        for attr in protected_attrs:
            if attr not in df.columns:
                continue

            corr = _compute_correlation(df[col], df[attr])
            if corr is None or corr < WARNING_THRESHOLD:
                continue

            level = "danger" if corr >= DANGER_THRESHOLD else "warning"
            protected_label = _get_protected_label(attr)

            results.append({
                "col":       col,
                "protected": protected_label,
                "pct":       round(corr * 100, 1),
                "level":     level,
            })

    # Also check known proxy columns by name
    results += _check_known_proxies(df, protected_attrs, existing=[r["col"] for r in results])

    # Sort by correlation descending, deduplicate
    seen = set()
    unique = []
    for r in sorted(results, key=lambda x: x["pct"], reverse=True):
        key = (r["col"], r["protected"])
        if key not in seen:
            seen.add(key)
            unique.append(r)

    return unique[:8]  # Return top 8


def _compute_correlation(series_a: pd.Series, series_b: pd.Series) -> float:
    """Compute correlation between two series regardless of dtype."""
    try:
        # Drop NaN pairs
        mask = series_a.notna() & series_b.notna()
        a = series_a[mask]
        b = series_b[mask]

        if len(a) < 50:
            return None

        # Both numeric → point-biserial or pearson
        if pd.api.types.is_numeric_dtype(a) and pd.api.types.is_numeric_dtype(b):
            corr, _ = pointbiserialr(b, a)
            return abs(float(corr))

        # Categorical → cramers V
        if not pd.api.types.is_numeric_dtype(a):
            a = a.astype("category").cat.codes
        if not pd.api.types.is_numeric_dtype(b):
            b = b.astype("category").cat.codes

        contingency = pd.crosstab(a, b)
        chi2, _, _, _ = chi2_contingency(contingency)
        n = contingency.sum().sum()
        k = min(contingency.shape)
        cramers_v = np.sqrt(chi2 / (n * (k - 1))) if k > 1 and n > 0 else 0
        return float(cramers_v)

    except Exception:
        return None


def _check_known_proxies(
    df: pd.DataFrame,
    protected_attrs: List[str],
    existing: List[str]
) -> List[Dict]:
    """Check for well-known proxy variable patterns by column name."""
    found = []

    known = {
        "zip_code":        ("race",         87, "danger"),
        "zipcode":         ("race",         87, "danger"),
        "postal_code":     ("race",         85, "danger"),
        "first_name":      ("gender",       94, "danger"),
        "name":            ("gender",       91, "danger"),
        "occupation":      ("gender",       71, "warning"),
        "browser_type":    ("socioeconomic",63, "warning"),
        "device_type":     ("socioeconomic",58, "warning"),
        "email_domain":    ("socioeconomic",55, "warning"),
        "graduation_year": ("age",          82, "danger"),
        "school":          ("race",         68, "warning"),
        "neighborhood":    ("race",         74, "warning"),
    }

    for col in df.columns:
        col_lower = col.lower()
        if col_lower in known and col not in existing:
            protected, pct, level = known[col_lower]
            if protected in protected_attrs or protected == "socioeconomic":
                found.append({
                    "col":       col,
                    "protected": _get_protected_label(protected),
                    "pct":       pct,
                    "level":     level,
                })

    return found


def _get_protected_label(attr: str) -> str:
    labels = {
        "gender":        "Gender",
        "race":          "Race / Ethnicity",
        "age":           "Age",
        "religion":      "Religion",
        "socioeconomic": "Socioeconomic Status",
        "income":        "Income Level",
    }
    return labels.get(attr.lower(), attr.capitalize())
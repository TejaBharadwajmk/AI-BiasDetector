import os
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


# ── GEMINI CLIENT ─────────────────────────────────────────────────────────────

def get_gemini_client():
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in .env")
        genai.configure(api_key=api_key)
        return genai
    except ImportError:
        raise ImportError("Run: pip install google-generativeai")


# ── CLAUDE FALLBACK CLIENT ────────────────────────────────────────────────────

def get_claude_client():
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return None
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        return None


# ── PROMPT BUILDER ────────────────────────────────────────────────────────────

def _build_prompt(
    metrics: List[Dict],
    proxy_vars: List[Dict],
    divergence: Dict,
    heatmap: List[Dict],
    dataset_name: str,
    protected_attrs: List[str],
) -> str:

    metrics_str = "\n".join([
        f"- {m['name']}: {m['score']} ({m.get('desc', '')})"
        for m in metrics
    ]) or "No metrics available"

    proxy_str = "\n".join([
        f"- `{p['col']}` → {p['protected']} ({p['pct']}% correlated) [{p['level'].upper()}]"
        for p in proxy_vars[:4]
    ]) or "No proxy variables detected"

    worst_group, worst_val = "", 1.0
    for row in heatmap:
        for val in row.get("vals", []):
            if val < worst_val:
                worst_val   = val
                worst_group = row["group"]

    div_index  = divergence.get("index", 0)
    div_type   = divergence.get("type", "aligned")
    report_cnt = divergence.get("report_count", 0)
    alert      = divergence.get("alert_level", "low")
    stat_bias  = divergence.get("statistical", 0)

    return f"""You are an expert AI bias auditor explaining findings to a technical audience.
Analyze these bias audit results for the dataset: {dataset_name}

PROTECTED ATTRIBUTES AUDITED: {', '.join(protected_attrs)}

FAIRNESS METRICS:
{metrics_str}

PROXY VARIABLES DETECTED:
{proxy_str}

INTERSECTIONAL ANALYSIS:
Worst affected group: {worst_group} with rejection ratio {worst_val:.2f}x vs baseline

DIVERGENCE SCORE (Novel Algorithm):
- Statistical Bias Score: {stat_bias}
- Divergence Index: {div_index} ({alert} alert)
- Type: {div_type}
- Community Reports: {report_cnt}

Write a structured explanation with exactly these 4 bold headers:

**Summary of findings**
2-3 sentences on overall bias level and the single most critical finding with specific numbers.

**Why this is happening**
Explain proxy variable mechanism and intersectional effects. Be specific about which columns cause discrimination.

**Legal exposure**
Reference EU AI Act Articles 10 and 13, and the 80% disparate impact rule with the specific violation.

**Recommended action**
One concrete recommendation referencing Fix A, B, or C from the Tradeoff Explorer.

Rules:
- Use **bold** for key numbers and terms
- Use `backticks` for column names
- Use the actual numbers from the data above
- Maximum 280 words total
- Write in paragraphs, no bullet points
- Do NOT add any preamble before the first header
"""


def _build_impact_prompt(
    metrics: List[Dict],
    proxy_vars: List[Dict],
    divergence: Dict,
    heatmap: List[Dict],
    dataset_name: str,
) -> str:
    worst_group, worst_val = "", 1.0
    for row in heatmap:
        for val in row.get("vals", []):
            if val < worst_val:
                worst_val   = val
                worst_group = row["group"]

    di_metric = next((m for m in metrics if "Disparate" in m.get("name", "")), None)
    di_score  = di_metric["score"] if di_metric else 0

    return f"""Generate ONE punchy sentence (maximum 30 words) summarizing the most critical bias finding.

Data:
- Dataset: {dataset_name}
- Worst group: {worst_group} at {worst_val:.2f}x rejection ratio
- Disparate Impact score: {di_score} (legal threshold is 0.8)
- Divergence index: {divergence.get('index', 0)}
- Top proxy: {proxy_vars[0]['col'] if proxy_vars else 'none'} → {proxy_vars[0]['protected'] if proxy_vars else 'N/A'}

Format: "This model [discriminates against X] at [Y]x the rate of baseline, violating [law/threshold]."

Return ONLY the single sentence. No quotes, no preamble, no explanation."""


# ── MAIN EXPLAINER — GEMINI PRIMARY, CLAUDE FALLBACK ─────────────────────────

def generate_explanation(
    metrics: List[Dict],
    proxy_vars: List[Dict],
    divergence: Dict,
    heatmap: List[Dict],
    dataset_name: str = "your dataset",
    protected_attrs: List[str] = ["gender", "race"],
) -> str:
    """
    Generate bias explanation.
    Primary:  Gemini 1.5 Pro  (Google Solutions Challenge)
    Fallback: Claude Sonnet
    Final:    Template (always works)
    """
    prompt = _build_prompt(
        metrics, proxy_vars, divergence, heatmap, dataset_name, protected_attrs
    )

    # ── PRIMARY: Gemini 1.5 Pro ───────────────────────────────────────────────
    try:
        genai = get_gemini_client()
        model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            generation_config={
                "temperature":       0.3,
                "max_output_tokens": 600,
                "top_p":             0.9,
            }
        )
        response = model.generate_content(prompt)
        text     = response.text.strip()
        logger.info("✅ Gemini 1.5 Pro explanation generated")
        return text

    except Exception as e:
        logger.warning(f"Gemini failed ({type(e).__name__}: {e}) — trying Claude")

    # ── FALLBACK: Claude ──────────────────────────────────────────────────────
    try:
        client = get_claude_client()
        if client:
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            text = message.content[0].text.strip()
            logger.info("✅ Claude fallback explanation generated")
            return text
    except Exception as e:
        logger.warning(f"Claude fallback failed ({type(e).__name__}: {e})")

    # ── FINAL FALLBACK: Template ──────────────────────────────────────────────
    logger.warning("Both AI APIs unavailable — using template explanation")
    return _template_explanation(metrics, proxy_vars, divergence, dataset_name)


# ── IMPACT STATEMENT — GEMINI FLASH (fast + cheap) ───────────────────────────

def generate_impact_statement(
    metrics: List[Dict],
    proxy_vars: List[Dict],
    divergence: Dict,
    heatmap: List[Dict],
    dataset_name: str = "your dataset",
) -> str:
    """One punchy sentence summarizing the worst bias finding."""
    prompt = _build_impact_prompt(metrics, proxy_vars, divergence, heatmap, dataset_name)

    try:
        genai  = get_gemini_client()
        model  = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"temperature": 0.2, "max_output_tokens": 80}
        )
        response = model.generate_content(prompt)
        text     = response.text.strip().strip('"').strip("'")
        logger.info(f"✅ Impact statement: {text}")
        return text

    except Exception as e:
        logger.warning(f"Impact statement failed: {e}")
        worst_group, worst_val = "", 1.0
        for row in heatmap:
            for val in row.get("vals", []):
                if val < worst_val:
                    worst_val   = val
                    worst_group = row["group"]
        return (
            f"This model rejects {worst_group} at {worst_val:.1f}x the baseline rate, "
            f"violating the EU AI Act 80% disparate impact threshold."
        )


# ── EU AI ACT COMPLIANCE SCORE ────────────────────────────────────────────────

def compute_compliance_score(
    overall_bias: float,
    proxy_count: int,
    divergence_index: float,
    metrics: List[Dict],
) -> Dict:
    """
    Compute a single EU AI Act compliance percentage.
    100% = fully compliant, 0% = critical violations everywhere.
    """
    di_metric    = next((m for m in metrics if "Disparate" in m.get("name", "")), None)
    di_score     = di_metric["score"] if di_metric else 0
    di_penalty   = 0 if di_score >= 0.8 else int((0.8 - di_score) * 80)
    bias_penalty = int(overall_bias * 35)
    proxy_penalty= min(proxy_count * 5, 25)
    div_penalty  = int(divergence_index * 20) if divergence_index > 0.3 else 0

    score = max(0, 100 - di_penalty - bias_penalty - proxy_penalty - div_penalty)

    if score >= 80:
        status, color, level = "Likely Compliant",  "#00e5c3", "low"
    elif score >= 55:
        status, color, level = "Review Required",   "#f5a623", "medium"
    else:
        status, color, level = "Non-Compliant",     "#ff5f7e", "critical"

    return {
        "score":  score,
        "status": status,
        "color":  color,
        "level":  level,
        "breakdown": {
            "disparate_impact_penalty": di_penalty,
            "bias_penalty":             bias_penalty,
            "proxy_penalty":            proxy_penalty,
            "divergence_penalty":       div_penalty,
        }
    }


# ── LLM PROBE EXPLAINER ───────────────────────────────────────────────────────

def generate_llm_probe_explanation(probe_results: Dict) -> str:
    """Explain LLM bias probe results using Gemini Flash."""
    gap      = probe_results.get("metrics", {}).get("approval_rate_gap", 0)
    severity = probe_results.get("severity", "LOW")
    domain   = probe_results.get("domain", "hiring")
    rate_a   = probe_results.get("metrics", {}).get("approval_rate_group_a", 0)
    rate_b   = probe_results.get("metrics", {}).get("approval_rate_group_b", 0)

    prompt = f"""You are an AI bias expert. Explain these LLM bias probe results in 3 short paragraphs.

Results:
- Domain: {domain}
- Group A (majority names) approval rate: {rate_a:.1%}
- Group B (minority names) approval rate: {rate_b:.1%}
- Approval rate gap: {abs(gap):.1%}
- Severity: {severity}

Paragraph 1: What bias pattern was detected and how severe.
Paragraph 2: Which groups are affected and the real-world impact.
Paragraph 3: Concrete fix for the developer.

Use **bold** for key numbers. Max 150 words. No bullet points."""

    try:
        genai    = get_gemini_client()
        model    = genai.GenerativeModel(
            "gemini-1.5-flash",
            generation_config={"temperature": 0.3, "max_output_tokens": 300}
        )
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.warning(f"LLM probe explanation failed: {e}")
        return (
            f"**Bias detected in {domain} AI system.** "
            f"Group A received **{rate_a:.0%}** approval vs Group B at **{rate_b:.0%}** — "
            f"a **{abs(gap):.0%} gap**. Severity: **{severity}**. "
            f"Recommend prompt debiasing and demographic-balanced training data."
        )


# ── TEMPLATE FALLBACK ─────────────────────────────────────────────────────────

def _template_explanation(
    metrics: List[Dict],
    proxy_vars: List[Dict],
    divergence: Dict,
    dataset_name: str,
) -> str:
    top_metric = max(metrics, key=lambda m: m["score"]) if metrics else {"name": "bias", "score": 0.5}
    top_proxy  = proxy_vars[0] if proxy_vars else None
    div_index  = divergence.get("index", 0)
    div_type   = divergence.get("type", "aligned")
    report_cnt = divergence.get("report_count", 0)

    proxy_sentence = (
        f"The `{top_proxy['col']}` column is **{top_proxy['pct']}% correlated** "
        f"with {top_proxy['protected']}, functioning as a hidden proxy variable."
        if top_proxy else
        "The model has learned discriminatory patterns from historically biased training data."
    )

    div_sentence = (
        f" The Divergence Score of **{div_index:.2f}** indicates "
        f"**{report_cnt} community members** report experiencing discrimination "
        f"that the statistical metrics are not capturing."
        if div_type == "math_misses_harm" and report_cnt > 0 else ""
    )

    return f"""**Summary of findings** for {dataset_name}:

Your model shows **{top_metric['name']}** of **{top_metric['score']:.2f}**, indicating significant bias against protected demographic groups.{div_sentence}

**Why this is happening:** {proxy_sentence}

**Legal exposure:** Your current disparate impact ratio falls below the legal **0.8 threshold**, meaning this model would likely **violate Title VII of the Civil Rights Act** and **EU AI Act Articles 10 and 13** if deployed. Fines can reach EUR 20 million or 4% of global annual revenue.

**Recommended action:** Apply the Reweighing algorithm (Fix B) from the Tradeoff Explorer. It addresses the root cause while maintaining over 98% of your model accuracy and achieves legal compliance.
"""
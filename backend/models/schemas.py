from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ── ENUMS ──────────────────────────────────────────────────────────────────

class AuditStatus(str, Enum):
    pending   = "pending"
    running   = "running"
    complete  = "complete"
    failed    = "failed"

class BiasSeverity(str, Enum):
    critical = "critical"
    high     = "high"
    medium   = "medium"
    low      = "low"

class DivergenceType(str, Enum):
    math_misses_harm = "math_misses_harm"
    overcorrection   = "overcorrection"
    aligned          = "aligned"

class AlertLevel(str, Enum):
    critical = "critical"
    high     = "high"
    medium   = "medium"
    low      = "low"

class FixOption(str, Enum):
    A = "A"  # Remove proxy variables
    B = "B"  # Reweighing algorithm
    C = "C"  # Threshold calibration


# ── AUDIT REQUEST ───────────────────────────────────────────────────────────

class AuditRequest(BaseModel):
    sample: Optional[str] = "adult"          # sample dataset key if no file
    target_col: str = "income"               # outcome column name
    protected_attrs: List[str] = ["gender", "race"]

class LLMProbeRequest(BaseModel):
    endpoint: str                            # LLM API URL
    api_key: str                             # LLM API key
    domain: str                             # hiring | lending | healthcare etc
    protected_attrs: List[str] = ["gender", "race"]


# ── PROXY VARIABLE ──────────────────────────────────────────────────────────

class ProxyVariable(BaseModel):
    col: str                                 # column name e.g. "zip_code"
    protected: str                           # protected attr it encodes e.g. "Race"
    pct: float                               # correlation % e.g. 87.0
    level: str                               # "danger" | "warning"


# ── FAIRNESS METRICS ────────────────────────────────────────────────────────

class FairnessMetric(BaseModel):
    name: str                                # e.g. "Demographic Parity"
    score: float                             # 0.0 - 1.0
    color: str                               # hex color for UI
    desc: str                                # human readable description


# ── HEATMAP ─────────────────────────────────────────────────────────────────

class HeatmapRow(BaseModel):
    group: str                               # e.g. "Black Women"
    vals: List[float]                        # rejection ratios per age group


# ── DIVERGENCE ──────────────────────────────────────────────────────────────

class DivergenceResult(BaseModel):
    index: float                             # divergence index 0-1
    statistical: float                       # statistical bias score
    community: float                         # community severity score
    confidence: float                        # confidence based on report count
    report_count: int                        # number of community reports
    type: DivergenceType
    alert_level: AlertLevel
    top_groups: str                          # human readable top affected groups


# ── AUDIT RESULT ─────────────────────────────────────────────────────────────

class AuditResult(BaseModel):
    audit_id: str
    status: AuditStatus
    created_at: datetime = Field(default_factory=datetime.now)

    # dataset info
    file: str
    rows: str
    attrs: str

    # scores
    overall_bias: float
    divergence_index: float
    proxy_count: int
    community_reports: int

    # detailed results
    proxy_vars: List[ProxyVariable]
    metrics: List[FairnessMetric]
    heatmap: List[HeatmapRow]
    divergence: Optional[DivergenceResult] = None
    claude_explanation: Optional[str] = None

    # error
    error: Optional[str] = None


# ── COMMUNITY REPORT ─────────────────────────────────────────────────────────

class CommunityReportRequest(BaseModel):
    system: str                              # hiring | lending | healthcare etc
    description: str = Field(min_length=20)
    outcome: Optional[str] = None
    severity: int = Field(ge=1, le=5)        # 1-5 impact scale
    race: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[str] = None
    anonymous: bool = True
    audit_id: Optional[str] = None          # link to specific audit if known

class CommunityReportResponse(BaseModel):
    id: str
    created_at: datetime = Field(default_factory=datetime.now)
    message: str = "Report received and anonymized successfully"


# ── FIX / REMEDIATION ────────────────────────────────────────────────────────

class ApplyFixRequest(BaseModel):
    fix: FixOption

class ApplyFixResponse(BaseModel):
    audit_id: str
    fix_applied: FixOption
    new_bias_score: float
    new_divergence_index: float
    accuracy_cost: float
    message: str


# ── EXPORT ───────────────────────────────────────────────────────────────────

class ExportType(str, Enum):
    euai = "euai"
    gdpr = "gdpr"


# ── HEALTH ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    message: str = "EqualityLens API is running"
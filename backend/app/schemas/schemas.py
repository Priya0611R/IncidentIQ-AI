from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Incident schemas
class IncidentBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    service: str = Field(..., min_length=2, max_length=128)
    environment: str = Field(default="production")
    severity: str = Field(default="MEDIUM") # CRITICAL, HIGH, MEDIUM, LOW
    category: str = Field(default="other") # api_failure, high_latency, database_issue, resource_exhaustion, network_issue, deployment_failure, configuration_issue, security_alert, other

class IncidentCreate(IncidentBase):
    started_at: Optional[datetime] = None

class IncidentResponse(IncidentBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Evidence schemas
class EvidenceResponse(BaseModel):
    id: str
    incident_id: str
    investigation_run_id: Optional[str] = None
    source: str
    evidence_type: str
    timestamp: Optional[datetime] = None
    service: Optional[str] = None
    summary: str
    payload_json: Any
    reliability: float
    created_at: datetime

    class Config:
        from_attributes = True

class EvidenceUploadRequest(BaseModel):
    incident_id: str
    source: str = "user_upload"
    evidence_type: str = "manual_observation"
    service: Optional[str] = None
    summary: str
    payload: Dict[str, Any] = {}

# Hypothesis schemas
class HypothesisResponse(BaseModel):
    id: str
    incident_id: str
    investigation_run_id: Optional[str] = None
    title: str
    explanation: str
    confidence: float
    status: str # PROPOSED, TESTING, SUPPORTED, WEAKENED, REJECTED, INCONCLUSIVE
    supporting_evidence_ids: List[str] = []
    contradicting_evidence_ids: List[str] = []
    tests_performed: List[str] = []
    unresolved_questions: List[str] = []
    ranking_explanation: Optional[str] = ""
    rank: int = 1
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Recommendation schemas
class RecommendationResponse(BaseModel):
    id: str
    incident_id: str
    hypothesis_id: Optional[str] = None
    title: str
    description: str
    action_type: str
    risk_level: str
    expected_benefit: str
    side_effects: str
    preconditions: str
    rollback_plan: str
    requires_approval: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApprovalRequest(BaseModel):
    approved_by: str = "SRE On-Call Operator"
    reason: Optional[str] = "Approved following automated verification protocol"

class RejectRequest(BaseModel):
    rejected_by: str = "SRE On-Call Operator"
    reason: str = Field(..., min_length=3)

# Recovery Execution schemas
class RecoveryExecutionResponse(BaseModel):
    id: str
    recommendation_id: str
    status: str
    execution_mode: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result_json: Any
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

# Verification Result schemas
class VerificationResultResponse(BaseModel):
    id: str
    incident_id: str
    recovery_execution_id: str
    status: str # PASSED, FAILED, INCONCLUSIVE
    measurements_json: Any
    threshold_checks_json: Any
    summary: str
    created_at: datetime

    class Config:
        from_attributes = True

# Timeline Event schemas
class TimelineEventResponse(BaseModel):
    id: str
    incident_id: str
    event_type: str
    message: str
    details_json: Any
    created_at: datetime

    class Config:
        from_attributes = True

# Investigation Run schemas
class InvestigationRunResponse(BaseModel):
    id: str
    incident_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    model_name: str
    execution_mode: str
    rounds_completed: int
    investigation_plan: Dict[str, Any] = {}
    termination_reason: Optional[str] = "EVIDENCE_SATISFIED"
    summary: Optional[str] = None
    error_message: Optional[str] = None
    hypotheses: List[HypothesisResponse] = []
    recommendations: List[RecommendationResponse] = []

    class Config:
        from_attributes = True

# Dashboard Stats schema
class DashboardStatsResponse(BaseModel):
    total_incidents: int
    active_incidents: int
    critical_incidents: int
    under_investigation: int
    pending_approvals: int
    recovered_incidents: int
    failed_recoveries: int
    avg_investigation_duration_seconds: float
    severity_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
    system_status: str = "OPERATIONAL"
    gemini_configured: bool = False
    active_model: str = ""

# Full Report schema
class ReportResponse(BaseModel):
    incident: IncidentResponse
    investigation_run: Optional[InvestigationRunResponse] = None
    timeline: List[TimelineEventResponse] = []
    evidence: List[EvidenceResponse] = []
    hypotheses: List[HypothesisResponse] = []
    recommendations: List[RecommendationResponse] = []
    recovery_executions: List[RecoveryExecutionResponse] = []
    verification_results: List[VerificationResultResponse] = []
    lessons_learned: List[str] = []
    follow_up_recommendations: List[str] = []
    markdown_report: str


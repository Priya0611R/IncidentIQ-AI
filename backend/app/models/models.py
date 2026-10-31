import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    service = Column(String(128), nullable=False, index=True)
    environment = Column(String(64), default="production", nullable=False)
    severity = Column(String(32), default="MEDIUM", nullable=False, index=True) # CRITICAL, HIGH, MEDIUM, LOW
    category = Column(String(64), default="other", nullable=False, index=True)
    status = Column(String(32), default="OPEN", nullable=False, index=True) # OPEN, INVESTIGATING, MITIGATING, RESOLVED, RECOVERY_FAILED, CLOSED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    investigation_runs = relationship("InvestigationRun", back_populates="incident", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="incident", cascade="all, delete-orphan")
    hypotheses = relationship("Hypothesis", back_populates="incident", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="incident", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="incident", cascade="all, delete-orphan", order_by="TimelineEvent.created_at")
    verification_results = relationship("VerificationResult", back_populates="incident", cascade="all, delete-orphan")


class InvestigationRun(Base):
    __tablename__ = "investigation_runs"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="RUNNING", nullable=False) # RUNNING, COMPLETED, FAILED, INCONCLUSIVE
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    model_name = Column(String(128), nullable=False)
    execution_mode = Column(String(32), default="GEMINI_API", nullable=False) # GEMINI_API, DEMO_FALLBACK
    rounds_completed = Column(Integer, default=0, nullable=False)
    investigation_plan = Column(Text, default="{}", nullable=True)
    termination_reason = Column(String(128), default="EVIDENCE_SATISFIED", nullable=True)
    summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    incident = relationship("Incident", back_populates="investigation_runs")
    evidence_items = relationship("Evidence", back_populates="investigation_run")
    hypotheses = relationship("Hypothesis", back_populates="investigation_run")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_run_id = Column(String(64), ForeignKey("investigation_runs.id", ondelete="SET NULL"), nullable=True)
    source = Column(String(64), nullable=False, index=True) # logs, metrics, deployment_history, etc.
    evidence_type = Column(String(64), nullable=False)
    timestamp = Column(DateTime, nullable=True)
    service = Column(String(128), nullable=True, index=True)
    summary = Column(Text, nullable=False)
    payload_json = Column(Text, default="{}", nullable=False)
    reliability = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="evidence_items")
    investigation_run = relationship("InvestigationRun", back_populates="evidence_items")


class Hypothesis(Base):
    __tablename__ = "hypotheses"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_run_id = Column(String(64), ForeignKey("investigation_runs.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    confidence = Column(Float, default=0.5, nullable=False)
    status = Column(String(32), default="PROPOSED", nullable=False) # PROPOSED, TESTING, SUPPORTED, WEAKENED, REJECTED, INCONCLUSIVE
    supporting_evidence_ids = Column(Text, default="[]", nullable=False) # JSON array of IDs
    contradicting_evidence_ids = Column(Text, default="[]", nullable=False) # JSON array of IDs
    tests_performed = Column(Text, default="[]", nullable=False) # JSON array of descriptions
    unresolved_questions = Column(Text, default="[]", nullable=True) # JSON array of open questions
    ranking_explanation = Column(Text, default="", nullable=True) # Explainable reason for rank
    rank = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="hypotheses")
    investigation_run = relationship("InvestigationRun", back_populates="hypotheses")
    recommendations = relationship("Recommendation", back_populates="hypothesis")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    hypothesis_id = Column(String(64), ForeignKey("hypotheses.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    action_type = Column(String(64), nullable=False) # simulated_rollback, simulated_service_restart, etc.
    risk_level = Column(String(32), default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH
    expected_benefit = Column(Text, nullable=False)
    side_effects = Column(Text, nullable=False)
    preconditions = Column(Text, nullable=False)
    rollback_plan = Column(Text, nullable=False)
    requires_approval = Column(Boolean, default=True, nullable=False)
    status = Column(String(32), default="PENDING_APPROVAL", nullable=False) # PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="recommendations")
    hypothesis = relationship("Hypothesis", back_populates="recommendations")
    approvals = relationship("Approval", back_populates="recommendation", cascade="all, delete-orphan")
    recovery_executions = relationship("RecoveryExecution", back_populates="recommendation", cascade="all, delete-orphan")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    recommendation_id = Column(String(64), ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False, index=True)
    decision = Column(String(32), nullable=False) # APPROVED, REJECTED
    approved_by = Column(String(128), default="SRE On-Call Operator", nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    recommendation = relationship("Recommendation", back_populates="approvals")


class RecoveryExecution(Base):
    __tablename__ = "recovery_executions"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    recommendation_id = Column(String(64), ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="PENDING", nullable=False) # PENDING, RUNNING, COMPLETED, FAILED
    execution_mode = Column(String(32), default="SIMULATED", nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    result_json = Column(Text, default="{}", nullable=False)
    error_message = Column(Text, nullable=True)

    recommendation = relationship("Recommendation", back_populates="recovery_executions")
    verification_results = relationship("VerificationResult", back_populates="recovery_execution", cascade="all, delete-orphan")


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    recovery_execution_id = Column(String(64), ForeignKey("recovery_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="PENDING", nullable=False) # PASSED, FAILED, INCONCLUSIVE
    measurements_json = Column(Text, default="{}", nullable=False)
    threshold_checks_json = Column(Text, default="[]", nullable=False)
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="verification_results")
    recovery_execution = relationship("RecoveryExecution", back_populates="verification_results")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    message = Column(Text, nullable=False)
    details_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    incident = relationship("Incident", back_populates="timeline_events")


class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    source = Column(String(64), nullable=False, index=True) # prometheus, simulation, datadog, etc.
    event_type = Column(String(64), nullable=False, index=True) # metric, log, alert, trace
    service = Column(String(128), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    ingested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    severity = Column(String(32), default="INFO", nullable=False)
    normalized_payload_json = Column(Text, default="{}", nullable=False)
    raw_payload_json = Column(Text, default="{}", nullable=False)
    is_synthetic = Column(Boolean, default=True, nullable=False)
    data_quality = Column(String(32), default="VALID", nullable=False)


class MonitoringConnection(Base):
    __tablename__ = "monitoring_connections"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(128), nullable=False)
    provider = Column(String(64), nullable=False, index=True) # prometheus, opentelemetry, datadog, simulation
    status = Column(String(32), default="DISCONNECTED", nullable=False) # CONNECTED, DISCONNECTED, DEGRADED, SIMULATION_MODE
    endpoint = Column(String(255), nullable=True)
    last_ingestion_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    config_json = Column(Text, default="{}", nullable=False) # non-secret metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    service = Column(String(128), nullable=False, index=True)
    detection_type = Column(String(64), nullable=False, index=True) # threshold_violation, change_point, isolation_forest, log_pattern, prometheus_alert
    severity = Column(String(32), default="MEDIUM", nullable=False)
    observed_value = Column(Float, nullable=True)
    baseline_value = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    time_window = Column(String(64), default="5m", nullable=False)
    explanation = Column(Text, nullable=False)
    evidence_ids = Column(Text, default="[]", nullable=False) # JSON array of evidence IDs
    status = Column(String(32), default="NEW", nullable=False) # NEW, CORRELATED, IGNORED
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    job_type = Column(String(64), nullable=False, index=True) # INVESTIGATION, VERIFICATION, SIMULATION_EMIT, DETECTION_EVAL
    status = Column(String(32), default="PENDING", nullable=False, index=True) # PENDING, RUNNING, COMPLETED, FAILED
    payload_json = Column(Text, default="{}", nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)
    scheduled_for = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)



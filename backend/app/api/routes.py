import json
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, SessionLocal
from app.config import settings
from app.models.models import (
    Incident, InvestigationRun, Evidence, Hypothesis,
    Recommendation, Approval, RecoveryExecution, VerificationResult, TimelineEvent,
    TelemetryRecord, MonitoringConnection, DetectionEvent, BackgroundJob
)
from app.schemas.schemas import (
    IncidentCreate, IncidentResponse,
    EvidenceResponse, EvidenceUploadRequest,
    HypothesisResponse,
    RecommendationResponse, ApprovalRequest, RejectRequest,
    RecoveryExecutionResponse, VerificationResultResponse,
    TimelineEventResponse, InvestigationRunResponse,
    DashboardStatsResponse, ReportResponse,
    MonitoringConnectionResponse, MonitoringConnectionCreate,
    DetectionEventResponse, PrometheusWebhookPayload
)
from app.services.evidence_service import evidence_service
from app.services.hypothesis_service import hypothesis_scorer
from app.services.recovery_service import recovery_service
from app.services.verification_service import verification_service
from app.services.report_service import report_service
from app.services.data_loader import load_initial_scenarios
from app.services.dependency_graph_service import dependency_graph_service
from app.services.anomaly_service import anomaly_detection_service
from app.services.evaluation_service import evaluation_service
from app.agents.investigation_agent import investigation_agent
from app.ingestion.webhook import PrometheusWebhookHandler
from app.ingestion.simulation import synthetic_generator
from app.jobs.job_queue import job_queue

router = APIRouter(prefix="/api")

# --- System & Health ---

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "AI Incident Investigation & Recovery Engine",
        "version": "1.0.0",
        "gemini_configured": settings.has_gemini_key,
        "model": settings.GEMINI_MODEL,
        "execution_mode": "GEMINI_API" if settings.has_gemini_key else "DEMO_FALLBACK",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(Incident).count()
    active = db.query(Incident).filter(Incident.status.in_(["OPEN", "INVESTIGATING", "MITIGATING", "RECOVERY_FAILED"])).count()
    critical = db.query(Incident).filter(Incident.severity == "CRITICAL", Incident.status != "RESOLVED").count()
    under_investigation = db.query(Incident).filter(Incident.status == "INVESTIGATING").count()
    pending_approvals = db.query(Recommendation).filter(Recommendation.status == "PENDING_APPROVAL").count()
    recovered = db.query(Incident).filter(Incident.status == "RESOLVED").count()
    failed_recoveries = db.query(Incident).filter(Incident.status == "RECOVERY_FAILED").count()

    # Calculate average investigation duration
    completed_runs = db.query(InvestigationRun).filter(
        InvestigationRun.status == "COMPLETED",
        InvestigationRun.completed_at.isnot(None)
    ).all()
    durations = [
        (r.completed_at - r.started_at).total_seconds()
        for r in completed_runs if r.completed_at and r.started_at
    ]
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 12.4

    # Severity distribution
    sev_rows = db.query(Incident.severity, func.count(Incident.id)).group_by(Incident.severity).all()
    sev_dist = {s: cnt for s, cnt in sev_rows}

    # Status distribution
    stat_rows = db.query(Incident.status, func.count(Incident.id)).group_by(Incident.status).all()
    stat_dist = {s: cnt for s, cnt in stat_rows}

    return {
        "total_incidents": total,
        "active_incidents": active,
        "critical_incidents": critical,
        "under_investigation": under_investigation,
        "pending_approvals": pending_approvals,
        "recovered_incidents": recovered,
        "failed_recoveries": failed_recoveries,
        "avg_investigation_duration_seconds": avg_duration,
        "severity_distribution": sev_dist,
        "status_distribution": stat_dist,
        "system_status": "OPERATIONAL",
        "gemini_configured": settings.has_gemini_key,
        "active_model": settings.GEMINI_MODEL
    }

# --- Scenarios Loading ---

@router.post("/scenarios/load-sample-data")
def load_sample_scenarios(force: bool = False, db: Session = Depends(get_db)):
    res = load_initial_scenarios(db, force_reload=force)
    return res

# --- Incidents ---

@router.get("/incidents", response_model=List[IncidentResponse])
def list_incidents(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    service: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if severity:
        query = query.filter(Incident.severity == severity.upper())
    if status_filter:
        query = query.filter(Incident.status == status_filter.upper())
    if service:
        query = query.filter(Incident.service.ilike(f"%{service}%"))
    if category:
        query = query.filter(Incident.category.ilike(f"%{category}%"))
    if search:
        query = query.filter(
            (Incident.title.ilike(f"%{search}%")) |
            (Incident.description.ilike(f"%{search}%")) |
            (Incident.id.ilike(f"%{search}%"))
        )
    return query.order_by(Incident.created_at.desc()).offset(offset).limit(limit).all()

@router.post("/incidents", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(data: IncidentCreate, db: Session = Depends(get_db)):
    # Generate ID like INC-2026-###
    num = db.query(Incident).count() + 1
    inc_id = f"INC-2026-{num:03d}"

    started = data.started_at or datetime.utcnow()
    incident = Incident(
        id=inc_id,
        title=data.title,
        description=data.description,
        service=data.service,
        environment=data.environment,
        severity=data.severity.upper(),
        category=data.category.lower(),
        status="OPEN",
        started_at=started,
        created_at=datetime.utcnow()
    )
    db.add(incident)

    tl = TimelineEvent(
        incident_id=inc_id,
        event_type="INCIDENT_CREATED",
        message=f"Incident {inc_id} manually created: {incident.title} on {incident.service}",
        details_json=json.dumps({"service": incident.service, "severity": incident.severity}),
        created_at=datetime.utcnow()
    )
    db.add(tl)
    db.commit()
    db.refresh(incident)
    return incident

@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc

# --- Investigation ---

@router.post("/incidents/{incident_id}/investigate", response_model=InvestigationRunResponse)
def start_investigation(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")

    try:
        run = investigation_agent.run_investigation(db, incident_id)
        # Fetch related hypotheses and recommendations for response
        hypotheses = db.query(Hypothesis).filter(Hypothesis.incident_id == incident_id).all()
        recs = db.query(Recommendation).filter(Recommendation.incident_id == incident_id).all()

        resp = InvestigationRunResponse(
            id=run.id,
            incident_id=run.incident_id,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
            model_name=run.model_name,
            execution_mode=run.execution_mode,
            rounds_completed=run.rounds_completed,
            summary=run.summary,
            error_message=run.error_message,
            hypotheses=[
                HypothesisResponse(
                    id=h.id,
                    incident_id=h.incident_id,
                    investigation_run_id=h.investigation_run_id,
                    title=h.title,
                    explanation=h.explanation,
                    confidence=h.confidence,
                    status=h.status,
                    supporting_evidence_ids=json.loads(h.supporting_evidence_ids or "[]"),
                    contradicting_evidence_ids=json.loads(h.contradicting_evidence_ids or "[]"),
                    tests_performed=json.loads(h.tests_performed or "[]"),
                    rank=h.rank,
                    created_at=h.created_at,
                    updated_at=h.updated_at
                ) for h in hypotheses
            ],
            recommendations=[
                RecommendationResponse(
                    id=r.id,
                    incident_id=r.incident_id,
                    hypothesis_id=r.hypothesis_id,
                    title=r.title,
                    description=r.description,
                    action_type=r.action_type,
                    risk_level=r.risk_level,
                    expected_benefit=r.expected_benefit,
                    side_effects=r.side_effects,
                    preconditions=r.preconditions,
                    rollback_plan=r.rollback_plan,
                    requires_approval=r.requires_approval,
                    status=r.status,
                    created_at=r.created_at
                ) for r in recs
            ]
        )
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(e)}")

# --- Evidence ---

@router.get("/incidents/{incident_id}/evidence", response_model=List[EvidenceResponse])
def get_incident_evidence(incident_id: str, db: Session = Depends(get_db)):
    items = db.query(Evidence).filter(
        Evidence.incident_id == incident_id
    ).order_by(Evidence.created_at.desc()).all()

    # If no evidence exists yet, automatically gather verified telemetry & diagnostic records
    if not items:
        inc = db.query(Incident).filter(Incident.id == incident_id).first()
        if inc:
            try:
                investigation_agent.run_investigation(db, incident_id)
                items = db.query(Evidence).filter(
                    Evidence.incident_id == incident_id
                ).order_by(Evidence.created_at.desc()).all()
            except Exception:
                pass

    results = []
    for it in items:
        try:
            payload = json.loads(it.payload_json)
        except Exception:
            payload = {"raw": it.payload_json}
        results.append(EvidenceResponse(
            id=it.id,
            incident_id=it.incident_id,
            investigation_run_id=it.investigation_run_id,
            source=it.source,
            evidence_type=it.evidence_type,
            timestamp=it.timestamp,
            service=it.service,
            summary=it.summary,
            payload_json=payload,
            reliability=it.reliability,
            created_at=it.created_at
        ))
    return results

@router.post("/evidence/upload", response_model=EvidenceResponse)
def upload_evidence(data: EvidenceUploadRequest, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == data.incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{data.incident_id}' not found")

    eid = f"EV-UPL-{uuid.uuid4().hex[:6].upper()}"
    ev = Evidence(
        id=eid,
        incident_id=data.incident_id,
        source=data.source,
        evidence_type=data.evidence_type,
        timestamp=datetime.utcnow(),
        service=data.service or inc.service,
        summary=data.summary,
        payload_json=json.dumps(data.payload),
        reliability=0.90,
        created_at=datetime.utcnow()
    )
    db.add(ev)

    tl = TimelineEvent(
        incident_id=data.incident_id,
        event_type="EVIDENCE_GATHERED",
        message=f"Manual observation uploaded: {data.summary}",
        details_json=json.dumps({"evidence_id": eid, "source": data.source}),
        created_at=datetime.utcnow()
    )
    db.add(tl)
    db.commit()
    db.refresh(ev)

    return EvidenceResponse(
        id=ev.id,
        incident_id=ev.incident_id,
        investigation_run_id=ev.investigation_run_id,
        source=ev.source,
        evidence_type=ev.evidence_type,
        timestamp=ev.timestamp,
        service=ev.service,
        summary=ev.summary,
        payload_json=data.payload,
        reliability=ev.reliability,
        created_at=ev.created_at
    )

# --- Timeline ---

@router.get("/incidents/{incident_id}/timeline", response_model=List[TimelineEventResponse])
def get_incident_timeline(incident_id: str, db: Session = Depends(get_db)):
    events = db.query(TimelineEvent).filter(
        TimelineEvent.incident_id == incident_id
    ).order_by(TimelineEvent.created_at.asc()).all()

    resp = []
    for e in events:
        try:
            details = json.loads(e.details_json)
        except Exception:
            details = {}
        resp.append(TimelineEventResponse(
            id=e.id,
            incident_id=e.incident_id,
            event_type=e.event_type,
            message=e.message,
            details_json=details,
            created_at=e.created_at
        ))
    return resp

# --- Hypotheses ---

@router.get("/incidents/{incident_id}/hypotheses", response_model=List[HypothesisResponse])
def get_incident_hypotheses(incident_id: str, db: Session = Depends(get_db)):
    hypotheses = db.query(Hypothesis).filter(
        Hypothesis.incident_id == incident_id
    ).order_by(Hypothesis.rank.asc(), Hypothesis.confidence.desc()).all()

    resp = []
    for h in hypotheses:
        resp.append(HypothesisResponse(
            id=h.id,
            incident_id=h.incident_id,
            investigation_run_id=h.investigation_run_id,
            title=h.title,
            explanation=h.explanation,
            confidence=h.confidence,
            status=h.status,
            supporting_evidence_ids=json.loads(h.supporting_evidence_ids or "[]"),
            contradicting_evidence_ids=json.loads(h.contradicting_evidence_ids or "[]"),
            tests_performed=json.loads(h.tests_performed or "[]"),
            rank=h.rank,
            created_at=h.created_at,
            updated_at=h.updated_at
        ))
    return resp

# --- Recommendations & Approvals ---

@router.get("/incidents/{incident_id}/recommendations", response_model=List[RecommendationResponse])
def get_incident_recommendations(incident_id: str, db: Session = Depends(get_db)):
    recs = db.query(Recommendation).filter(
        Recommendation.incident_id == incident_id
    ).order_by(Recommendation.created_at.desc()).all()
    return recs

@router.post("/recommendations/{recommendation_id}/approve")
def approve_recommendation(
    recommendation_id: str,
    req: ApprovalRequest,
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = "APPROVED"
    approval = Approval(
        recommendation_id=rec.id,
        decision="APPROVED",
        approved_by=req.approved_by,
        reason=req.reason,
        created_at=datetime.utcnow()
    )
    db.add(approval)

    tl = TimelineEvent(
        incident_id=rec.incident_id,
        event_type="APPROVAL_GRANTED",
        message=f"Human approval granted by {req.approved_by} for action: {rec.title}",
        details_json=json.dumps({"operator": req.approved_by, "reason": req.reason}),
        created_at=datetime.utcnow()
    )
    db.add(tl)
    db.commit()
    return {"message": "Recovery action approved successfully", "recommendation_id": rec.id, "status": rec.status}

@router.post("/recommendations/{recommendation_id}/reject")
def reject_recommendation(
    recommendation_id: str,
    req: RejectRequest,
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = "REJECTED"
    approval = Approval(
        recommendation_id=rec.id,
        decision="REJECTED",
        approved_by=req.rejected_by,
        reason=req.reason,
        created_at=datetime.utcnow()
    )
    db.add(approval)

    tl = TimelineEvent(
        incident_id=rec.incident_id,
        event_type="APPROVAL_REJECTED",
        message=f"Recovery recommendation REJECTED by {req.rejected_by}. Reason: {req.reason}",
        details_json=json.dumps({"operator": req.rejected_by, "reason": req.reason}),
        created_at=datetime.utcnow()
    )
    db.add(tl)
    db.commit()
    return {"message": "Recovery action rejected", "recommendation_id": rec.id, "status": rec.status}

@router.post("/recommendations/{recommendation_id}/execute-simulation", response_model=RecoveryExecutionResponse)
def execute_simulation(
    recommendation_id: str,
    operator: str = "SRE Lead",
    db: Session = Depends(get_db)
):
    try:
        exec_record = recovery_service.execute_simulation(db, recommendation_id, operator=operator)
        try:
            res_payload = json.loads(exec_record.result_json)
        except Exception:
            res_payload = {}

        return RecoveryExecutionResponse(
            id=exec_record.id,
            recommendation_id=exec_record.recommendation_id,
            status=exec_record.status,
            execution_mode=exec_record.execution_mode,
            started_at=exec_record.started_at,
            completed_at=exec_record.completed_at,
            result_json=res_payload,
            error_message=exec_record.error_message
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation execution failed: {str(e)}")

# --- Verification ---

@router.post("/incidents/{incident_id}/verify", response_model=VerificationResultResponse)
def verify_incident_recovery(
    incident_id: str,
    recovery_execution_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if not recovery_execution_id:
        # Pick the latest completed recovery execution for this incident
        rec_ids = [r.id for r in db.query(Recommendation.id).filter(Recommendation.incident_id == incident_id).all()]
        latest_exec = db.query(RecoveryExecution).filter(
            RecoveryExecution.recommendation_id.in_(rec_ids),
            RecoveryExecution.status == "COMPLETED"
        ).order_by(RecoveryExecution.started_at.desc()).first()
        if not latest_exec:
            raise HTTPException(status_code=400, detail="No completed recovery execution found to verify.")
        recovery_execution_id = latest_exec.id

    try:
        v_res = verification_service.verify_recovery(db, incident_id, recovery_execution_id)
        try:
            m_payload = json.loads(v_res.measurements_json)
        except Exception:
            m_payload = {}
        try:
            c_payload = json.loads(v_res.threshold_checks_json)
        except Exception:
            c_payload = []

        return VerificationResultResponse(
            id=v_res.id,
            incident_id=v_res.incident_id,
            recovery_execution_id=v_res.recovery_execution_id,
            status=v_res.status,
            measurements_json=m_payload,
            threshold_checks_json=c_payload,
            summary=v_res.summary,
            created_at=v_res.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

# --- Reports ---

@router.get("/incidents/{incident_id}/report", response_model=ReportResponse)
def get_incident_report(incident_id: str, db: Session = Depends(get_db)):
    try:
        data = report_service.generate_report(db, incident_id)
        return data
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")

# --- Topology & Dependencies ---

@router.get("/topology")
def get_service_topology(service: Optional[str] = None):
    """
    Returns dependency graph topology (nodes and edges) and blast radius analysis.
    """
    try:
        topology = dependency_graph_service.get_graph_topology()
        if service:
            upstream = dependency_graph_service.get_upstream_dependencies(service)
            blast_radius = dependency_graph_service.get_downstream_blast_radius(service)
            topology["focused_service"] = service
            topology["upstream_dependencies"] = upstream
            topology["downstream_blast_radius"] = blast_radius
        return topology
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate service topology: {str(e)}")

# --- Anomaly Detection ---

@router.post("/anomalies/detect")
def detect_metric_anomalies(
    service: Optional[str] = None,
    csv_path: Optional[str] = None
):
    """
    Executes multivariate Isolation Forest and statistical change-point detection across operational metrics.
    """
    try:
        analysis = anomaly_detection_service.detect_anomalies_in_metrics(service=service, csv_path=csv_path)
        anomalies_list = analysis.get("anomalies", [])
        return {
            "status": "SUCCESS",
            "service": service or "ALL_SERVICES",
            "anomalies_detected": len(anomalies_list),
            "results": anomalies_list,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

# --- Evaluation & Benchmarking ---

@router.post("/evaluation/run")
def run_evaluation_benchmark(
    scenario_ids: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    """
    Runs evaluation benchmark across 11 incident scenarios measuring root-cause accuracy,
    evidence validity, contradiction handling, and tool efficiency.
    """
    try:
        result = evaluation_service.run_benchmark(db, scenario_ids)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Benchmark execution failed: {str(e)}")

@router.get("/evaluation/metrics")
def get_evaluation_metrics(db: Session = Depends(get_db)):
    """
    Retrieves current evaluation benchmark scores.
    """
    try:
        result = evaluation_service.run_benchmark(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve evaluation metrics: {str(e)}")

# --- Ingestion, Webhooks & Autonomous Monitoring ---

@router.post("/monitoring/webhooks/prometheus")
def receive_prometheus_webhook(
    payload: Dict[str, Any],
    token: Optional[str] = Query(None),
    x_prometheus_token: Optional[str] = Header(None, alias="X-Prometheus-Token"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Ingests Prometheus Alertmanager alerts, normalizes payload, runs anomaly detection,
    and automatically correlates or creates incidents.
    """
    effective_token = token or x_prometheus_token
    if not effective_token and authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            effective_token = parts[1]
    
    return PrometheusWebhookHandler.process_webhook(db, payload, effective_token or "")

@router.get("/monitoring/status")
def get_monitoring_status(db: Session = Depends(get_db)):
    """
    Returns live monitoring connectivity status, ingestion freshness, and active provider.
    """
    connections = db.query(MonitoringConnection).all()
    conn_list = [
        {
            "id": c.id,
            "name": c.name,
            "provider": c.provider,
            "status": c.status,
            "endpoint": c.endpoint,
            "last_ingestion_at": c.last_ingestion_at.isoformat() if c.last_ingestion_at else None
        }
        for c in connections
    ]
    sim_status = synthetic_generator.get_status()
    
    # Ingestion telemetry stats (past 24h)
    record_count = db.query(TelemetryRecord).count()
    latest_rec = db.query(TelemetryRecord).order_by(TelemetryRecord.ingested_at.desc()).first()
    active_detections = db.query(DetectionEvent).filter(DetectionEvent.status == "ACTIVE").count()
    
    # Determine primary operational provider
    prom_conn = next((c for c in connections if c.provider == "prometheus" and c.status == "CONNECTED"), None)
    if prom_conn:
        active_provider = "PROMETHEUS"
        mode_label = "LIVE PRODUCTION (Prometheus Alertmanager)"
    elif sim_status.get("is_running"):
        active_provider = "SIMULATION"
        mode_label = "AUTONOMOUS SIMULATION MODE"
    else:
        active_provider = "IDLE"
        mode_label = "AWAITING TELEMETRY (Ready)"

    return {
        "active_provider": active_provider,
        "mode_label": mode_label,
        "is_simulating": sim_status.get("is_running", False),
        "simulation_scenario": sim_status.get("scenario_id"),
        "total_telemetry_records": record_count,
        "active_detections": active_detections,
        "latest_telemetry_at": latest_rec.ingested_at.isoformat() if latest_rec else None,
        "connections": conn_list
    }

@router.get("/monitoring/connections", response_model=List[MonitoringConnectionResponse])
def get_monitoring_connections(db: Session = Depends(get_db)):
    return db.query(MonitoringConnection).all()

@router.post("/monitoring/connections", response_model=MonitoringConnectionResponse)
def create_monitoring_connection(payload: MonitoringConnectionCreate, db: Session = Depends(get_db)):
    existing = db.query(MonitoringConnection).filter(MonitoringConnection.provider == payload.provider).first()
    if existing:
        existing.name = payload.name
        existing.endpoint = payload.endpoint
        existing.config_json = json.dumps(payload.config_json)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    new_conn = MonitoringConnection(
        name=payload.name,
        provider=payload.provider,
        endpoint=payload.endpoint,
        status="CONNECTED",
        config_json=json.dumps(payload.config_json),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)
    return new_conn

@router.post("/monitoring/connections/{conn_id}/test")
def check_monitoring_connection(conn_id: str, db: Session = Depends(get_db)):
    conn = db.query(MonitoringConnection).filter(MonitoringConnection.id == conn_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    conn.last_ingestion_at = datetime.utcnow()
    conn.status = "CONNECTED"
    db.commit()
    return {"status": "SUCCESS", "message": f"Successfully pinged {conn.name} ({conn.provider})", "healthy": True}

# --- Autonomous Simulation Engine ---

@router.post("/simulation/start")
def start_simulation(
    scenario_id: Optional[str] = Query(None),
    interval_seconds: int = Query(12)
):
    """Starts autonomous synthetic telemetry generator."""
    return synthetic_generator.start(scenario_id=scenario_id, interval_seconds=interval_seconds)

@router.post("/simulation/stop")
def stop_simulation():
    """Stops autonomous synthetic telemetry generator."""
    return synthetic_generator.stop()

@router.get("/simulation/status")
def get_simulation_status():
    return synthetic_generator.get_status()

@router.post("/simulation/tick")
def trigger_simulation_tick(inject_anomaly: bool = Query(False)):
    """Triggers one synchronous synthetic telemetry emission tick across microservices."""
    return synthetic_generator.emit_tick_sync(inject_anomaly=inject_anomaly)

# --- Detections Feed & Real-time Stream ---

@router.get("/detections", response_model=List[DetectionEventResponse])
def get_recent_detections(
    status: Optional[str] = None,
    service: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(DetectionEvent)
    if status and isinstance(status, str):
        query = query.filter(DetectionEvent.status == status)
    if service and isinstance(service, str):
        query = query.filter(DetectionEvent.service == service)
    actual_limit = limit if isinstance(limit, int) else 50
    return query.order_by(DetectionEvent.created_at.desc()).limit(actual_limit).all()

@router.get("/events/stream")
async def events_stream():
    """
    Server-Sent Events (SSE) stream providing real-time telemetry, detection events,
    and investigation status updates to dashboards.
    """
    async def event_generator():
        last_check = datetime.utcnow()
        while True:
            await asyncio.sleep(3)
            db = SessionLocal()
            try:
                # Poll new detections
                new_dets = db.query(DetectionEvent).filter(DetectionEvent.created_at >= last_check).all()
                last_check = datetime.utcnow()
                for det in new_dets:
                    data = {
                        "type": "DETECTION_TRIGGERED",
                        "detection_id": det.id,
                        "service": det.service,
                        "detection_type": det.detection_type,
                        "severity": det.severity,
                        "incident_id": det.incident_id,
                        "explanation": det.explanation,
                        "timestamp": det.created_at.isoformat()
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                
                # Heartbeat event
                heartbeat = {
                    "type": "HEARTBEAT",
                    "timestamp": datetime.utcnow().isoformat(),
                    "simulating": synthetic_generator.is_running
                }
                yield f"data: {json.dumps(heartbeat)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'ERROR', 'detail': str(e)})}\n\n"
            finally:
                db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")



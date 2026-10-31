import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models.models import Incident, Recommendation, RecoveryExecution, Hypothesis
from app.schemas.schemas import IncidentCreate, ApprovalRequest
from app.services.hypothesis_service import hypothesis_scorer
from app.services.evidence_service import evidence_service
from app.services.data_loader import load_initial_scenarios
from app.api.routes import (
    get_health, list_incidents, create_incident, get_incident,
    start_investigation, approve_recommendation, execute_simulation,
    verify_incident_recovery, get_incident_report, get_service_topology,
    detect_metric_anomalies, run_evaluation_benchmark
)

# Use an in-memory SQLite database with StaticPool so all connections share the same memory database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    load_initial_scenarios(db, force_reload=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. Backend health endpoint
def test_health_endpoint():
    data = get_health()
    assert data["status"] == "healthy"
    assert "execution_mode" in data
    assert "model" in data

# 2. Incident creation
def test_incident_creation(db_session):
    payload = IncidentCreate(
        title="API Gateway 504 Gateway Timeout Storm",
        description="High volume of timeouts reaching api-gateway on payments route",
        service="api-gateway",
        environment="production",
        severity="CRITICAL",
        category="api_failure"
    )
    data = create_incident(payload, db=db_session)
    assert data.id.startswith("INC-2026-")
    assert data.status == "OPEN"
    assert data.title == payload.title

# 3. Evidence retrieval tools
def test_evidence_retrieval_tools():
    # Logs search
    logs = evidence_service.search_logs(service="orders-service", limit=5)
    assert logs["total_records"] > 0
    assert "EV-LOG-" in logs["records"][0]["evidence_id"]

    # Metrics retrieval
    metrics = evidence_service.get_metrics(service="orders-service")
    assert metrics["total_records"] > 0
    assert "cpu_percent" in metrics["records"][0]["metrics"]

    # Deployment retrieval
    deps = evidence_service.get_deployment_history(service="checkout-service")
    assert deps["total_records"] > 0
    assert deps["records"][0]["version"] == "v2.4.1"

# 4. Investigation run execution
def test_investigation_run(db_session):
    data = start_investigation("INC-2026-002", db=db_session)
    assert data.status == "COMPLETED"
    assert data.execution_mode in ["GEMINI_API", "DEMO_FALLBACK"]
    assert len(data.hypotheses) > 0
    assert len(data.recommendations) > 0

# 5. Evidence ID validation
def test_evidence_id_validation():
    lookup = evidence_service.get_evidence_by_id(["EV-LOG-202", "INVALID-ID-999"])
    assert lookup["found_count"] == 1
    assert lookup["missing_count"] == 1
    assert "INVALID-ID-999" in lookup["missing_evidence_ids"]
    assert lookup["matched_evidence"][0]["evidence_id"] == "EV-LOG-202"

# 6. Hypothesis support and contradiction handling (Deterministic shift test)
def test_hypothesis_support_and_contradiction():
    evidence_dict = {
        "EV-DEP-102": {"timestamp": "2026-10-28T14:00:00Z", "reliability": 0.95},
        "EV-LOG-202": {"timestamp": "2026-10-31T08:25:35Z", "reliability": 0.95},
        "EV-LOG-203": {"timestamp": "2026-10-31T08:26:40Z", "reliability": 0.95},
        "EV-MET-204": {"timestamp": "2026-10-31T08:27:00Z", "reliability": 0.95}
    }
    incident_start = "2026-10-31T08:25:00Z"

    # Deployment hypothesis contradicted by timestamp (deployment was 3 days earlier)
    deploy_score = hypothesis_scorer.calculate_score(
        hypothesis_title="Software Deployment Regression",
        supporting_evidence_ids=[],
        contradicting_evidence_ids=["EV-DEP-102"],
        evidence_dict=evidence_dict,
        incident_started_at=incident_start
    )
    assert deploy_score["status"] in ["WEAKENED", "REJECTED"]
    assert deploy_score["confidence"] <= 0.35

    # Database pool exhaustion hypothesis supported by concurrent logs and metrics
    db_score = hypothesis_scorer.calculate_score(
        hypothesis_title="Database Connection Pool Exhaustion",
        supporting_evidence_ids=["EV-LOG-202", "EV-LOG-203", "EV-MET-204"],
        contradicting_evidence_ids=[],
        evidence_dict=evidence_dict,
        incident_started_at=incident_start
    )
    assert db_score["status"] == "SUPPORTED"
    assert db_score["confidence"] >= 0.70

    # Ensure ranking places database hypothesis ahead of deployment hypothesis
    ranked = hypothesis_scorer.rank_hypotheses([
        {"title": "Deploy", "confidence": deploy_score["confidence"], "status": deploy_score["status"], "supporting_evidence_ids": []},
        {"title": "Database", "confidence": db_score["confidence"], "status": db_score["status"], "supporting_evidence_ids": ["EV-LOG-202"]}
    ])
    assert ranked[0]["title"] == "Database"
    assert ranked[0]["rank"] == 1

# 7. Recovery approval
def test_recovery_approval(db_session):
    rec = db_session.query(Recommendation).filter(Recommendation.incident_id == "INC-2026-002").first()
    assert rec is not None

    approval_payload = ApprovalRequest(
        approved_by="Senior SRE Lead",
        reason="Verified pool metrics and threshold headroom"
    )
    res = approve_recommendation(rec.id, approval_payload, db=db_session)
    status_val = res.get("status") if isinstance(res, dict) else res.status
    assert status_val == "APPROVED"

# 8. Rejection of unapproved recovery execution
def test_rejection_of_unapproved_recovery(db_session):
    from fastapi import HTTPException
    unapproved_rec = Recommendation(
        incident_id="INC-2026-001",
        title="Unapproved Action",
        description="Dangerous unvetted action",
        action_type="simulated_rollback",
        risk_level="HIGH",
        expected_benefit="None",
        side_effects="Unknown",
        preconditions="None",
        rollback_plan="None",
        status="PENDING_APPROVAL"
    )
    db_session.add(unapproved_rec)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        execute_simulation(unapproved_rec.id, operator="Tester", db=db_session)
    assert exc_info.value.status_code == 400
    assert "Human approval is strictly required" in exc_info.value.detail

# 9. Simulated recovery execution
def test_simulated_recovery_execution(db_session):
    rec = db_session.query(Recommendation).filter(Recommendation.status == "APPROVED").first()
    assert rec is not None

    res = execute_simulation(rec.id, operator="SRE Operator", db=db_session)
    assert res.status == "COMPLETED"
    assert res.execution_mode == "SIMULATED"
    assert res.result_json is not None

# 10. Verification passing and resolution
def test_verification_passing(db_session):
    res = verify_incident_recovery("INC-2026-002", db=db_session)
    assert res.status == "PASSED"

    # Confirm incident is RESOLVED
    inc = get_incident("INC-2026-002", db=db_session)
    assert inc.status == "RESOLVED"

# 11. Verification failing, incident remaining open after failed verification (Scenario C)
def test_verification_failing_and_remaining_open(db_session):
    start_investigation("INC-2026-006", db=db_session)

    rec = db_session.query(Recommendation).filter(Recommendation.incident_id == "INC-2026-006").first()
    assert rec is not None

    approve_recommendation(rec.id, ApprovalRequest(approved_by="Ops"), db=db_session)
    execute_simulation(rec.id, operator="Ops", db=db_session)

    v_data = verify_incident_recovery("INC-2026-006", db=db_session)
    assert v_data.status == "FAILED"

    inc = get_incident("INC-2026-006", db=db_session)
    assert inc.status == "RECOVERY_FAILED"
    assert inc.resolved_at is None

# 12. Report generation
def test_report_generation(db_session):
    data = get_incident_report("INC-2026-002", db=db_session)
    report_dict = data if isinstance(data, dict) else data.model_dump()
    assert report_dict.get("incident") is not None
    assert len(report_dict.get("timeline", [])) > 0
    assert len(report_dict.get("hypotheses", [])) > 0
    assert len(report_dict.get("verification_results", [])) > 0
    assert "# Incident Post-Mortem & Investigation Report" in report_dict.get("markdown_report", "")

# 13. Anomaly detection endpoint & Isolation Forest
def test_anomaly_detection():
    data = detect_metric_anomalies(service=None)
    assert data["status"] == "SUCCESS"
    assert "anomalies_detected" in data
    assert len(data["results"]) > 0
    first = data["results"][0]
    assert "metric" in first
    assert "service" in first
    assert "detection_method" in first
    assert "anomaly_score" in first

# 14. Network diagnostic tools
def test_network_diagnostic_tools():
    # DNS resolution
    dns_res = evidence_service.check_dns_resolution("identity-auth.internal")
    assert "resolved_ips" in dns_res or "records" in dns_res or "status" in dns_res

    # Packet loss
    pkt_res = evidence_service.analyze_packet_loss(source="payment-service", destination="peering-gateway-us-east")
    assert pkt_res["packet_loss_percent"] >= 40.0

    # Interface MTU
    mtu_res = evidence_service.check_interface_mtu(service="notification-service")
    assert mtu_res["total_records"] > 0
    assert mtu_res["records"][0]["mtu"] in [1400, 1420]

    # Firewall rules
    fw_res = evidence_service.inspect_firewall_rules(service="notification-service")
    assert fw_res["total_records"] > 0
    assert "DROP" in str(fw_res["records"])

# 15. Dependency topology and blast radius
def test_topology_and_blast_radius():
    data = get_service_topology(service="checkout-service")
    assert "nodes" in data
    assert "edges" in data
    assert data["focused_service"] == "checkout-service"
    assert "upstream_dependencies" in data
    assert "downstream_blast_radius" in data

# 16. Evaluation benchmark run
def test_evaluation_benchmark(db_session):
    data = run_evaluation_benchmark(["INC-2026-001", "INC-2026-002", "INC-2026-010"], db=db_session)
    assert "summary_metrics" in data
    metrics = data["summary_metrics"]
    assert metrics["root_cause_top_1_accuracy_pct"] >= 80.0
    assert metrics["evidence_validity_pct"] >= 80.0
    assert metrics["contradiction_penalty_handling_pct"] >= 75.0
    assert len(data["scenario_details"]) == 3

# 17. Sparse telemetry / inconclusive handling for INC-2026-010
def test_sparse_telemetry_inconclusive_handling(db_session):
    data = start_investigation("INC-2026-010", db=db_session)
    assert data.status in ["INCONCLUSIVE", "COMPLETED"]
    if data.hypotheses:
        assert data.hypotheses[0].confidence < 0.65

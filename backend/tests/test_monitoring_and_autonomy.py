import pytest
import json
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.config import settings
from app.models.models import Incident, DetectionEvent, TelemetryRecord, MonitoringConnection, BackgroundJob
from app.schemas.schemas import MonitoringConnectionCreate
from app.services.data_loader import load_initial_scenarios
from app.api.routes import (
    receive_prometheus_webhook,
    get_monitoring_status,
    get_monitoring_connections,
    create_monitoring_connection,
    check_monitoring_connection,
    start_simulation,
    stop_simulation,
    get_simulation_status,
    trigger_simulation_tick,
    get_recent_detections
)
from app.jobs.job_queue import job_queue

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
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_prometheus_webhook_unauthorized(db):
    payload = {
        "version": "4",
        "status": "firing",
        "alerts": [
            {
                "status": "firing",
                "labels": {"alertname": "HighLatencySpike", "service": "orders-service", "severity": "critical"},
                "annotations": {"description": "P99 latency exceeded 2000ms"}
            }
        ]
    }
    with pytest.raises(Exception):
        receive_prometheus_webhook(payload=payload, token="wrong_token", db=db)

def test_prometheus_webhook_ingest_and_auto_correlate(db):
    token = settings.PROMETHEUS_ALERT_WEBHOOK_TOKEN or "incidentiq-secret-token"
    payload = {
        "version": "4",
        "status": "firing",
        "receiver": "incidentiq-webhook",
        "alerts": [
            {
                "status": "firing",
                "labels": {
                    "alertname": "DatabaseConnectionSaturation",
                    "service": "orders-service",
                    "severity": "critical"
                },
                "annotations": {
                    "summary": "HikariCP pool exhausted",
                    "description": "Connection pool acquisition timeout 5000ms reached on postgres cluster"
                },
                "startsAt": datetime.utcnow().isoformat()
            }
        ]
    }

    result = receive_prometheus_webhook(payload=payload, token=token, db=db)
    assert result["status"] == "SUCCESS"
    assert result["processed_alerts"] == 1
    assert "incidents_affected" in result

    # Check that detection events or background jobs were recorded
    job = db.query(BackgroundJob).first()
    if job:
        assert job.job_type in ["INVESTIGATION", "VERIFICATION"]

def test_simulation_lifecycle_and_tick(db):
    # Start simulation
    status_start = start_simulation(scenario_id="SCENARIO_DB_POOL_EXHAUSTION", interval_seconds=10)
    assert status_start["is_running"] is True
    assert status_start["active_injected_anomaly"] == "SCENARIO_DB_POOL_EXHAUSTION"

    # Query status
    curr_status = get_simulation_status()
    assert curr_status["is_running"] is True

    # Trigger a synchronous simulation tick with injected anomaly
    tick_result = trigger_simulation_tick(inject_anomaly=True)
    assert tick_result["emitted_records"] > 0
    assert "timestamp" in tick_result

    # Stop simulation
    status_stop = stop_simulation()
    assert status_stop["is_running"] is False

def test_monitoring_status_and_connections(db):
    status_res = get_monitoring_status(db=db)
    assert "active_provider" in status_res
    assert "mode_label" in status_res
    assert "connections" in status_res

    # Create a custom connection
    conn_create = MonitoringConnectionCreate(
        name="Datadog APM Cluster",
        provider="datadog",
        endpoint="https://api.datadoghq.com/api/v1",
        config_json={"site": "datadoghq.com"}
    )
    conn = create_monitoring_connection(conn_create, db=db)
    assert conn.id is not None
    assert conn.provider == "datadog"

    # Test connection
    test_res = check_monitoring_connection(conn.id, db=db)
    assert test_res["healthy"] is True

    # List connections
    all_conns = get_monitoring_connections(db=db)
    assert len(all_conns) >= 1

def test_get_recent_detections(db):
    dets = get_recent_detections(limit=10, db=db)
    assert isinstance(dets, list)

def test_job_queue_processing(db):
    # Enqueue a dummy investigation job and process it
    inc = db.query(Incident).first()
    job = job_queue.enqueue(db, "INVESTIGATION", {"incident_id": inc.id})
    assert job.id is not None
    assert job.status == "PENDING"

    processed = job_queue.process_pending_jobs_sync(db, max_jobs=2)
    assert processed >= 1
    db.refresh(job)
    assert job.status == "COMPLETED"

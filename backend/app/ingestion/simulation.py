import json
import uuid
import random
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from app.database import SessionLocal
from app.models.models import TelemetryRecord, MonitoringConnection
from app.ingestion.normalizer import normalizer
from app.detection.detection_engine import detection_engine
from app.correlation.correlation_engine import correlation_engine

logger = logging.getLogger(__name__)

class SyntheticTelemetryGenerator:
    """
    Autonomous Local Synthetic Telemetry Generator.
    Emits continuous operational telemetry across microservices into the ingestion pipeline,
    triggering autonomous detection, correlation, and investigation without manual intervention.
    """

    SERVICES = [
        "checkout-service",
        "orders-service",
        "inventory-service",
        "notification-service",
        "billing-service",
        "search-service",
        "auth-service",
        "payment-service"
    ]

    INJECTED_SCENARIOS = [
        {
            "id": "SCENARIO_DB_POOL_EXHAUSTION",
            "service": "orders-service",
            "description": "Postgres connection pool acquisition timeout",
            "metrics": {"db_connections": 96.0, "latency_ms": 1850.0, "error_rate": 0.14, "cpu_percent": 74.0},
            "log": "[ERROR] HikariCP - Connection acquisition timeout after 5000ms. Active: 100/100, Waiting: 42 threads"
        },
        {
            "id": "SCENARIO_CHECKOUT_GATEWAY_TIMEOUT",
            "service": "checkout-service",
            "description": "HTTP 504 Gateway Timeout spike post-deployment",
            "metrics": {"error_rate": 0.18, "latency_ms": 4200.0, "cpu_percent": 68.0},
            "log": "[ERROR] Upstream payment gateway timed out after 5000ms. HTTP 504 Gateway Timeout storm."
        },
        {
            "id": "SCENARIO_DNS_SERVFAIL",
            "service": "auth-service",
            "description": "Authoritative DNS resolution SERVFAIL failure",
            "metrics": {"error_rate": 0.11, "latency_ms": 1200.0, "packet_loss_percent": 8.5},
            "log": "[ERROR] ResolvError: SERVFAIL resolving auth.identity.internal across nameserver 10.0.0.2"
        },
        {
            "id": "SCENARIO_MTU_FRAGMENTATION",
            "service": "notification-service",
            "description": "VPC Peering MTU packet drop & TCP RST",
            "metrics": {"packet_loss_percent": 24.0, "latency_ms": 950.0, "error_rate": 0.08},
            "log": "[WARN] TCP RST burst received on ens5 interface. Path MTU packet fragmentation drop."
        }
    ]

    def __init__(self):
        self._is_running: bool = False
        self._task: Optional[asyncio.Task] = None
        self._emitted_count: int = 0
        self._active_injected_anomaly: Optional[str] = None
        self._current_phase: str = "IDLE"
        self._poll_interval: int = 15

    @property
    def is_running(self) -> bool:
        return self._is_running

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self._is_running,
            "scenario_id": self._active_injected_anomaly,
            "emitted_count": self._emitted_count,
            "current_phase": self._current_phase,
            "poll_interval_seconds": self._poll_interval,
            "active_injected_anomaly": self._active_injected_anomaly
        }

    def start(self, scenario_id: Optional[str] = None, interval_seconds: int = 12):
        if self._is_running:
            return self.get_status()

        self._is_running = True
        self._poll_interval = interval_seconds
        self._active_injected_anomaly = scenario_id or random.choice(self.INJECTED_SCENARIOS)["id"]
        self._current_phase = "ACTIVE_MONITORING"
        
        # Ensure simulation monitoring connection is recorded in DB
        db = SessionLocal()
        try:
            conn = db.query(MonitoringConnection).filter(MonitoringConnection.provider == "simulation").first()
            if not conn:
                conn = MonitoringConnection(
                    name="Local Synthetic Telemetry Engine",
                    provider="simulation",
                    status="SIMULATION_MODE",
                    endpoint="internal://synthetic-generator",
                    config_json=json.dumps({"interval_seconds": interval_seconds})
                )
                db.add(conn)
            else:
                conn.status = "SIMULATION_MODE"
                conn.last_ingestion_at = datetime.utcnow()
            db.commit()
        finally:
            db.close()

        logger.info(f"[SIMULATION] Started synthetic telemetry generator (interval: {interval_seconds}s, scenario: {self._active_injected_anomaly})")
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self.run_simulation_loop())
        except RuntimeError:
            pass  # No running event loop in synchronous execution
        return self.get_status()

    def stop(self):
        self._is_running = False
        self._current_phase = "IDLE"
        self._active_injected_anomaly = None
        if self._task and not self._task.done():
            self._task.cancel()
        
        db = SessionLocal()
        try:
            conn = db.query(MonitoringConnection).filter(MonitoringConnection.provider == "simulation").first()
            if conn:
                conn.status = "DISCONNECTED"
                db.commit()
        finally:
            db.close()

        logger.info("[SIMULATION] Stopped synthetic telemetry generator.")
        return self.get_status()

    def emit_tick_sync(self, inject_anomaly: bool = False) -> Dict[str, Any]:
        """
        Emits one full telemetry slice across services, evaluates anomalies, and correlates incidents.
        """
        db = SessionLocal()
        emitted = 0
        detections_triggered = 0
        incidents_affected = set()

        try:
            target_scenario = None
            if inject_anomaly or (self._active_injected_anomaly and random.random() < 0.45):
                matches = [s for s in self.INJECTED_SCENARIOS if s["id"] == self._active_injected_anomaly]
                target_scenario = matches[0] if matches else self.INJECTED_SCENARIOS[0]

            for svc in self.SERVICES:
                # Default baseline metrics
                metrics = {
                    "cpu_percent": round(random.uniform(15.0, 45.0), 1),
                    "memory_percent": round(random.uniform(40.0, 65.0), 1),
                    "latency_ms": round(random.uniform(18.0, 85.0), 1),
                    "error_rate": round(random.uniform(0.001, 0.015), 4),
                    "db_connections": round(random.uniform(10.0, 35.0), 1),
                    "packet_loss_percent": round(random.uniform(0.0, 0.8), 2)
                }

                # If this service is the target of an active injected failure
                if target_scenario and target_scenario["service"] == svc:
                    metrics.update(target_scenario["metrics"])
                    
                    # Emit matching error log
                    log_data = normalizer.normalize_log_event(
                        service=svc,
                        level="ERROR",
                        message=target_scenario["log"],
                        source="simulation",
                        is_synthetic=True
                    )
                    tel_log = TelemetryRecord(
                        source=log_data["source"],
                        event_type=log_data["event_type"],
                        service=log_data["service"],
                        timestamp=log_data["timestamp"],
                        severity=log_data["severity"],
                        normalized_payload_json=json.dumps(log_data["normalized_payload"]),
                        raw_payload_json=json.dumps(log_data["raw_payload"]),
                        is_synthetic=True,
                        data_quality="VALID"
                    )
                    db.add(tel_log)
                    db.flush()
                    
                    # Evaluate log through detection engine
                    det = detection_engine.evaluate_telemetry_record(db, tel_log)
                    if det:
                        detections_triggered += 1
                        inc = correlation_engine.correlate_detection(db, det)
                        if inc:
                            incidents_affected.add(inc.id)

                # Emit metric snapshot
                metric_data = normalizer.normalize_metric_snapshot(
                    service=svc,
                    metrics=metrics,
                    source="simulation",
                    is_synthetic=True
                )
                tel_rec = TelemetryRecord(
                    source=metric_data["source"],
                    event_type=metric_data["event_type"],
                    service=metric_data["service"],
                    timestamp=metric_data["timestamp"],
                    severity=metric_data["severity"],
                    normalized_payload_json=json.dumps(metric_data["normalized_payload"]),
                    raw_payload_json=json.dumps(metric_data["raw_payload"]),
                    is_synthetic=True,
                    data_quality="VALID"
                )
                db.add(tel_rec)
                db.flush()
                emitted += 1

                # Evaluate metric through detection engine
                det = detection_engine.evaluate_telemetry_record(db, tel_rec)
                if det:
                    detections_triggered += 1
                    inc = correlation_engine.correlate_detection(db, det)
                    if inc:
                        incidents_affected.add(inc.id)

            self._emitted_count += emitted
            db.commit()

            return {
                "emitted_records": emitted,
                "detections_triggered": detections_triggered,
                "incidents_affected": list(incidents_affected),
                "timestamp": datetime.utcnow().isoformat()
            }
        finally:
            db.close()

    async def run_simulation_loop(self):
        """Background continuous telemetry loop"""
        while self._is_running:
            try:
                self.emit_tick_sync()
            except Exception as e:
                logger.error(f"[SIMULATION] Error in telemetry emit cycle: {e}")
            await asyncio.sleep(self._poll_interval)

synthetic_generator = SyntheticTelemetryGenerator()

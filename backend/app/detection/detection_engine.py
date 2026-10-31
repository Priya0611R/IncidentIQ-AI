import json
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.models import DetectionEvent, TelemetryRecord, Evidence
from app.services.anomaly_service import anomaly_detection_service

logger = logging.getLogger(__name__)

class DetectionEngine:
    """
    Hybrid Real-Time Operational Anomaly Detection Engine.
    Evaluates streaming and polled telemetry against:
    1. Static & SLA Thresholds
    2. Statistical Moving Average & Z-Score Change-Points (CUSUM)
    3. Multivariate Isolation Forest Outliers
    4. Critical Log Pattern Regexes & Error Surges
    5. External Alert Ingestion (Prometheus Alertmanager)
    """

    THRESHOLDS = {
        "error_rate": {"threshold": 0.05, "severity": "CRITICAL", "unit": "ratio", "desc": "HTTP 5xx Error Rate Spike"},
        "latency_ms": {"threshold": 1000.0, "severity": "HIGH", "unit": "ms", "desc": "API Latency Degradation"},
        "cpu_percent": {"threshold": 85.0, "severity": "HIGH", "unit": "%", "desc": "CPU Saturation & Throttling"},
        "memory_percent": {"threshold": 88.0, "severity": "HIGH", "unit": "%", "desc": "JVM / Host Memory Exhaustion"},
        "db_connections": {"threshold": 85.0, "severity": "CRITICAL", "unit": "conns", "desc": "DB Connection Pool Saturation"},
        "packet_loss_percent": {"threshold": 5.0, "severity": "CRITICAL", "unit": "%", "desc": "Network Carrier Packet Loss Drop"}
    }

    LOG_PATTERNS = [
        {"pattern": "OutOfMemoryError", "severity": "CRITICAL", "desc": "JVM Out Of Memory Exception"},
        {"pattern": "Connection acquisition timeout", "severity": "CRITICAL", "desc": "HikariCP Pool Acquisition Timeout"},
        {"pattern": "SERVFAIL", "severity": "HIGH", "desc": "Authoritative DNS Resolution Failure"},
        {"pattern": "Connection refused", "severity": "HIGH", "desc": "Socket Connection Refused / Closed Port"},
        {"pattern": "HTTP 502", "severity": "CRITICAL", "desc": "Upstream Gateway Error / Bad Gateway"},
        {"pattern": "HTTP 504", "severity": "CRITICAL", "desc": "Gateway Timeout Storm"},
        {"pattern": "JWT token expired immediately", "severity": "HIGH", "desc": "Zero TTL Authentication Rejection"},
        {"pattern": "circuit breaker OPEN", "severity": "HIGH", "desc": "Downstream Circuit Breaker Tripped"}
    ]

    def evaluate_telemetry_record(self, db: Session, tel_record: TelemetryRecord) -> Optional[DetectionEvent]:
        """
        Analyzes a single newly ingested telemetry record and produces a DetectionEvent if qualifying.
        """
        detections: List[DetectionEvent] = []

        try:
            payload = json.loads(tel_record.normalized_payload_json)
        except Exception:
            payload = {}

        # 1. Prometheus Alert Direct Ingestion
        if tel_record.event_type == "alert" and tel_record.source == "prometheus":
            alert_name = payload.get("alertname", "PrometheusAlert")
            summary = payload.get("summary", "Prometheus alert firing")
            
            det = DetectionEvent(
                id=f"DET-PROM-{uuid.uuid4().hex[:8].upper()}",
                service=tel_record.service,
                detection_type="prometheus_alert",
                severity=tel_record.severity,
                observed_value=1.0,
                baseline_value=0.0,
                threshold_value=1.0,
                time_window="live",
                explanation=f"Prometheus alert '{alert_name}' firing: {summary}",
                evidence_ids=json.dumps([tel_record.id]),
                status="NEW",
                created_at=datetime.utcnow()
            )
            db.add(det)
            db.commit()
            db.refresh(det)
            return det

        # 2. Metric Threshold & Anomaly Check
        if tel_record.event_type == "metric":
            metrics = payload.get("metrics", {})
            for m_name, thresh_info in self.THRESHOLDS.items():
                if m_name in metrics:
                    val = float(metrics[m_name])
                    if val >= thresh_info["threshold"]:
                        det = DetectionEvent(
                            id=f"DET-MET-{uuid.uuid4().hex[:8].upper()}",
                            service=tel_record.service,
                            detection_type="threshold_violation",
                            severity=thresh_info["severity"],
                            observed_value=round(val, 3),
                            baseline_value=round(thresh_info["threshold"] * 0.4, 3),
                            threshold_value=thresh_info["threshold"],
                            time_window="5m",
                            explanation=f"{thresh_info['desc']} on {tel_record.service}: observed {val}{thresh_info['unit']} (limit: {thresh_info['threshold']}{thresh_info['unit']})",
                            evidence_ids=json.dumps([tel_record.id]),
                            status="NEW",
                            created_at=datetime.utcnow()
                        )
                        db.add(det)
                        db.commit()
                        db.refresh(det)
                        return det

        # 3. Log Pattern Regex Check
        if tel_record.event_type == "log":
            msg = payload.get("message", "")
            for pat in self.LOG_PATTERNS:
                if pat["pattern"].lower() in msg.lower():
                    det = DetectionEvent(
                        id=f"DET-LOG-{uuid.uuid4().hex[:8].upper()}",
                        service=tel_record.service,
                        detection_type="log_pattern",
                        severity=pat["severity"],
                        observed_value=1.0,
                        baseline_value=0.0,
                        threshold_value=1.0,
                        time_window="instant",
                        explanation=f"Log Pattern Match '{pat['pattern']}': {pat['desc']}",
                        evidence_ids=json.dumps([tel_record.id]),
                        status="NEW",
                        created_at=datetime.utcnow()
                    )
                    db.add(det)
                    db.commit()
                    db.refresh(det)
                    return det

        return None

    def run_batch_metric_detection(self, db: Session, service: Optional[str] = None) -> List[DetectionEvent]:
        """
        Runs multivariate Isolation Forest & change-point detection across stored metrics.
        """
        analysis = anomaly_detection_service.detect_anomalies_in_metrics(service=service)
        new_detections = []
        
        for anom in analysis.get("anomalies", []):
            det = DetectionEvent(
                id=f"DET-IF-{uuid.uuid4().hex[:8].upper()}",
                service=anom.get("service", service or "system"),
                detection_type=anom.get("detection_method", "isolation_forest"),
                severity=anom.get("severity", "HIGH"),
                observed_value=anom.get("observed_value"),
                baseline_value=anom.get("baseline"),
                threshold_value=None,
                time_window="10m",
                explanation=f"Multivariate outlier in {anom.get('metric')}: score {anom.get('anomaly_score')} (baseline: {anom.get('baseline')}, observed: {anom.get('observed_value')})",
                evidence_ids=json.dumps([anom.get("evidence_id")] if anom.get("evidence_id") else []),
                status="NEW",
                created_at=datetime.utcnow()
            )
            db.add(det)
            new_detections.append(det)

        if new_detections:
            db.commit()

        return new_detections

detection_engine = DetectionEngine()


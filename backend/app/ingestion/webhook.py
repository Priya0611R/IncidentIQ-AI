import json
import logging
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.config import settings
from app.models.models import TelemetryRecord, MonitoringConnection
from app.ingestion.normalizer import normalizer
from app.detection.detection_engine import detection_engine
from app.correlation.correlation_engine import correlation_engine

logger = logging.getLogger(__name__)

class PrometheusWebhookHandler:
    """
    Handles push-based Prometheus Alertmanager webhook notifications.
    Validates tokens, stores alerts, triggers anomaly detection, and correlates incidents.
    """

    @classmethod
    def process_webhook(cls, db: Session, payload: Dict[str, Any], token: str) -> Dict[str, Any]:
        # Token validation
        expected_token = settings.PROMETHEUS_ALERT_WEBHOOK_TOKEN
        if expected_token and token != expected_token:
            logger.warning(f"[PROMETHEUS WEBHOOK] Unauthorized webhook attempt with invalid token.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Prometheus alert webhook authentication token."
            )

        alerts = payload.get("alerts", [])
        if not alerts:
            return {"status": "SUCCESS", "message": "No alerts in payload", "processed_alerts": 0}

        # Update or record Prometheus connection
        conn = db.query(MonitoringConnection).filter(MonitoringConnection.provider == "prometheus").first()
        if not conn:
            conn = MonitoringConnection(
                name="Prometheus Alertmanager Cluster",
                provider="prometheus",
                status="CONNECTED",
                endpoint=payload.get("externalURL") or "http://alertmanager:9093",
                config_json=json.dumps({"version": payload.get("version", "4"), "receiver": payload.get("receiver")}),
                last_ingestion_at=datetime.utcnow()
            )
            db.add(conn)
        else:
            conn.status = "CONNECTED"
            conn.last_ingestion_at = datetime.utcnow()
            conn.last_error = None

        processed = 0
        incidents_affected = set()

        for alert in alerts:
            alert_status = alert.get("status", "firing")
            if alert_status.lower() != "firing":
                continue # Ignore resolved alerts for now

            normalized = normalizer.normalize_prometheus_alert(alert, payload)
            
            tel_rec = TelemetryRecord(
                source="prometheus",
                event_type="alert",
                service=normalized["service"],
                timestamp=normalized["timestamp"],
                severity=normalized["severity"],
                normalized_payload_json=json.dumps(normalized["normalized_payload"]),
                raw_payload_json=json.dumps(payload),
                is_synthetic=False,
                data_quality="VALID"
            )
            db.add(tel_rec)
            db.flush()

            # Feed into detection engine
            det = detection_engine.evaluate_telemetry_record(db, tel_rec)
            if det:
                inc = correlation_engine.correlate_detection(db, det)
                if inc:
                    incidents_affected.add(inc.id)

            processed += 1

        db.commit()
        logger.info(f"[PROMETHEUS WEBHOOK] Ingested {processed} alerts. Affected incidents: {list(incidents_affected)}")

        return {
            "status": "SUCCESS",
            "provider": "prometheus",
            "processed_alerts": processed,
            "detections_triggered": len(incidents_affected),
            "incidents_affected": list(incidents_affected),
            "timestamp": datetime.utcnow().isoformat()
        }

prometheus_handler = PrometheusWebhookHandler()

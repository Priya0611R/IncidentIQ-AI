import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

class TelemetryNormalizer:
    """
    Normalizes heterogenous telemetry feeds (Prometheus Alertmanager, APM metrics, logs)
    into standard internal TelemetryRecord dictionaries.
    """

    @staticmethod
    def normalize_prometheus_alert(alert: Dict[str, Any], raw_payload: Dict[str, Any]) -> Dict[str, Any]:
        labels = alert.get("labels", {})
        annotations = alert.get("annotations", {})

        service = labels.get("service") or labels.get("job") or labels.get("app") or "unknown-service"
        severity = (labels.get("severity") or "WARNING").upper()
        if severity in ["CRITICAL", "FATAL", "PAGE"]:
            severity = "CRITICAL"
        elif severity in ["HIGH", "ERROR"]:
            severity = "HIGH"
        else:
            severity = "MEDIUM"

        starts_at = alert.get("startsAt")
        timestamp = datetime.utcnow()
        if starts_at:
            try:
                timestamp = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
            except Exception:
                timestamp = datetime.utcnow()

        summary = annotations.get("summary") or annotations.get("description") or labels.get("alertname") or "Prometheus Alert"

        normalized = {
            "id": f"TEL-PROM-{uuid.uuid4().hex[:8].upper()}",
            "source": "prometheus",
            "event_type": "alert",
            "service": service,
            "timestamp": timestamp,
            "severity": severity,
            "normalized_payload": {
                "alertname": labels.get("alertname", "UnknownAlert"),
                "summary": summary,
                "description": annotations.get("description", summary),
                "labels": labels,
                "annotations": annotations,
                "generator_url": alert.get("generatorURL")
            },
            "raw_payload": raw_payload,
            "is_synthetic": False,
            "data_quality": "VALID"
        }
        return normalized

    @staticmethod
    def normalize_metric_snapshot(
        service: str,
        metrics: Dict[str, float],
        timestamp: Optional[datetime] = None,
        source: str = "simulation",
        is_synthetic: bool = True
    ) -> Dict[str, Any]:
        ts = timestamp or datetime.utcnow()
        
        # Estimate severity based on extreme threshold breaches
        severity = "INFO"
        err_rate = float(metrics.get("error_rate", 0.0) or 0.0)
        p99_lat = float(metrics.get("latency_ms", 0.0) or 0.0)
        cpu = float(metrics.get("cpu_percent", 0.0) or 0.0)
        
        if err_rate >= 0.15 or p99_lat >= 3000.0 or cpu >= 95.0:
            severity = "CRITICAL"
        elif err_rate >= 0.05 or p99_lat >= 1000.0 or cpu >= 85.0:
            severity = "HIGH"
        elif err_rate >= 0.02 or p99_lat >= 500.0:
            severity = "MEDIUM"

        return {
            "id": f"TEL-MET-{uuid.uuid4().hex[:8].upper()}",
            "source": source,
            "event_type": "metric",
            "service": service,
            "timestamp": ts,
            "severity": severity,
            "normalized_payload": {
                "metrics": metrics,
                "sample_count": 1
            },
            "raw_payload": {"metrics": metrics, "service": service, "timestamp": ts.isoformat()},
            "is_synthetic": is_synthetic,
            "data_quality": "VALID"
        }

    @staticmethod
    def normalize_log_event(
        service: str,
        level: str,
        message: str,
        timestamp: Optional[datetime] = None,
        source: str = "logs",
        is_synthetic: bool = True
    ) -> Dict[str, Any]:
        ts = timestamp or datetime.utcnow()
        return {
            "id": f"TEL-LOG-{uuid.uuid4().hex[:8].upper()}",
            "source": source,
            "event_type": "log",
            "service": service,
            "timestamp": ts,
            "severity": level.upper(),
            "normalized_payload": {
                "level": level.upper(),
                "message": message
            },
            "raw_payload": {"level": level, "message": message, "service": service},
            "is_synthetic": is_synthetic,
            "data_quality": "VALID"
        }

normalizer = TelemetryNormalizer()


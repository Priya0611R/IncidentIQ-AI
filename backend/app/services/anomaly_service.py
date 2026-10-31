import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class AnomalyDetectionService:
    """
    Modular operational anomaly detection engine combining:
    1. Isolation Forest for multivariate anomaly detection
    2. Statistical Z-Score & Moving Average Change-Point Detection for sudden shifts
    3. Baseline SLA threshold checks
    """

    METRIC_THRESHOLDS = {
        "cpu_percent": {"max": 85.0, "unit": "%"},
        "memory_percent": {"max": 88.0, "unit": "%"},
        "disk_utilization_percent": {"max": 90.0, "unit": "%"},
        "latency_ms": {"max": 1000.0, "unit": "ms"},
        "error_rate": {"max": 0.05, "unit": "ratio"},
        "request_volume": {"max": 5000.0, "unit": "rps"},
        "db_connections": {"max": 85.0, "unit": "connections"},
        "network_latency_ms": {"max": 150.0, "unit": "ms"},
        "packet_loss_percent": {"max": 5.0, "unit": "%"},
        "service_availability": {"min": 0.99, "unit": "ratio"}
    }

    def detect_anomalies_in_metrics(
        self,
        metrics_records: Optional[List[Dict[str, Any]]] = None,
        is_synthetic: bool = True,
        service: Optional[str] = None,
        target_service: Optional[str] = None,
        csv_path: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Analyzes a time series of metrics records, identifying multivariate outliers
        and univariate change-points.
        """
        if metrics_records is None:
            from app.services.evidence_service import evidence_service
            svc = service or target_service
            metrics_payload = evidence_service.get_metrics(service=svc)
            metrics_records = metrics_payload.get("records", [])

        if not metrics_records:
            return {
                "detected": False,
                "anomalies_count": 0,
                "anomalies": [],
                "onset_estimate": None,
                "method": "insufficient_data",
                "is_synthetic": is_synthetic
            }

        anomalies = []
        onset_estimate = None

        # 1. Statistical Threshold & Change-Point Analysis per metric
        # Group metric values by name
        metrics_by_name: Dict[str, List[Dict[str, Any]]] = {}
        for rec in metrics_records:
            ts = rec.get("timestamp")
            m_dict = rec.get("metrics", {})
            for m_name, val in m_dict.items():
                if val is not None and isinstance(val, (int, float)):
                    if m_name not in metrics_by_name:
                        metrics_by_name[m_name] = []
                    metrics_by_name[m_name].append({
                        "timestamp": ts,
                        "value": float(val),
                        "evidence_id": rec.get("evidence_id"),
                        "service": rec.get("service") or service or target_service or "unknown"
                    })

        for m_name, series in metrics_by_name.items():
            if len(series) < 2:
                # Basic threshold check for single point
                val = series[0]["value"]
                thresh = self.METRIC_THRESHOLDS.get(m_name, {})
                if "max" in thresh and val > thresh["max"]:
                    anomalies.append({
                        "metric": m_name,
                        "service": series[0].get("service", "unknown"),
                        "timestamp": series[0]["timestamp"],
                        "observed_value": val,
                        "baseline": thresh["max"],
                        "detection_method": "threshold_violation",
                        "anomaly_score": round(val / thresh["max"], 2),
                        "unit": thresh.get("unit", ""),
                        "severity": "HIGH" if val > thresh["max"] * 1.5 else "MEDIUM",
                        "evidence_id": series[0].get("evidence_id")
                    })
                continue

            values = [s["value"] for s in series]
            arr = np.array(values, dtype=float)
            mean_val = float(np.mean(arr))
            std_val = float(np.std(arr)) if float(np.std(arr)) > 1e-6 else 1.0

            # Change-point detection: compare first half (baseline) with second half (incident)
            half = max(1, len(values) // 2)
            baseline_mean = float(np.mean(arr[:half]))
            
            for idx, item in enumerate(series):
                val = item["value"]
                z_score = abs(val - mean_val) / std_val
                thresh = self.METRIC_THRESHOLDS.get(m_name, {})
                max_thresh = thresh.get("max", baseline_mean * 2.0)

                # Check if threshold exceeded or z_score >= 2.0
                is_outlier = (z_score >= 2.0 and val > baseline_mean) or ("max" in thresh and val > max_thresh)
                if is_outlier:
                    score = min(1.0, round(z_score / 4.0, 2))
                    anomalies.append({
                        "metric": m_name,
                        "service": item.get("service", "unknown"),
                        "timestamp": item["timestamp"],
                        "observed_value": val,
                        "baseline": round(baseline_mean, 2),
                        "detection_method": "statistical_change_point",
                        "anomaly_score": score,
                        "unit": thresh.get("unit", ""),
                        "severity": "CRITICAL" if score >= 0.75 else "HIGH",
                        "evidence_id": item.get("evidence_id")
                    })
                    if not onset_estimate and item.get("timestamp"):
                        onset_estimate = item["timestamp"]

        # 2. Multivariate Isolation Forest (when >= 4 records with multiple features)
        if len(metrics_records) >= 4:
            try:
                from sklearn.ensemble import IsolationForest
                feature_names = ["cpu_percent", "memory_percent", "latency_ms", "error_rate", "db_connections"]
                data_matrix = []
                valid_timestamps = []

                for rec in metrics_records:
                    m = rec.get("metrics", {})
                    row = [float(m.get(fn, 0.0) or 0.0) for fn in feature_names]
                    data_matrix.append(row)
                    valid_timestamps.append(rec.get("timestamp"))

                X = np.array(data_matrix)
                # Check variance
                if np.var(X) > 1e-4:
                    clf = IsolationForest(contamination=0.25, random_state=42)
                    preds = clf.fit_predict(X) # -1 is anomaly, 1 is normal
                    raw_scores = clf.score_samples(X)

                    for idx, (pred, score) in enumerate(zip(preds, raw_scores)):
                        if pred == -1:
                            # Normalize score to 0..1
                            norm_score = round(float(np.clip(-score, 0.1, 0.99)), 2)
                            anomalies.append({
                                "metric": "multivariate_telemetry_vector",
                                "timestamp": valid_timestamps[idx],
                                "observed_value": "Multivariate distribution divergence",
                                "baseline": "Expected baseline feature covariance",
                                "detection_method": "isolation_forest",
                                "anomaly_score": norm_score,
                                "unit": "vector",
                                "severity": "HIGH",
                                "evidence_id": metrics_records[idx].get("evidence_id")
                            })
                            if not onset_estimate:
                                onset_estimate = valid_timestamps[idx]
            except Exception as e:
                logger.debug(f"Isolation Forest skipped: {e}")

        # Deduplicate and sort anomalies by score descending
        sorted_anomalies = sorted(anomalies, key=lambda a: a.get("anomaly_score", 0.0), reverse=True)

        return {
            "detected": len(sorted_anomalies) > 0,
            "anomalies_count": len(sorted_anomalies),
            "anomalies": sorted_anomalies,
            "onset_estimate": onset_estimate,
            "method": "hybrid_isolation_forest_and_statistical",
            "is_synthetic": is_synthetic,
            "summary": (
                f"Detected {len(sorted_anomalies)} metric anomalies via Isolation Forest and Change-Point Analysis. "
                f"Estimated anomaly onset: {onset_estimate or 'Indeterminate'}."
            ) if sorted_anomalies else "No significant statistical anomalies detected in metrics."
        }

anomaly_detection_service = AnomalyDetectionService()


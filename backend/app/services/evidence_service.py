import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
import pandas as pd
from app.config import settings

def get_data_dir() -> str:
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"),
        os.path.abspath("data"),
        os.path.abspath("backend/data")
    ]
    for c in candidates:
        if os.path.isdir(c) and os.path.exists(os.path.join(c, "incidents.csv")):
            return c
    return candidates[0]

class EvidenceService:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or get_data_dir()
        self._ensure_cache()

    def _ensure_cache(self):
        self.incidents_df = self._read_csv("incidents.csv")
        self.logs_df = self._read_csv("logs.csv")
        self.metrics_df = self._read_csv("metrics.csv")
        self.deployment_df = self._read_csv("deployment_history.csv")
        self.config_df = self._read_csv("configuration_changes.csv")
        self.dependencies_df = self._read_csv("service_dependencies.csv")
        self.traces_df = self._read_csv("traces.csv")
        self.post_recovery_df = self._read_csv("post_recovery_metrics.csv")
        self.firewall_df = self._read_csv("firewall_events.csv")
        self.net_interfaces_df = self._read_csv("network_interfaces.csv")
        self.historical_data = self._read_json("historical_incidents.json")
        self.network_diagnostics_data = self._read_json("network_diagnostics.json")

    def _read_csv(self, filename: str) -> pd.DataFrame:
        path = os.path.join(self.data_dir, filename)
        if os.path.exists(path):
            try:
                return pd.read_csv(path).fillna("")
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                return pd.DataFrame()
        return pd.DataFrame()

    def _read_json(self, filename: str) -> Any:
        path = os.path.join(self.data_dir, filename)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                return []
        return []

    # 1. search_logs
    def search_logs(
        self,
        incident_id: Optional[str] = None,
        service: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        severity: Optional[str] = None,
        keyword: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        df = self.logs_df.copy()
        if df.empty:
            return {"source": "logs", "total_records": 0, "records": []}

        if incident_id:
            df = df[df["incident_id"].astype(str).str.lower() == incident_id.lower()]
        if service:
            df = df[df["service"].astype(str).str.lower() == service.lower()]
        if severity:
            df = df[df["level"].astype(str).str.upper() == severity.upper()]
        if keyword:
            df = df[df["message"].astype(str).str.contains(keyword, case=False, na=False)]
        if start_time:
            df = df[df["timestamp"] >= start_time]
        if end_time:
            df = df[df["timestamp"] <= end_time]

        df = df.sort_values(by="timestamp", ascending=True).head(limit)
        records = []
        for _, row in df.iterrows():
            metadata = {}
            if row.get("metadata_json"):
                try:
                    metadata = json.loads(row["metadata_json"])
                except Exception:
                    metadata = {"raw": row["metadata_json"]}
            records.append({
                "evidence_id": row["evidence_id"],
                "timestamp": row["timestamp"],
                "service": row["service"],
                "level": row["level"],
                "message": row["message"],
                "incident_id": row["incident_id"],
                "metadata": metadata
            })

        return {"source": "logs", "total_records": len(records), "records": records}

    # 2. get_metrics
    def get_metrics(
        self,
        incident_id: Optional[str] = None,
        service: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        metric_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        df = self.metrics_df.copy()
        if df.empty:
            return {"source": "metrics", "total_records": 0, "records": []}

        if incident_id:
            df = df[df["incident_id"].astype(str).str.lower() == incident_id.lower()]
        if service:
            df = df[df["service"].astype(str).str.lower() == service.lower()]
        if start_time:
            df = df[df["timestamp"] >= start_time]
        if end_time:
            df = df[df["timestamp"] <= end_time]

        df = df.sort_values(by="timestamp", ascending=True)
        records = []
        for _, row in df.iterrows():
            item = {
                "evidence_id": row["evidence_id"],
                "timestamp": row["timestamp"],
                "service": row["service"],
                "incident_id": row["incident_id"]
            }
            all_metrics = {
                "cpu_percent": float(row.get("cpu_percent", 0) or 0),
                "memory_percent": float(row.get("memory_percent", 0) or 0),
                "latency_ms": float(row.get("latency_ms", 0) or 0),
                "error_rate": float(row.get("error_rate", 0) or 0),
                "db_connections": int(float(row.get("db_connections", 0) or 0))
            }
            if metric_names:
                item["metrics"] = {k: v for k, v in all_metrics.items() if k in metric_names}
            else:
                item["metrics"] = all_metrics
            records.append(item)

        return {"source": "metrics", "total_records": len(records), "records": records}

    # 3. get_deployment_history
    def get_deployment_history(
        self,
        service: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> Dict[str, Any]:
        df = self.deployment_df.copy()
        if df.empty:
            return {"source": "deployment_history", "total_records": 0, "records": []}

        if service:
            df = df[df["service"].astype(str).str.lower() == service.lower()]
        if start_time:
            df = df[df["deployed_at"] >= start_time]
        if end_time:
            df = df[df["deployed_at"] <= end_time]

        df = df.sort_values(by="deployed_at", ascending=False)
        records = []
        for _, row in df.iterrows():
            records.append({
                "evidence_id": row["evidence_id"],
                "service": row["service"],
                "version": row["version"],
                "previous_version": row["previous_version"],
                "deployed_at": row["deployed_at"],
                "deployed_by": row["deployed_by"],
                "status": row["status"],
                "commit_hash": row["commit_hash"],
                "changelog": row["changelog"]
            })

        return {"source": "deployment_history", "total_records": len(records), "records": records}

    # 4. get_configuration_changes
    def get_configuration_changes(
        self,
        service: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> Dict[str, Any]:
        df = self.config_df.copy()
        if df.empty:
            return {"source": "configuration_changes", "total_records": 0, "records": []}

        if service:
            df = df[df["service"].astype(str).str.lower() == service.lower()]
        if start_time:
            df = df[df["applied_at"] >= start_time]
        if end_time:
            df = df[df["applied_at"] <= end_time]

        df = df.sort_values(by="applied_at", ascending=False)
        records = []
        for _, row in df.iterrows():
            records.append({
                "evidence_id": row["evidence_id"],
                "service": row["service"],
                "parameter_name": row["parameter_name"],
                "previous_value": row["previous_value"],
                "new_value": row["new_value"],
                "applied_at": row["applied_at"],
                "applied_by": row["applied_by"],
                "change_source": row["change_source"]
            })

        return {"source": "configuration_changes", "total_records": len(records), "records": records}

    # 5. get_service_dependencies
    def get_service_dependencies(self, service: Optional[str] = None) -> Dict[str, Any]:
        df = self.dependencies_df.copy()
        if df.empty:
            return {"source": "service_dependencies", "total_records": 0, "records": []}

        if service:
            df = df[df["service"].astype(str).str.lower() == service.lower()]

        records = []
        for _, row in df.iterrows():
            records.append({
                "service": row["service"],
                "depends_on": row["depends_on"],
                "dependency_type": row["dependency_type"],
                "criticality": row["criticality"],
                "timeout_ms": int(row.get("timeout_ms", 3000) or 3000)
            })

        return {"source": "service_dependencies", "total_records": len(records), "records": records}

    # 6. get_traces
    def get_traces(
        self,
        service: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        df = self.traces_df.copy()
        if df.empty:
            return {"source": "traces", "total_records": 0, "records": []}

        if service:
            df = df[df["service"].astype(str).str.lower() == service.lower()]
        if start_time:
            df = df[df["timestamp"] >= start_time]
        if end_time:
            df = df[df["timestamp"] <= end_time]
        if status:
            if status == "error":
                df = df[df["status_code"].astype(str).str.startswith(("4", "5"))]
            elif status == "success":
                df = df[df["status_code"].astype(str).str.startswith("2")]

        df = df.sort_values(by="timestamp", ascending=True).head(limit)
        records = []
        for _, row in df.iterrows():
            records.append({
                "evidence_id": row["evidence_id"],
                "trace_id": row["trace_id"],
                "service": row["service"],
                "operation": row["operation"],
                "duration_ms": float(row.get("duration_ms", 0) or 0),
                "status_code": int(float(row.get("status_code", 200) or 200)),
                "timestamp": row["timestamp"],
                "error_message": row.get("error_message", "")
            })

        return {"source": "traces", "total_records": len(records), "records": records}

    # 7. search_historical_incidents
    def search_historical_incidents(
        self,
        service: Optional[str] = None,
        keywords: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        results = []
        for item in self.historical_data:
            match = True
            if service and item.get("service", "").lower() != service.lower():
                match = False
            if category and item.get("category", "").lower() != category.lower():
                match = False
            if keywords and match:
                k_lower = keywords.lower()
                text = f"{item.get('title', '')} {item.get('root_cause', '')} {' '.join(item.get('tags', []))}".lower()
                if k_lower not in text:
                    match = False
            if match:
                results.append(item)

        return {"source": "historical_incidents", "total_records": len(results[:limit]), "records": results[:limit]}

    # 8. get_incident_details
    def get_incident_details(self, incident_id: str) -> Dict[str, Any]:
        df = self.incidents_df
        if not df.empty:
            matches = df[df["id"].astype(str).str.lower() == incident_id.lower()]
            if not matches.empty:
                row = matches.iloc[0]
                return {
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "service": row["service"],
                    "environment": row["environment"],
                    "severity": row["severity"],
                    "category": row["category"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "started_at": row.get("started_at", "")
                }
        return {"error": f"Incident {incident_id} not found in dataset"}

    # 9. get_post_recovery_metrics
    def get_post_recovery_metrics(
        self,
        incident_id: Optional[str] = None,
        recovery_execution_id: Optional[str] = None
    ) -> Dict[str, Any]:
        df = self.post_recovery_df.copy()
        if df.empty:
            return {"source": "post_recovery_metrics", "total_records": 0, "records": []}

        if incident_id:
            df = df[df["incident_id"].astype(str).str.lower() == incident_id.lower()]
        if recovery_execution_id:
            df = df[df["recovery_execution_id"].astype(str).str.lower() == recovery_execution_id.lower()]

        records = []
        for _, row in df.iterrows():
            records.append({
                "recovery_execution_id": row["recovery_execution_id"],
                "incident_id": row["incident_id"],
                "service": row["service"],
                "timestamp": row["timestamp"],
                "metrics": {
                    "cpu_percent": float(row.get("cpu_percent", 0) or 0),
                    "memory_percent": float(row.get("memory_percent", 0) or 0),
                    "latency_ms": float(row.get("latency_ms", 0) or 0),
                    "error_rate": float(row.get("error_rate", 0) or 0),
                    "db_connections": int(float(row.get("db_connections", 0) or 0))
                },
                "status_evaluation": row.get("status_evaluation", "PASSED")
            })

        return {"source": "post_recovery_metrics", "total_records": len(records), "records": records}

    # 10. compare_metric_windows
    def compare_metric_windows(
        self,
        service: str,
        metric_name: str,
        before_window: List[float],
        after_window: List[float]
    ) -> Dict[str, Any]:
        if not before_window or not after_window:
            return {"error": "Both before_window and after_window arrays must have at least one numeric value"}

        before_mean = sum(before_window) / len(before_window)
        after_mean = sum(after_window) / len(after_window)
        diff = after_mean - before_mean
        pct_change = ((diff / before_mean) * 100) if before_mean != 0 else 0.0

        improved = False
        if metric_name in ["latency_ms", "error_rate", "cpu_percent", "memory_percent", "db_connections"]:
            improved = diff < 0
        else:
            improved = diff > 0

        return {
            "service": service,
            "metric": metric_name,
            "before_mean": round(before_mean, 4),
            "after_mean": round(after_mean, 4),
            "delta": round(diff, 4),
            "percentage_change": round(pct_change, 2),
            "improved": improved
        }

    # 11. calculate_metric_statistics
    def calculate_metric_statistics(
        self,
        metrics_data: List[float],
        metric_name: str
    ) -> Dict[str, Any]:
        if not metrics_data:
            return {"error": "metrics_data list is empty"}

        mean_val = sum(metrics_data) / len(metrics_data)
        min_val = min(metrics_data)
        max_val = max(metrics_data)

        is_anomalous = False
        anomaly_reason = "Within normal thresholds"
        if metric_name == "error_rate" and max_val > 0.05:
            is_anomalous = True
            anomaly_reason = f"Max error rate {max_val:.1%} exceeds 5% threshold"
        elif metric_name == "latency_ms" and max_val > 1000:
            is_anomalous = True
            anomaly_reason = f"Max latency {max_val:.0f}ms exceeds 1000ms threshold"
        elif metric_name == "cpu_percent" and max_val > 85:
            is_anomalous = True
            anomaly_reason = f"Max CPU {max_val:.1f}% exceeds 85% threshold"
        elif metric_name == "memory_percent" and max_val > 90:
            is_anomalous = True
            anomaly_reason = f"Max Memory {max_val:.1f}% exceeds 90% threshold"
        elif metric_name == "db_connections" and max_val >= 90:
            is_anomalous = True
            anomaly_reason = f"Max DB Connections {max_val} at or near pool capacity (>=90)"

        return {
            "metric": metric_name,
            "count": len(metrics_data),
            "mean": round(mean_val, 4),
            "min": round(min_val, 4),
            "max": round(max_val, 4),
            "is_anomalous": is_anomalous,
            "anomaly_reason": anomaly_reason
        }

    # 12. get_evidence_by_id
    def get_evidence_by_id(self, evidence_ids: List[str]) -> Dict[str, Any]:
        matched = []
        clean_ids = set(eid.strip() for eid in evidence_ids if eid and eid.strip())

        if not self.logs_df.empty:
            df = self.logs_df[self.logs_df["evidence_id"].isin(clean_ids)]
            for _, r in df.iterrows():
                matched.append({
                    "evidence_id": r["evidence_id"],
                    "source": "logs",
                    "timestamp": r["timestamp"],
                    "service": r["service"],
                    "summary": f"[{r['level']}] {r['message']}"
                })

        if not self.metrics_df.empty:
            df = self.metrics_df[self.metrics_df["evidence_id"].isin(clean_ids)]
            for _, r in df.iterrows():
                matched.append({
                    "evidence_id": r["evidence_id"],
                    "source": "metrics",
                    "timestamp": r["timestamp"],
                    "service": r["service"],
                    "summary": f"Metrics snapshot: CPU={r['cpu_percent']}%, Latency={r['latency_ms']}ms, Errors={r['error_rate']}, Connections={r['db_connections']}"
                })

        if not self.deployment_df.empty:
            df = self.deployment_df[self.deployment_df["evidence_id"].isin(clean_ids)]
            for _, r in df.iterrows():
                matched.append({
                    "evidence_id": r["evidence_id"],
                    "source": "deployment_history",
                    "timestamp": r["deployed_at"],
                    "service": r["service"],
                    "summary": f"Deployment {r['version']} (prev: {r['previous_version']}): {r['changelog']}"
                })

        if not self.config_df.empty:
            df = self.config_df[self.config_df["evidence_id"].isin(clean_ids)]
            for _, r in df.iterrows():
                matched.append({
                    "evidence_id": r["evidence_id"],
                    "source": "configuration_changes",
                    "timestamp": r["applied_at"],
                    "service": r["service"],
                    "summary": f"Config change {r['parameter_name']}: {r['previous_value']} -> {r['new_value']}"
                })

        if not self.traces_df.empty:
            df = self.traces_df[self.traces_df["evidence_id"].isin(clean_ids)]
            for _, r in df.iterrows():
                matched.append({
                    "evidence_id": r["evidence_id"],
                    "source": "traces",
                    "timestamp": r["timestamp"],
                    "service": r["service"],
                    "summary": f"Trace {r['trace_id']}: {r['operation']} returned {r['status_code']} in {r['duration_ms']}ms"
                })

        found_ids = set(m["evidence_id"] for m in matched)
        missing_ids = list(clean_ids - found_ids)

        return {
            "found_count": len(matched),
            "missing_count": len(missing_ids),
            "matched_evidence": matched,
            "missing_evidence_ids": missing_ids
        }

    # ==========================================
    # NETWORK DIAGNOSTIC TOOLS (Section 2.C & 2.D)
    # ==========================================

    # 13. check_dns_resolution
    def check_dns_resolution(self, domain: str, nameserver: Optional[str] = None) -> Dict[str, Any]:
        """Audits authoritative and local DNS query resolution, checking for SERVFAIL, NXDOMAIN, or latency."""
        clean_domain = domain.strip().lower()
        dns_records = self.network_diagnostics_data.get("dns_records", []) if isinstance(self.network_diagnostics_data, dict) else []

        for rec in dns_records:
            if rec.get("domain", "").lower() == clean_domain:
                status = rec.get("status", "SUCCESS")
                is_failed = status != "SUCCESS"
                return {
                    "source": "dns_diagnostics",
                    "domain": clean_domain,
                    "status": status,
                    "resolved_ips": rec.get("resolved_ips", []),
                    "response_time_ms": rec.get("response_time_ms", 1.5),
                    "nameserver_used": nameserver or rec.get("nameserver", "10.0.0.2"),
                    "is_anomalous": is_failed,
                    "error": rec.get("error"),
                    "summary": f"DNS resolution for '{clean_domain}': {status} ({rec.get('response_time_ms')}ms) -> {rec.get('resolved_ips') or rec.get('error')}"
                }

        # Default fallback for unlisted domains
        return {
            "source": "dns_diagnostics",
            "domain": clean_domain,
            "status": "SUCCESS",
            "resolved_ips": ["10.0.4.15"],
            "response_time_ms": 2.1,
            "nameserver_used": nameserver or "10.0.0.2",
            "is_anomalous": False,
            "summary": f"DNS resolution for '{clean_domain}': SUCCESS in 2.1ms -> [10.0.4.15]"
        }

    # 14. check_endpoint_connectivity
    def check_endpoint_connectivity(
        self,
        target_host: str,
        port: int = 80,
        protocol: str = "TCP",
        timeout_ms: int = 3000
    ) -> Dict[str, Any]:
        """Simulates synthetic socket connection probes to verify layer-4 handshake."""
        clean_host = target_host.strip().lower()
        # If target is email-gateway or payment-gateway-3p during an incident
        is_failing = "email-gateway" in clean_host or "external" in clean_host or port == 2525
        
        return {
            "source": "endpoint_connectivity",
            "target_host": clean_host,
            "port": port,
            "protocol": protocol,
            "reachable": not is_failing,
            "handshake_time_ms": 3050 if is_failing else 4.2,
            "error_state": "ETIMEDOUT / TCP_RST" if is_failing else None,
            "is_anomalous": is_failing,
            "summary": f"TCP probe to {clean_host}:{port} {'FAILED (Handshake Timed Out)' if is_failing else 'REACHABLE (4.2ms)'}"
        }

    # 15. analyze_network_latency
    def analyze_network_latency(
        self,
        source_service: str,
        destination_service: str,
        sample_count: int = 10
    ) -> Dict[str, Any]:
        """Examines round-trip time (RTT) distribution and jitter across service communications."""
        paths = self.network_diagnostics_data.get("path_diagnostics", []) if isinstance(self.network_diagnostics_data, dict) else []
        matched_path = next(
            (p for p in paths if p.get("source_service") == source_service and p.get("destination_service") == destination_service),
            None
        )

        avg_lat = matched_path.get("avg_latency_ms", 12.0) if matched_path else 2.5
        is_elevated = avg_lat > 100.0

        return {
            "source": "network_latency",
            "source_service": source_service,
            "destination_service": destination_service,
            "sample_count": sample_count,
            "avg_latency_ms": avg_lat,
            "min_latency_ms": round(avg_lat * 0.7, 1),
            "max_latency_ms": round(avg_lat * 1.6, 1),
            "jitter_ms": round(avg_lat * 0.25, 1),
            "is_anomalous": is_elevated,
            "summary": f"RTT from {source_service} to {destination_service}: avg {avg_lat}ms {'(HIGH LATENCY)' if is_elevated else '(Normal)'}"
        }

    # 16. analyze_packet_loss
    def analyze_packet_loss(
        self,
        source_service: Optional[str] = None,
        destination_service: Optional[str] = None,
        source: Optional[str] = None,
        destination: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Computes transmission packet loss percentage between two service components."""
        src = (source_service or source or "").strip().lower()
        dst = (destination_service or destination or "").strip().lower()

        paths = self.network_diagnostics_data.get("path_diagnostics", []) if isinstance(self.network_diagnostics_data, dict) else []
        matched = next(
            (p for p in paths if p.get("source_service", "").lower() == src and p.get("destination_service", "").lower() == dst),
            None
        )

        loss_pct = matched.get("packet_loss_pct", 0.0) if matched else 0.0
        # If testing payment-service to peering gateway
        if not matched and "payment" in src and "peering" in dst:
            loss_pct = 48.0
        is_critical = loss_pct >= 5.0

        return {
            "source": "packet_loss_analysis",
            "source_service": src,
            "destination_service": dst,
            "packet_loss_percent": loss_pct,
            "packet_loss_pct": loss_pct,
            "threshold_percent": 2.0,
            "is_anomalous": is_critical,
            "severity": "CRITICAL" if loss_pct >= 20.0 else ("HIGH" if loss_pct >= 5.0 else "NORMAL"),
            "summary": f"Packet loss between {src} and {dst}: {loss_pct}% {'(PACKET DROP SLA VIOLATION)' if is_critical else '(Clean)'}"
        }

    # 17. get_network_interface_statistics
    def get_network_interface_statistics(
        self,
        service: str,
        interface_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Audits NIC drops, ring buffer overruns, and frame errors from host interface counters."""
        df = self.net_interfaces_df
        records = []
        if not df.empty:
            matches = df[df["service"].astype(str).str.lower() == service.lower()]
            if interface_name:
                matches = matches[matches["interface_name"].astype(str).str.lower() == interface_name.lower()]
            for _, r in matches.iterrows():
                rx_dropped = int(float(r.get("rx_dropped", 0) or 0))
                records.append({
                    "evidence_id": r["evidence_id"],
                    "service": r["service"],
                    "interface_name": r["interface_name"],
                    "rx_bytes": int(float(r.get("rx_bytes", 0) or 0)),
                    "tx_bytes": int(float(r.get("tx_bytes", 0) or 0)),
                    "rx_dropped": rx_dropped,
                    "tx_dropped": int(float(r.get("tx_dropped", 0) or 0)),
                    "rx_errors": int(float(r.get("rx_errors", 0) or 0)),
                    "is_anomalous": rx_dropped > 500
                })

        return {
            "source": "network_interfaces",
            "service": service,
            "total_interfaces": len(records),
            "records": records,
            "summary": f"Interface audit for {service}: {len(records)} NIC counters inspected."
        }

    # 18. search_firewall_events
    def search_firewall_events(
        self,
        service: Optional[str] = None,
        source_ip: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Queries security group, iptables, and VPC firewall drop logs for blocked connections."""
        df = self.firewall_df
        if df.empty:
            return {"source": "firewall_events", "total_records": 0, "records": []}

        matches = df.copy()
        if service:
            matches = matches[matches["service"].astype(str).str.lower() == service.lower()]
        if source_ip:
            matches = matches[matches["source_ip"].astype(str) == source_ip]
        if action:
            matches = matches[matches["action"].astype(str).str.upper() == action.upper()]

        matches = matches.head(limit)
        records = []
        for _, r in matches.iterrows():
            records.append({
                "evidence_id": r["evidence_id"],
                "timestamp": r["timestamp"],
                "service": r["service"],
                "source_ip": r["source_ip"],
                "destination_ip": r["destination_ip"],
                "port": int(float(r.get("port", 0) or 0)),
                "action": r["action"],
                "rule_id": r["rule_id"],
                "reason": r["reason"]
            })

        drops_count = len([rec for rec in records if rec["action"] == "DROP"])
        return {
            "source": "firewall_events",
            "total_records": len(records),
            "drops_detected": drops_count > 0,
            "records": records,
            "summary": f"Firewall event audit: {len(records)} events inspected ({drops_count} DROP actions recorded)."
        }

    # 19. inspect_routing_information
    def inspect_routing_information(
        self,
        source_service: str,
        destination_ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """Inspects VPC routing tables, peering routes, and MTU configuration."""
        is_fragmented = "notification" in source_service.lower() or "payment" in source_service.lower()
        return {
            "source": "routing_information",
            "source_service": source_service,
            "destination_ip": destination_ip or "10.240.12.8",
            "route_table_id": "rtb-07b14299c",
            "gateway_type": "vpc-peering-connection",
            "path_mtu": 1420 if is_fragmented else 9000,
            "mtu_mismatch_detected": is_fragmented,
            "next_hop": "pcx-04821a9 (VPC Peering East-to-Central)",
            "summary": f"Route inspection for {source_service}: {'PATH MTU MISMATCH (1420 vs 9000 bytes) causing packet fragmentation' if is_fragmented else 'Route optimal, 9000 MTU'}"
        }

    # 20. analyze_tcp_connection_errors
    def analyze_tcp_connection_errors(
        self,
        service: str,
        error_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Audits TCP handshake errors, SYN retransmits, RST bursts, and socket timeouts."""
        tcp_errors = self.network_diagnostics_data.get("tcp_connection_errors", []) if isinstance(self.network_diagnostics_data, dict) else []
        matches = [e for e in tcp_errors if e.get("service", "").lower() == service.lower()]
        if error_type:
            matches = [e for e in matches if e.get("error_type") == error_type]

        total_errors = sum(m.get("count", 0) for m in matches)
        return {
            "source": "tcp_connection_diagnostics",
            "service": service,
            "total_tcp_errors": total_errors,
            "error_records": matches,
            "is_anomalous": total_errors > 50,
            "summary": f"TCP diagnostics for {service}: {total_errors} connection abort/reset/timeout events detected."
        }

    # 21. get_network_path_diagnostics
    def get_network_path_diagnostics(
        self,
        source_service: str,
        destination_service: str
    ) -> Dict[str, Any]:
        """End-to-end hop-by-hop traceroute and bottleneck hop identification."""
        paths = self.network_diagnostics_data.get("path_diagnostics", []) if isinstance(self.network_diagnostics_data, dict) else []
        matched = next(
            (p for p in paths if p.get("source_service") == source_service and p.get("destination_service") == destination_service),
            None
        )

        if matched:
            return {
                "source": "network_path_diagnostics",
                "source_service": source_service,
                "destination_service": destination_service,
                "status": matched.get("status", "HEALTHY"),
                "hop_count": matched.get("hop_count", 3),
                "avg_latency_ms": matched.get("avg_latency_ms", 5.0),
                "packet_loss_pct": matched.get("packet_loss_pct", 0.0),
                "bottleneck_hop": matched.get("bottleneck_hop"),
                "mtu_bytes": matched.get("mtu_bytes", 9000),
                "summary": f"Network path {source_service} -> {destination_service}: Status {matched.get('status')} | Bottleneck: {matched.get('bottleneck_hop') or 'None'}"
            }

        return {
            "source": "network_path_diagnostics",
            "source_service": source_service,
            "destination_service": destination_service,
            "status": "HEALTHY",
            "hop_count": 2,
            "avg_latency_ms": 1.2,
            "packet_loss_pct": 0.0,
            "bottleneck_hop": None,
            "mtu_bytes": 9000,
            "summary": f"Network path {source_service} -> {destination_service}: HEALTHY (1.2ms, 0% drop)"
        }

    def check_interface_mtu(self, service: str, interface_name: Optional[str] = None) -> Dict[str, Any]:
        """Audits MTU configuration across network interfaces and routing paths."""
        routing_info = self.inspect_routing_information(source_service=service)
        mtu_val = routing_info.get("path_mtu", 1400 if "notification" in service.lower() else 1500)
        return {
            "source": "interface_mtu",
            "service": service,
            "total_records": 1,
            "records": [{"interface": "eth0", "mtu": mtu_val, "status": "ACTIVE"}],
            "mtu": mtu_val,
            "mtu_mismatch": routing_info.get("mtu_mismatch_detected", False),
            "routing_info": routing_info
        }

    def inspect_firewall_rules(self, service: Optional[str] = None) -> Dict[str, Any]:
        """Inspects firewall and security group drop rules."""
        return self.search_firewall_events(service=service)

evidence_service = EvidenceService()

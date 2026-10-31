from typing import Dict, Any, List
from app.services.evidence_service import evidence_service

# Full Diagnostic Tool Registry (21 tools: 12 General Operations + 9 Network Diagnostics)
TOOL_DEFINITIONS = [
    # General Operations
    {
        "name": "search_logs",
        "description": "Search system, application, and gateway logs for errors, warnings, stack traces, and relevant keywords.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "incident_id": {"type": "STRING", "description": "Optional incident ID to filter logs (e.g. INC-2026-001)"},
                "service": {"type": "STRING", "description": "Microservice name (e.g. checkout-service, orders-service)"},
                "severity": {"type": "STRING", "description": "Log level filter: ERROR, WARN, INFO"},
                "keyword": {"type": "STRING", "description": "Search keyword like timeout, exception, pool, memory"},
                "limit": {"type": "INTEGER", "description": "Maximum number of log lines to return (default 20)"}
            }
        }
    },
    {
        "name": "get_metrics",
        "description": "Retrieve time-series performance metrics: cpu_percent, memory_percent, latency_ms, error_rate, and db_connections.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "incident_id": {"type": "STRING", "description": "Incident ID to filter metrics (e.g. INC-2026-001)"},
                "service": {"type": "STRING", "description": "Service name to fetch metrics for"},
                "metric_names": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"},
                    "description": "Optional list of metric names like ['latency_ms', 'error_rate']"
                }
            }
        }
    },
    {
        "name": "get_deployment_history",
        "description": "Retrieve recent software release deployments, version changes, commit hashes, and changelogs.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name to check deployments for"}
            }
        }
    },
    {
        "name": "get_configuration_changes",
        "description": "Retrieve recent runtime configuration, feature flag, and parameter changes.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name to check configuration updates for"}
            }
        }
    },
    {
        "name": "get_service_dependencies",
        "description": "Retrieve upstream and downstream architectural dependencies, call types, and timeout thresholds.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name to inspect dependencies for"}
            }
        }
    },
    {
        "name": "get_traces",
        "description": "Retrieve distributed APM trace spans with HTTP status codes, durations, and errors.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name"},
                "status": {"type": "STRING", "description": "Filter by 'error' or 'success'"},
                "limit": {"type": "INTEGER", "description": "Maximum traces to retrieve"}
            }
        }
    },
    {
        "name": "search_historical_incidents",
        "description": "Find previously resolved similar incidents, known root causes, and verified recovery procedures.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name"},
                "keywords": {"type": "STRING", "description": "Keywords related to symptoms or errors"},
                "category": {"type": "STRING", "description": "Incident category filter"}
            }
        }
    },
    {
        "name": "calculate_metric_statistics",
        "description": "Compute mean, minimum, maximum, and anomaly flags for a series of metric numbers.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "metrics_data": {
                    "type": "ARRAY",
                    "items": {"type": "NUMBER"},
                    "description": "List of numeric values"
                },
                "metric_name": {"type": "STRING", "description": "Name of the metric (e.g. latency_ms, error_rate)"}
            },
            "required": ["metrics_data", "metric_name"]
        }
    },
    {
        "name": "compare_metric_windows",
        "description": "Compare baseline before-window metrics with incident after-window metrics.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name"},
                "metric_name": {"type": "STRING", "description": "Metric name"},
                "before_window": {"type": "ARRAY", "items": {"type": "NUMBER"}, "description": "Baseline window values"},
                "after_window": {"type": "ARRAY", "items": {"type": "NUMBER"}, "description": "Post-onset window values"}
            },
            "required": ["service", "metric_name", "before_window", "after_window"]
        }
    },
    {
        "name": "get_evidence_by_id",
        "description": "Fetch verified evidence details for a given list of evidence IDs.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "evidence_ids": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"},
                    "description": "List of evidence IDs to look up (e.g. ['EV-LOG-103', 'EV-MET-104'])"
                }
            },
            "required": ["evidence_ids"]
        }
    },
    {
        "name": "get_incident_details",
        "description": "Retrieve comprehensive incident intake details and observed initial symptoms.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "incident_id": {"type": "STRING", "description": "Unique incident ID"}
            },
            "required": ["incident_id"]
        }
    },
    {
        "name": "get_post_recovery_metrics",
        "description": "Retrieve fresh telemetry observations collected after recovery simulation.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "incident_id": {"type": "STRING", "description": "Incident ID"},
                "recovery_execution_id": {"type": "STRING", "description": "Optional execution ID"}
            }
        }
    },

    # Network Diagnostics (Section 2.C & 2.D)
    {
        "name": "check_dns_resolution",
        "description": "Test DNS domain name resolution, query latency, authoritative nameserver responses, and SERVFAIL/NXDOMAIN errors.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "domain": {"type": "STRING", "description": "Target hostname or FQDN to resolve"},
                "nameserver": {"type": "STRING", "description": "Optional nameserver IP to query"}
            },
            "required": ["domain"]
        }
    },
    {
        "name": "check_endpoint_connectivity",
        "description": "Perform synthetic TCP/UDP socket handshake probe to test layer-4 reachability.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "target_host": {"type": "STRING", "description": "Target hostname or IP"},
                "port": {"type": "INTEGER", "description": "Port number (e.g. 80, 443, 2525)"},
                "protocol": {"type": "STRING", "description": "TCP or UDP"},
                "timeout_ms": {"type": "INTEGER", "description": "Timeout threshold in milliseconds"}
            },
            "required": ["target_host"]
        }
    },
    {
        "name": "analyze_network_latency",
        "description": "Measure network round-trip time (RTT), jitter, and latency variance between two microservices.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "source_service": {"type": "STRING", "description": "Calling service name"},
                "destination_service": {"type": "STRING", "description": "Target dependency service name"},
                "sample_count": {"type": "INTEGER", "description": "Number of probe samples (default 10)"}
            },
            "required": ["source_service", "destination_service"]
        }
    },
    {
        "name": "analyze_packet_loss",
        "description": "Determine network packet drop percentage across VPC peering and inter-subnet routes.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "source_service": {"type": "STRING", "description": "Source service"},
                "destination_service": {"type": "STRING", "description": "Destination service"}
            },
            "required": ["source_service", "destination_service"]
        }
    },
    {
        "name": "get_network_interface_statistics",
        "description": "Inspect network interface card (NIC) counters for dropped frames, ring buffer overruns, and TX/RX errors.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Host service name"},
                "interface_name": {"type": "STRING", "description": "Optional interface name like eth0"}
            },
            "required": ["service"]
        }
    },
    {
        "name": "search_firewall_events",
        "description": "Search security group, iptables, and VPC firewall logs for blocked or dropped traffic events.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name filter"},
                "source_ip": {"type": "STRING", "description": "Source IP address filter"},
                "action": {"type": "STRING", "description": "Action filter: DROP or ALLOW"},
                "limit": {"type": "INTEGER", "description": "Maximum records to return"}
            }
        }
    },
    {
        "name": "inspect_routing_information",
        "description": "Audit VPC routing tables, MTU configuration, and next-hop gateway definitions for packet fragmentation.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "source_service": {"type": "STRING", "description": "Calling service name"},
                "destination_ip": {"type": "STRING", "description": "Destination IP address"}
            },
            "required": ["source_service"]
        }
    },
    {
        "name": "analyze_tcp_connection_errors",
        "description": "Inspect TCP handshake aborts, SYN retransmission loops, and RST burst anomalies.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "service": {"type": "STRING", "description": "Service name"},
                "error_type": {"type": "STRING", "description": "Error filter like TCP_RST_BURST or ETIMEDOUT"}
            },
            "required": ["service"]
        }
    },
    {
        "name": "get_network_path_diagnostics",
        "description": "Traceroute network path hop-by-hop and pinpoint bottleneck routers or peering links.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "source_service": {"type": "STRING", "description": "Source service"},
                "destination_service": {"type": "STRING", "description": "Destination service"}
            },
            "required": ["source_service", "destination_service"]
        }
    }
]

def execute_tool_call(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Safe, typed tool dispatch executor ensuring validation and bounded size."""
    try:
        # General Operations
        if tool_name == "search_logs":
            return evidence_service.search_logs(
                incident_id=arguments.get("incident_id"),
                service=arguments.get("service"),
                severity=arguments.get("severity"),
                keyword=arguments.get("keyword"),
                limit=min(100, arguments.get("limit", 20))
            )
        elif tool_name == "get_metrics":
            return evidence_service.get_metrics(
                incident_id=arguments.get("incident_id"),
                service=arguments.get("service"),
                metric_names=arguments.get("metric_names")
            )
        elif tool_name == "get_deployment_history":
            return evidence_service.get_deployment_history(service=arguments.get("service"))
        elif tool_name == "get_configuration_changes":
            return evidence_service.get_configuration_changes(service=arguments.get("service"))
        elif tool_name == "get_service_dependencies":
            return evidence_service.get_service_dependencies(service=arguments.get("service"))
        elif tool_name == "get_traces":
            return evidence_service.get_traces(
                service=arguments.get("service"),
                status=arguments.get("status"),
                limit=min(100, arguments.get("limit", 20))
            )
        elif tool_name == "search_historical_incidents":
            return evidence_service.search_historical_incidents(
                service=arguments.get("service"),
                keywords=arguments.get("keywords"),
                category=arguments.get("category"),
                limit=min(20, arguments.get("limit", 5))
            )
        elif tool_name == "calculate_metric_statistics":
            return evidence_service.calculate_metric_statistics(
                metrics_data=arguments.get("metrics_data", []),
                metric_name=arguments.get("metric_name", "unknown")
            )
        elif tool_name == "compare_metric_windows":
            return evidence_service.compare_metric_windows(
                service=arguments.get("service", "unknown"),
                metric_name=arguments.get("metric_name", "unknown"),
                before_window=arguments.get("before_window", []),
                after_window=arguments.get("after_window", [])
            )
        elif tool_name == "get_evidence_by_id":
            return evidence_service.get_evidence_by_id(evidence_ids=arguments.get("evidence_ids", []))
        elif tool_name == "get_incident_details":
            return evidence_service.get_incident_details(incident_id=arguments.get("incident_id", ""))
        elif tool_name == "get_post_recovery_metrics":
            return evidence_service.get_post_recovery_metrics(
                incident_id=arguments.get("incident_id"),
                recovery_execution_id=arguments.get("recovery_execution_id")
            )

        # Network Diagnostics
        elif tool_name == "check_dns_resolution":
            return evidence_service.check_dns_resolution(
                domain=arguments.get("domain", ""),
                nameserver=arguments.get("nameserver")
            )
        elif tool_name == "check_endpoint_connectivity":
            return evidence_service.check_endpoint_connectivity(
                target_host=arguments.get("target_host", ""),
                port=arguments.get("port", 80),
                protocol=arguments.get("protocol", "TCP"),
                timeout_ms=arguments.get("timeout_ms", 3000)
            )
        elif tool_name == "analyze_network_latency":
            return evidence_service.analyze_network_latency(
                source_service=arguments.get("source_service", ""),
                destination_service=arguments.get("destination_service", ""),
                sample_count=arguments.get("sample_count", 10)
            )
        elif tool_name == "analyze_packet_loss":
            return evidence_service.analyze_packet_loss(
                source_service=arguments.get("source_service", ""),
                destination_service=arguments.get("destination_service", "")
            )
        elif tool_name == "get_network_interface_statistics":
            return evidence_service.get_network_interface_statistics(
                service=arguments.get("service", ""),
                interface_name=arguments.get("interface_name")
            )
        elif tool_name == "search_firewall_events":
            return evidence_service.search_firewall_events(
                service=arguments.get("service"),
                source_ip=arguments.get("source_ip"),
                action=arguments.get("action"),
                limit=min(100, arguments.get("limit", 20))
            )
        elif tool_name == "inspect_routing_information":
            return evidence_service.inspect_routing_information(
                source_service=arguments.get("source_service", ""),
                destination_ip=arguments.get("destination_ip")
            )
        elif tool_name == "analyze_tcp_connection_errors":
            return evidence_service.analyze_tcp_connection_errors(
                service=arguments.get("service", ""),
                error_type=arguments.get("error_type")
            )
        elif tool_name == "get_network_path_diagnostics":
            return evidence_service.get_network_path_diagnostics(
                source_service=arguments.get("source_service", ""),
                destination_service=arguments.get("destination_service", "")
            )
        else:
            return {"error": f"Unknown diagnostic tool: '{tool_name}'"}
    except Exception as e:
        return {"error": f"Diagnostic tool execution error for '{tool_name}': {str(e)}"}

import networkx as nx
from typing import List, Dict, Any, Optional, Set
import os
import pandas as pd
from app.services.evidence_service import get_data_dir

class DependencyGraphService:
    """
    Dependency topology graph analysis using NetworkX.
    Maps microservices, databases, third-party providers, and network gateways.
    Provides upstream failure tracing and downstream blast radius evaluation.
    """

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or get_data_dir()
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        dep_path = os.path.join(self.data_dir, "service_dependencies.csv")
        self.graph.clear()

        # Add predefined nodes with category types
        nodes_meta = {
            "checkout-service": {"type": "API_SERVICE", "tier": 1},
            "orders-service": {"type": "BACKEND_SERVICE", "tier": 2},
            "billing-service": {"type": "BACKEND_SERVICE", "tier": 2},
            "inventory-service": {"type": "BACKEND_SERVICE", "tier": 2},
            "notification-service": {"type": "ASYNC_WORKER", "tier": 3},
            "search-service": {"type": "SEARCH_ENGINE", "tier": 2},
            "reporting-service": {"type": "BATCH_WORKER", "tier": 3},
            "auth-service": {"type": "IDENTITY_SERVICE", "tier": 1},
            "orders-postgres-db": {"type": "DATABASE", "tier": 4},
            "inventory-redis-cache": {"type": "CACHE", "tier": 3},
            "elasticsearch-cluster": {"type": "SEARCH_CLUSTER", "tier": 3},
            "email-gateway": {"type": "NETWORK_GATEWAY", "tier": 4},
            "payment-gateway-3p": {"type": "THIRD_PARTY_API", "tier": 4},
            "external-auth-provider": {"type": "THIRD_PARTY_IDP", "tier": 4}
        }

        for node_id, meta in nodes_meta.items():
            self.graph.add_node(node_id, **meta)

        if os.path.exists(dep_path):
            try:
                df = pd.read_csv(dep_path).fillna("")
                for _, row in df.iterrows():
                    u = str(row["service"]).strip()
                    v = str(row["depends_on"]).strip()
                    if u and v:
                        self.graph.add_edge(
                            u, v,
                            dependency_type=str(row.get("dependency_type", "HTTP_REST")),
                            criticality=str(row.get("criticality", "MEDIUM")),
                            timeout_ms=int(float(row.get("timeout_ms", 3000) or 3000))
                        )
            except Exception as e:
                print(f"Error building dependency graph: {e}")

    def get_downstream_blast_radius(self, target_service: str) -> Dict[str, Any]:
        """
        Identifies all caller services that depend on target_service (in-degree traversal).
        If target_service fails, these downstream callers suffer degradation.
        """
        target = target_service.lower()
        if target not in self.graph:
            return {
                "service": target_service,
                "affected_services": [],
                "blast_radius_score": 0.1,
                "total_affected": 0
            }

        # Invert graph to find callers that depend on target
        rev_graph = self.graph.reverse(copy=True)
        affected = set()
        try:
            for node in nx.descendants(rev_graph, target):
                affected.add(node)
        except Exception:
            pass

        # Calculate blast radius impact score
        impact = min(1.0, 0.2 + (len(affected) * 0.2))

        return {
            "service": target_service,
            "affected_services": list(affected),
            "total_affected": len(affected),
            "blast_radius_score": round(impact, 2),
            "explanation": f"A failure in {target_service} cascades to {len(affected)} upstream/caller service(s): {', '.join(affected) if affected else 'Isolated leaf'}"
        }

    def get_upstream_failure_sources(self, service: str) -> Dict[str, Any]:
        """
        Traverses outbound edges to identify dependencies that could cause service to fail.
        """
        target = service.lower()
        if target not in self.graph:
            return {"service": service, "dependencies": [], "dependency_count": 0}

        deps = []
        try:
            for n in nx.descendants(self.graph, target):
                edge_data = self.graph.get_edge_data(target, n) or {}
                meta = self.graph.nodes.get(n, {})
                deps.append({
                    "service": n,
                    "type": meta.get("type", "UNKNOWN"),
                    "dependency_type": edge_data.get("dependency_type", "HTTP_REST"),
                    "criticality": edge_data.get("criticality", "MEDIUM"),
                    "timeout_ms": edge_data.get("timeout_ms", 3000)
                })
        except Exception:
            pass

        return {
            "service": service,
            "dependencies": deps,
            "dependency_count": len(deps)
        }

    def get_upstream_dependencies(self, service: str) -> Dict[str, Any]:
        """Alias for get_upstream_failure_sources"""
        return self.get_upstream_failure_sources(service)

    def find_shared_dependencies(self, service_list: List[str]) -> List[str]:
        """Identifies single-point-of-failure dependencies shared between multiple degraded services."""
        if len(service_list) < 2:
            return []

        dep_sets = []
        for s in service_list:
            s_clean = s.lower()
            if s_clean in self.graph:
                try:
                    deps = set(nx.descendants(self.graph, s_clean))
                    dep_sets.append(deps)
                except Exception:
                    pass

        if not dep_sets:
            return []

        common = set.intersection(*dep_sets)
        return list(common)

    def get_graph_topology(self) -> Dict[str, Any]:
        """Returns nodes and edges for UI visualization."""
        nodes = []
        for n, data in self.graph.nodes(data=True):
            nodes.append({
                "id": n,
                "label": n,
                "type": data.get("type", "SERVICE"),
                "tier": data.get("tier", 2)
            })

        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "dependency_type": data.get("dependency_type", "HTTP_REST"),
                "criticality": data.get("criticality", "MEDIUM"),
                "timeout_ms": data.get("timeout_ms", 3000)
            })

        return {"nodes": nodes, "edges": edges}

dependency_graph_service = DependencyGraphService()


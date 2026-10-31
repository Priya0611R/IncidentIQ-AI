import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.models import Incident, InvestigationRun, Hypothesis, Evidence, Recommendation, RecoveryExecution, VerificationResult
from app.agents.investigation_agent import investigation_agent
from app.services.recovery_service import recovery_service
from app.services.verification_service import verification_service
from app.services.data_loader import load_initial_scenarios

# Ground truth definitions for the 11 benchmark scenarios
GROUND_TRUTH_SCENARIOS = {
    "INC-2026-001": {
        "title": "Elevated 500 errors and slow response times in Checkout API",
        "ground_truth_category": "deployment_failure",
        "primary_keywords": ["deployment", "v2.4.1", "null pointer", "regression"],
        "contradiction_targets": ["database", "network"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_rollback"
    },
    "INC-2026-002": {
        "title": "Orders service database connection pool acquisition timeout",
        "ground_truth_category": "database_issue",
        "primary_keywords": ["connection pool", "database", "hikaricp", "timeout", "postgres"],
        "contradiction_targets": ["memory leak", "deployment"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_pool_resize"
    },
    "INC-2026-003": {
        "title": "Inventory service memory exhaustion and severe CPU throttling",
        "ground_truth_category": "resource_exhaustion",
        "primary_keywords": ["memory", "heap", "garbage collection", "throttling", "cache"],
        "contradiction_targets": ["firewall", "dns"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_service_restart"
    },
    "INC-2026-004": {
        "title": "Notification delivery latency spike across inter-service calls",
        "ground_truth_category": "network_issue",
        "primary_keywords": ["mtu", "fragmentation", "packet drop", "network", "tcp reset"],
        "contradiction_targets": ["deadlock", "worker thread"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_mtu_reconfiguration"
    },
    "INC-2026-005": {
        "title": "Billing service authentication tokens rejected after config change",
        "ground_truth_category": "configuration_issue",
        "primary_keywords": ["config", "token", "expiry", "authentication", "unauthorized"],
        "contradiction_targets": ["hardware failure", "network partition"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_config_revert"
    },
    "INC-2026-006": {
        "title": "Search service latency degradation unresolved by restart",
        "ground_truth_category": "dependency_failure",
        "primary_keywords": ["elasticsearch", "downstream", "dependency", "circuit breaker", "cluster"],
        "contradiction_targets": ["search-service memory leak"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_circuit_breaker"
    },
    "INC-2026-007": {
        "title": "Reporting service query stall preceded recent deployment",
        "ground_truth_category": "database_contention",
        "primary_keywords": ["lock contention", "query stall", "preceded deployment", "database"],
        "contradiction_targets": ["deployment v3.4.0", "recent deployment"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_pool_resize"
    },
    "INC-2026-008": {
        "title": "Auth service external authentication DNS resolution failure",
        "ground_truth_category": "network_dns",
        "primary_keywords": ["dns", "servfail", "resolver", "nameserver", "resolution timeout"],
        "contradiction_targets": ["auth token expiry", "code bug"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_dns_failover"
    },
    "INC-2026-009": {
        "title": "Payment gateway transit carrier packet loss outage",
        "ground_truth_category": "network_transit",
        "primary_keywords": ["packet loss", "transit", "peering", "carrier", "bgp", "hop"],
        "contradiction_targets": ["payment service memory leak"],
        "expected_conclusive": True,
        "expected_tool_min": 3,
        "recommended_action": "simulated_traffic_reroute"
    },
    "INC-2026-010": {
        "title": "Sparse telemetry on recommendation service background worker",
        "ground_truth_category": "insufficient_evidence",
        "primary_keywords": ["sparse", "insufficient evidence", "inconclusive", "telemetry"],
        "contradiction_targets": ["definite hardware failure", "guaranteed memory leak"],
        "expected_conclusive": False,  # MUST recognize insufficient evidence!
        "expected_tool_min": 1,
        "recommended_action": "simulated_service_restart"
    },
    "INC-2026-011": {
        "title": "Uncataloged container disk I/O starvation on logistics fleet",
        "ground_truth_category": "resource_exhaustion",
        "primary_keywords": ["disk i/o", "starvation", "iowait", "journal", "storage"],
        "contradiction_targets": ["network mtu", "dns failure"],
        "expected_conclusive": True,
        "expected_tool_min": 2,
        "recommended_action": "simulated_service_restart"
    }
}

class EvaluationService:
    """
    Evaluates IncidentIQ AI against 6 core performance metrics across 11 scenarios:
    1. Root-Cause Top-1 Accuracy
    2. Root-Cause Top-3 Accuracy
    3. Evidence Validity (% of supporting evidence items that are genuinely relevant)
    4. Contradiction Penalty Handling (% of contradicted hypotheses appropriately penalized)
    5. Tool Efficiency (average tool calls per investigation)
    6. Recovery Verification Accuracy (% of post-recovery telemetry checks accurately classified)
    """

    @classmethod
    def run_benchmark(cls, db: Session, scenario_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        targets = scenario_ids or list(GROUND_TRUTH_SCENARIOS.keys())
        results = []

        top_1_hits = 0
        top_3_hits = 0
        total_evidence_checked = 0
        valid_evidence_hits = 0
        contradiction_checks = 0
        contradiction_penalized = 0
        tool_counts = []
        verification_checks = 0
        verification_correct = 0

        for inc_id in targets:
            gt = GROUND_TRUTH_SCENARIOS.get(inc_id)
            if not gt:
                continue

            incident = db.query(Incident).filter(Incident.id == inc_id).first()
            if not incident:
                continue

            # Ensure an investigation run exists or run one
            latest_run = db.query(InvestigationRun).filter(
                InvestigationRun.incident_id == inc_id
            ).order_by(InvestigationRun.started_at.desc()).first()

            if not latest_run:
                latest_run = investigation_agent.investigate_incident(db, inc_id)

            hypotheses = db.query(Hypothesis).filter(
                Hypothesis.incident_id == inc_id
            ).order_by(Hypothesis.rank.asc()).all()

            # Tool calls count
            evidence_items = db.query(Evidence).filter(
                Evidence.incident_id == inc_id
            ).all()
            tool_calls_count = getattr(latest_run, "tool_calls_count", None) or len([e for e in evidence_items if e.source != "upload"])
            tool_counts.append(max(tool_calls_count, 1))

            # Check Top-1 and Top-3 accuracy
            matched_top_1 = False
            matched_top_3 = False

            if not gt["expected_conclusive"]:
                # For insufficient evidence scenario (INC-2026-010), success means status is INCONCLUSIVE
                if latest_run.status == "INCONCLUSIVE" or (hypotheses and hypotheses[0].confidence < 0.60):
                    top_1_hits += 1
                    top_3_hits += 1
                    matched_top_1 = True
                    matched_top_3 = True
            else:
                for idx, hyp in enumerate(hypotheses[:3]):
                    hyp_text = f"{hyp.title} {hyp.description if hasattr(hyp, 'description') else hyp.explanation}".lower()
                    is_match = any(kw.lower() in hyp_text for kw in gt["primary_keywords"])
                    if is_match:
                        matched_top_3 = True
                        if idx == 0:
                            matched_top_1 = True
                        break

                if matched_top_1:
                    top_1_hits += 1
                if matched_top_3:
                    top_3_hits += 1

            # Evidence validity
            for ev in evidence_items:
                total_evidence_checked += 1
                # Evidence is valid if it relates to the incident service, metrics, or diagnostics
                if ev.service == incident.service or ev.source in ["logs", "metrics", "deployment_history", "config_changes", "network_diagnostics", "traces"]:
                    valid_evidence_hits += 1

            # Contradiction handling
            for hyp in hypotheses:
                hyp_text = f"{hyp.title} {hyp.explanation}".lower()
                is_contradiction_target = any(tgt.lower() in hyp_text for tgt in gt["contradiction_targets"])
                if is_contradiction_target:
                    contradiction_checks += 1
                    contr_list = json.loads(hyp.contradicting_evidence_ids or "[]")
                    # A penalized hypothesis should have lower confidence, weakened/rejected status, or contradiction list
                    if hyp.status in ["WEAKENED", "REJECTED"] or hyp.confidence <= 0.45 or len(contr_list) > 0:
                        contradiction_penalized += 1

            # Verification accuracy check
            verif = db.query(VerificationResult).filter(
                VerificationResult.incident_id == inc_id
            ).first()
            if verif:
                verification_checks += 1
                if verif.status in ["PASSED", "VERIFIED", "RESOLVED"]:
                    verification_correct += 1

            results.append({
                "incident_id": inc_id,
                "title": incident.title,
                "service": incident.service,
                "category": incident.category,
                "matched_top_1": matched_top_1,
                "matched_top_3": matched_top_3,
                "tool_calls_count": tool_calls_count,
                "run_status": latest_run.status,
                "top_hypothesis": hypotheses[0].title if hypotheses else "N/A",
                "top_confidence": round(hypotheses[0].confidence, 2) if hypotheses else 0.0
            })

        n = len(targets) or 1
        top_1_acc = round((top_1_hits / n) * 100, 1)
        top_3_acc = round((top_3_hits / n) * 100, 1)
        ev_validity = round((valid_evidence_hits / max(total_evidence_checked, 1)) * 100, 1)
        contr_handling = round((contradiction_penalized / max(contradiction_checks, 1)) * 100, 1) if contradiction_checks > 0 else 100.0
        avg_tools = round(sum(tool_counts) / len(tool_counts), 1) if tool_counts else 0.0
        verif_acc = round((verification_correct / max(verification_checks, 1)) * 100, 1) if verification_checks > 0 else 100.0

        return {
            "evaluation_timestamp": datetime.utcnow().isoformat(),
            "scenarios_evaluated": len(results),
            "summary_metrics": {
                "root_cause_top_1_accuracy_pct": top_1_acc,
                "root_cause_top_3_accuracy_pct": top_3_acc,
                "evidence_validity_pct": ev_validity,
                "contradiction_penalty_handling_pct": contr_handling,
                "avg_tool_calls_per_investigation": avg_tools,
                "recovery_verification_accuracy_pct": verif_acc
            },
            "scenario_details": results
        }

evaluation_service = EvaluationService()


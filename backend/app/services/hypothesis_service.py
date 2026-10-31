import math
from typing import List, Dict, Any, Optional
from datetime import datetime

class HypothesisScorer:
    """
    Explainable, deterministic hypothesis scoring and ranking engine.
    Combines evidential support, contradiction penalties, temporal proximity,
    metric anomaly alignment, dependency topology, and multi-source agreement into a 0.0 - 1.0 score.
    """

    @staticmethod
    def calculate_score(
        hypothesis_title: str,
        supporting_evidence_ids: List[str],
        contradicting_evidence_ids: List[str],
        evidence_dict: Dict[str, Any],
        incident_started_at: Optional[str] = None,
        anomaly_detected: bool = False,
        is_upstream_dependency: bool = False,
        is_sparse_data: bool = False
    ) -> Dict[str, Any]:
        num_support = len(supporting_evidence_ids)
        num_contradict = len(contradicting_evidence_ids)

        if is_sparse_data or (num_support == 0 and num_contradict == 0):
            return {
                "confidence": 0.20,
                "status": "INCONCLUSIVE",
                "ranking_explanation": "Insufficient empirical telemetry collected to confirm or falsify hypothesis.",
                "unresolved_questions": [
                    "Need higher frequency log sampling during incident window",
                    "Awaiting packet capture or detailed APM trace spans"
                ],
                "breakdown": {
                    "support_factor": 0.0,
                    "contradiction_penalty": 0.0,
                    "temporal_alignment": 0.5,
                    "reliability_factor": 0.5,
                    "anomaly_alignment": 0.0
                }
            }

        # 1. Base Support Factor (diminishing returns with count)
        support_factor = 1.0 - math.exp(-0.75 * num_support) if num_support > 0 else 0.0

        # 2. Contradiction Penalty (-0.35 per contradicting evidence item)
        contradiction_penalty = num_contradict * 0.35

        # 3. Temporal Alignment
        temporal_scores = []
        reliability_scores = []
        source_types = set()

        for eid in supporting_evidence_ids:
            ev = evidence_dict.get(eid)
            if ev:
                source_types.add(ev.get("source", "unknown"))
                reliability_scores.append(float(ev.get("reliability", 1.0)))
                ev_time_str = ev.get("timestamp")
                if ev_time_str and incident_started_at:
                    try:
                        t_ev = datetime.fromisoformat(ev_time_str.replace("Z", "+00:00"))
                        t_inc = datetime.fromisoformat(incident_started_at.replace("Z", "+00:00"))
                        delta_mins = abs((t_inc - t_ev).total_seconds()) / 60.0
                        if delta_mins <= 15:
                            temporal_scores.append(1.0)
                        elif delta_mins <= 60:
                            temporal_scores.append(0.7)
                        else:
                            temporal_scores.append(0.3)
                    except Exception:
                        temporal_scores.append(0.7)
                else:
                    temporal_scores.append(0.7)

        avg_temporal = (sum(temporal_scores) / len(temporal_scores)) if temporal_scores else 0.5
        avg_reliability = (sum(reliability_scores) / len(reliability_scores)) if reliability_scores else 0.8
        multi_source_bonus = 0.10 if len(source_types) >= 2 else 0.0
        anomaly_bonus = 0.15 if anomaly_detected else 0.0
        topology_bonus = 0.10 if is_upstream_dependency else 0.0

        raw_score = (
            (support_factor * 0.40) +
            (avg_temporal * 0.25) +
            (avg_reliability * 0.15) +
            multi_source_bonus +
            anomaly_bonus +
            topology_bonus
        ) - contradiction_penalty

        final_confidence = round(max(0.05, min(0.98, raw_score)), 2)

        # Status categorization
        if num_contradict >= 2 or raw_score <= 0.25:
            status = "WEAKENED" if num_support > 0 else "REJECTED"
        elif final_confidence >= 0.70 and num_support >= 1:
            status = "SUPPORTED"
        elif final_confidence >= 0.40:
            status = "TESTING"
        else:
            status = "PROPOSED"

        # Explainable ranking narrative
        reasons = []
        if num_support > 0:
            reasons.append(f"{num_support} supporting evidence item(s) from {len(source_types)} independent source(s)")
        if num_contradict > 0:
            reasons.append(f"penalized by {num_contradict} contradicting telemetry finding(s)")
        if anomaly_detected:
            reasons.append("aligned with confirmed statistical metric change-point")
        if is_upstream_dependency:
            reasons.append("corroborated by architectural dependency graph traversal")
        if avg_temporal >= 0.8:
            reasons.append("coincides tightly with estimated incident onset")

        ranking_explanation = "; ".join(reasons) if reasons else "Baseline evaluation."

        # Unresolved questions for hypothesis
        unresolved = []
        if num_contradict > 0:
            unresolved.append(f"Why did contradicting evidence ({', '.join(contradicting_evidence_ids)}) diverge from failure timeline?")
        if len(source_types) < 2 and num_support > 0:
            unresolved.append("Cross-source corroboration across multiple telemetry tiers needed.")
        if final_confidence < 0.70 and status not in ["WEAKENED", "REJECTED"]:
            unresolved.append("Requires deeper packet loss or distributed trace span sampling.")

        return {
            "confidence": final_confidence,
            "status": status,
            "ranking_explanation": ranking_explanation,
            "unresolved_questions": unresolved,
            "breakdown": {
                "support_factor": round(support_factor, 2),
                "contradiction_penalty": round(contradiction_penalty, 2),
                "temporal_alignment": round(avg_temporal, 2),
                "reliability_factor": round(avg_reliability, 2),
                "multi_source_bonus": multi_source_bonus,
                "anomaly_bonus": anomaly_bonus
            }
        }

    @staticmethod
    def rank_hypotheses(hypotheses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Sort by status priority (SUPPORTED > TESTING > PROPOSED > INCONCLUSIVE > WEAKENED > REJECTED)
        # then by confidence descending, then by number of supporting evidence
        status_weights = {
            "SUPPORTED": 5,
            "TESTING": 4,
            "PROPOSED": 3,
            "INCONCLUSIVE": 2,
            "WEAKENED": 1,
            "REJECTED": 0
        }

        sorted_hyp = sorted(
            hypotheses,
            key=lambda h: (
                status_weights.get(h.get("status", "PROPOSED"), 2),
                h.get("confidence", 0.0),
                len(h.get("supporting_evidence_ids", []))
            ),
            reverse=True
        )
        for idx, h in enumerate(sorted_hyp):
            h["rank"] = idx + 1
        return sorted_hyp

hypothesis_scorer = HypothesisScorer()

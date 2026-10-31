import json
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.models import Incident, DetectionEvent, TimelineEvent, Evidence, BackgroundJob
from app.services.dependency_graph_service import dependency_graph_service

logger = logging.getLogger(__name__)

class CorrelationEngine:
    """
    Correlates incoming detection events into existing active incidents or
    automatically creates new qualified incidents and triggers autonomous investigation.
    """

    CORRELATION_WINDOW_MINUTES = 30

    def correlate_detection(self, db: Session, detection: DetectionEvent) -> Incident:
        """
        Determines whether the detection belongs to an existing open incident or
        represents a new independent production failure.
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=self.CORRELATION_WINDOW_MINUTES)
        
        # 1. Search for active incidents on the same service
        active_incident = db.query(Incident).filter(
            Incident.service.ilike(detection.service),
            Incident.status.in_(["OPEN", "INVESTIGATING", "MITIGATING", "RECOVERY_FAILED"]),
            Incident.created_at >= cutoff_time
        ).order_by(Incident.created_at.desc()).first()

        # 2. If not found, check topological blast-radius neighbors
        if not active_incident:
            blast_radius = dependency_graph_service.get_downstream_blast_radius(detection.service)
            related_services = set(blast_radius.get("affected_services", []))
            
            upstream = dependency_graph_service.get_upstream_dependencies(detection.service)
            for dep in upstream.get("dependencies", []):
                dep_name = dep.get("service") if isinstance(dep, dict) else dep
                if dep_name:
                    related_services.add(str(dep_name))

            if related_services:
                active_incident = db.query(Incident).filter(
                    Incident.service.in_(list(related_services)),
                    Incident.status.in_(["OPEN", "INVESTIGATING", "MITIGATING", "RECOVERY_FAILED"]),
                    Incident.created_at >= cutoff_time
                ).order_by(Incident.created_at.desc()).first()

        # ----------------------------------------------------
        # CASE A: Correlate into Existing Active Incident
        # ----------------------------------------------------
        if active_incident:
            detection.status = "CORRELATED"
            detection.incident_id = active_incident.id
            
            # Escalate severity if incoming event is higher severity
            if detection.severity == "CRITICAL" and active_incident.severity != "CRITICAL":
                active_incident.severity = "CRITICAL"

            # Create correlated timeline event
            tl = TimelineEvent(
                incident_id=active_incident.id,
                event_type="CORRELATED_ANOMALY",
                message=f"Correlated related detection ({detection.detection_type}) on {detection.service}: {detection.explanation}",
                details_json=json.dumps({
                    "detection_id": detection.id,
                    "service": detection.service,
                    "observed_value": detection.observed_value,
                    "threshold": detection.threshold_value
                }),
                created_at=datetime.utcnow()
            )
            db.add(tl)
            db.commit()
            db.refresh(active_incident)
            logger.info(f"Correlated detection {detection.id} into active incident {active_incident.id}")
            return active_incident

        # ----------------------------------------------------
        # CASE B: Automatically Create New Incident & Enqueue Investigation
        # ----------------------------------------------------
        detection.status = "CORRELATED"
        num = db.query(Incident).count() + 1
        inc_id = f"INC-2026-{num:03d}"

        category_map = {
            "threshold_violation": "high_latency" if "latency" in detection.explanation.lower() else "resource_exhaustion",
            "log_pattern": "database_issue" if "hikari" in detection.explanation.lower() or "timeout" in detection.explanation.lower() else "api_failure",
            "prometheus_alert": "deployment_failure" if "deploy" in detection.explanation.lower() else "network_issue",
            "isolation_forest": "resource_exhaustion"
        }
        category = category_map.get(detection.detection_type, "network_issue")

        new_incident = Incident(
            id=inc_id,
            title=f"Autonomous Alert: {detection.explanation[:80]}",
            description=f"Automatically detected by IncidentIQ Hybrid Detection Engine: {detection.explanation}. Correlated across operational metrics and service dependencies.",
            service=detection.service,
            environment="production",
            severity=detection.severity,
            category=category,
            status="OPEN",
            started_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(new_incident)
        db.flush()

        detection.incident_id = new_incident.id

        # Add initial timeline event
        tl = TimelineEvent(
            incident_id=new_incident.id,
            event_type="INCIDENT_AUTONOMOUSLY_DETECTED",
            message=f"Incident autonomously triggered by {detection.detection_type}: {detection.explanation}",
            details_json=json.dumps({"detection_id": detection.id, "severity": detection.severity}),
            created_at=datetime.utcnow()
        )
        db.add(tl)

        # Enqueue background autonomous investigation job
        job = BackgroundJob(
            id=f"JOB-INV-{uuid.uuid4().hex[:8].upper()}",
            job_type="INVESTIGATION",
            status="PENDING",
            payload_json=json.dumps({"incident_id": new_incident.id}),
            scheduled_for=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(new_incident)

        logger.info(f"Autonomously created incident {new_incident.id} and enqueued investigation job {job.id}")
        return new_incident

correlation_engine = CorrelationEngine()


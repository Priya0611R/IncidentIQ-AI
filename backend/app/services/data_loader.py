import os
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Incident, TimelineEvent, Evidence
from app.services.evidence_service import evidence_service
from app.agents.investigation_agent import investigation_agent

logger = logging.getLogger(__name__)

def load_initial_scenarios(db: Session, force_reload: bool = False):
    """
    Populates sample scenarios into the SQLite database if empty or upon manual request,
    and pre-populates verified telemetry evidence, hypotheses, and recovery actions.
    """
    count = db.query(Incident).count()
    if count > 0 and not force_reload:
        # Ensure existing incidents have evidence pre-seeded if empty
        incidents = db.query(Incident).all()
        seeded_evidence = 0
        for inc in incidents:
            ev_count = db.query(Evidence).filter(Evidence.incident_id == inc.id).count()
            if ev_count == 0:
                try:
                    investigation_agent.run_investigation(db, inc.id)
                    seeded_evidence += 1
                except Exception as e:
                    logger.warning(f"Failed to auto-seed evidence for {inc.id}: {e}")
        return {
            "message": f"Database contains {count} incidents ({seeded_evidence} newly seeded with evidence).",
            "loaded_count": 0
        }

    df = evidence_service.incidents_df
    if df.empty:
        return {"error": "Could not read incidents.csv", "loaded_count": 0}

    loaded = 0
    for _, row in df.iterrows():
        inc_id = str(row["id"])
        existing = db.query(Incident).filter(Incident.id == inc_id).first()
        if existing and not force_reload:
            continue

        if existing and force_reload:
            db.delete(existing)
            db.commit()

        # Parse datetime
        created_dt = datetime.utcnow()
        if row.get("created_at"):
            try:
                created_dt = datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00"))
            except Exception:
                pass

        started_dt = created_dt
        if row.get("started_at"):
            try:
                started_dt = datetime.fromisoformat(str(row["started_at"]).replace("Z", "+00:00"))
            except Exception:
                pass

        inc = Incident(
            id=inc_id,
            title=str(row["title"]),
            description=str(row["description"]),
            service=str(row["service"]),
            environment=str(row.get("environment", "production")),
            severity=str(row.get("severity", "MEDIUM")),
            category=str(row.get("category", "other")),
            status=str(row.get("status", "OPEN")),
            created_at=created_dt,
            started_at=started_dt
        )
        db.add(inc)

        # Add initial timeline event
        tl = TimelineEvent(
            incident_id=inc_id,
            event_type="INCIDENT_CREATED",
            message=f"Incident opened: {inc.title} on {inc.service} ({inc.severity})",
            details_json=json.dumps({"service": inc.service, "severity": inc.severity, "category": inc.category}),
            created_at=created_dt
        )
        db.add(tl)
        db.commit()

        # Pre-seed verified telemetry evidence, diagnostics, and hypotheses for each incident
        try:
            investigation_agent.run_investigation(db, inc_id)
        except Exception as e:
            logger.warning(f"Could not pre-run investigation for {inc_id}: {e}")

        loaded += 1

    return {"message": f"Successfully loaded {loaded} incident scenarios with verified evidence.", "loaded_count": loaded}


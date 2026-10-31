import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Incident, TimelineEvent, Evidence
from app.services.evidence_service import evidence_service

def load_initial_scenarios(db: Session, force_reload: bool = False):
    """
    Populates sample scenarios into the SQLite database if empty or upon manual request.
    """
    count = db.query(Incident).count()
    if count > 0 and not force_reload:
        return {"message": f"Database already contains {count} incidents.", "loaded_count": 0}

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
        loaded += 1

    db.commit()
    return {"message": f"Successfully loaded {loaded} incident scenarios.", "loaded_count": loaded}


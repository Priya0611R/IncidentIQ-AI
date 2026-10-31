import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import engine, Base
from app.models.models import (
    Incident, InvestigationRun, Evidence, Hypothesis,
    Recommendation, Approval, RecoveryExecution, VerificationResult, TimelineEvent,
    TelemetryRecord, MonitoringConnection, DetectionEvent, BackgroundJob
)

if __name__ == "__main__":
    print("Creating all tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")


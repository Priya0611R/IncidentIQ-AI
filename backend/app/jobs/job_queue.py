import json
import logging
import asyncio
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import BackgroundJob
from app.agents.investigation_agent import investigation_agent
from app.services.verification_service import verification_service

logger = logging.getLogger(__name__)

class PersistentJobQueue:
    """
    Durable, database-backed background job queue and execution engine.
    Ensures autonomous investigation and verification jobs survive application restarts.
    """

    _worker_task: Optional[asyncio.Task] = None
    _is_running: bool = False

    @classmethod
    def enqueue(cls, db: Session, job_type: str, payload: dict) -> BackgroundJob:
        job = BackgroundJob(
            job_type=job_type,
            status="PENDING",
            payload_json=json.dumps(payload),
            scheduled_for=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @classmethod
    def process_pending_jobs_sync(cls, db: Session, max_jobs: int = 5) -> int:
        """
        Processes up to max_jobs pending background jobs synchronously.
        """
        pending = db.query(BackgroundJob).filter(
            BackgroundJob.status == "PENDING",
            BackgroundJob.scheduled_for <= datetime.utcnow()
        ).order_by(BackgroundJob.created_at.asc()).limit(max_jobs).all()

        processed_count = 0
        for job in pending:
            job.status = "RUNNING"
            job.started_at = datetime.utcnow()
            job.attempts += 1
            db.commit()

            try:
                payload = json.loads(job.payload_json)
                if job.job_type == "INVESTIGATION":
                    incident_id = payload.get("incident_id")
                    if incident_id:
                        logger.info(f"[JOB WORKER] Executing autonomous investigation for {incident_id}")
                        investigation_agent.run_investigation(db, incident_id)
                elif job.job_type == "VERIFICATION":
                    incident_id = payload.get("incident_id")
                    exec_id = payload.get("recovery_execution_id")
                    if incident_id:
                        logger.info(f"[JOB WORKER] Executing post-recovery verification for {incident_id}")
                        verification_service.verify_recovery(db, incident_id, exec_id)

                job.status = "COMPLETED"
                job.completed_at = datetime.utcnow()
                db.commit()
                processed_count += 1
            except Exception as e:
                logger.error(f"[JOB WORKER] Job {job.id} failed: {e}", exc_info=True)
                job.error_message = str(e)
                if job.attempts >= job.max_attempts:
                    job.status = "FAILED"
                else:
                    job.status = "PENDING"
                job.completed_at = datetime.utcnow()
                db.commit()

        return processed_count

    @classmethod
    async def start_worker_loop(cls, poll_interval_seconds: int = 5):
        """
        Asynchronous worker loop that periodically processes durable background jobs.
        """
        cls._is_running = True
        logger.info("[JOB WORKER] Starting persistent background job worker loop...")
        
        while cls._is_running:
            try:
                db = SessionLocal()
                try:
                    cls.process_pending_jobs_sync(db, max_jobs=3)
                finally:
                    db.close()
            except Exception as loop_err:
                logger.error(f"[JOB WORKER] Error in worker loop: {loop_err}")

            await asyncio.sleep(poll_interval_seconds)

    @classmethod
    def stop_worker_loop(cls):
        cls._is_running = False
        if cls._worker_task and not cls._worker_task.done():
            cls._worker_task.cancel()
        logger.info("[JOB WORKER] Stopped persistent background job worker.")

job_queue = PersistentJobQueue()


import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.routes import router
from app.services.data_loader import load_initial_scenarios
from app.jobs.job_queue import job_queue
from app.ingestion.simulation import synthetic_generator

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("IncidentIQ")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    logger.info("Initializing SQLite database tables...")
    Base.metadata.create_all(bind=engine)

    # Automatically load sample scenarios if empty
    db = SessionLocal()
    try:
        load_res = load_initial_scenarios(db, force_reload=False)
        logger.info(f"Database scenario status: {load_res.get('message')}")
    except Exception as e:
        logger.warning(f"Could not load initial scenarios on startup: {e}")
    finally:
        db.close()

    if settings.has_gemini_key:
        logger.info(f"Google Gemini configured: using model '{settings.GEMINI_MODEL}'")
    else:
        logger.warning("No valid GEMINI_API_KEY detected. Running in deterministic DEMO_FALLBACK mode.")

    # Start persistent background job worker loop
    worker_task = asyncio.create_task(job_queue.start_worker_loop(poll_interval_seconds=3))

    yield

    logger.info("Shutting down IncidentIQ application...")
    job_queue.stop_worker_loop()
    synthetic_generator.stop()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("IncidentIQ application successfully shutdown.")

app = FastAPI(
    title="AI-Powered Autonomous Incident Investigation and Recovery System",
    description="Investigates technical incidents, gathers empirical evidence, forms and ranks root-cause hypotheses, requests human authorization, executes simulated remediations, and verifies recovery.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = settings.cors_origin_list
if "*" not in origins:
    origins.extend(["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow any origin for local dev ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


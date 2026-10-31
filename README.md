# IncidentIQ AI: Autonomous Incident Investigation and Recovery System

> **Tagline:** *Investigate. Adapt. Recover. Verify.*  
> **Mission:** An AI incident investigator that turns fragmented production signals into evidence-backed diagnosis and safer recovery decisions.

---

### 🔗 Quick Links & Presentation
- **📖 [Executive Pitch Deck & Team Documentation (Cognify Crew)](./docs/README.md)** — Complete slide-by-slide project overview, team credits, architecture, and impact analysis ([Google Slides Presentation](https://docs.google.com/presentation/d/1HY0_idMfPe1P7hzwJUM8NTK0f2BHBIxG/edit?usp=sharing&ouid=106482162579105740095&rtpof=true&sd=true) • [PowerPoint File](./docs/IncidentIQ_AI.pptx)).
- **🌐 Live Web Console:** [http://127.0.0.1:5174](http://127.0.0.1:5174) or [http://localhost:5173](http://localhost:5173) (Light Mode SRE Command Console)
- **⚡ Backend OpenAPI Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **🧪 Automated Test Suite:** `pytest backend/tests/test_all_workflows.py -v` (23 passing tests)

---

## 👥 Cognify Crew (Project Team)

| Team Member | Role / Focus |
|:---|:---|
| **Priya R** | AI & Backend Architecture / Lead |
| **Vaishnavi S** | Autonomous Investigation & Agent Orchestration |
| **Revathi M** | Anomaly Detection (Isolation Forest) & Telemetry Ingestion |
| **Harini R** | SRE Workflows, Recovery Verification & Post-Mortem Analytics |
| **Varshini S** | Frontend Experience, SRE Command Console & UI/UX Design |

---

## 🧭 The 8-Step Autonomous Lifecycle

IncidentIQ AI implements an end-to-end evidence-based incident investigation workflow:

```
1. Collect Evidence   →   Logs, metrics, traces, alerts, deployments & configs
2. Build Timeline     →   Chronological correlation of failure events
3. Form Hypotheses    →   Multi-candidate root-cause formulation
4. Investigate Tools  →   Dynamic tool calling (DNS, packet loss, config diffs)
5. Identify Root Cause→   Scored & ranked with contradiction penalties
6. Propose Recovery   →   Actionable, reversible remediation plan
7. Request Approval   →   Strict human authorization gate
8. Verify Evidence    →   Post-recovery SLA threshold audit
```

---

## 🚨 Problem & Solution

### The Problem
*Production incident response is difficult and time-consuming:*
1. **Scattered Signals:** Logs, metrics, traces, and alerts are isolated across disconnected tools.
2. **Manual Investigation:** Engineers must manually cross-correlate gigabytes of telemetry under intense time pressure.
3. **Uncertain & Risky Fixes:** Initial intuitive explanations are often wrong; untested changes risk worsening outages.

### Our Solution — IncidentIQ AI
*An AI-assisted incident investigator that turns fragmented signals into evidence-backed diagnosis and safer recovery decisions:*
1. **Correlate and Analyze:** Combines logs, metrics, traces, and deployment history into an aligned incident timeline.
2. **Adaptive Investigation:** Tests competing hypotheses against live diagnostics and adapts when evidence contradicts initial assumptions.
3. **Safe Recovery & Verification:** Recommends verified mitigations, requires human approval for critical actions, and verifies resolution against SLA criteria.

---

## 1. System Architecture & Workflow

IncidentIQ executes an end-to-end autonomous lifecycle:

```
Incident Intake
      ↓
Incident Classification
      ↓
Evidence Collection (Logs, Metrics, Deployments, Configs, Traces)
      ↓
Chronological Timeline Construction
      ↓
AI Investigation Agent (Dynamic Multi-Round Tool Calling)
      ↓
Dynamic Evidence Gathering & Metric Anomaly Detection
      ↓
Root-Cause Hypothesis Formulation & Testing
      ↓
Explainable Evidential Scoring & Ranked Assessment
      ↓
Recovery Recommendation
      ↓
Human Approval (Mandatory Sign-off with Risk Review)
      ↓
Safe Simulated Recovery Execution
      ↓
Fresh Post-Recovery Telemetry Gathering
      ↓
SLA Threshold Verification (Pass/Fail)
      ↓
Incident Resolution OR Further Investigation
      ↓
Executive Post-Mortem Report (JSON & Markdown)
```

---

## 2. Technology Stack

- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, SQLite, Pandas.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React, Axios.
- **AI Engine:**
  - Google Gemini API (`gemini-2.5-flash` or any configured flash model).
  - Dynamic tool calling via standard JSON schema function declarations.
  - Transparent dual-mode architecture: switches to a deterministic empirical engine (`DEMO_FALLBACK`) when an API key is absent or when running offline.

---

## 3. Project Structure

```
IncidentIQ AI/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint, CORS, lifespan & seeding
│   │   ├── config.py                   # Pydantic Settings & environment variables
│   │   ├── database.py                 # SQLAlchemy engine, session & Base
│   │   ├── models/
│   │   │   └── models.py               # ORM Entities (Incident, Evidence, Hypotheses...)
│   │   ├── schemas/
│   │   │   └── schemas.py              # Pydantic request/response schemas
│   │   ├── agents/
│   │   │   ├── prompts.py              # SRE persona prompts & JSON format instructions
│   │   │   ├── tools.py                # Tool declarations & dispatch execution
│   │   │   └── investigation_agent.py  # Multi-round dynamic agent + demo engine
│   │   ├── services/
│   │   │   ├── evidence_service.py     # 12 empirical evidence retrieval tools
│   │   │   ├── hypothesis_service.py   # Normalized mathematical scoring & ranking
│   │   │   ├── recovery_service.py     # Safe simulated recovery handlers
│   │   │   ├── verification_service.py # SLA threshold evaluation & audit
│   │   │   ├── report_service.py       # Post-mortem generator (JSON + Markdown)
│   │   │   └── data_loader.py          # Synthetic dataset seeder
│   │   └── api/
│   │       └── routes.py               # REST API endpoints
│   ├── data/                           # Local synthetic CSV and JSON datasets
│   ├── tests/
│   │   └── test_all_workflows.py       # 12 automated test suites
│   ├── requirements.txt
│   └── .env.example
├── data/                               # Root mirror of synthetic datasets
│   ├── incidents.csv
│   ├── logs.csv
│   ├── metrics.csv
│   ├── deployment_history.csv
│   ├── configuration_changes.csv
│   ├── service_dependencies.csv
│   ├── traces.csv
│   ├── historical_incidents.json
│   └── post_recovery_metrics.csv
├── frontend/
│   ├── src/
│   │   ├── api/client.ts               # Typed Axios API client
│   │   ├── components/                 # Navbar, ConfirmationDialog
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx       # System overview & telemetry charts
│   │   │   ├── IncidentsPage.tsx       # Searchable & filterable incident table
│   │   │   ├── CreateIncidentModal.tsx # Incident creation with input validation
│   │   │   ├── InvestigationWorkspacePage.tsx # Primary investigation console
│   │   │   ├── RecoveryCenterPage.tsx  # Central recovery governance
│   │   │   └── ReportPage.tsx          # Post-mortem viewer & exporter
│   │   ├── types/index.ts              # Shared TypeScript interfaces
│   │   ├── App.tsx                     # Main layout & state coordinator
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

---

## 4. Setup and Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup

1. **Activate or create a virtual environment:**
   ```powershell
   # Windows PowerShell
   python -m venv backend/venv
   .\backend\venv\Scripts\Activate.ps1
   ```
   ```bash
   # Linux / macOS
   python3 -m venv backend/venv
   source backend/venv/bin/activate
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `backend/.env`:
   ```bash
   cp .env.example backend/.env
   ```
   Configure your Gemini API Key in `backend/.env`:
   ```ini
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   DATABASE_URL=sqlite:///./incident_system.db
   ENVIRONMENT=development
   LOG_LEVEL=INFO
   ```
   > **Note:** If `GEMINI_API_KEY` is omitted or left blank, the application automatically launches in **Deterministic Demo Mode**. It will clearly label all investigation runs as `DEMO_FALLBACK`.

### Frontend Setup

1. **Install Node packages:**
   ```bash
   cd frontend
   npm install
   ```

2. **Build frontend:**
   ```bash
   npm run build
   ```

---

## 5. Running the Application

### 1. Start the Backend API Server
```powershell
# From project root in Windows PowerShell
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
```bash
# General shell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI server will be available at: `http://127.0.0.1:8000`  
Interactive OpenAPI Swagger docs: `http://127.0.0.1:8000/docs`

### 2. Start the Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 6. Running Automated Tests

Run the complete suite of 12 automated end-to-end workflow tests:

```powershell
# Windows PowerShell
.\backend\venv\Scripts\python.exe -m pytest backend/tests/test_all_workflows.py -v
```
```bash
# General shell
pytest backend/tests/test_all_workflows.py -v
```

The test suite validates:
1. Health endpoint and system operational readiness.
2. Incident creation and ID generation.
3. Multi-source evidence retrieval tools (Logs, Metrics, Deployments).
4. Multi-round autonomous investigation execution.
5. Tool-call argument and parameter validation.
6. Evidence ID provenance validation against stored telemetry.
7. Hypothesis scoring, contradiction penalties, and rank adjustment.
8. Human recovery authorization.
9. Strict rejection of unapproved recovery execution attempts.
10. Safe simulated recovery execution and audit trail logging.
11. Telemetry threshold verification passing and incident resolution.
12. Telemetry threshold verification failing (keeping incident open).
13. Executive post-mortem generation in JSON and Markdown formats.

---

## 7. Demonstration Scenarios

The system includes pre-loaded synthetic scenarios accessible from the UI:

### Scenario A: Database Connection Pool Exhaustion (`INC-2026-002`)
- **Symptoms:** Orders API returns HTTP 500 errors; requests queue up with 30s timeouts.
- **Empirical Evidence:**
  - `EV-LOG-202` / `EV-LOG-203`: HikariCP logs indicate connection acquisition timeouts.
  - `EV-MET-204`: Active Postgres connections saturate at 100/100 limit.
  - `EV-DEP-102`: Software deployment occurred 3 days prior, ruling out a deployment regression.
- **AI Behavior:** The agent gathers metrics, weakens the deployment hypothesis due to temporal mismatch, identifies pool starvation as the primary root cause (Confidence: 85%), and recommends resizing the pool and purging idle leaks.
- **Recovery & Verification:** Operator approves `simulated_pool_resize`. Simulation runs, fresh telemetry confirms connection count drops to 38 and latency normalizes to 165ms. Incident status changes to `RESOLVED`.

### Scenario B: Deployment Regression (`INC-2026-001`)
- **Symptoms:** Checkout API returns HTTP 502/504 errors; latency spikes to 4600ms.
- **Empirical Evidence:**
  - `EV-DEP-101`: Artifact `v2.4.1` deployed at 09:11:30Z.
  - `EV-LOG-103`: NullReferenceException in `PaymentPayloadValidator` at 09:13:02Z.
  - `EV-MET-104`: Error rate spikes from 0.1% to 28.4% immediately following the release.
- **AI Behavior:** Confirms tight temporal alignment between deployment and error surge. Ranks deployment bug as #1 root cause. Proposes canary rollback to `v2.4.0`.
- **Recovery & Verification:** Rollback is simulated. Fresh metrics verify latency drops to 58ms and error rate to 0.05%. Verification passes; incident marked `RESOLVED`.

### Scenario C: Failed Recovery Verification (`INC-2026-006`)
- **Symptoms:** Search cluster query latency elevated above 3200ms.
- **First Mitigation:** Initial hypothesis suspects local cache invalidation. A service restart with cache flush is approved and simulated.
- **Verification Result:** Post-recovery verification checks fail! Latency remains at 3150ms and error rate remains at 16.5%.
- **Outcome:** The system **refuses to falsely mark the incident resolved**. The incident status transitions to `RECOVERY_FAILED`. New evidence points to downstream Elasticsearch node `es-data-03` circuit breaking, directing further investigation to the search cluster infrastructure.

---

## 8. Safety, Security, and Governance

- **Zero Arbitrary Execution:** Recovery actions are restricted to predefined, sandboxed simulation handlers (`simulated_rollback`, `simulated_pool_resize`, `simulated_service_restart`, `simulated_circuit_breaker`, `simulated_config_revert`).
- **Strict Human Authorization:** Recommendations cannot execute without explicit operator approval. Unapproved or rejected actions are blocked at the API layer.
- **Mandatory Telemetry Verification:** Incidents cannot be closed solely based on LLM output. Resolution requires post-recovery empirical verification against strict SLA thresholds.
- **Data Provenance:** Every hypothesis must link to verified evidence IDs present in the audit database. Fabricated evidence IDs are rejected.
- **Credential Protection:** API keys are never exposed in responses or client bundles.

---

## 9. License & Disclaimer

IncidentIQ AI is designed for development, testing, and demonstration purposes. In production environments, replace the synthetic evidence service and simulated recovery handlers with authenticated connections to your cloud provider, APM (Datadog/New Relic/Prometheus), and orchestration tooling (Kubernetes/Terraform).


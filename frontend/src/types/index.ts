export interface Incident {
  id: string;
  title: string;
  description: string;
  service: string;
  environment: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'RECOVERY_FAILED' | 'CLOSED';
  created_at: string;
  updated_at: string;
  started_at?: string;
  resolved_at?: string;
}

export interface EvidenceItem {
  id: string;
  incident_id: string;
  investigation_run_id?: string;
  source: string;
  evidence_type: string;
  timestamp?: string;
  service?: string;
  summary: string;
  payload_json: any;
  reliability: number;
  created_at: string;
}

export interface Hypothesis {
  id: string;
  incident_id: string;
  investigation_run_id?: string;
  title: string;
  explanation: string;
  confidence: number;
  status: 'PROPOSED' | 'TESTING' | 'SUPPORTED' | 'WEAKENED' | 'REJECTED' | 'INCONCLUSIVE';
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  tests_performed: string[];
  rank: number;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  incident_id: string;
  hypothesis_id?: string;
  title: string;
  description: string;
  action_type: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  expected_benefit: string;
  side_effects: string;
  preconditions: string;
  rollback_plan: string;
  requires_approval: boolean;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  created_at: string;
}

export interface RecoveryExecution {
  id: string;
  recommendation_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  execution_mode: string;
  started_at: string;
  completed_at?: string;
  result_json: any;
  error_message?: string;
}

export interface VerificationResult {
  id: string;
  incident_id: string;
  recovery_execution_id: string;
  status: 'PASSED' | 'FAILED' | 'INCONCLUSIVE';
  measurements_json: any;
  threshold_checks_json: Array<{
    metric: string;
    threshold: string;
    observed_value: string;
    passed: boolean;
    status: 'PASS' | 'FAIL';
  }>;
  summary: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  incident_id: string;
  event_type: string;
  message: string;
  details_json: any;
  created_at: string;
}

export interface InvestigationRun {
  id: string;
  incident_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  model_name: string;
  execution_mode: 'GEMINI_API' | 'DEMO_FALLBACK';
  rounds_completed: number;
  summary?: string;
  error_message?: string;
  hypotheses: Hypothesis[];
  recommendations: Recommendation[];
}

export interface DashboardStats {
  total_incidents: number;
  active_incidents: number;
  critical_incidents: number;
  under_investigation: number;
  pending_approvals: number;
  recovered_incidents: number;
  failed_recoveries: number;
  avg_investigation_duration_seconds: number;
  severity_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  system_status: string;
  gemini_configured: boolean;
  active_model: string;
}

export interface IncidentReport {
  incident: Incident;
  investigation_run?: InvestigationRun;
  timeline: TimelineEvent[];
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  recommendations: Recommendation[];
  recovery_executions: RecoveryExecution[];
  verification_results: VerificationResult[];
  lessons_learned: string[];
  follow_up_recommendations: string[];
  markdown_report: string;
}

export interface DetectionEvent {
  id: string;
  service: string;
  detection_type: string;
  severity: string;
  observed_value?: number;
  baseline_value?: number;
  threshold_value?: number;
  time_window: string;
  explanation: string;
  evidence_ids: string[];
  status: string;
  incident_id?: string;
  created_at: string;
}

export interface MonitoringStatus {
  active_provider: 'PROMETHEUS' | 'SIMULATION' | 'IDLE';
  mode_label: string;
  is_simulating: boolean;
  simulation_scenario?: string;
  total_telemetry_records: number;
  active_detections: number;
  latest_telemetry_at?: string;
  connections: Array<{
    id: string;
    name: string;
    provider: string;
    status: string;
    endpoint: string;
    last_ingestion_at?: string;
  }>;
}


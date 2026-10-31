import axios from 'axios';
import {
  Incident,
  EvidenceItem,
  Hypothesis,
  Recommendation,
  RecoveryExecution,
  VerificationResult,
  TimelineEvent,
  InvestigationRun,
  DashboardStats,
  IncidentReport
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Health & Stats
  getHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await api.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },

  loadSampleScenarios: async (force = false) => {
    const res = await api.post(`/scenarios/load-sample-data?force=${force}`);
    return res.data;
  },

  // Incidents
  getIncidents: async (filters?: {
    severity?: string;
    status?: string;
    service?: string;
    category?: string;
    search?: string;
  }): Promise<Incident[]> => {
    const res = await api.get<Incident[]>('/incidents', { params: filters });
    return res.data;
  },

  getIncident: async (incidentId: string): Promise<Incident> => {
    const res = await api.get<Incident>(`/incidents/${incidentId}`);
    return res.data;
  },

  createIncident: async (incident: {
    title: string;
    description: string;
    service: string;
    environment?: string;
    severity?: string;
    category?: string;
    started_at?: string;
  }): Promise<Incident> => {
    const res = await api.post<Incident>('/incidents', incident);
    return res.data;
  },

  // Investigation
  startInvestigation: async (incidentId: string): Promise<InvestigationRun> => {
    const res = await api.post<InvestigationRun>(`/incidents/${incidentId}/investigate`);
    return res.data;
  },

  // Evidence
  getEvidence: async (incidentId: string): Promise<EvidenceItem[]> => {
    const res = await api.get<EvidenceItem[]>(`/incidents/${incidentId}/evidence`);
    return res.data;
  },

  uploadEvidence: async (payload: {
    incident_id: string;
    source?: string;
    evidence_type?: string;
    service?: string;
    summary: string;
    payload?: any;
  }): Promise<EvidenceItem> => {
    const res = await api.post<EvidenceItem>('/evidence/upload', payload);
    return res.data;
  },

  // Timeline
  getTimeline: async (incidentId: string): Promise<TimelineEvent[]> => {
    const res = await api.get<TimelineEvent[]>(`/incidents/${incidentId}/timeline`);
    return res.data;
  },

  // Hypotheses
  getHypotheses: async (incidentId: string): Promise<Hypothesis[]> => {
    const res = await api.get<Hypothesis[]>(`/incidents/${incidentId}/hypotheses`);
    return res.data;
  },

  // Recommendations & Approvals
  getRecommendations: async (incidentId: string): Promise<Recommendation[]> => {
    const res = await api.get<Recommendation[]>(`/incidents/${incidentId}/recommendations`);
    return res.data;
  },

  approveRecommendation: async (recommendationId: string, approvedBy = 'SRE On-Call Operator', reason?: string) => {
    const res = await api.post(`/recommendations/${recommendationId}/approve`, {
      approved_by: approvedBy,
      reason: reason || 'Approved through IncidentIQ SRE Console'
    });
    return res.data;
  },

  rejectRecommendation: async (recommendationId: string, rejectedBy = 'SRE On-Call Operator', reason: string) => {
    const res = await api.post(`/recommendations/${recommendationId}/reject`, {
      rejected_by: rejectedBy,
      reason
    });
    return res.data;
  },

  executeSimulation: async (recommendationId: string, operator = 'SRE Operator'): Promise<RecoveryExecution> => {
    const res = await api.post<RecoveryExecution>(`/recommendations/${recommendationId}/execute-simulation?operator=${encodeURIComponent(operator)}`);
    return res.data;
  },

  // Verification
  verifyRecovery: async (incidentId: string, recoveryExecutionId?: string): Promise<VerificationResult> => {
    const res = await api.post<VerificationResult>(`/incidents/${incidentId}/verify${recoveryExecutionId ? `?recovery_execution_id=${recoveryExecutionId}` : ''}`);
    return res.data;
  },

  // Reports
  getReport: async (incidentId: string): Promise<IncidentReport> => {
    const res = await api.get<IncidentReport>(`/incidents/${incidentId}/report`);
    return res.data;
  },

  // Topology & Dependencies
  getTopology: async (service?: string) => {
    const res = await api.get('/topology', { params: { service } });
    return res.data;
  },

  // Anomaly Detection
  detectAnomalies: async (service?: string) => {
    const res = await api.post('/anomalies/detect', null, { params: { service } });
    return res.data;
  },

  // Evaluation & Benchmarking
  runEvaluation: async (scenarioIds?: string[]) => {
    const res = await api.post('/evaluation/run', scenarioIds || null);
    return res.data;
  },

  getEvaluationMetrics: async () => {
    const res = await api.get('/evaluation/metrics');
    return res.data;
  }
};


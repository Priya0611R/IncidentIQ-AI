import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { InvestigationWorkspacePage } from './pages/InvestigationWorkspacePage';
import { RecoveryCenterPage } from './pages/RecoveryCenterPage';
import { ReportPage } from './pages/ReportPage';
import { CreateIncidentModal } from './pages/CreateIncidentModal';
import { apiClient } from './api/client';
import { 
  Incident, 
  DashboardStats, 
  EvidenceItem, 
  Hypothesis, 
  Recommendation, 
  TimelineEvent, 
  InvestigationRun,
  IncidentReport 
} from './types';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'incidents' | 'workspace' | 'recovery' | 'report'>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Global Data State
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [allRecommendations, setAllRecommendations] = useState<Recommendation[]>([]);

  // Workspace State
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [investigationRun, setInvestigationRun] = useState<InvestigationRun | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [report, setReport] = useState<IncidentReport | null>(null);

  // UI State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isExecutingSimulation, setIsExecutingSimulation] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial Data Fetch
  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const [health, dashboardStats, incidentList] = await Promise.all([
        apiClient.getHealth().catch(() => null),
        apiClient.getDashboardStats().catch(() => null),
        apiClient.getIncidents().catch(() => [])
      ]);
      setSystemHealth(health);
      setStats(dashboardStats);
      setIncidents(incidentList);

      // Collect all recommendations across incidents for recovery center
      if (incidentList.length > 0) {
        const recPromises = incidentList.slice(0, 10).map(inc => 
          apiClient.getRecommendations(inc.id).catch(() => [])
        );
        const recResults = await Promise.all(recPromises);
        setAllRecommendations(recResults.flat());
      }
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Incident Details when Workspace opens
  useEffect(() => {
    if (selectedIncidentId) {
      fetchWorkspaceData(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const fetchWorkspaceData = async (incidentId: string) => {
    try {
      const [inc, evList, hypList, recList, tlList] = await Promise.all([
        apiClient.getIncident(incidentId),
        apiClient.getEvidence(incidentId),
        apiClient.getHypotheses(incidentId),
        apiClient.getRecommendations(incidentId),
        apiClient.getTimeline(incidentId)
      ]);

      setCurrentIncident(inc);
      setEvidence(evList);
      setHypotheses(hypList);
      setRecommendations(recList);
      setTimeline(tlList);
    } catch (err: any) {
      showToast(err.message || 'Failed to load incident details', 'error');
    }
  };

  const handleSelectIncident = (id: string, tab: string = 'workspace') => {
    if (id) {
      setSelectedIncidentId(id);
    }
    setCurrentTab(tab as any);
  };

  const handleStartInvestigation = async (id?: string) => {
    const targetId = id || selectedIncidentId;
    if (!targetId) return;

    try {
      setIsInvestigating(true);
      showToast(`Autonomous AI investigation running for ${targetId}...`, 'info');
      const run = await apiClient.startInvestigation(targetId);
      setInvestigationRun(run);
      showToast(`Investigation concluded: ${run.execution_mode}`, 'success');

      // Refresh workspace data
      await fetchWorkspaceData(targetId);
      await fetchGlobalData();
      if (!selectedIncidentId || selectedIncidentId !== targetId) {
        setSelectedIncidentId(targetId);
        setCurrentTab('workspace');
      }
    } catch (err: any) {
      showToast(`Investigation failed: ${err?.response?.data?.detail || err.message}`, 'error');
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleApproveRecovery = async (recId: string) => {
    try {
      await apiClient.approveRecommendation(recId, 'Senior SRE Lead', 'Authorized through IncidentIQ Console');
      showToast('Recovery action approved. Ready for safe simulated execution.', 'success');
      if (selectedIncidentId) await fetchWorkspaceData(selectedIncidentId);
      await fetchGlobalData();
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`, 'error');
    }
  };

  const handleRejectRecovery = async (recId: string, reason: string) => {
    try {
      await apiClient.rejectRecommendation(recId, 'Senior SRE Lead', reason);
      showToast('Recommendation rejected.', 'info');
      if (selectedIncidentId) await fetchWorkspaceData(selectedIncidentId);
      await fetchGlobalData();
    } catch (err: any) {
      showToast(`Rejection failed: ${err.message}`, 'error');
    }
  };

  const handleExecuteSimulation = async (recId: string) => {
    try {
      setIsExecutingSimulation(true);
      showToast('Dispatching safe simulated recovery handler...', 'info');
      await apiClient.executeSimulation(recId);
      showToast('Simulated recovery handler completed successfully.', 'success');
      if (selectedIncidentId) await fetchWorkspaceData(selectedIncidentId);
      await fetchGlobalData();
    } catch (err: any) {
      showToast(`Execution failed: ${err?.response?.data?.detail || err.message}`, 'error');
    } finally {
      setIsExecutingSimulation(false);
    }
  };

  const handleVerifyRecovery = async (incidentId?: string) => {
    const targetId = incidentId || selectedIncidentId;
    if (!targetId) return;

    try {
      setIsVerifying(true);
      showToast('Collecting fresh telemetry & evaluating threshold checks...', 'info');
      const vResult = await apiClient.verifyRecovery(targetId);
      if (vResult.status === 'PASSED') {
        showToast('Verification SUCCEEDED! Incident marked RESOLVED.', 'success');
      } else {
        showToast('Verification FAILED! SLA thresholds violated. Incident remains OPEN.', 'error');
      }
      await fetchWorkspaceData(targetId);
      await fetchGlobalData();
    } catch (err: any) {
      showToast(`Verification failed: ${err?.response?.data?.detail || err.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoadScenarios = async () => {
    try {
      setIsLoadingScenarios(true);
      const res = await apiClient.loadSampleScenarios(true);
      showToast(res.message || 'Sample demonstration scenarios loaded.', 'success');
      await fetchGlobalData();
      if (incidents.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId('INC-2026-001');
      }
    } catch (err: any) {
      showToast('Failed to load sample scenarios', 'error');
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const handleOpenReport = async () => {
    if (!selectedIncidentId) return;
    try {
      setLoading(true);
      const rep = await apiClient.getReport(selectedIncidentId);
      setReport(rep);
      setCurrentTab('report');
    } catch (err: any) {
      showToast('Could not load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatedIncident = (newInc: Incident) => {
    showToast(`Incident ${newInc.id} created successfully!`, 'success');
    fetchGlobalData();
    setSelectedIncidentId(newInc.id);
    setCurrentTab('workspace');
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-stone-900 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => setCurrentTab(tab as any)}
        systemHealth={systemHealth}
        selectedIncidentId={selectedIncidentId}
        onLoadScenarios={handleLoadScenarios}
        isLoadingScenarios={isLoadingScenarios}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardPage
            stats={stats}
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onLoadScenarios={handleLoadScenarios}
            loading={loading}
          />
        )}

        {currentTab === 'incidents' && (
          <IncidentsPage
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            onStartInvestigation={handleStartInvestigation}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onRefresh={fetchGlobalData}
            investigatingId={isInvestigating ? selectedIncidentId : null}
          />
        )}

        {currentTab === 'workspace' && currentIncident && (
          <InvestigationWorkspacePage
            incident={currentIncident}
            investigationRun={investigationRun}
            evidence={evidence}
            hypotheses={hypotheses}
            recommendations={recommendations}
            timeline={timeline}
            onStartInvestigation={() => handleStartInvestigation(currentIncident.id)}
            onRefresh={() => fetchWorkspaceData(currentIncident.id)}
            onApproveRecovery={handleApproveRecovery}
            onExecuteSimulation={handleExecuteSimulation}
            onVerifyRecovery={() => handleVerifyRecovery(currentIncident.id)}
            onOpenReport={handleOpenReport}
            isInvestigating={isInvestigating}
            isExecutingSimulation={isExecutingSimulation}
            isVerifying={isVerifying}
          />
        )}

        {currentTab === 'recovery' && (
          <RecoveryCenterPage
            recommendations={allRecommendations}
            incidents={incidents}
            onApprove={handleApproveRecovery}
            onReject={handleRejectRecovery}
            onExecuteSimulation={handleExecuteSimulation}
            onVerify={handleVerifyRecovery}
            onSelectIncident={handleSelectIncident}
            loading={loading}
          />
        )}

        {currentTab === 'report' && (
          <ReportPage
            report={report}
            onBack={() => setCurrentTab('workspace')}
            loading={loading}
          />
        )}
      </main>

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreatedIncident}
      />

      {/* Toast Notification Pill */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
            toast.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-900' :
            'bg-white border-slate-300 text-slate-800'
          }`}>
            {toast.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
            {toast.type === 'info' && <Info className="h-4 w-4 text-emerald-600 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


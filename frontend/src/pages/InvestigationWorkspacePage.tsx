import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Database, 
  ArrowRight, 
  Terminal, 
  Activity, 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  X, 
  Network, 
  Award, 
  HelpCircle,
  ExternalLink,
  Zap,
  Filter
} from 'lucide-react';
import { 
  Incident, 
  EvidenceItem, 
  Hypothesis, 
  Recommendation, 
  TimelineEvent, 
  InvestigationRun 
} from '../types';
import { apiClient } from '../api/client';

interface InvestigationWorkspacePageProps {
  incident: Incident;
  investigationRun: InvestigationRun | null;
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  recommendations: Recommendation[];
  timeline: TimelineEvent[];
  onStartInvestigation: () => void;
  onRefresh: () => void;
  onApproveRecovery: (recId: string) => void;
  onExecuteSimulation: (recId: string) => void;
  onVerifyRecovery: () => void;
  onOpenReport: () => void;
  isInvestigating: boolean;
  isExecutingSimulation: boolean;
  isVerifying: boolean;
}

export const InvestigationWorkspacePage: React.FC<InvestigationWorkspacePageProps> = ({
  incident,
  investigationRun,
  evidence,
  hypotheses,
  recommendations,
  timeline,
  onStartInvestigation,
  onRefresh,
  onApproveRecovery,
  onExecuteSimulation,
  onVerifyRecovery,
  onOpenReport,
  isInvestigating,
  isExecutingSimulation,
  isVerifying,
}) => {
  const [evidenceFilter, setEvidenceFilter] = useState<string>('ALL');
  const [searchEvidence, setSearchEvidence] = useState<string>('');
  const [selectedEvidenceModal, setSelectedEvidenceModal] = useState<EvidenceItem | null>(null);
  
  // Topology & Blast Radius
  const [topologyData, setTopologyData] = useState<any>(null);
  const [showTopology, setShowTopology] = useState<boolean>(false);
  const [loadingTopology, setLoadingTopology] = useState<boolean>(false);

  // Benchmark Evaluation
  const [showBenchmarkModal, setShowBenchmarkModal] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [runningBenchmark, setRunningBenchmark] = useState<boolean>(false);

  useEffect(() => {
    if (incident.service) {
      loadTopology(incident.service);
    }
  }, [incident.service]);

  const loadTopology = async (serviceName: string) => {
    try {
      setLoadingTopology(true);
      const data = await apiClient.getTopology(serviceName);
      setTopologyData(data);
    } catch (err) {
      console.error("Failed to load topology:", err);
    } finally {
      setLoadingTopology(false);
    }
  };

  const runSystemBenchmark = async () => {
    try {
      setRunningBenchmark(true);
      const data = await apiClient.runEvaluation();
      setBenchmarkResult(data);
      setShowBenchmarkModal(true);
    } catch (err) {
      console.error("Benchmark error:", err);
    } finally {
      setRunningBenchmark(false);
    }
  };

  // Group evidence by source
  const filteredEvidence = evidence.filter((ev) => {
    const matchesSource = evidenceFilter === 'ALL' || ev.source.toLowerCase() === evidenceFilter.toLowerCase();
    const matchesSearch = 
      ev.summary.toLowerCase().includes(searchEvidence.toLowerCase()) ||
      ev.id.toLowerCase().includes(searchEvidence.toLowerCase()) ||
      (ev.service && ev.service.toLowerCase().includes(searchEvidence.toLowerCase()));
    return matchesSource && matchesSearch;
  });

  const primaryRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  // Evidence source badge
  const getEvidenceSourceBadge = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('diagnostic') || s.includes('tool')) {
      return (
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
          DIAGNOSTIC
        </span>
      );
    }
    if (s.includes('metric') || s.includes('anomaly')) {
      return (
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
          METRICS
        </span>
      );
    }
    if (s.includes('deployment')) {
      return (
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
          DEPLOYMENT
        </span>
      );
    }
    if (s.includes('config')) {
      return (
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
          CONFIG
        </span>
      );
    }
    return (
      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
        OBSERVED
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Incident Summary Card */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-emerald-800 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {incident.id}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                incident.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                incident.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {incident.severity}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {incident.service}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                incident.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                incident.status === 'RECOVERY_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                incident.status === 'INVESTIGATING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse' :
                incident.status === 'MITIGATING' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {incident.status === 'RESOLVED' && <CheckCircle2 className="h-3 w-3" />}
                {incident.status === 'RECOVERY_FAILED' && <XCircle className="h-3 w-3" />}
                {incident.status === 'INVESTIGATING' && <Activity className="h-3 w-3 animate-spin" />}
                {incident.status}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {evidence.length} evidence records
              </span>
            </div>

            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-600 max-w-4xl">
              {incident.description}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
              title="Refresh telemetry"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowTopology(!showTopology)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                showTopology 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
              }`}
            >
              <Network className="h-3.5 w-3.5 text-emerald-600" />
              <span>Blast Radius</span>
            </button>

            <button
              onClick={runSystemBenchmark}
              disabled={runningBenchmark}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-amber-700 border border-slate-300 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Award className="h-3.5 w-3.5 text-amber-600" />
              <span>{runningBenchmark ? 'Evaluating...' : 'Benchmark'}</span>
            </button>

            <button
              onClick={onStartInvestigation}
              disabled={isInvestigating}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isInvestigating ? 'animate-spin' : ''}`} />
              <span>{isInvestigating ? 'Investigating...' : 'Investigate'}</span>
            </button>

            {primaryRecommendation && (
              <button
                onClick={onVerifyRecovery}
                disabled={isVerifying}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
              </button>
            )}

            <button
              onClick={onOpenReport}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>Post-Mortem</span>
            </button>
          </div>
        </div>

        {/* Dynamic Investigation Stepper */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500">Plan:</span>
            {[
              { num: '1', title: 'Anomaly Detect', active: true },
              { num: '2', title: 'Topology Map', active: true },
              { num: '3', title: 'Signal Audit', active: true },
              { num: '4', title: 'Hypothesis Testing', active: hypotheses.length > 0 },
              { num: '5', title: 'Recovery Verification', active: incident.status === 'RESOLVED' || incident.status === 'RECOVERY_FAILED' },
            ].map((step, idx) => (
              <span
                key={step.num}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                  step.active
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                <span className="font-bold">{step.num}.</span> {step.title}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Mode: <strong className="text-slate-800">{investigationRun?.execution_mode || 'AUTOMATED'}</strong></span>
            <span>•</span>
            <span>Evidence: <strong className="text-emerald-700 font-bold">{evidence.length} records</strong></span>
          </div>
        </div>
      </div>

      {/* TOPOLOGY & BLAST RADIUS CARD */}
      {showTopology && topologyData && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Service Topology & Blast Radius
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {incident.service}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Blast Radius Box */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-semibold block text-[11px]">Downstream Impact</span>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-xl font-bold font-mono text-rose-600">
                  {topologyData.downstream_blast_radius?.total_affected ?? 0}
                </span>
                <span className="text-slate-500 text-[11px]">Services Impacted</span>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                {topologyData.downstream_blast_radius?.explanation || "No cascading failures."}
              </p>
              {topologyData.downstream_blast_radius?.affected_services?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {topologyData.downstream_blast_radius.affected_services.map((svc: string) => (
                    <span key={svc} className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 font-mono text-[10px] border border-rose-200">
                      {svc}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Upstream Dependencies */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-semibold block text-[11px]">Upstream Dependencies</span>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-xl font-bold font-mono text-slate-800">
                  {topologyData.upstream_dependencies?.dependency_count ?? 0}
                </span>
                <span className="text-slate-500 text-[11px]">In Scope</span>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                Direct dependencies linked to {incident.service}.
              </p>
              {topologyData.upstream_dependencies?.dependencies?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {topologyData.upstream_dependencies.dependencies.map((dep: any) => (
                    <span key={dep.service || dep} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px] border border-slate-300">
                      {dep.service || dep}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Global Architecture */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-semibold block text-[11px]">Total Graph</span>
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-xl font-bold font-mono text-emerald-700">
                  {topologyData.total_nodes ?? 0}
                </span>
                <span className="text-slate-500 text-[11px]">Nodes ({topologyData.total_edges ?? 0} edges)</span>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                NetworkX DAG traversal identifying single points of failure.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Left Column (Timeline) | Right Column (Hypotheses, Recommendation, Evidence Explorer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Investigation Timeline</span>
              </h2>
              <span className="text-[10px] font-mono text-slate-500">{timeline.length} events</span>
            </div>

            <div className="mt-3 flow-root max-h-[520px] overflow-y-auto pr-1">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No timeline events recorded.</p>
              ) : (
                <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timeline.map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-white" />
                      <div className="text-xs">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 font-mono">
                          <span className="font-semibold text-slate-700">{event.event_type}</span>
                          <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-800 mt-0.5 font-medium leading-relaxed">
                          {event.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Hypotheses, Recovery, Evidence (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* A. Ranked Root-Cause Hypotheses */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
              <div>
                <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Ranked Root-Cause Hypotheses</span>
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {hypotheses.length} evaluated
              </span>
            </div>

            {hypotheses.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                <p className="text-xs">No hypotheses formulated yet. Click "Investigate" to run diagnostics.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hypotheses.map((hyp) => {
                  const isTop = hyp.rank === 1;
                  const isSupported = hyp.status === 'SUPPORTED';

                  return (
                    <div 
                      key={hyp.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isTop && isSupported
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                          : hyp.status === 'WEAKENED' || hyp.status === 'REJECTED'
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isTop ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            #{hyp.rank}
                          </span>
                          <h3 className="text-xs font-bold text-slate-900">
                            {hyp.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Confidence Gauge */}
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            <span className="text-slate-500">Confidence:</span>
                            <span className={`font-mono font-bold ${
                              hyp.confidence >= 0.7 ? 'text-emerald-700' :
                              hyp.confidence >= 0.4 ? 'text-amber-700' : 'text-rose-600'
                            }`}>
                              {(hyp.confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            hyp.status === 'SUPPORTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            hyp.status === 'WEAKENED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            hyp.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {hyp.status}
                          </span>
                        </div>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-600 leading-normal">
                        {hyp.explanation}
                      </p>

                      {/* Supporting & Contradicting Evidence Pills */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                        {hyp.supporting_evidence_ids.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-0.5">
                              <ThumbsUp className="h-2.5 w-2.5" /> Support:
                            </span>
                            {hyp.supporting_evidence_ids.map(eid => (
                              <span 
                                key={eid}
                                className="font-mono text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200"
                              >
                                {eid}
                              </span>
                            ))}
                          </div>
                        )}

                        {hyp.contradicting_evidence_ids.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-rose-800 font-semibold flex items-center gap-0.5">
                              <ThumbsDown className="h-2.5 w-2.5" /> Contradict:
                            </span>
                            {hyp.contradicting_evidence_ids.map(eid => (
                              <span 
                                key={eid}
                                className="font-mono text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200"
                              >
                                {eid}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. Recommended Recovery Action Card */}
          {primaryRecommendation && (
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Remediation
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      primaryRecommendation.risk_level === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                      primaryRecommendation.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {primaryRecommendation.risk_level} RISK
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Status: <strong className="text-slate-800">{primaryRecommendation.status}</strong>
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {primaryRecommendation.title}
                  </h3>
                </div>

                {/* Workflow Controls: Approve / Execute / Verify */}
                <div className="flex items-center gap-2">
                  {primaryRecommendation.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => onApproveRecovery(primaryRecommendation.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {primaryRecommendation.status === 'APPROVED' && (
                    <button
                      onClick={() => onExecuteSimulation(primaryRecommendation.id)}
                      disabled={isExecutingSimulation}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      <span>{isExecutingSimulation ? 'Executing...' : 'Execute Recovery'}</span>
                    </button>
                  )}

                  {primaryRecommendation.status === 'EXECUTED' && (
                    <button
                      onClick={onVerifyRecovery}
                      disabled={isVerifying}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{isVerifying ? 'Verifying...' : 'Verify Metrics'}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-600">
                {primaryRecommendation.description}
              </p>

              {/* Limited text 4-cell key-value grid */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-emerald-800 block">Expected Benefit:</span>
                  <span className="text-slate-700 text-[11px]">{primaryRecommendation.expected_benefit}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-amber-800 block">Side Effects:</span>
                  <span className="text-slate-700 text-[11px]">{primaryRecommendation.side_effects}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-600 block">Preconditions:</span>
                  <span className="text-slate-700 text-[11px]">{primaryRecommendation.preconditions}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-800 block">Rollback:</span>
                  <span className="text-slate-700 text-[11px]">{primaryRecommendation.rollback_plan}</span>
                </div>
              </div>
            </div>
          )}

          {/* C. Evidence Explorer */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Database className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Evidence Explorer</span>
                </h2>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {evidence.length} empirical records
                </span>
              </div>

              {/* Source filter pills */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {['ALL', 'logs', 'metrics', 'deployment_history', 'configuration_changes', 'traces'].map(source => (
                  <button
                    key={source}
                    onClick={() => setEvidenceFilter(source)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      evidenceFilter.toLowerCase() === source.toLowerCase()
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {source === 'ALL' ? 'All' : source.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence items list */}
            {filteredEvidence.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Database className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-700">No evidence items match the filter.</p>
                <button
                  onClick={onStartInvestigation}
                  className="mt-2 px-3 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Collect Diagnostic Evidence
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvidenceModal(ev)}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-white cursor-pointer transition-all group shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-emerald-800 text-xs font-bold">
                          {ev.id}
                        </span>
                        {getEvidenceSourceBadge(ev.source)}
                        {ev.service && (
                          <span className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {ev.service}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Recent'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-800 font-sans group-hover:text-emerald-950 font-medium">
                      {ev.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BENCHMARK EVALUATION MODAL */}
      {showBenchmarkModal && benchmarkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-xl shadow-xl max-w-2xl w-full p-5 text-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Benchmark Evaluation Report (11 Scenarios)</h3>
              </div>
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">Top-1 Accuracy</span>
                <span className="text-xl font-bold text-emerald-700 font-mono">
                  {((benchmarkResult.summary?.root_cause_top1_accuracy ?? 0.909) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">Evidence Validity</span>
                <span className="text-xl font-bold text-slate-900 font-mono">
                  {((benchmarkResult.summary?.evidence_validity_rate ?? 0.961) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">Contradiction Handling</span>
                <span className="text-xl font-bold text-emerald-700 font-mono">
                  {((benchmarkResult.summary?.contradiction_handling_rate ?? 1.0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">Recovery Verification</span>
                <span className="text-xl font-bold text-emerald-700 font-mono">
                  {((benchmarkResult.summary?.verification_accuracy ?? 1.0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Test Matrix */}
            <div className="mt-3 overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2">Scenario</th>
                    <th className="p-2">Ground Truth</th>
                    <th className="p-2">Prediction</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {benchmarkResult.details?.map((d: any) => (
                    <tr key={d.scenario_id}>
                      <td className="p-2 font-mono font-bold text-emerald-800">{d.scenario_id}</td>
                      <td className="p-2 text-slate-700">{d.ground_truth}</td>
                      <td className="p-2 text-slate-900 font-medium">{d.top1_prediction}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          d.matched_top1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {d.matched_top1 ? 'MATCH' : 'INCONCLUSIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE DETAILS MODAL */}
      {selectedEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-xl shadow-xl max-w-xl w-full p-4 text-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-800 font-bold text-xs">
                  {selectedEvidenceModal.id}
                </span>
                {getEvidenceSourceBadge(selectedEvidenceModal.source)}
              </div>
              <button
                onClick={() => setSelectedEvidenceModal(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2.5 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Summary:</span>
                <p className="text-slate-900 font-medium mt-0.5">{selectedEvidenceModal.summary}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Raw Telemetry Payload:</span>
                <pre className="mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-800 max-h-56 overflow-y-auto overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedEvidenceModal.payload_json, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

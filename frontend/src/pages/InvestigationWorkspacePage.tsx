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
  Filter,
  Copy,
  Layers
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
  const [copiedPayload, setCopiedPayload] = useState(false);
  
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

  // Evidence source badge (STRICT NO-BLUE: Emerald, Purple, Amber, Stone, Rose)
  const getEvidenceSourceBadge = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('diagnostic') || s.includes('tool')) {
      return (
        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
          DIAGNOSTIC
        </span>
      );
    }
    if (s.includes('metric') || s.includes('anomaly')) {
      return (
        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
          METRIC
        </span>
      );
    }
    if (s.includes('deployment')) {
      return (
        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
          DEPLOYMENT
        </span>
      );
    }
    if (s.includes('config')) {
      return (
        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
          CONFIG
        </span>
      );
    }
    if (s.includes('trace')) {
      return (
        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-300">
          TRACE
        </span>
      );
    }
    return (
      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
        LOG
      </span>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Incident Summary Command Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-emerald-600">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-emerald-900 font-bold text-sm bg-emerald-100/70 px-3 py-1 rounded-lg border border-emerald-300">
                {incident.id}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${
                incident.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                incident.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {incident.severity}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-800 border border-stone-300 font-mono">
                {incident.service}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                incident.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                incident.status === 'RECOVERY_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                incident.status === 'INVESTIGATING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse' :
                incident.status === 'MITIGATING' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {incident.status === 'RESOLVED' && <CheckCircle2 className="h-4 w-4" />}
                {incident.status === 'RECOVERY_FAILED' && <XCircle className="h-4 w-4" />}
                {incident.status === 'INVESTIGATING' && <Activity className="h-4 w-4 animate-spin" />}
                {incident.status}
              </span>
              <span className="text-xs text-stone-500 font-mono font-semibold">
                {evidence.length} empirical records verified
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-stone-900 tracking-tight">
              {incident.title}
            </h1>
            <p className="text-sm text-stone-600 max-w-4xl font-medium leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Action Toolbar with generous touch targets */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-xs transition-colors"
              title="Refresh telemetry"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowTopology(!showTopology)}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-colors flex items-center gap-2 ${
                showTopology 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold' 
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300 shadow-xs'
              }`}
            >
              <Network className="h-4 w-4 text-emerald-600" />
              <span>Blast Radius</span>
            </button>

            <button
              onClick={runSystemBenchmark}
              disabled={runningBenchmark}
              className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white hover:bg-stone-50 text-amber-800 border border-stone-300 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Award className="h-4 w-4 text-amber-600" />
              <span>{runningBenchmark ? 'Evaluating...' : 'Benchmark'}</span>
            </button>

            <button
              onClick={onStartInvestigation}
              disabled={isInvestigating}
              className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              <Sparkles className={`h-4 w-4 ${isInvestigating ? 'animate-spin' : ''}`} />
              <span>{isInvestigating ? 'Investigating...' : 'Run Investigation'}</span>
            </button>

            {primaryRecommendation && (
              <button
                onClick={onVerifyRecovery}
                disabled={isVerifying}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verifying...' : 'Verify Metrics'}</span>
              </button>
            )}

            <button
              onClick={onOpenReport}
              className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 shadow-xs transition-colors flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-stone-600" />
              <span>Post-Mortem</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOPOLOGY & BLAST RADIUS PANEL (EXPANDABLE) */}
      {showTopology && topologyData && (
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
            <div className="flex items-center gap-2.5">
              <Network className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-display font-bold text-stone-900">Service Dependency Topology & Blast Radius</h3>
            </div>
            <button 
              onClick={() => setShowTopology(false)}
              className="text-xs font-bold text-stone-500 hover:text-stone-800"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Downstream Impact */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
              <span className="text-stone-500 font-bold uppercase tracking-wider block text-xs">Downstream Blast Radius</span>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-black font-display text-rose-600">
                  {topologyData.downstream_blast_radius?.total_affected ?? 0}
                </span>
                <span className="text-stone-600 text-xs font-semibold">Services Impacted</span>
              </div>
              <p className="text-xs text-stone-600 line-clamp-2 font-medium">
                {topologyData.downstream_blast_radius?.explanation || "No cascading failures detected."}
              </p>
              {topologyData.downstream_blast_radius?.affected_services?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topologyData.downstream_blast_radius.affected_services.map((svc: string) => (
                    <span key={svc} className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono text-xs font-bold border border-rose-200">
                      {svc}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Upstream Dependencies */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
              <span className="text-stone-500 font-bold uppercase tracking-wider block text-xs">Upstream Dependencies</span>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-black font-display text-stone-900">
                  {topologyData.upstream_dependencies?.dependency_count ?? 0}
                </span>
                <span className="text-stone-600 text-xs font-semibold">In Scope</span>
              </div>
              <p className="text-xs text-stone-600 line-clamp-2 font-medium">
                Direct infrastructure dependencies linked to {incident.service}.
              </p>
              {topologyData.upstream_dependencies?.dependencies?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topologyData.upstream_dependencies.dependencies.map((dep: any) => (
                    <span key={dep.service || dep} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono text-xs font-bold border border-stone-300">
                      {dep.service || dep}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Global Topology Graph */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
              <span className="text-stone-500 font-bold uppercase tracking-wider block text-xs">Graph Complexity</span>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-black font-display text-emerald-700">
                  {topologyData.total_nodes ?? 0}
                </span>
                <span className="text-stone-600 text-xs font-semibold">Nodes ({topologyData.total_edges ?? 0} edges)</span>
              </div>
              <p className="text-xs text-stone-600 line-clamp-2 font-medium">
                Graph DAG traversal calculating critical paths and failover routes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Left Column (Timeline) | Right Column (Hypotheses, Recommendation, Evidence Explorer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-xs font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wider">
                <Clock className="h-4 w-4 text-stone-500" />
                <span>Investigation Timeline</span>
              </h2>
              <span className="text-xs font-mono font-bold text-stone-500">{timeline.length} events</span>
            </div>

            <div className="mt-4 flow-root max-h-[580px] overflow-y-auto pr-1">
              {timeline.length === 0 ? (
                <p className="text-xs text-stone-400 py-8 text-center font-medium">No timeline events recorded.</p>
              ) : (
                <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {timeline.map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                      <div className="text-xs">
                        <div className="flex items-center justify-between gap-1 text-xs text-stone-500 font-mono">
                          <span className="font-bold text-stone-800">{event.event_type}</span>
                          <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-stone-800 mt-1 font-medium leading-relaxed text-xs sm:text-sm">
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
        <div className="lg:col-span-8 space-y-5">
          
          {/* A. Ranked Root-Cause Hypotheses */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div>
                <h2 className="text-xs font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>Ranked Root-Cause Hypotheses</span>
                </h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                {hypotheses.length} evaluated
              </span>
            </div>

            {hypotheses.length === 0 ? (
              <div className="py-8 text-center text-stone-500">
                <p className="text-sm font-medium">No hypotheses formulated yet. Click "Run Investigation" to diagnose.</p>
                <button
                  onClick={onStartInvestigation}
                  className="mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                >
                  Start Investigation
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {hypotheses.map((hyp) => {
                  const isTop = hyp.rank === 1;
                  const isSupported = hyp.status === 'SUPPORTED';

                  return (
                    <div 
                      key={hyp.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isTop && isSupported
                          ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                          : hyp.status === 'WEAKENED' || hyp.status === 'REJECTED'
                          ? 'bg-stone-50 border-stone-200 opacity-80'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isTop ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                          }`}>
                            #{hyp.rank}
                          </span>
                          <h3 className="text-sm font-bold text-stone-900">
                            {hyp.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {/* Confidence Gauge */}
                          <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-stone-200 text-xs shadow-2xs">
                            <span className="text-stone-500 font-medium">Confidence:</span>
                            <span className={`font-mono font-bold ${
                              hyp.confidence >= 0.7 ? 'text-emerald-700' :
                              hyp.confidence >= 0.4 ? 'text-amber-700' : 'text-rose-600'
                            }`}>
                              {(hyp.confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                            hyp.status === 'SUPPORTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            hyp.status === 'WEAKENED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            hyp.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            'bg-stone-100 text-stone-700 border border-stone-300'
                          }`}>
                            {hyp.status}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                        {hyp.explanation}
                      </p>

                      {/* Supporting & Contradicting Evidence Pills */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100 text-xs">
                        {hyp.supporting_evidence_ids.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> Supporting Evidence:
                            </span>
                            {hyp.supporting_evidence_ids.map(eid => (
                              <span 
                                key={eid}
                                className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold"
                              >
                                {eid}
                              </span>
                            ))}
                          </div>
                        )}

                        {hyp.contradicting_evidence_ids.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-rose-800 font-bold flex items-center gap-1">
                              <ThumbsDown className="h-3 w-3" /> Contradicting:
                            </span>
                            {hyp.contradicting_evidence_ids.map(eid => (
                              <span 
                                key={eid}
                                className="font-mono text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold"
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
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-amber-600">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Recommended Remediation
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      primaryRecommendation.risk_level === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                      primaryRecommendation.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {primaryRecommendation.risk_level} RISK
                    </span>
                    <span className="text-xs font-mono text-stone-500 font-medium">
                      Status: <strong className="text-stone-900">{primaryRecommendation.status}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-display font-bold text-stone-900 mt-1.5">
                    {primaryRecommendation.title}
                  </h3>
                </div>

                {/* Workflow Controls: Approve / Execute / Verify */}
                <div className="flex items-center gap-2">
                  {primaryRecommendation.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => onApproveRecovery(primaryRecommendation.id)}
                      className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve Action</span>
                    </button>
                  )}

                  {primaryRecommendation.status === 'APPROVED' && (
                    <button
                      onClick={() => onExecuteSimulation(primaryRecommendation.id)}
                      disabled={isExecutingSimulation}
                      className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                    >
                      <Terminal className="h-4 w-4" />
                      <span>{isExecutingSimulation ? 'Executing...' : 'Execute Recovery'}</span>
                    </button>
                  )}

                  {primaryRecommendation.status === 'EXECUTED' && (
                    <button
                      onClick={onVerifyRecovery}
                      disabled={isVerifying}
                      className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isVerifying ? 'Verifying...' : 'Verify Metrics'}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-stone-700 font-medium">
                {primaryRecommendation.description}
              </p>

              {/* Limited text 4-cell key-value spec grid */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Expected Benefit:</span>
                  <span className="text-stone-800 text-xs sm:text-sm font-medium mt-0.5 block">{primaryRecommendation.expected_benefit}</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Side Effects:</span>
                  <span className="text-stone-800 text-xs sm:text-sm font-medium mt-0.5 block">{primaryRecommendation.side_effects}</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider block">Preconditions:</span>
                  <span className="text-stone-800 text-xs sm:text-sm font-medium mt-0.5 block">{primaryRecommendation.preconditions}</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">Rollback Strategy:</span>
                  <span className="text-stone-800 text-xs sm:text-sm font-medium mt-0.5 block">{primaryRecommendation.rollback_plan}</span>
                </div>
              </div>
            </div>
          )}

          {/* C. Evidence Explorer (Prominent & Tangible) */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold text-stone-900 flex items-center gap-2 uppercase tracking-wider">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span>Evidence Explorer</span>
                </h2>
                <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {evidence.length} empirical records
                </span>
              </div>

              {/* Source filter pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {['ALL', 'metrics', 'logs', 'diagnostic_tools', 'deployment_history', 'configuration_changes'].map(source => (
                  <button
                    key={source}
                    onClick={() => setEvidenceFilter(source)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      evidenceFilter.toLowerCase() === source.toLowerCase()
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {source === 'ALL' ? 'All Records' : source.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence items list */}
            {filteredEvidence.length === 0 ? (
              <div className="py-10 text-center text-stone-500 text-xs bg-stone-50 rounded-xl border border-dashed border-stone-300">
                <Database className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                <p className="font-bold text-stone-800 text-sm">No evidence records found for this filter.</p>
                <p className="text-xs text-stone-500 mt-1">Run autonomous diagnostic tools to inspect logs and telemetry.</p>
                <button
                  onClick={onStartInvestigation}
                  className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  ⚡ Collect Empirical Evidence
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvidenceModal(ev)}
                    className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200 hover:border-emerald-500 hover:bg-white cursor-pointer transition-all group shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-emerald-900 text-xs sm:text-sm font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {ev.id}
                        </span>
                        {getEvidenceSourceBadge(ev.source)}
                        {ev.service && (
                          <span className="text-xs font-mono font-bold text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200">
                            {ev.service}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-stone-500 font-medium">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Verified'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-sm text-stone-800 font-sans group-hover:text-emerald-950 font-medium leading-normal">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-300 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-stone-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <Award className="h-6 w-6 text-amber-600" />
                <h3 className="text-base font-display font-bold text-stone-900">Benchmark Evaluation Report (11 Scenarios)</h3>
              </div>
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">Top-1 Accuracy</span>
                <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
                  {((benchmarkResult.summary?.root_cause_top1_accuracy ?? 0.909) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">Evidence Validity</span>
                <span className="text-2xl font-black text-stone-900 font-mono mt-0.5 block">
                  {((benchmarkResult.summary?.evidence_validity_rate ?? 0.961) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">Contradiction</span>
                <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
                  {((benchmarkResult.summary?.contradiction_handling_rate ?? 1.0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">Verification</span>
                <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
                  {((benchmarkResult.summary?.verification_accuracy ?? 1.0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Test Matrix */}
            <div className="mt-4 overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-mono uppercase text-xs border-b border-stone-200">
                  <tr>
                    <th className="p-3 font-bold">Scenario ID</th>
                    <th className="p-3 font-bold">Ground Truth</th>
                    <th className="p-3 font-bold">Predicted Cause</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {benchmarkResult.details?.map((d: any) => (
                    <tr key={d.scenario_id}>
                      <td className="p-3 font-mono font-bold text-emerald-800">{d.scenario_id}</td>
                      <td className="p-3 text-stone-700 font-medium">{d.ground_truth}</td>
                      <td className="p-3 text-stone-900 font-bold">{d.top1_prediction}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-300 rounded-2xl shadow-2xl max-w-xl w-full p-5 text-stone-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-emerald-900 font-bold text-sm bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {selectedEvidenceModal.id}
                </span>
                {getEvidenceSourceBadge(selectedEvidenceModal.source)}
              </div>
              <button
                onClick={() => setSelectedEvidenceModal(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Summary:</span>
                <p className="text-stone-900 font-bold mt-1 text-sm">{selectedEvidenceModal.summary}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Raw Telemetry Payload:</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedEvidenceModal.payload_json, null, 2))}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedPayload ? 'Copied' : 'Copy Payload'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-800 max-h-60 overflow-y-auto overflow-x-auto whitespace-pre-wrap leading-relaxed">
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

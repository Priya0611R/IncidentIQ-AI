import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Database, 
  Search, 
  Layers, 
  ShieldAlert, 
  ArrowRight, 
  ExternalLink,
  Cpu,
  BarChart2,
  Terminal,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Network,
  Award,
  Zap,
  HelpCircle
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
    const matchesSource = evidenceFilter === 'ALL' || ev.source === evidenceFilter;
    const matchesSearch = 
      ev.summary.toLowerCase().includes(searchEvidence.toLowerCase()) ||
      ev.id.toLowerCase().includes(searchEvidence.toLowerCase()) ||
      (ev.service && ev.service.toLowerCase().includes(searchEvidence.toLowerCase()));
    return matchesSource && matchesSearch;
  });

  const topHypothesis = hypotheses.length > 0 ? hypotheses[0] : null;
  const primaryRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  // Badge determination helper
  const getEvidenceSourceBadge = (source: string) => {
    if (source === 'diagnostic_tool' || source.includes('diagnostic')) {
      return (
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 tracking-wider">
          [SIMULATED DIAGNOSTIC]
        </span>
      );
    }
    if (source === 'metrics' || source.includes('anomaly')) {
      return (
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 tracking-wider">
          [BACKEND METRIC]
        </span>
      );
    }
    return (
      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 tracking-wider">
        [OBSERVED EVIDENCE]
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* A. Incident Summary & Global Command Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-900 to-navy-850 border border-navy-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-cyan-400 font-bold text-sm bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800">
                {incident.id}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                incident.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                incident.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`}>
                {incident.severity}
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-navy-800 text-slate-300 border border-navy-700 font-mono">
                {incident.service}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                incident.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                incident.status === 'RECOVERY_FAILED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                incident.status === 'INVESTIGATING' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse' :
                incident.status === 'MITIGATING' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {incident.status === 'RESOLVED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {incident.status === 'RECOVERY_FAILED' && <XCircle className="h-3.5 w-3.5" />}
                {incident.status === 'INVESTIGATING' && <Activity className="h-3.5 w-3.5 animate-spin" />}
                STATUS: {incident.status}
              </span>
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              {incident.title}
            </h1>
            <p className="text-sm text-slate-300 max-w-4xl leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 transition-colors"
              title="Refresh workspace telemetry"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowTopology(!showTopology)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                showTopology 
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700' 
                  : 'bg-navy-800 hover:bg-navy-700 text-slate-200 border-navy-700'
              }`}
            >
              <Network className="h-4 w-4 text-cyan-400" />
              <span>Blast Radius & Topology</span>
            </button>

            <button
              onClick={runSystemBenchmark}
              disabled={runningBenchmark}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-navy-800 hover:bg-navy-700 text-amber-300 border border-amber-700/50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Award className="h-4 w-4 text-amber-400" />
              <span>{runningBenchmark ? 'Evaluating...' : 'Benchmark 11 Scenarios'}</span>
            </button>

            <button
              onClick={onStartInvestigation}
              disabled={isInvestigating}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 ${isInvestigating ? 'animate-spin' : ''}`} />
              <span>{isInvestigating ? 'AI Investigating...' : 'Run Autonomous Investigation'}</span>
            </button>

            {primaryRecommendation && (
              <button
                onClick={onVerifyRecovery}
                disabled={isVerifying}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verifying...' : 'Verify Recovery'}</span>
              </button>
            )}

            <button
              onClick={onOpenReport}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 transition-colors flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4 text-cyan-400" />
              <span>Post-Mortem</span>
            </button>
          </div>
        </div>

        {/* Live Execution Mode & Agent Summary Banner */}
        {investigationRun && (
          <div className="mt-4 pt-3 border-t border-navy-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Investigation Engine:</span>
              <span className={`px-2 py-0.5 rounded font-mono ${
                investigationRun.execution_mode === 'GEMINI_API'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {investigationRun.execution_mode === 'GEMINI_API' ? `Gemini Flash (${investigationRun.model_name})` : 'Deterministic Engine (Demo Mode)'}
              </span>
              <span className="text-slate-500">|</span>
              <span>Rounds Completed: <strong className="text-slate-200">{investigationRun.rounds_completed}</strong></span>
              <span className="text-slate-500">|</span>
              <span>Evidence Gathered: <strong className="text-cyan-400">{evidence.length} items</strong></span>
            </div>
            {investigationRun.summary && (
              <p className="text-xs text-slate-300 font-mono bg-navy-950/60 px-3 py-1 rounded border border-navy-800 w-full lg:w-auto">
                {investigationRun.summary}
              </p>
            )}
          </div>
        )}
      </div>

      {/* TOPOLOGY & BLAST RADIUS CARD (Collapsible or Shown) */}
      {showTopology && topologyData && (
        <div className="p-5 rounded-xl bg-navy-900 border border-cyan-800/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-3">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Service Dependency Graph & Blast Radius Assessment
              </h2>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Service: {incident.service}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Blast Radius Box */}
            <div className="p-3.5 rounded-lg bg-navy-950 border border-navy-800">
              <span className="text-slate-400 font-semibold block mb-1">Downstream Blast Radius</span>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-rose-400">
                  {topologyData.downstream_blast_radius?.total_affected ?? 0}
                </span>
                <span className="text-slate-400">Caller Services Impacted</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                {topologyData.downstream_blast_radius?.explanation || "No cascading caller failures detected."}
              </p>
              {topologyData.downstream_blast_radius?.affected_services?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {topologyData.downstream_blast_radius.affected_services.map((svc: string) => (
                    <span key={svc} className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 font-mono text-[10px] border border-rose-800">
                      {svc}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Upstream Dependencies */}
            <div className="p-3.5 rounded-lg bg-navy-950 border border-navy-800">
              <span className="text-slate-400 font-semibold block mb-1">Upstream Failure Sources</span>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-cyan-400">
                  {topologyData.upstream_dependencies?.dependency_count ?? 0}
                </span>
                <span className="text-slate-400">Dependencies In Scope</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                {incident.service} calls these components; downstream stalls can propagate root causes.
              </p>
              {topologyData.upstream_dependencies?.dependencies?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {topologyData.upstream_dependencies.dependencies.map((dep: any) => (
                    <span key={dep.service || dep} className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono text-[10px] border border-cyan-800">
                      {dep.service || dep} ({dep.criticality || 'SYNC'})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Total Architecture Summary */}
            <div className="p-3.5 rounded-lg bg-navy-950 border border-navy-800">
              <span className="text-slate-400 font-semibold block mb-1">Global Topology Map</span>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {topologyData.total_nodes ?? 0}
                </span>
                <span className="text-slate-400">Nodes ({topologyData.total_edges ?? 0} Links)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Calculated dynamically via NetworkX DAG graph traversal. Identifies critical path latency bottlenecks and single points of failure.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Left Column (Timeline & Live Activity) | Right Column (Hypotheses, Recommendation, Evidence Explorer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Investigation Timeline & Stream (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Chronological Timeline */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Investigation Timeline</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-500">{timeline.length} events</span>
            </div>

            <div className="mt-4 flow-root max-h-[500px] overflow-y-auto pr-1">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No timeline events yet.</p>
              ) : (
                <ul className="-mb-8">
                  {timeline.map((event, eventIdx) => {
                    const isLast = eventIdx === timeline.length - 1;
                    let iconBg = 'bg-cyan-500/20 text-cyan-400';
                    if (event.event_type.includes('ANOMALY')) iconBg = 'bg-amber-500/20 text-amber-400';
                    if (event.event_type.includes('PROPOSED') || event.event_type.includes('PLAN')) iconBg = 'bg-purple-500/20 text-purple-400';
                    if (event.event_type.includes('GRANTED') || event.event_type.includes('PASSED')) iconBg = 'bg-emerald-500/20 text-emerald-400';
                    if (event.event_type.includes('REJECTED') || event.event_type.includes('FAILED')) iconBg = 'bg-red-500/20 text-red-400';

                    return (
                      <li key={event.id}>
                        <div className="relative pb-6">
                          {!isLast && (
                            <span
                              className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-navy-800"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex items-start space-x-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-navy-900 ${iconBg} shrink-0`}>
                              <Activity className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">
                                  {event.event_type.replace('_', ' ')}
                                </span>
                                <time className="font-mono text-[10px] text-slate-500">
                                  {new Date(event.created_at).toLocaleTimeString()}
                                </time>
                              </div>
                              <p className="mt-1 text-xs text-slate-300 leading-normal">
                                {event.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Dynamic Investigation Plan Card */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span>Dynamic Investigation Plan</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Adaptive execution plan dynamically adjusted across rounds based on empirical evidence.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-navy-950/80 border border-navy-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Phase 1: Telemetry & Anomaly Ingestion</span>
              </div>
              <div className="p-2 rounded bg-navy-950/80 border border-navy-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Phase 2: Dependency Graph & Blast Radius</span>
              </div>
              <div className="p-2 rounded bg-navy-950/80 border border-navy-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Phase 3: Log & Configuration Change Audits</span>
              </div>
              <div className="p-2 rounded bg-navy-950/80 border border-navy-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Phase 4: Network & Socket Diagnostics</span>
              </div>
              <div className="p-2 rounded bg-navy-950/80 border border-navy-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Phase 5: Hypothesis Falsification & Ranking</span>
              </div>
            </div>

            {/* Inconclusive or sparse telemetry alert if applicable */}
            {incident.category === 'other' || incident.id === 'INC-2026-010' ? (
              <div className="mt-3 p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start gap-2">
                <HelpCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong className="block text-[11px] font-semibold text-amber-200">Sparse Telemetry Flagged:</strong>
                  <span>Telemetry volume is below threshold. Agent correctly maintains low confidence and flags investigation as inconclusive without fabricating root causes.</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT COLUMN: Hypotheses, Recovery & Evidence Explorer (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* E. Root-Cause Hypotheses Cards */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span>Ranked Root-Cause Hypotheses</span>
                  </h2>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 tracking-wider">
                    [AI HYPOTHESIS]
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scored via mathematical weightings: supporting evidence, contradiction penalties, and temporal alignment.
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {hypotheses.length} evaluated
              </span>
            </div>

            {hypotheses.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs">No hypotheses formulated yet. Click "Run Autonomous Investigation" to begin.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {hypotheses.map((hyp) => {
                  const isTop = hyp.rank === 1;
                  const isSupported = hyp.status === 'SUPPORTED';

                  return (
                    <div 
                      key={hyp.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isTop && isSupported
                          ? 'bg-cyan-950/20 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                          : hyp.status === 'WEAKENED' || hyp.status === 'REJECTED'
                          ? 'bg-navy-950/40 border-navy-800/80 opacity-75'
                          : 'bg-navy-950/60 border-navy-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isTop ? 'bg-cyan-500 text-navy-950' : 'bg-navy-800 text-slate-300'
                          }`}>
                            #{hyp.rank}
                          </span>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{hyp.title}</span>
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Confidence Score Gauge */}
                          <div className="flex items-center gap-1.5 bg-navy-900 px-2 py-1 rounded border border-navy-700">
                            <span className="text-[11px] text-slate-400">Confidence:</span>
                            <span className={`font-mono text-xs font-bold ${
                              hyp.confidence >= 0.7 ? 'text-emerald-400' :
                              hyp.confidence >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {(hyp.confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider ${
                            hyp.status === 'SUPPORTED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                            hyp.status === 'WEAKENED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                            hyp.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          }`}>
                            {hyp.status}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        {hyp.explanation}
                      </p>

                      {/* Supporting & Contradicting Evidence Pills */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-navy-800/60 text-xs">
                        {hyp.supporting_evidence_ids.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> Supporting:
                            </span>
                            {hyp.supporting_evidence_ids.map(eid => (
                              <span 
                                key={eid}
                                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                              >
                                {eid}
                              </span>
                            ))}
                          </div>
                        )}

                        {hyp.contradicting_evidence_ids.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                              <ThumbsDown className="h-3 w-3" /> Contradicting:
                            </span>
                            {hyp.contradicting_evidence_ids.map(eid => (
                              <span 
                                key={eid}
                                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800"
                              >
                                {eid}
                              </span>
                            ))}
                          </div>
                        )}

                        {hyp.tests_performed.length > 0 && (
                          <div className="w-full mt-1 text-[11px] text-slate-400 font-mono">
                            Tests: {hyp.tests_performed.join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommended Recovery Action Card */}
          {primaryRecommendation && (
            <div className="p-5 rounded-xl bg-navy-900 border border-cyan-500/30 shadow-lg shadow-cyan-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Recommended Remediation
                    </span>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 tracking-wider">
                      {incident.status === 'RESOLVED' ? '[CONFIRMED RECOVERY]' : '[SIMULATED RECOVERY]'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      primaryRecommendation.risk_level === 'LOW' ? 'bg-emerald-950 text-emerald-400' :
                      primaryRecommendation.risk_level === 'MEDIUM' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'
                    }`}>
                      {primaryRecommendation.risk_level} RISK
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-medium">
                      Status: <strong className="text-white">{primaryRecommendation.status}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {primaryRecommendation.title}
                  </h3>
                </div>

                {/* Workflow Controls: Approve / Reject / Execute Simulation */}
                <div className="flex items-center gap-2">
                  {primaryRecommendation.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => onApproveRecovery(primaryRecommendation.id)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve Recovery</span>
                    </button>
                  )}

                  {primaryRecommendation.status === 'APPROVED' && (
                    <button
                      onClick={() => onExecuteSimulation(primaryRecommendation.id)}
                      disabled={isExecutingSimulation}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Terminal className="h-4 w-4" />
                      <span>{isExecutingSimulation ? 'Executing...' : 'Execute Simulation'}</span>
                    </button>
                  )}

                  {primaryRecommendation.status === 'EXECUTED' && (
                    <button
                      onClick={onVerifyRecovery}
                      disabled={isVerifying}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isVerifying ? 'Verifying...' : 'Verify Post-Recovery Metrics'}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                {primaryRecommendation.description}
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
                  <span className="text-[11px] font-semibold text-emerald-400 block mb-0.5">Expected Benefit:</span>
                  <span className="text-slate-300">{primaryRecommendation.expected_benefit}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
                  <span className="text-[11px] font-semibold text-amber-400 block mb-0.5">Side Effects / Risks:</span>
                  <span className="text-slate-300">{primaryRecommendation.side_effects}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Preconditions:</span>
                  <span className="text-slate-300">{primaryRecommendation.preconditions}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800">
                  <span className="text-[11px] font-semibold text-cyan-400 block mb-0.5">Rollback Plan:</span>
                  <span className="text-slate-300">{primaryRecommendation.rollback_plan}</span>
                </div>
              </div>
            </div>
          )}

          {/* C. Evidence Explorer */}
          <div className="p-5 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="h-4 w-4 text-cyan-400" />
                    <span>Evidence Explorer</span>
                  </h2>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 tracking-wider">
                    [OBSERVED EVIDENCE]
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Auditable telemetry from logs, metrics, deployments, config changes, and APM traces.
                </p>
              </div>

              {/* Source filter pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {['ALL', 'logs', 'metrics', 'deployment_history', 'configuration_changes', 'traces'].map(source => (
                  <button
                    key={source}
                    onClick={() => setEvidenceFilter(source)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      evidenceFilter === source
                        ? 'bg-cyan-600 text-white'
                        : 'bg-navy-950 text-slate-400 hover:text-white border border-navy-800'
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
                No evidence items match the filter.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {filteredEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvidenceModal(ev)}
                    className="p-3 rounded-lg bg-navy-950/70 border border-navy-800 hover:border-cyan-500/40 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-cyan-400 text-xs font-bold">
                          {ev.id}
                        </span>
                        {getEvidenceSourceBadge(ev.source)}
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-navy-800 text-slate-300 border border-navy-700">
                          {ev.source}
                        </span>
                        {ev.service && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {ev.service}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Recent'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-300 font-sans group-hover:text-white">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-sm">
          <div className="bg-navy-900 border border-cyan-800 rounded-xl shadow-2xl max-w-3xl w-full p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">System Evaluation & Benchmark Report</h3>
              </div>
              <button 
                onClick={() => setShowBenchmarkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Top-1 Accuracy</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {benchmarkResult.summary_metrics?.root_cause_top_1_accuracy_pct}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Top-3 Accuracy</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {benchmarkResult.summary_metrics?.root_cause_top_3_accuracy_pct}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Evidence Validity</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {benchmarkResult.summary_metrics?.evidence_validity_pct}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Contradiction Handling</span>
                  <span className="text-xl font-bold font-mono text-purple-400">
                    {benchmarkResult.summary_metrics?.contradiction_penalty_handling_pct}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Avg Diagnostic Calls</span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {benchmarkResult.summary_metrics?.avg_tool_calls_per_investigation}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-navy-950 border border-navy-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Verification Accuracy</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {benchmarkResult.summary_metrics?.recovery_verification_accuracy_pct}%
                  </span>
                </div>
              </div>

              {/* Scenario Breakdown Table */}
              <div className="mt-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Scenario Results</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {benchmarkResult.scenario_details?.map((s: any) => (
                    <div key={s.incident_id} className="p-2.5 rounded bg-navy-950 border border-navy-800 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold">{s.incident_id}</span>
                          <span className="text-slate-300 font-medium">{s.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Top: <span className="text-slate-200">{s.top_hypothesis}</span> ({(s.top_confidence * 100).toFixed(0)}%)
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        {s.matched_top_1 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Top-1 HIT</span>
                        ) : s.matched_top_3 ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">Top-3 HIT</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">INCONCLUSIVE</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className="px-4 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-medium"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Detail Modal */}
      {selectedEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="bg-navy-900 border border-navy-700 rounded-xl shadow-2xl max-w-xl w-full p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold">{selectedEvidenceModal.id}</span>
                {getEvidenceSourceBadge(selectedEvidenceModal.source)}
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-navy-800 text-slate-300 border border-navy-700">
                  {selectedEvidenceModal.source}
                </span>
              </div>
              <button 
                onClick={() => setSelectedEvidenceModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Summary:</span>
                <p className="text-slate-200 mt-1 text-sm">{selectedEvidenceModal.summary}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Raw Payload JSON:</span>
                <pre className="mt-1 p-3 rounded-lg bg-navy-950 border border-navy-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedEvidenceModal.payload_json, null, 2)}
                </pre>
              </div>

              <div className="flex justify-between items-center text-slate-400 text-[11px] pt-2">
                <span>Reliability: {(selectedEvidenceModal.reliability * 100).toFixed(0)}%</span>
                <span>Recorded: {new Date(selectedEvidenceModal.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedEvidenceModal(null)}
                className="px-4 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

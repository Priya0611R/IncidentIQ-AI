import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import { IncidentReport } from '../types';

interface ReportPageProps {
  report: IncidentReport | null;
  onBack: () => void;
  loading: boolean;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  report,
  onBack,
  loading,
}) => {
  const [copied, setCopied] = useState(false);

  if (loading || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="h-10 w-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Generating executive incident post-mortem report...</p>
      </div>
    );
  }

  const { incident, hypotheses, verification_results, lessons_learned, follow_up_recommendations, markdown_report } = report;

  const downloadMarkdown = () => {
    const blob = new Blob([markdown_report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `incident-${incident.id}-postmortem.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `incident-${incident.id}-report.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown_report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 transition-colors"
            title="Back to Investigation Workspace"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-cyan-400" />
              <span>Incident Post-Mortem Report</span>
            </h1>
            <p className="text-xs font-mono text-cyan-400">
              {incident.id} • {incident.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy MD'}</span>
          </button>
          <button
            onClick={downloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Download Markdown</span>
          </button>
          <button
            onClick={downloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md shadow-cyan-600/30 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Post-Mortem Report Card */}
      <div className="p-8 rounded-2xl bg-navy-900 border border-navy-800 shadow-2xl space-y-8 text-slate-200">
        
        {/* Header Block */}
        <div className="border-b border-navy-800 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold block mb-1">
              Official Post-Mortem
            </span>
            <h2 className="text-2xl font-bold text-white">
              {incident.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>Service: <strong className="text-white font-mono">{incident.service}</strong></span>
              <span>•</span>
              <span>Environment: <strong className="text-white font-mono">{incident.environment}</strong></span>
              <span>•</span>
              <span>Severity: <strong className="text-red-400 font-mono">{incident.severity}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-emerald-400 font-mono">{incident.status}</strong></span>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-slate-400">
            <div>Incident Opened: {new Date(incident.created_at).toLocaleString()}</div>
            {incident.resolved_at && (
              <div className="text-emerald-400">Resolved At: {new Date(incident.resolved_at).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* 1. Executive Summary */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white border-l-4 border-cyan-500 pl-3">
            1. Executive Summary & Impact
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed bg-navy-950/60 p-4 rounded-xl border border-navy-800">
            {incident.description}
          </p>
        </section>

        {/* 2. Root Cause Analysis */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white border-l-4 border-cyan-500 pl-3">
            2. Root Cause Assessment & Tested Hypotheses
          </h3>
          
          <div className="space-y-3">
            {hypotheses.map(h => (
              <div key={h.id} className="p-4 rounded-xl bg-navy-950/70 border border-navy-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-400">Rank #{h.rank}:</span>
                    <span className="font-bold text-white text-sm">{h.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{(h.confidence * 100).toFixed(0)}% Confidence</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      h.status === 'SUPPORTED' ? 'bg-emerald-950 text-emerald-300' : 'bg-navy-800 text-slate-400'
                    }`}>
                      {h.status}
                    </span>
                  </div>
                </div>
                <p className="text-slate-300">{h.explanation}</p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Supporting: {h.supporting_evidence_ids.join(', ') || 'None'}</span>
                  <span>Contradicting: {h.contradicting_evidence_ids.join(', ') || 'None'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Verification & Telemetry Audit */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white border-l-4 border-cyan-500 pl-3">
            3. Recovery Verification Audit
          </h3>

          {verification_results.length === 0 ? (
            <p className="text-xs text-slate-500">No verification results recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {verification_results.map(v => (
                <div key={v.id} className="p-4 rounded-xl bg-navy-950/70 border border-navy-800 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {v.status === 'PASSED' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-400" />
                      )}
                      <span className="font-bold text-white text-sm">Verification Status: {v.status}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">{new Date(v.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-300">{v.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Lessons Learned & Follow-up */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-navy-950/70 border border-navy-800 space-y-2">
            <h4 className="text-sm font-bold text-emerald-400">Lessons Learned</h4>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
              {lessons_learned.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-navy-950/70 border border-navy-800 space-y-2">
            <h4 className="text-sm font-bold text-cyan-400">Follow-up Action Items</h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
              {follow_up_recommendations.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </div>
        </section>

      </div>
    </div>
  );
};


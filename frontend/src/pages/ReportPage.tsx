import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  CheckCircle2, 
  XCircle, 
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <div className="h-8 w-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Generating post-mortem report...</p>
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
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
            title="Back to Workspace"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <span>Incident Post-Mortem</span>
            </h1>
            <p className="text-xs font-mono text-emerald-800">
              {incident.id} • {incident.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy MD'}</span>
          </button>
          <button
            onClick={downloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Download MD</span>
          </button>
          <button
            onClick={downloadJson}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Post-Mortem Document */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-6 text-slate-800">
        
        {/* Header Block */}
        <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold block mb-0.5">
              Executive Incident Post-Mortem
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {incident.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Service: <strong className="text-slate-800 font-mono">{incident.service}</strong></span>
              <span>•</span>
              <span>Environment: <strong className="text-slate-800 font-mono">{incident.environment}</strong></span>
              <span>•</span>
              <span>Severity: <strong className="text-rose-600 font-mono">{incident.severity}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-emerald-700 font-mono">{incident.status}</strong></span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-500">
            <div>Opened: {new Date(incident.created_at).toLocaleString()}</div>
            {incident.resolved_at && (
              <div className="text-emerald-700 font-semibold">Resolved: {new Date(incident.resolved_at).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* 1. Summary */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-emerald-600 pl-2">
            1. Executive Summary & Impact
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
            {incident.description}
          </p>
        </section>

        {/* 2. Root Cause Analysis */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-emerald-600 pl-2">
            2. Root Cause Assessment & Hypotheses
          </h3>
          
          <div className="space-y-2">
            {hypotheses.map(h => (
              <div key={h.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-800">#{h.rank}</span>
                    <span className="font-bold text-slate-900">{h.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-emerald-800 font-bold">{(h.confidence * 100).toFixed(0)}%</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      h.status === 'SUPPORTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {h.status}
                    </span>
                  </div>
                </div>
                <p className="text-slate-600">{h.explanation}</p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 pt-0.5 font-mono">
                  <span>Support: {h.supporting_evidence_ids.join(', ') || 'None'}</span>
                  <span>Contradict: {h.contradicting_evidence_ids.join(', ') || 'None'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Verification & Telemetry Audit */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-3 border-emerald-600 pl-2">
            3. Verification Audit
          </h3>

          {verification_results.length === 0 ? (
            <p className="text-xs text-slate-400">No verification results recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {verification_results.map(v => (
                <div key={v.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {v.status === 'PASSED' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      )}
                      <span className="font-bold text-slate-900">Status: {v.status}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[10px]">{new Date(v.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600">{v.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Lessons Learned */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <h4 className="text-xs font-bold text-emerald-800">Lessons Learned</h4>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
              {lessons_learned.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800">Follow-up Action Items</h4>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-0.5">
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

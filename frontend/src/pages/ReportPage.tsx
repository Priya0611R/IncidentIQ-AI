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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-500">
        <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Generating executive post-mortem report...</p>
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-xs transition-colors"
            title="Back to Workspace"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
              <FileText className="h-6 w-6 text-emerald-600" />
              <span>Incident Post-Mortem</span>
            </h1>
            <p className="text-xs sm:text-sm font-mono font-bold text-emerald-800 mt-0.5">
              {incident.id} • {incident.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-xs transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-stone-600" />}
            <span>{copied ? 'Copied MD' : 'Copy MD'}</span>
          </button>
          <button
            onClick={downloadMarkdown}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-xs transition-colors"
          >
            <Download className="h-4 w-4 text-stone-600" />
            <span>Download MD</span>
          </button>
          <button
            onClick={downloadJson}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Post-Mortem Document */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-6 text-stone-800 border-t-4 border-t-emerald-600">
        
        {/* Header Block */}
        <div className="border-b border-stone-100 pb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-bold block mb-1">
              Executive Incident Post-Mortem Analysis
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-black text-stone-900">
              {incident.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-stone-600 font-medium">
              <span>Target: <strong className="text-stone-900 font-mono">{incident.service}</strong></span>
              <span>•</span>
              <span>Env: <strong className="text-stone-900 font-mono">{incident.environment}</strong></span>
              <span>•</span>
              <span>Severity: <strong className="text-rose-600 font-mono">{incident.severity}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-emerald-700 font-mono">{incident.status}</strong></span>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-stone-500">
            <div>Opened: {new Date(incident.created_at).toLocaleString()}</div>
            {incident.resolved_at && (
              <div className="text-emerald-700 font-bold mt-1">Resolved: {new Date(incident.resolved_at).toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* 1. Summary */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-l-4 border-emerald-600 pl-3">
            1. Executive Summary & Impact Analysis
          </h3>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200 font-medium">
            {incident.description}
          </p>
        </section>

        {/* 2. Root Cause Analysis */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-l-4 border-emerald-600 pl-3">
            2. Empirical Root Cause Assessment & Formulated Hypotheses
          </h3>
          
          <div className="space-y-2.5">
            {hypotheses.map(h => (
              <div key={h.id} className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-xs">#{h.rank}</span>
                    <span className="font-bold text-stone-900 text-sm sm:text-base">{h.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-800 font-bold text-sm">{(h.confidence * 100).toFixed(0)}%</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      h.status === 'SUPPORTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {h.status}
                    </span>
                  </div>
                </div>
                <p className="text-stone-700 font-medium text-xs sm:text-sm">{h.explanation}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-1 font-mono">
                  <span>Support Evidence: <strong>{h.supporting_evidence_ids.join(', ') || 'None'}</strong></span>
                  <span>•</span>
                  <span>Contradicting: <strong>{h.contradicting_evidence_ids.join(', ') || 'None'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Verification & Telemetry Audit */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-l-4 border-emerald-600 pl-3">
            3. Post-Recovery Verification Audit
          </h3>

          {verification_results.length === 0 ? (
            <p className="text-xs sm:text-sm text-stone-400 font-medium">No verification audits recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {verification_results.map(v => (
                <div key={v.id} className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {v.status === 'PASSED' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-600" />
                      )}
                      <span className="font-bold text-stone-900 text-sm">Status: {v.status}</span>
                    </div>
                    <span className="font-mono text-stone-500 text-xs">{new Date(v.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-stone-700 font-medium">{v.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Lessons Learned & Action Items */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Lessons Learned</h4>
            <ul className="list-disc list-inside text-xs sm:text-sm text-stone-700 font-medium space-y-1">
              {lessons_learned.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Follow-up Action Items</h4>
            <ol className="list-decimal list-inside text-xs sm:text-sm text-stone-700 font-medium space-y-1">
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

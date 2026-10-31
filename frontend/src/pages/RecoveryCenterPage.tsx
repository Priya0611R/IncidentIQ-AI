import React, { useState } from 'react';
import { 
  Wrench, 
  Check, 
  X, 
  Terminal, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Recommendation, Incident } from '../types';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

interface RecoveryCenterPageProps {
  recommendations: Recommendation[];
  incidents: Incident[];
  onApprove: (recId: string) => void;
  onReject: (recId: string, reason: string) => void;
  onExecuteSimulation: (recId: string) => void;
  onVerify: (incidentId: string) => void;
  onSelectIncident: (id: string, tab?: string) => void;
  loading: boolean;
}

export const RecoveryCenterPage: React.FC<RecoveryCenterPageProps> = ({
  recommendations,
  incidents,
  onApprove,
  onReject,
  onExecuteSimulation,
  onVerify,
  onSelectIncident,
  loading,
}) => {
  const [activeDialog, setActiveDialog] = useState<{
    type: 'APPROVE' | 'REJECT' | 'EXECUTE';
    rec: Recommendation;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('Alternative mitigation selected by operator');

  const getIncident = (incidentId: string) => incidents.find(i => i.id === incidentId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Recovery Operations</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Simulated Remediation
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Human-in-the-loop authorization, simulated mitigations, and post-action verification.
          </p>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs text-xs">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="text-slate-700">
          <strong>Safety Protocol Enforced:</strong> All remediation actions run in simulated sandbox mode and verify telemetry against SLA thresholds.
        </span>
      </div>

      {/* Recommendations Cards */}
      {recommendations.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 shadow-xs">
          <Wrench className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-700 font-medium">No recovery recommendations pending</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Launch an autonomous investigation from the Incidents list to generate evidence-backed recovery proposals.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const inc = getIncident(rec.incident_id);

            return (
              <div 
                key={rec.id}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3"
              >
                {/* Header & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-emerald-800 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {rec.id}
                    </span>
                    <button
                      onClick={() => onSelectIncident(rec.incident_id, 'workspace')}
                      className="font-mono text-xs text-slate-700 hover:text-emerald-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 font-semibold"
                    >
                      <span>Incident: {rec.incident_id}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    {inc && (
                      <span className="text-xs font-mono text-slate-500">
                        ({inc.service})
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      rec.risk_level === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                      rec.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {rec.risk_level} RISK
                    </span>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      rec.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      rec.status === 'EXECUTED' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      rec.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {rec.status}
                    </span>

                    {/* Approve / Reject buttons */}
                    {rec.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => setActiveDialog({ type: 'APPROVE', rec })}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => setActiveDialog({ type: 'REJECT', rec })}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* Execute Simulation button */}
                    {rec.status === 'APPROVED' && (
                      <button
                        onClick={() => setActiveDialog({ type: 'EXECUTE', rec })}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1"
                      >
                        <Terminal className="h-3 w-3" />
                        <span>Execute Recovery</span>
                      </button>
                    )}

                    {/* Run Verification button */}
                    {rec.status === 'EXECUTED' && (
                      <button
                        onClick={() => onVerify(rec.incident_id)}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Verify Telemetry</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {rec.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {rec.description}
                  </p>
                </div>

                {/* Specification Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-emerald-800 block">Benefit</span>
                    <span className="text-slate-700 text-[11px]">{rec.expected_benefit}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-amber-800 block">Side Effects</span>
                    <span className="text-slate-700 text-[11px]">{rec.side_effects}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 block">Preconditions</span>
                    <span className="text-slate-700 text-[11px]">{rec.preconditions}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-800 block">Rollback</span>
                    <span className="text-slate-700 text-[11px]">{rec.rollback_plan}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {activeDialog && (
        <ConfirmationDialog
          isOpen={true}
          title={
            activeDialog.type === 'APPROVE' ? 'Authorize Recovery' :
            activeDialog.type === 'REJECT' ? 'Reject Recovery' :
            'Execute Simulated Recovery'
          }
          message={
            activeDialog.type === 'APPROVE'
              ? `Authorize '${activeDialog.rec.title}'? Risk: ${activeDialog.rec.risk_level}.`
              : activeDialog.type === 'REJECT'
              ? `Provide rejection rationale. This halts this remediation path for Incident ${activeDialog.rec.incident_id}.`
              : `Execute simulation for '${activeDialog.rec.title}' on service ${getIncident(activeDialog.rec.incident_id)?.service}?`
          }
          confirmLabel={
            activeDialog.type === 'APPROVE' ? 'Approve' :
            activeDialog.type === 'REJECT' ? 'Reject' :
            'Execute'
          }
          isDangerous={activeDialog.type === 'REJECT'}
          onConfirm={() => {
            if (activeDialog.type === 'APPROVE') {
              onApprove(activeDialog.rec.id);
            } else if (activeDialog.type === 'REJECT') {
              onReject(activeDialog.rec.id, rejectReason);
            } else if (activeDialog.type === 'EXECUTE') {
              onExecuteSimulation(activeDialog.rec.id);
            }
            setActiveDialog(null);
          }}
          onCancel={() => setActiveDialog(null)}
          loading={loading}
        />
      )}
    </div>
  );
};

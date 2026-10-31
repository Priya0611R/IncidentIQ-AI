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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900 tracking-tight">
              Recovery Operations Center
            </h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
              Safe Sandbox Actions
            </span>
          </div>
          <p className="text-sm font-medium text-stone-500 mt-1">
            Human-in-the-loop authorization, simulated mitigations, and post-action verification.
          </p>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200/90 flex items-center gap-3 shadow-xs text-sm">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        <span className="text-stone-700 font-medium">
          <strong className="text-stone-900 font-bold">Safety Protocol Enforced:</strong> All remediation actions run in safe simulated sandbox mode and verify post-action telemetry against SLA recovery criteria.
        </span>
      </div>

      {/* Recommendations Cards */}
      {recommendations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200/90 shadow-xs">
          <Wrench className="h-10 w-10 text-stone-400 mx-auto mb-3" />
          <p className="text-base font-bold text-stone-800">No recovery recommendations pending</p>
          <p className="text-xs font-medium text-stone-500 mt-1 max-w-md mx-auto">
            Launch an autonomous investigation from the Incidents list to formulate root causes and generate evidence-backed recovery proposals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const inc = getIncident(rec.incident_id);

            return (
              <div 
                key={rec.id}
                className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-4 border-t-4 border-t-emerald-600"
              >
                {/* Header & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-emerald-900 font-bold text-xs sm:text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {rec.id}
                    </span>
                    <button
                      onClick={() => onSelectIncident(rec.incident_id, 'workspace')}
                      className="font-mono text-xs sm:text-sm text-stone-800 hover:text-emerald-800 bg-stone-100 px-3 py-1 rounded-lg border border-stone-300 flex items-center gap-1.5 font-bold transition-colors"
                    >
                      <span>Incident: {rec.incident_id}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-stone-500" />
                    </button>
                    {inc && (
                      <span className="text-xs sm:text-sm font-mono text-stone-600 font-semibold">
                        ({inc.service})
                      </span>
                    )}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                      rec.risk_level === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                      rec.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {rec.risk_level} RISK
                    </span>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                      rec.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      rec.status === 'EXECUTED' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                      rec.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {rec.status}
                    </span>

                    {/* Approve / Reject buttons */}
                    {rec.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => setActiveDialog({ type: 'APPROVE', rec })}
                          className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => setActiveDialog({ type: 'REJECT', rec })}
                          className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <X className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* Execute Simulation button */}
                    {rec.status === 'APPROVED' && (
                      <button
                        onClick={() => setActiveDialog({ type: 'EXECUTE', rec })}
                        className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-2 active:scale-95"
                      >
                        <Terminal className="h-4 w-4" />
                        <span>Execute Recovery</span>
                      </button>
                    )}

                    {/* Run Verification button */}
                    {rec.status === 'EXECUTED' && (
                      <button
                        onClick={() => onVerify(rec.incident_id)}
                        className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition-all flex items-center gap-2 active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Verify Telemetry</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-base sm:text-lg font-display font-bold text-stone-900">
                    {rec.title}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-stone-600 font-medium">
                    {rec.description}
                  </p>
                </div>

                {/* Specification Grid (4-cell clean display) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Expected Benefit</span>
                    <span className="text-stone-800 font-medium mt-1 block">{rec.expected_benefit}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Side Effects</span>
                    <span className="text-stone-800 font-medium mt-1 block">{rec.side_effects}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-stone-600 uppercase tracking-wider block">Preconditions</span>
                    <span className="text-stone-800 font-medium mt-1 block">{rec.preconditions}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">Rollback Strategy</span>
                    <span className="text-stone-800 font-medium mt-1 block">{rec.rollback_plan}</span>
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
            activeDialog.type === 'APPROVE' ? 'Authorize Recovery Action' :
            activeDialog.type === 'REJECT' ? 'Reject Recovery Proposal' :
            'Execute Simulated Recovery'
          }
          message={
            activeDialog.type === 'APPROVE'
              ? `Authorize '${activeDialog.rec.title}'? Risk rating: ${activeDialog.rec.risk_level}.`
              : activeDialog.type === 'REJECT'
              ? `Provide rejection rationale. This halts this remediation path for Incident ${activeDialog.rec.incident_id}.`
              : `Execute safe simulation for '${activeDialog.rec.title}' on service ${getIncident(activeDialog.rec.incident_id)?.service}?`
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

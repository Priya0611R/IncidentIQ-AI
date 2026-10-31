import React, { useState } from 'react';
import { 
  Wrench, 
  Check, 
  X, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  Info
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Recovery Operations Center</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Safe Simulated Mitigations
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Strict human-in-the-loop governance for remediation actions, safe sandbox simulation, and telemetry verification.
          </p>
        </div>
      </div>

      {/* Safety Guardrails Notice Banner */}
      <div className="p-4 rounded-xl bg-navy-900 border border-cyan-500/30 flex items-start gap-3 shadow-md">
        <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">
            Safety Protocol Enforced: Predefined Simulated Remediation Handlers
          </p>
          <p className="text-slate-400 leading-relaxed">
            All recovery executions run in simulated mode without modifying production OS binaries or cloud infrastructure.
            Automated verification checks post-action telemetry against defined SLA thresholds before declaring incident resolution.
          </p>
        </div>
      </div>

      {/* Recommendations Cards */}
      {recommendations.length === 0 ? (
        <div className="text-center py-12 bg-navy-900 rounded-xl border border-navy-800">
          <Wrench className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-300 font-medium">No recovery recommendations currently pending</p>
          <p className="text-xs text-slate-500 mt-1">
            Launch an autonomous investigation from the Incidents list to generate evidence-backed recovery proposals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const inc = getIncident(rec.incident_id);

            return (
              <div 
                key={rec.id}
                className="p-5 rounded-xl bg-navy-900 border border-navy-800 shadow-sm space-y-4"
              >
                {/* Header & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold text-xs">
                      {rec.id}
                    </span>
                    <button
                      onClick={() => onSelectIncident(rec.incident_id, 'workspace')}
                      className="font-mono text-xs text-slate-300 hover:text-cyan-300 bg-navy-950 px-2 py-0.5 rounded border border-navy-700 flex items-center gap-1"
                    >
                      <span>Incident: {rec.incident_id}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    {inc && (
                      <span className="text-xs font-mono text-slate-400">
                        ({inc.service})
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      rec.risk_level === 'LOW' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      rec.risk_level === 'MEDIUM' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 
                      'bg-red-950 text-red-400 border border-red-800'
                    }`}>
                      {rec.risk_level} RISK
                    </span>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                      rec.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      rec.status === 'EXECUTED' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      rec.status === 'REJECTED' ? 'bg-red-950 text-red-300 border border-red-800' :
                      'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {rec.status}
                    </span>

                    {/* Approve / Reject buttons */}
                    {rec.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => setActiveDialog({ type: 'APPROVE', rec })}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => setActiveDialog({ type: 'REJECT', rec })}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600/80 hover:bg-red-500 text-white transition-all flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* Execute Simulation button */}
                    {rec.status === 'APPROVED' && (
                      <button
                        onClick={() => setActiveDialog({ type: 'EXECUTE', rec })}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 transition-all flex items-center gap-1.5"
                      >
                        <Terminal className="h-3.5 w-3.5" />
                        <span>Execute Simulation</span>
                      </button>
                    )}

                    {/* Run Verification button */}
                    {rec.status === 'EXECUTED' && (
                      <button
                        onClick={() => onVerify(rec.incident_id)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Audit Verification</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-base font-bold text-white">
                    {rec.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    {rec.description}
                  </p>
                </div>

                {/* Specification Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold block mb-1">Expected Benefit</span>
                    <span className="text-slate-300">{rec.expected_benefit}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold block mb-1">Potential Side Effects</span>
                    <span className="text-slate-300">{rec.side_effects}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">Preconditions</span>
                    <span className="text-slate-300">{rec.preconditions}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold block mb-1">Rollback Plan</span>
                    <span className="text-slate-300">{rec.rollback_plan}</span>
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
            activeDialog.type === 'REJECT' ? 'Reject Recovery Recommendation' :
            'Execute Simulated Recovery Handler'
          }
          message={
            activeDialog.type === 'APPROVE'
              ? `Are you sure you want to authorize '${activeDialog.rec.title}'? This action carries a ${activeDialog.rec.risk_level} risk level.`
              : activeDialog.type === 'REJECT'
              ? `Provide rejection rationale. This will halt this specific mitigation path for Incident ${activeDialog.rec.incident_id}.`
              : `Proceed with simulating '${activeDialog.rec.title}' for service ${getIncident(activeDialog.rec.incident_id)?.service}? A safe audit trail will be logged.`
          }
          confirmLabel={
            activeDialog.type === 'APPROVE' ? 'Approve Mitigation' :
            activeDialog.type === 'REJECT' ? 'Confirm Rejection' :
            'Execute Safe Simulation'
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


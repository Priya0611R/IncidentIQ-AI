import React, { useState } from 'react';
import { X, AlertCircle, PlusCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { Incident } from '../types';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [service, setService] = useState('checkout-service');
  const [environment, setEnvironment] = useState('production');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [category, setCategory] = useState('api_failure');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !service.trim()) {
      setError('Please fill in all required fields (Title, Description, Service).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullDesc = symptoms.trim() 
        ? `${description.trim()}\n\nObserved Symptoms: ${symptoms.trim()}`
        : description.trim();

      const newInc = await apiClient.createIncident({
        title: title.trim(),
        description: fullDesc,
        service: service.trim(),
        environment,
        severity,
        category,
        started_at: new Date().toISOString()
      });

      onCreated(newInc);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <div className="bg-navy-900 border border-navy-700 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-navy-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Create Technical Incident</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Incident Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Elevated 502 Bad Gateway errors on Payment API"
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Affected Service <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. checkout-service"
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 outline-none text-white"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="canary">Canary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 outline-none text-white"
              >
                <option value="CRITICAL">CRITICAL - Severe Outage</option>
                <option value="HIGH">HIGH - Service Degraded</option>
                <option value="MEDIUM">MEDIUM - Latency / Intermittent</option>
                <option value="LOW">LOW - Non-blocking Anomaly</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 outline-none text-white"
              >
                <option value="api_failure">API / HTTP 5xx Failure</option>
                <option value="database_issue">Database Connection / Timeout</option>
                <option value="deployment_failure">Deployment Regression</option>
                <option value="resource_exhaustion">High CPU / Memory Exhaustion</option>
                <option value="network_issue">Network Latency / Packet Drops</option>
                <option value="configuration_issue">Configuration Drift / Error</option>
                <option value="high_latency">High Latency Degradation</option>
                <option value="security_alert">Security Alert</option>
                <option value="other">Other / Unknown</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the incident, impact on end-users or downstream callers..."
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white placeholder-slate-500 resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Observed Symptoms (Optional)</label>
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. p99 response time spike to 4500ms, HikariCP pool at 100/100"
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white placeholder-slate-500"
            />
          </div>

          <div className="pt-4 border-t border-navy-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Create Incident</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

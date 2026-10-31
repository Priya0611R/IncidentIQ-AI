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
      setError('Please fill in Title, Description, and Service.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-xl shadow-xl max-w-lg w-full p-5 text-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Create Incident</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HTTP 502 Bad Gateway spike on Payment API"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Service <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. checkout-service"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 outline-none text-slate-800"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="canary">Canary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 outline-none text-slate-800"
              >
                <option value="CRITICAL">CRITICAL - Severe</option>
                <option value="HIGH">HIGH - Degraded</option>
                <option value="MEDIUM">MEDIUM - Intermittent</option>
                <option value="LOW">LOW - Non-blocking</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 outline-none text-slate-800"
              >
                <option value="api_failure">API / HTTP 5xx</option>
                <option value="database_issue">Database Pool Timeout</option>
                <option value="deployment_failure">Deployment Regression</option>
                <option value="resource_exhaustion">Resource Saturation</option>
                <option value="network_issue">Network Latency / RST</option>
                <option value="configuration_issue">Config Drift</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Incident context and operational impact..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 placeholder-slate-400 resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Symptoms (Optional)</label>
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. p99 response time spike to 4200ms"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Create</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

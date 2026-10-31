import React, { useState } from 'react';
import { 
  Search, 
  RotateCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  PlusCircle,
  FileText
} from 'lucide-react';
import { Incident } from '../types';

interface IncidentsPageProps {
  incidents: Incident[];
  onSelectIncident: (id: string, tab?: string) => void;
  onStartInvestigation: (id: string) => void;
  onOpenCreate: () => void;
  onRefresh: () => void;
  investigatingId: string | null;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({
  incidents,
  onSelectIncident,
  onStartInvestigation,
  onOpenCreate,
  onRefresh,
  investigatingId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch = 
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || inc.category === categoryFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Incident Management</h1>
          <p className="text-xs text-slate-500">
            Real-time fleet incidents across microservices and cloud infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
            title="Refresh incident list"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Incident</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, title, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 outline-none text-slate-800"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 outline-none text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="MITIGATING">Mitigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="RECOVERY_FAILED">Recovery Failed</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-300 focus:border-emerald-500 outline-none text-slate-800"
          >
            <option value="ALL">All Categories</option>
            <option value="api_failure">API Failure</option>
            <option value="database_issue">Database Issue</option>
            <option value="deployment_failure">Deployment Failure</option>
            <option value="resource_exhaustion">Resource Exhaustion</option>
            <option value="network_issue">Network Latency</option>
            <option value="configuration_issue">Configuration Drift</option>
            <option value="high_latency">High Latency</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">ID</th>
                <th className="py-2.5 px-3.5">Incident Title</th>
                <th className="py-2.5 px-3.5">Service</th>
                <th className="py-2.5 px-3.5">Severity</th>
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Time</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No incidents match the active search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const isCurrentInvestigating = investigatingId === inc.id;

                  return (
                    <tr 
                      key={inc.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-emerald-700">
                        {inc.id}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-900 max-w-xs truncate group-hover:text-emerald-800">
                        {inc.title}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 text-[11px]">
                        {inc.service}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          inc.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 capitalize text-[11px]">
                        {inc.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          inc.status === 'RECOVERY_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          inc.status === 'INVESTIGATING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse' :
                          inc.status === 'MITIGATING' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {inc.status === 'RESOLVED' && <CheckCircle2 className="h-3 w-3" />}
                          {inc.status === 'RECOVERY_FAILED' && <XCircle className="h-3 w-3" />}
                          {inc.status === 'INVESTIGATING' && <Activity className="h-3 w-3 animate-spin" />}
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(inc.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-1.5">
                        {/* Investigation Action */}
                        <button
                          onClick={() => onStartInvestigation(inc.id)}
                          disabled={isCurrentInvestigating}
                          className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors inline-flex items-center gap-1 ${
                            isCurrentInvestigating
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 animate-pulse'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <Sparkles className="h-3 w-3 text-emerald-600" />
                          <span>{isCurrentInvestigating ? 'Analyzing...' : 'Investigate'}</span>
                        </button>

                        {/* Open Workspace Action */}
                        <button
                          onClick={() => onSelectIncident(inc.id, 'workspace')}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Workspace</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>

                        {/* View Post-Mortem Report */}
                        <button
                          onClick={() => onSelectIncident(inc.id, 'report')}
                          className="p-1 text-xs font-medium rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition-colors inline-flex items-center"
                          title="Post-Mortem Report"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

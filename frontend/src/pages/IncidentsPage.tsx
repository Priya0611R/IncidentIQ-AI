import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Activity, 
  FileText, 
  ArrowRight, 
  PlusCircle, 
  RotateCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Database
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Incident Management</h1>
          <p className="text-sm text-slate-400">
            Real-time fleet incidents across microservices and cloud infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 transition-colors"
            title="Refresh incident list"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Incident</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, title, or service name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white placeholder-slate-500"
          />
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 outline-none text-slate-200"
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
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 outline-none text-slate-200"
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
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-navy-950 border border-navy-700 focus:border-cyan-500 outline-none text-slate-200"
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
      <div className="rounded-xl bg-navy-900 border border-navy-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-sans">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No incidents match the active search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const isCurrentInvestigating = investigatingId === inc.id;

                  return (
                    <tr 
                      key={inc.id}
                      className="hover:bg-navy-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                        {inc.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate group-hover:text-white">
                        {inc.title}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {inc.service}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          inc.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          inc.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          inc.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 capitalize text-[11px]">
                        {inc.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inc.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          inc.status === 'RECOVERY_FAILED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          inc.status === 'INVESTIGATING' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse' :
                          inc.status === 'MITIGATING' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {inc.status === 'RESOLVED' && <CheckCircle2 className="h-3 w-3" />}
                          {inc.status === 'RECOVERY_FAILED' && <XCircle className="h-3 w-3" />}
                          {inc.status === 'INVESTIGATING' && <Activity className="h-3 w-3 animate-spin" />}
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(inc.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {/* Investigation Action */}
                        <button
                          onClick={() => onStartInvestigation(inc.id)}
                          disabled={isCurrentInvestigating}
                          className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors inline-flex items-center gap-1 ${
                            isCurrentInvestigating
                              ? 'bg-cyan-950 text-cyan-400 border-cyan-700 animate-pulse'
                              : 'bg-navy-800 hover:bg-cyan-950 text-cyan-300 border-navy-700 hover:border-cyan-600'
                          }`}
                        >
                          <Sparkles className="h-3 w-3 text-cyan-400" />
                          <span>{isCurrentInvestigating ? 'Investigating...' : 'Investigate'}</span>
                        </button>

                        {/* Open Workspace Action */}
                        <button
                          onClick={() => onSelectIncident(inc.id, 'workspace')}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 hover:border-slate-500 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Workspace</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>

                        {/* View Post-Mortem Report */}
                        <button
                          onClick={() => onSelectIncident(inc.id, 'report')}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 hover:border-slate-500 transition-colors inline-flex items-center gap-1"
                          title="View Post-Mortem Report"
                        >
                          <FileText className="h-3 w-3" />
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


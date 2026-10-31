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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900 tracking-tight">
            Incident Fleet Registry
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-1">
            Real-time multi-service operational incidents requiring root-cause investigation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-xs transition-colors"
            title="Refresh incident list"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Incident</span>
          </button>
        </div>
      </div>

      {/* Filter Bar with Enhanced Font Sizing */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search by ID, title, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-stone-50 border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-stone-900 placeholder-stone-400"
          />
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-stone-50 border border-stone-300 focus:border-emerald-500 outline-none text-stone-800"
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
            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-stone-50 border border-stone-300 focus:border-emerald-500 outline-none text-stone-800"
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
            className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-stone-50 border border-stone-300 focus:border-emerald-500 outline-none text-stone-800"
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
      <div className="rounded-2xl bg-white border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600 font-mono uppercase text-xs border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4 font-bold">ID</th>
                <th className="py-3.5 px-4 font-bold">Incident Title</th>
                <th className="py-3.5 px-4 font-bold">Service</th>
                <th className="py-3.5 px-4 font-bold">Severity</th>
                <th className="py-3.5 px-4 font-bold">Category</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Time</th>
                <th className="py-3.5 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500 font-medium">
                    No incidents match the active search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const isCurrentInvestigating = investigatingId === inc.id;

                  return (
                    <tr 
                      key={inc.id}
                      className="hover:bg-stone-50 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800 text-xs sm:text-sm">
                        {inc.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900 max-w-sm truncate group-hover:text-emerald-800 text-xs sm:text-sm">
                        {inc.title}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-600 text-xs font-semibold">
                        {inc.service}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          inc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                          inc.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 capitalize text-xs font-medium">
                        {inc.category.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold ${
                          inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          inc.status === 'RECOVERY_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          inc.status === 'INVESTIGATING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse' :
                          inc.status === 'MITIGATING' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {inc.status === 'RESOLVED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {inc.status === 'RECOVERY_FAILED' && <XCircle className="h-3.5 w-3.5" />}
                          {inc.status === 'INVESTIGATING' && <Activity className="h-3.5 w-3.5 animate-spin" />}
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 font-mono text-xs">
                        {new Date(inc.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {/* Investigation Action */}
                        <button
                          onClick={() => onStartInvestigation(inc.id)}
                          disabled={isCurrentInvestigating}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all inline-flex items-center gap-1.5 ${
                            isCurrentInvestigating
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 animate-pulse'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{isCurrentInvestigating ? 'Analyzing...' : 'Investigate'}</span>
                        </button>

                        {/* Open Workspace Action */}
                        <button
                          onClick={() => onSelectIncident(inc.id, 'workspace')}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Workspace</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>

                        {/* View Post-Mortem Report */}
                        <button
                          onClick={() => onSelectIncident(inc.id, 'report')}
                          className="p-1.5 text-xs font-bold rounded-lg bg-white hover:bg-stone-100 text-stone-600 border border-stone-300 transition-colors inline-flex items-center"
                          title="Post-Mortem Report"
                        >
                          <FileText className="h-4 w-4" />
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

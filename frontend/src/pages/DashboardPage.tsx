import React from 'react';
import { 
  AlertOctagon, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  PlusCircle, 
  Database,
  Layers,
  Wrench,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { DashboardStats, Incident } from '../types';

interface DashboardPageProps {
  stats: DashboardStats | null;
  incidents: Incident[];
  onSelectIncident: (id: string, tab?: string) => void;
  onOpenCreate: () => void;
  onLoadScenarios: () => void;
  loading: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#ef4444',
  INVESTIGATING: '#06b6d4',
  MITIGATING: '#8b5cf6',
  RESOLVED: '#10b981',
  RECOVERY_FAILED: '#f43f5e',
  CLOSED: '#64748b',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  incidents,
  onSelectIncident,
  onOpenCreate,
  onLoadScenarios,
  loading
}) => {
  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="h-10 w-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Aggregating telemetry and incident stats...</p>
      </div>
    );
  }

  const sevData = Object.entries(stats?.severity_distribution || {}).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name] || '#94a3b8'
  }));

  const statData = Object.entries(stats?.status_distribution || {}).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#94a3b8'
  }));

  const pendingIncidents = incidents.filter(i => i.status === 'MITIGATING' || i.status === 'INVESTIGATING');

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>SRE Cloud Operations Command</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Live Monitoring
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Real-time telemetry, automated AI root-cause hypotheses, and verified mitigations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLoadScenarios}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 transition-colors"
          >
            <Database className="h-4 w-4 text-cyan-400" />
            <span>Load Demo Scenarios</span>
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Incident</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Incidents */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total</span>
            <Layers className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats?.total_incidents ?? 0}</div>
          <div className="mt-1 text-[11px] text-slate-500">Tracked issues</div>
        </div>

        {/* Active Incidents */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active</span>
            <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-400">{stats?.active_incidents ?? 0}</div>
          <div className="mt-1 text-[11px] text-cyan-500/80">Requiring attention</div>
        </div>

        {/* Critical Incidents */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Critical</span>
            <AlertOctagon className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-400">{stats?.critical_incidents ?? 0}</div>
          <div className="mt-1 text-[11px] text-red-500/80">SLA Critical P0/P1</div>
        </div>

        {/* Under Investigation */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Investigating</span>
            <Sparkles className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400">{stats?.under_investigation ?? 0}</div>
          <div className="mt-1 text-[11px] text-blue-500/80">AI agent active</div>
        </div>

        {/* Pending Approvals */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Approvals</span>
            <Wrench className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{stats?.pending_approvals ?? 0}</div>
          <div className="mt-1 text-[11px] text-amber-500/80">Awaiting human sign-off</div>
        </div>

        {/* Successfully Recovered */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Recovered</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{stats?.recovered_incidents ?? 0}</div>
          <div className="mt-1 text-[11px] text-emerald-500/80">Verified healthy</div>
        </div>

        {/* Failed Recoveries / Avg MTTR */}
        <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Avg MTTR</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400">
            {stats?.avg_investigation_duration_seconds ? `${stats.avg_investigation_duration_seconds}s` : '12s'}
          </div>
          <div className="mt-1 text-[11px] text-purple-500/80">Investigation speed</div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution */}
        <div className="p-5 rounded-xl bg-navy-900 border border-navy-800">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
            <span>Incident Severity Distribution</span>
            <span className="text-xs text-slate-400 font-normal">Active & Resolved</span>
          </h3>
          <div className="h-56 w-full">
            {sevData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sevData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e3056', borderRadius: '8px', color: '#f1f5f9' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {sevData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No incident data available
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="p-5 rounded-xl bg-navy-900 border border-navy-800">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
            <span>Workflow Status Breakdown</span>
            <span className="text-xs text-slate-400 font-normal">Current Pipeline</span>
          </h3>
          <div className="h-56 w-full flex items-center justify-center">
            {statData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statData.map((entry, index) => (
                      <Cell key={`cell-pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e3056', borderRadius: '8px', color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs">No status data available</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
            {statData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-400 font-mono text-[11px]">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="p-5 rounded-xl bg-navy-900 border border-navy-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Recent Incident Stream</h3>
            <p className="text-xs text-slate-400">Live operational incidents across cloud services</p>
          </div>
          <button
            onClick={() => onSelectIncident('', 'incidents')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-10 bg-navy-950/50 rounded-lg border border-dashed border-navy-800">
            <ShieldAlert className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">No incidents currently recorded in database</p>
            <p className="text-xs text-slate-500 mt-1">Click "Load Demo Scenarios" to explore realistic enterprise failures.</p>
            <button
              onClick={onLoadScenarios}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all"
            >
              Load Demo Scenarios
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 font-mono uppercase text-[10px] border-b border-navy-800">
                <tr>
                  <th className="py-2.5 px-3">Incident ID</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 font-sans">
                {incidents.slice(0, 6).map((inc) => (
                  <tr 
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id, 'workspace')}
                    className="hover:bg-navy-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 font-mono font-medium text-cyan-400">
                      {inc.id}
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-medium max-w-xs truncate group-hover:text-white">
                      {inc.title}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {inc.service}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                        inc.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        inc.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        inc.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        inc.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        inc.status === 'RECOVERY_FAILED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        inc.status === 'INVESTIGATING' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse' :
                        inc.status === 'MITIGATING' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-cyan-400 group-hover:text-cyan-300 text-xs font-medium inline-flex items-center gap-1">
                        Investigate <ArrowRight className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


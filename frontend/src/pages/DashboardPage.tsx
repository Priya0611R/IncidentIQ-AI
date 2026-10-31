import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Activity, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  PlusCircle, 
  Database,
  Layers,
  Wrench,
  Sparkles,
  Radio,
  Play,
  Square,
  Zap,
  BellRing
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { DashboardStats, Incident, MonitoringStatus, DetectionEvent } from '../types';
import { apiClient } from '../api/client';

interface DashboardPageProps {
  stats: DashboardStats | null;
  incidents: Incident[];
  onSelectIncident: (id: string, tab?: string) => void;
  onOpenCreate: () => void;
  onLoadScenarios: () => void;
  loading: boolean;
}

// STRICT NO-BLUE PALETTE
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#e11d48', // rose-600
  HIGH: '#ea580c',     // orange-600
  MEDIUM: '#d97706',   // amber-600
  LOW: '#64748b',      // slate-500
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#e11d48',            // rose-600
  INVESTIGATING: '#059669',   // emerald-600
  MITIGATING: '#7c3aed',      // violet-600
  RESOLVED: '#16a34a',        // green-600
  RECOVERY_FAILED: '#dc2626', // red-600
  CLOSED: '#64748b',          // slate-500
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  incidents,
  onSelectIncident,
  onOpenCreate,
  onLoadScenarios,
  loading
}) => {
  const [monitoring, setMonitoring] = useState<MonitoringStatus | null>(null);
  const [detections, setDetections] = useState<DetectionEvent[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('SCENARIO_DB_POOL_EXHAUSTION');
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      const [monStatus, detList] = await Promise.all([
        apiClient.getMonitoringStatus(),
        apiClient.getDetections({ limit: 6 })
      ]);
      setMonitoring(monStatus);
      setIsSimulating(monStatus.is_simulating);
      setDetections(detList);
    } catch (e) {
      console.warn("Could not fetch live monitoring status", e);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSimulation = async () => {
    setActionLoading(true);
    try {
      await apiClient.startSimulation(selectedScenario, 12);
      await fetchMonitoringData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopSimulation = async () => {
    setActionLoading(true);
    try {
      await apiClient.stopSimulation();
      await fetchMonitoringData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerTick = async () => {
    setActionLoading(true);
    try {
      await apiClient.triggerSimulationTick(true);
      await fetchMonitoringData();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <div className="h-8 w-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Loading telemetry...</p>
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

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Operations Command</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active Monitoring
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time telemetry, automated root-cause analysis, and verified recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLoadScenarios}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
          >
            <Database className="h-3.5 w-3.5 text-emerald-600" />
            <span>Load Demo Data</span>
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Incident</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900">{stats?.total_incidents ?? 0}</div>
          <div className="text-[10px] text-slate-500">Tracked issues</div>
        </div>

        {/* Active */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active</span>
            <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{stats?.active_incidents ?? 0}</div>
          <div className="text-[10px] text-emerald-700/80">Active alerts</div>
        </div>

        {/* Critical */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Critical</span>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-rose-600">{stats?.critical_incidents ?? 0}</div>
          <div className="text-[10px] text-rose-600/80">SLA Critical P0/P1</div>
        </div>

        {/* Investigating */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Investigating</span>
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-violet-700">{stats?.under_investigation ?? 0}</div>
          <div className="text-[10px] text-violet-700/80">Agent active</div>
        </div>

        {/* Approvals */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Approvals</span>
            <Wrench className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-600">{stats?.pending_approvals ?? 0}</div>
          <div className="text-[10px] text-amber-700/80">Awaiting sign-off</div>
        </div>

        {/* Recovered */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Recovered</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-600">{stats?.recovered_incidents ?? 0}</div>
          <div className="text-[10px] text-emerald-700/80">Verified healthy</div>
        </div>

        {/* Avg MTTR */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Avg MTTR</span>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900">
            {stats?.avg_investigation_duration_seconds ? `${stats.avg_investigation_duration_seconds}s` : '12s'}
          </div>
          <div className="text-[10px] text-slate-500">Investigation time</div>
        </div>
      </div>

      {/* Autonomous Ingestion Console */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              monitoring?.active_provider === 'PROMETHEUS'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : isSimulating
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <Radio className={`h-4 w-4 ${isSimulating ? 'animate-pulse text-emerald-600' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Telemetry Ingestion Engine</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                  monitoring?.active_provider === 'PROMETHEUS'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isSimulating
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {monitoring?.mode_label || 'READY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Continuous signal ingestion, anomaly evaluation, and automatic incident correlation.
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              disabled={isSimulating || actionLoading}
              className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
            >
              <option value="SCENARIO_DB_POOL_EXHAUSTION">DB Pool Saturation (orders-service)</option>
              <option value="SCENARIO_CHECKOUT_GATEWAY_TIMEOUT">504 Gateway Timeout (checkout-service)</option>
              <option value="SCENARIO_DNS_SERVFAIL">DNS SERVFAIL Storm (auth-service)</option>
              <option value="SCENARIO_MTU_FRAGMENTATION">VPC MTU Packet Drop (notification-service)</option>
            </select>

            {isSimulating ? (
              <button
                onClick={handleStopSimulation}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Square className="h-3 w-3" />
                <span>Stop Engine</span>
              </button>
            ) : (
              <button
                onClick={handleStartSimulation}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Play className="h-3 w-3" />
                <span>Start Engine</span>
              </button>
            )}

            <button
              onClick={handleTriggerTick}
              disabled={actionLoading}
              title="Immediately inject a synthetic failure telemetry tick across services"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-medium transition-all"
            >
              <Zap className="h-3 w-3 text-amber-600" />
              <span>Inject Anomaly</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stream Health Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Ingested Telemetry (24h)</span>
            <span className="text-slate-900 font-mono font-bold text-xs">
              {monitoring?.total_telemetry_records ?? 0} records
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Active Anomaly Detections</span>
            <span className="text-amber-700 font-mono font-bold text-xs">
              {monitoring?.active_detections ?? 0} active
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Freshness</span>
            <span className="text-slate-700 font-mono text-[11px]">
              {monitoring?.latest_telemetry_at ? new Date(monitoring.latest_telemetry_at).toLocaleTimeString() : 'Awaiting data'}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Webhook Ingestion URL</span>
            <span className="text-emerald-700 font-mono text-[10px] truncate block" title="/api/monitoring/webhooks/prometheus">
              /api/monitoring/webhooks/prometheus
            </span>
          </div>
        </div>

        {/* Live Detected Anomalies Feed */}
        {detections.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <BellRing className="h-3 w-3 text-emerald-600" />
                Live Anomaly Detections
              </span>
              <span className="text-[10px] text-slate-500">Auto-correlated</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {detections.map((d) => (
                <div
                  key={d.id}
                  onClick={() => d.incident_id && onSelectIncident(d.incident_id, 'workspace')}
                  className={`p-2 rounded-lg bg-slate-50 border text-xs transition-colors ${
                    d.incident_id ? 'border-slate-300 hover:border-emerald-500 cursor-pointer' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-semibold text-slate-900">{d.service}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      d.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {d.detection_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{d.explanation}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>{new Date(d.created_at).toLocaleTimeString()}</span>
                    {d.incident_id && (
                      <span className="text-emerald-700 font-mono font-semibold hover:underline flex items-center gap-0.5">
                        {d.incident_id} <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
            <span>Severity Distribution</span>
            <span className="text-xs text-slate-500 font-normal">Active & Resolved</span>
          </h3>
          <div className="h-52 w-full">
            {sevData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sevData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                    itemStyle={{ color: '#059669' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {sevData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                No incident data available
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
            <span>Workflow Status</span>
            <span className="text-xs text-slate-500 font-normal">Pipeline breakdown</span>
          </h3>
          <div className="h-44 w-full flex items-center justify-center">
            {statData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statData.map((entry, index) => (
                      <Cell key={`cell-pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">No status data available</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
            {statData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 font-mono text-[11px]">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Incidents</h3>
            <p className="text-[11px] text-slate-500">Production incidents requiring investigation & recovery</p>
          </div>
          <button
            onClick={() => onSelectIncident('', 'incidents')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-700 font-medium">No incidents currently recorded</p>
            <button
              onClick={onLoadScenarios}
              className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
            >
              Load Demo Scenarios
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Incident</th>
                  <th className="py-2 px-3">Service</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {incidents.slice(0, 6).map((inc) => (
                  <tr 
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id, 'workspace')}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                      {inc.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 font-medium max-w-xs truncate group-hover:text-emerald-800">
                      {inc.title}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {inc.service}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        inc.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        inc.status === 'RECOVERY_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        inc.status === 'INVESTIGATING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse' :
                        inc.status === 'MITIGATING' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-emerald-700 group-hover:text-emerald-800 text-xs font-semibold inline-flex items-center gap-1">
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

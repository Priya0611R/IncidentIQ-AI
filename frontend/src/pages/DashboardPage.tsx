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
  BellRing,
  ExternalLink
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
  LOW: '#78716c',      // stone-500
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#e11d48',            // rose-600
  INVESTIGATING: '#059669',   // emerald-600
  MITIGATING: '#7c3aed',      // violet-600
  RESOLVED: '#10b981',        // emerald-500
  RECOVERY_FAILED: '#dc2626', // red-600
  CLOSED: '#78716c',          // stone-500
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-500">
        <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Streaming incident telemetry...</p>
      </div>
    );
  }

  const sevData = Object.entries(stats?.severity_distribution || {}).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name] || '#a8a29e'
  }));

  const statData = Object.entries(stats?.status_distribution || {}).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#a8a29e'
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900 tracking-tight">
              Command Center
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping inline-block" />
              Live Telemetry
            </span>
          </div>
          <p className="text-sm text-stone-600 mt-1 font-medium">
            Autonomous multi-service monitoring, evidence synthesis, and verified recovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoadScenarios}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-xs transition-colors"
          >
            <Database className="h-4 w-4 text-emerald-600" />
            <span>Load Demo Data</span>
          </button>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Incident</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Stats Cards with Elevated Command Style and Prominent Numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Total */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-stone-600">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Incidents</span>
            <Layers className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-display font-black text-stone-900">
            {stats?.total_incidents ?? 0}
          </div>
          <div className="text-xs font-semibold text-stone-500 mt-1">Tracked system issues</div>
        </div>

        {/* Active */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-emerald-600">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Issues</span>
            <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-display font-black text-emerald-700">
            {stats?.active_incidents ?? 0}
          </div>
          <div className="text-xs font-semibold text-emerald-700/80 mt-1">Requires investigation</div>
        </div>

        {/* Critical */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-rose-600">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Critical P0/P1</span>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-display font-black text-rose-600">
            {stats?.critical_incidents ?? 0}
          </div>
          <div className="text-xs font-semibold text-rose-600/80 mt-1">High business impact</div>
        </div>

        {/* Investigating */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-violet-600">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Investigating</span>
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-display font-black text-violet-700">
            {stats?.under_investigation ?? 0}
          </div>
          <div className="text-xs font-semibold text-violet-700/80 mt-1">Autonomous AI active</div>
        </div>

        {/* Approvals */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-amber-600">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Pending Gate</span>
            <Wrench className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-display font-black text-amber-600">
            {stats?.pending_approvals ?? 0}
          </div>
          <div className="text-xs font-semibold text-amber-700/80 mt-1">Awaiting SRE sign-off</div>
        </div>

        {/* Recovered */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-emerald-500">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Verified Fixed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-display font-black text-emerald-600">
            {stats?.recovered_incidents ?? 0}
          </div>
          <div className="text-xs font-semibold text-emerald-700/80 mt-1">Telemetry healthy</div>
        </div>

        {/* Avg MTTR */}
        <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-xs border-t-4 border-t-stone-700">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Avg MTTR</span>
            <Clock className="h-4 w-4 text-stone-500" />
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-display font-black text-stone-900 font-mono">
            {stats?.avg_investigation_duration_seconds ? `${stats.avg_investigation_duration_seconds}s` : '12s'}
          </div>
          <div className="text-xs font-semibold text-stone-500 mt-1">Fast cycle time</div>
        </div>
      </div>

      {/* Autonomous Telemetry & Injection Engine */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border ${
              monitoring?.active_provider === 'PROMETHEUS'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : isSimulating
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-stone-50 border-stone-200 text-stone-600'
            }`}>
              <Radio className={`h-6 w-6 ${isSimulating ? 'animate-pulse text-emerald-600' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-display font-bold text-stone-900">Telemetry Ingestion Engine</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase border ${
                  monitoring?.active_provider === 'PROMETHEUS'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isSimulating
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}>
                  {monitoring?.mode_label || 'ACTIVE READY'}
                </span>
              </div>
              <p className="text-xs font-medium text-stone-500 mt-0.5">
                Continuous signal ingestion, anomaly evaluation, and automatic incident correlation.
              </p>
            </div>
          </div>

          {/* Quick Engine Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              disabled={isSimulating || actionLoading}
              className="bg-stone-50 text-stone-800 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 shadow-2xs"
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
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Stop Engine</span>
              </button>
            ) : (
              <button
                onClick={handleStartSimulation}
                disabled={actionLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Start Stream</span>
              </button>
            )}

            <button
              onClick={handleTriggerTick}
              disabled={actionLoading}
              title="Immediately inject a synthetic failure telemetry tick across services"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold transition-all active:scale-95 shadow-2xs"
            >
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <span>Inject Anomaly</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stream Health Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
            <span className="text-stone-500 block text-xs font-bold uppercase tracking-wider">Ingested Telemetry (24h)</span>
            <span className="text-stone-900 font-mono font-bold text-sm sm:text-base mt-0.5 block">
              {monitoring?.total_telemetry_records ?? 0} records
            </span>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
            <span className="text-stone-500 block text-xs font-bold uppercase tracking-wider">Active Anomaly Detections</span>
            <span className="text-amber-700 font-mono font-bold text-sm sm:text-base mt-0.5 block">
              {monitoring?.active_detections ?? 0} detected
            </span>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
            <span className="text-stone-500 block text-xs font-bold uppercase tracking-wider">Signal Freshness</span>
            <span className="text-stone-800 font-mono font-semibold text-xs sm:text-sm mt-0.5 block">
              {monitoring?.latest_telemetry_at ? new Date(monitoring.latest_telemetry_at).toLocaleTimeString() : 'Live polling'}
            </span>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
            <span className="text-stone-500 block text-xs font-bold uppercase tracking-wider">Webhook Endpoint</span>
            <span className="text-emerald-700 font-mono font-semibold text-xs truncate mt-0.5 block" title="/api/monitoring/webhooks/prometheus">
              /api/monitoring/webhooks/prometheus
            </span>
          </div>
        </div>

        {/* Live Detected Anomalies Feed */}
        {detections.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <BellRing className="h-4 w-4 text-emerald-600" />
                Live Anomaly Correlation Stream
              </span>
              <span className="text-xs font-mono font-semibold text-stone-500">Auto-correlated</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
              {detections.map((d) => (
                <div
                  key={d.id}
                  onClick={() => d.incident_id && onSelectIncident(d.incident_id, 'workspace')}
                  className={`p-3 rounded-xl bg-stone-50 border text-xs transition-all ${
                    d.incident_id ? 'border-stone-300 hover:border-emerald-500 hover:bg-white cursor-pointer shadow-xs' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono font-bold text-stone-900 text-xs sm:text-sm">{d.service}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      d.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {d.detection_type}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 mt-1 line-clamp-1 font-medium">{d.explanation}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-stone-500">
                    <span className="font-mono">{new Date(d.created_at).toLocaleTimeString()}</span>
                    {d.incident_id && (
                      <span className="text-emerald-700 font-mono font-bold hover:underline flex items-center gap-1">
                        {d.incident_id} <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Severity */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <h3 className="text-sm font-display font-bold uppercase tracking-wider text-stone-900 mb-4 flex items-center justify-between">
            <span>Severity Distribution</span>
            <span className="text-xs text-stone-500 font-medium normal-case">Active & Resolved</span>
          </h3>
          <div className="h-56 w-full">
            {sevData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sevData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#78716c" fontSize={12} fontWeight={600} />
                  <YAxis stroke="#78716c" fontSize={12} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '10px', color: '#1c1917', fontWeight: 600 }}
                    itemStyle={{ color: '#059669' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {sevData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-stone-400 text-xs">
                No incident data available
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <h3 className="text-sm font-display font-bold uppercase tracking-wider text-stone-900 mb-4 flex items-center justify-between">
            <span>Workflow Status</span>
            <span className="text-xs text-stone-500 font-medium normal-case">Lifecycle breakdown</span>
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
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '10px', color: '#1c1917', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-stone-400 text-xs">No status data available</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3 text-xs">
            {statData.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-stone-700 font-mono font-medium text-xs">{s.name}: <strong>{s.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-display font-bold text-stone-900">Recent Incidents</h3>
            <p className="text-xs text-stone-500 font-medium mt-0.5">High-priority outages requiring autonomous investigation</p>
          </div>
          <button
            onClick={() => onSelectIncident('', 'incidents')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors"
          >
            <span>View All Incidents</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-10 bg-stone-50 rounded-xl border border-dashed border-stone-300">
            <ShieldAlert className="h-10 w-10 text-stone-400 mx-auto mb-2" />
            <p className="text-sm text-stone-700 font-medium">No active incidents found</p>
            <button
              onClick={onLoadScenarios}
              className="mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
            >
              Load Demo Scenarios
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600 font-mono uppercase text-xs border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4 font-bold">ID</th>
                  <th className="py-3 px-4 font-bold">Incident Title</th>
                  <th className="py-3 px-4 font-bold">Target Service</th>
                  <th className="py-3 px-4 font-bold">Severity</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {incidents.slice(0, 6).map((inc) => (
                  <tr 
                    key={inc.id}
                    onClick={() => onSelectIncident(inc.id, 'workspace')}
                    className="hover:bg-stone-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                      {inc.id}
                    </td>
                    <td className="py-3 px-4 text-stone-900 font-bold max-w-sm truncate group-hover:text-emerald-800 text-xs sm:text-sm">
                      {inc.title}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600 text-xs">
                      {inc.service}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        inc.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        inc.status === 'RECOVERY_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        inc.status === 'INVESTIGATING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse' :
                        inc.status === 'MITIGATING' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-700 group-hover:text-emerald-800 text-xs font-bold inline-flex items-center gap-1">
                        Investigate <ArrowRight className="h-3.5 w-3.5" />
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

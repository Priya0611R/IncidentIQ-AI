import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  LayoutDashboard, 
  ListFilter, 
  PlusCircle, 
  RotateCcw, 
  Wrench, 
  FileText, 
  Cpu, 
  Database 
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  systemHealth: {
    status?: string;
    gemini_configured?: boolean;
    model?: string;
    execution_mode?: string;
  } | null;
  selectedIncidentId: string | null;
  onLoadScenarios: () => void;
  isLoadingScenarios: boolean;
  onOpenCreateModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  systemHealth,
  selectedIncidentId,
  onLoadScenarios,
  isLoadingScenarios,
  onOpenCreateModal
}) => {
  const isGemini = systemHealth?.gemini_configured;

  return (
    <header className="border-b border-navy-800 bg-navy-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">IncidentIQ</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  AI Autonomous
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Investigation & Recovery Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-navy-800 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </button>

            <button
              onClick={() => setCurrentTab('incidents')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'incidents'
                  ? 'bg-navy-800 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <ListFilter className="h-4 w-4" />
              Incidents
            </button>

            {selectedIncidentId && (
              <button
                onClick={() => setCurrentTab('workspace')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'workspace'
                    ? 'bg-navy-800 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                }`}
              >
                <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                Investigation: <span className="font-mono text-xs text-cyan-300">{selectedIncidentId}</span>
              </button>
            )}

            <button
              onClick={() => setCurrentTab('recovery')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentTab === 'recovery'
                  ? 'bg-navy-800 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <Wrench className="h-4 w-4" />
              Recovery Center
            </button>

            {selectedIncidentId && (
              <button
                onClick={() => setCurrentTab('report')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'report'
                    ? 'bg-navy-800 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                }`}
              >
                <FileText className="h-4 w-4" />
                Post-Mortem
              </button>
            )}
          </nav>

          {/* Right Status Badges & Actions */}
          <div className="flex items-center gap-3">
            {/* Model Badge */}
            <div className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border ${
              isGemini
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}>
              <Cpu className="h-3.5 w-3.5" />
              <span>
                {isGemini ? `Gemini: ${systemHealth?.model}` : 'Deterministic Demo Mode'}
              </span>
            </div>

            {/* Load Scenarios Button */}
            <button
              onClick={onLoadScenarios}
              disabled={isLoadingScenarios}
              title="Reload synthetic demonstration datasets into database"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 hover:border-slate-500 transition-all disabled:opacity-50"
            >
              <Database className={`h-3.5 w-3.5 ${isLoadingScenarios ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Reset Data</span>
            </button>

            {/* Create Incident Button */}
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Incident</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};


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
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-md shadow-emerald-700/20 ring-1 ring-emerald-600/30">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl tracking-tight text-stone-900">IncidentIQ</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Autonomous
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden sm:block">AI SRE Investigation & Recovery Platform</p>
            </div>
          </div>

          {/* Navigation Tabs with comfortable font sizes */}
          <nav className="hidden md:flex items-center bg-stone-100/80 p-1 rounded-xl border border-stone-200/80 space-x-1">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </button>

            <button
              onClick={() => setCurrentTab('incidents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'incidents'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <ListFilter className="h-4 w-4" />
              Incidents
            </button>

            {selectedIncidentId && (
              <button
                onClick={() => setCurrentTab('workspace')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  currentTab === 'workspace'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Activity className="h-4 w-4 text-emerald-300 animate-pulse" />
                <span>Investigation: <strong className="font-mono text-xs">{selectedIncidentId}</strong></span>
              </button>
            )}

            <button
              onClick={() => setCurrentTab('recovery')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'recovery'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Wrench className="h-4 w-4" />
              Recovery Center
            </button>

            {selectedIncidentId && (
              <button
                onClick={() => setCurrentTab('report')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  currentTab === 'report'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <FileText className="h-4 w-4" />
                Post-Mortem
              </button>
            )}
          </nav>

          {/* Right Status Badges & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Model Badge */}
            <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              isGemini
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <Cpu className="h-4 w-4 text-emerald-700" />
              <span>
                {isGemini ? `Gemini: ${systemHealth?.model}` : 'Deterministic Demo Mode'}
              </span>
            </div>

            {/* Load Scenarios Button */}
            <button
              onClick={onLoadScenarios}
              disabled={isLoadingScenarios}
              title="Reload synthetic demonstration datasets into database"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 shadow-xs transition-all disabled:opacity-50"
            >
              <Database className={`h-3.5 w-3.5 ${isLoadingScenarios ? 'animate-spin text-emerald-600' : 'text-stone-500'}`} />
              <span>Reset Data</span>
            </button>

            {/* Create Incident Button */}
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all active:scale-95"
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


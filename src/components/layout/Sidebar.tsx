import React from 'react';
import {
  Network,
  Calendar,
  PenTool,
  CheckSquare,
  Layers,
  BarChart3,
  FileUp,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';

export type NavView =
  | 'tree'
  | 'schedule'
  | 'essay'
  | 'questions'
  | 'flashcards'
  | 'analytics'
  | 'edital';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  streakCount: number;
  totalStudySecondsToday: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  streakCount,
  totalStudySecondsToday,
}) => {
  const navItems = [
    { id: 'tree' as NavView, label: 'Árvore de Estudo', icon: Network },
    { id: 'schedule' as NavView, label: 'Cronograma', icon: Calendar },
    { id: 'questions' as NavView, label: 'Banco de Questões', icon: CheckSquare },
    { id: 'flashcards' as NavView, label: 'Flashcards (SRS)', icon: Layers },
    { id: 'essay' as NavView, label: 'Laboratório de Redação', icon: PenTool },
    { id: 'analytics' as NavView, label: 'Desempenho & Lacunas', icon: BarChart3 },
    { id: 'edital' as NavView, label: 'Importar Edital IA', icon: FileUp },
  ];

  const formatHoursMinutes = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  return (
    <aside className="w-64 h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between select-none shrink-0 z-30">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100 text-sm tracking-tight flex items-center gap-1.5">
                SkillNapse
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">KyoFoundation</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Navegação Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800/90 text-zinc-100 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/70 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-zinc-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Gamification & User Footer */}
      <div className="p-3 border-t border-zinc-900/90 space-y-3 bg-zinc-950/60">
        {/* Streak & Today Study Time Widget */}
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-medium font-mono">
              <Flame className="w-4 h-4 fill-amber-500/20" />
              <span>{streakCount} dias seguidos</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Ativo
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                Líquidas hoje:
              </span>
              <span className="font-mono text-zinc-200">
                {formatHoursMinutes(totalStudySecondsToday)} / 3h 00m
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (totalStudySecondsToday / (3 * 3600)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200">
            MS
          </div>
          <div className="truncate flex-1">
            <div className="text-xs font-medium text-zinc-200 truncate">Hokyozu</div>
            <div className="text-[10px] text-zinc-400 font-mono truncate">hokyozu@skillnapse.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

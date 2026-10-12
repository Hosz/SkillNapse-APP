import React from 'react';
import {
  Network,
  Calendar,
  PenTool,
  Award,
  BarChart3,
  FileUp,
  Flame,
  Clock,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  Layers,
  Settings,
} from 'lucide-react';
import { useTheme } from '../../context/useTheme';

export type NavView =
  | 'tree'
  | 'schedule'
  | 'simulado'
  | 'flashcards'
  | 'essay'
  | 'analytics'
  | 'edital';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  streakCount: number;
  totalStudySecondsToday: number;
  userEmail?: string;
  userName?: string;
  dailyGoalHours?: number;
  onOpenProfile?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  streakCount,
  totalStudySecondsToday,
  userEmail = 'estudante@skillnapse.ai',
  userName,
  dailyGoalHours = 3,
  onOpenProfile,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'tree' as NavView, label: 'Árvore de Estudo', icon: Network },
    { id: 'schedule' as NavView, label: 'Cronograma Semanal', icon: Calendar },
    { id: 'simulado' as NavView, label: 'Simulados & Provas IA', icon: Award },
    { id: 'flashcards' as NavView, label: 'Flashcards (SM-2)', icon: Layers },
    { id: 'essay' as NavView, label: 'Laboratório de Redação', icon: PenTool },
    { id: 'analytics' as NavView, label: 'Desempenho & Lacunas', icon: BarChart3 },
    { id: 'edital' as NavView, label: 'Importar Edital IA', icon: FileUp },
  ];

  const formatHoursMinutes = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const getInitials = (text: string) => {
    if (!text) return 'SN';
    const clean = text.includes('@') ? text.split('@')[0] : text;
    const parts = clean.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-64 h-screen bg-white dark:bg-zinc-950 border-r-2 border-zinc-200 dark:border-zinc-800 flex flex-col justify-between select-none shrink-0 z-30 transition-colors print:hidden">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight flex items-center gap-1.5">
                SkillNapse
                <span className="text-[10px] font-mono uppercase bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">KyoFoundation</div>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all cursor-pointer"
            title={theme === 'dark' ? 'Mudar para Tema Branco' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Navegação Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-zinc-100 shadow-xs border border-indigo-200 dark:border-zinc-700 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Gamification & User Footer */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-50/70 dark:bg-zinc-950/70">
        {/* Streak & Today Study Time Widget */}
        <div
          onClick={onOpenProfile}
          className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-2xs hover:border-indigo-300 dark:hover:border-zinc-700 transition-all cursor-pointer group"
          title="Clique para calibrar sua meta diária de estudos"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold font-mono">
              <Flame className="w-4 h-4 fill-amber-500/20 text-amber-500" />
              <span>{streakCount} dias seguidos</span>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
              Ofensiva
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                Líquidas hoje:
              </span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                {formatHoursMinutes(totalStudySecondsToday)} / {dailyGoalHours}h 00m
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (totalStudySecondsToday / (dailyGoalHours * 3600)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div
          onClick={onOpenProfile}
          className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:border-indigo-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-all cursor-pointer group"
          title="Abrir Meu Perfil e Configurações"
        >
          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-1.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
              {getInitials(userName || userEmail)}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {userName || userEmail}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{userName ? userEmail : 'Conectado'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfile?.();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
              title="Configurações e Perfil"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              title="Deslogar da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

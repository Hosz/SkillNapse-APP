import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Target,
  Clock,
  Flame,
  Check,
  Sparkles,
  Sliders,
  ShieldCheck,
  TrendingUp,
  LogOut,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  cargoAlvo?: string;
  dailyGoalHours: number;
  dailyGoalQuestions?: number;
  streakCount: number;
  totalStudySecondsToday: number;
  questionsAnsweredToday?: number;
  onSave: (data: { userName: string; dailyGoalHours: number; dailyGoalQuestions: number; cargoAlvo?: string }) => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userName,
  cargoAlvo = '',
  dailyGoalHours,
  dailyGoalQuestions = 15,
  streakCount,
  totalStudySecondsToday,
  questionsAnsweredToday = 0,
  onSave,
  onLogout,
}) => {
  const [name, setName] = useState(userName);
  const [cargo, setCargo] = useState(cargoAlvo);
  const [goalHours, setGoalHours] = useState(dailyGoalHours);
  const [goalQuestions, setGoalQuestions] = useState(dailyGoalQuestions);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(userName);
      setCargo(cargoAlvo);
      setGoalHours(dailyGoalHours);
      setGoalQuestions(dailyGoalQuestions);
      setSavedSuccess(false);
    }
  }, [isOpen, userName, cargoAlvo, dailyGoalHours, dailyGoalQuestions]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      userName: name.trim(),
      cargoAlvo: cargo.trim(),
      dailyGoalHours: goalHours,
      dailyGoalQuestions: goalQuestions,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const getInitials = (text: string) => {
    if (!text) return 'SN';
    const parts = text.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  const formatHoursMinutes = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const goalSeconds = goalHours * 3600;
  const timePercent = Math.min(100, Math.round((totalStudySecondsToday / goalSeconds) * 100));
  const questionsPercent = goalQuestions > 0 ? Math.min(100, Math.round((questionsAnsweredToday / goalQuestions) * 100)) : 100;
  const overallPercent = goalQuestions > 0 ? Math.round((timePercent + questionsPercent) / 2) : timePercent;
  const isGoalComplete = timePercent >= 100 && (goalQuestions <= 0 || questionsPercent >= 100);

  const goalPresets = [1, 2, 3, 4, 5, 6, 8];

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto pt-6 sm:pt-8 pb-12 sm:pb-8 animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 sm:p-7 space-y-5 sm:space-y-6 text-zinc-900 dark:text-zinc-100 my-auto sm:my-8 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Perfil & Metas de Ofensiva</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Calibre seus objetivos diários de horas líquidas e questões para conquistar sua ofensiva.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Ofensiva</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {streakCount} {streakCount === 1 ? 'dia' : 'dias'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Horas Hoje</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {formatHoursMinutes(totalStudySecondsToday)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span>Questões</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {questionsAnsweredToday} / {goalQuestions > 0 ? goalQuestions : '∞'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isGoalComplete ? 'Concluída' : 'Progresso'}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {isGoalComplete ? '100% 🎉' : `${overallPercent}%`}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dados Pessoais */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              Identificação do Estudante
            </h4>

            <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-base shadow-md shadow-indigo-500/20 shrink-0">
                {getInitials(name || userEmail)}
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {name || 'Estudante'}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 text-zinc-400" />
                  <span>{userEmail}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  Nome de Exibição
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Lucas Gabriel"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-zinc-400" />
                  Cargo / Concurso Alvo
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Analista Judiciário, Auditor-Fiscal, Agente da PF..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Meta Diária de Estudo */}
          <div className="space-y-3.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                Meta Diária de Horas Líquidas
              </h4>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                {goalHours}h 00m por dia
              </span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {goalPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoalHours(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    goalHours === preset
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold border border-indigo-600'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  {preset}h
                </button>
              ))}
            </div>

            {/* Range Slider */}
            <div className="space-y-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                <span>1 hora</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {goalHours} {goalHours === 1 ? 'hora' : 'horas'} por dia ({goalHours * 60} min)
                </span>
                <span>10 horas</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={goalHours}
                onChange={(e) => setGoalHours(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Essa meta calibra a barra de horas no menu lateral e baliza os ciclos de foco do estudante.
              </p>
            </div>
          </div>

          {/* Meta Diária de Questões */}
          <div className="space-y-3.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                <Target className="w-3.5 h-3.5 text-amber-500" />
                Meta Diária de Questões
              </h4>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                {goalQuestions > 0 ? `${goalQuestions} questões / dia` : 'Sem meta de questões (opcional)'}
              </span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {[0, 5, 10, 15, 20, 25, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoalQuestions(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    goalQuestions === preset
                      ? 'bg-amber-600 text-white shadow-xs font-semibold border border-amber-600'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  {preset === 0 ? '0 (desativada)' : `${preset} q.`}
                </button>
              ))}
            </div>

            {/* Range Slider Questoes */}
            <div className="space-y-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                <span>0 (desativada)</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {goalQuestions > 0 ? `${goalQuestions} questões por dia` : 'Apenas horas líquidas computam ofensiva'}
                </span>
                <span>100 q.</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={goalQuestions}
                onChange={(e) => setGoalQuestions(parseInt(e.target.value, 10) || 0)}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {goalQuestions > 0
                  ? `Para computar e manter sua ofensiva, você precisará bater a meta de horas E resolver no mínimo ${goalQuestions} questões diariamente.`
                  : 'Ao deixar em 0, sua ofensiva dependerá exclusivamente de bater as horas líquidas de estudo.'}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Sair da conta e encerrar sessão"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Conta</span>
                </button>
              )}

              <span className="text-xs text-zinc-500 hidden sm:inline">
                {savedSuccess ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Salvo com sucesso!
                  </span>
                ) : (
                  'Metas salvas no seu perfil'
                )}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

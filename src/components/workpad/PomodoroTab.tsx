import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Flame, Award } from 'lucide-react';
import type { Topico } from '../../types';

interface PomodoroTabProps {
  topic: Topico;
  onSessionComplete: (seconds: number) => void;
}

export const PomodoroTab: React.FC<PomodoroTabProps> = ({ topic, onSessionComplete }) => {
  const [initialMinutes, setInitialMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`skillnapse_pomodoro_${topic.id}`);
      if (saved) return JSON.parse(saved).initialMinutes || 25;
    } catch (_err) {
      void _err;
    }
    return 25;
  });

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`skillnapse_pomodoro_${topic.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const elapsed = parsed.isRunning ? Math.floor((Date.now() - parsed.timestamp) / 1000) : 0;
        return Math.max(0, parsed.secondsLeft - elapsed);
      }
    } catch (_err) {
      void _err;
    }
    return 25 * 60;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`skillnapse_pomodoro_${topic.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const elapsed = parsed.isRunning ? Math.floor((Date.now() - parsed.timestamp) / 1000) : 0;
        return parsed.isRunning && parsed.secondsLeft - elapsed > 0;
      }
    } catch (_err) {
      void _err;
    }
    return false;
  });

  const [sessionSecondsElapsed, setSessionSecondsElapsed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`skillnapse_pomodoro_${topic.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const elapsed = parsed.isRunning ? Math.floor((Date.now() - parsed.timestamp) / 1000) : 0;
        return (parsed.sessionSecondsElapsed || 0) + elapsed;
      }
    } catch (_err) {
      void _err;
    }
    return 0;
  });

  const [mode, setMode] = useState<'FOCO' | 'PAUSA_CURTA' | 'PAUSA_LONGA'>('FOCO');
  const [justCompleted, setJustCompleted] = useState(false);

  // Persist Pomodoro timer state to localStorage (Section 6.2 of FRONTEND_INTEGRATION_GUIDE.md)
  useEffect(() => {
    if (secondsLeft > 0 && (isRunning || sessionSecondsElapsed > 0)) {
      localStorage.setItem(
        `skillnapse_pomodoro_${topic.id}`,
        JSON.stringify({
          initialMinutes,
          secondsLeft,
          isRunning,
          sessionSecondsElapsed,
          mode,
          timestamp: Date.now(),
        })
      );
    }
  }, [secondsLeft, isRunning, sessionSecondsElapsed, mode, initialMinutes, topic.id]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setJustCompleted(true);
            localStorage.removeItem(`skillnapse_pomodoro_${topic.id}`);
            return 0;
          }
          return prev - 1;
        });
        setSessionSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, topic.id]);

  const handleModeChange = (newMinutes: number, newMode: 'FOCO' | 'PAUSA_CURTA' | 'PAUSA_LONGA') => {
    setIsRunning(false);
    setInitialMinutes(newMinutes);
    setSecondsLeft(newMinutes * 60);
    setMode(newMode);
    setJustCompleted(false);
    localStorage.removeItem(`skillnapse_pomodoro_${topic.id}`);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(initialMinutes * 60);
    setSessionSecondsElapsed(0);
    localStorage.removeItem(`skillnapse_pomodoro_${topic.id}`);
  };

  const handleFinishSession = () => {
    setIsRunning(false);
    if (sessionSecondsElapsed > 0) {
      onSessionComplete(sessionSecondsElapsed);
    } else {
      onSessionComplete(initialMinutes * 60 - secondsLeft || 300);
    }
    setJustCompleted(true);
    localStorage.removeItem(`skillnapse_pomodoro_${topic.id}`);
    setTimeout(() => setJustCompleted(false), 4000);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = ((initialMinutes * 60 - secondsLeft) / (initialMinutes * 60)) * 100;

  const totalTopicHours = Math.floor((topic.tempoLiquidoSegundos || 0) / 3600);
  const totalTopicMinutes = Math.floor(((topic.tempoLiquidoSegundos || 0) % 3600) / 60);

  return (
    <div className="p-5 flex flex-col h-full justify-between select-none">
      <div className="space-y-6">
        {/* Mode Selector */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
          <button
            onClick={() => handleModeChange(25, 'FOCO')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'FOCO' && initialMinutes === 25
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Foco (25m)
          </button>
          <button
            onClick={() => handleModeChange(50, 'FOCO')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'FOCO' && initialMinutes === 50
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Deep (50m)
          </button>
          <button
            onClick={() => handleModeChange(5, 'PAUSA_CURTA')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'PAUSA_CURTA'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pausa (5m)
          </button>
        </div>

        {/* Circular / Minimalist Digital Clock Display */}
        <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 relative overflow-hidden">
          {/* Subtle glow circle */}
          <div
            className={`absolute w-48 h-48 rounded-full blur-3xl transition-opacity duration-1000 pointer-events-none ${
              isRunning ? 'bg-indigo-500/15 opacity-100' : 'bg-transparent opacity-0'
            }`}
          />

          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            {mode === 'FOCO' ? 'Sessão de Estudo Líquido' : 'Intervalo de Recuperação'}
          </span>

          <div className="text-6xl font-mono font-semibold tracking-tighter text-zinc-100 my-2">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>

          {/* Progress Bar */}
          <div className="w-56 h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleReset}
              className="p-3 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/50 transition-all active:scale-95"
              title="Resetar tempo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 shadow-lg transition-all active:scale-95 ${
                isRunning
                  ? 'bg-zinc-800 text-amber-300 border border-amber-500/30 shadow-amber-500/10'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" /> Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Iniciar Foco
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {justCompleted && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-300">
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sessão computada! Ofensiva (streak) mantida e horas salvas no tópico.</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/70">
            <div className="text-[11px] text-zinc-500">Horas líquidas no tópico</div>
            <div className="text-base font-mono font-semibold text-zinc-200 mt-0.5">
              {totalTopicHours}h {totalTopicMinutes}m
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/70">
            <div className="text-[11px] text-zinc-500">Ofensiva ativa</div>
            <div className="text-base font-mono font-semibold text-amber-400 mt-0.5 flex items-center gap-1.5">
              <Flame className="w-4 h-4 fill-amber-500/20" /> 14 dias
            </div>
          </div>
        </div>
      </div>

      {/* Complete session & record net time */}
      <div className="pt-4 border-t border-zinc-900">
        <button
          onClick={handleFinishSession}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 text-xs font-medium border border-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-2 transition-all"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Concluir Sessão & Registrar no Banco (+Streak)
        </button>
      </div>
    </div>
  );
};

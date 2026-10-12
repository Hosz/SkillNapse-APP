import React, { useEffect } from 'react';
import {
  Sparkles,
  X,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export interface AiQuotaExceededModalProps {
  isOpen: boolean;
  message?: string;
  onClose: () => void;
}

export const AiQuotaExceededModal: React.FC<AiQuotaExceededModalProps> = ({
  isOpen,
  message,
  onClose,
}) => {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/50 shadow-2xl overflow-hidden p-6 text-zinc-900 dark:text-zinc-100 transition-all">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 mb-1">
              <Clock className="w-3 h-3" />
              COTA DIÁRIA ATINGIDA (429)
            </div>
            <h3 id="quota-modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Limite Diário de IA Atingido
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              A cota de processamento do modelo de Inteligência Artificial atingiu o teto diário do provedor.
            </p>
          </div>
        </div>

        {/* Mensagem Técnica ou Customizada se fornecida */}
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {/* Informações Didáticas sobre o Reset e o que fazer */}
        <div className="space-y-3 mb-6 text-xs text-zinc-600 dark:text-zinc-300">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
              Quando a IA voltará a responder?
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
              As cotas de requisição diária (Google Gemini) são renovadas automaticamente todos os dias às <strong>00:00 UTC (21:00 no horário de Brasília)</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              O que você ainda pode fazer na plataforma:
            </div>
            <ul className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5 pl-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Revisar seus <strong>Flashcards</strong> já cadastrados com repetição espaçada.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Navegar pela <strong>Árvore de Estudos</strong> e usar o <strong>Workpad / Pomodoro</strong>.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Praticar questões e simulados já registrados no seu histórico.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Ação */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            Entendi e continuar estudando
          </button>
        </div>
      </div>
    </div>
  );
};

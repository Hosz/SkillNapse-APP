import React, { useState, useEffect } from 'react';
import {
  Timer,
  FileSignature,
  HelpCircle,
  Layers,
  X,
  Maximize2,
  Minimize2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { Topico, Materia } from '../../types';
import { PomodoroTab } from './PomodoroTab';
import { CanvasTab } from './CanvasTab';
import { QuestionsTab } from './QuestionsTab';
import { FlashcardsTab } from './FlashcardsTab';

export type TicketType = 'pomodoro' | 'canvas' | 'questoes' | 'flashcards';

interface WorkpadProps {
  topic: Topico | null;
  materia?: Materia;
  planoId?: string;
  initialTab?: TicketType;
  onClose?: () => void;
  onSessionComplete: (seconds: number) => void;
  onPraticarSimulado?: (params: {
    planoId?: string;
    materiaId?: string;
    topicoId?: string;
    subtopicoId?: string;
  }) => void;
  onStartSimulado?: (simuladoId?: string) => void;
}

export const Workpad: React.FC<WorkpadProps> = ({
  topic,
  materia,
  planoId,
  initialTab = 'pomodoro',
  onClose,
  onSessionComplete,
  onPraticarSimulado,
  onStartSimulado,
}) => {
  // State: which ticket is currently pulled/open (null means collapsed)
  const [activeTicket, setActiveTicket] = useState<TicketType | null>(initialTab);
  const [isExpanded, setIsExpanded] = useState(false);

  // Se um novo tópico for selecionado e o fichário estiver recolhido, abre com a aba inicial
  useEffect(() => {
    if (topic && !activeTicket) {
      setActiveTicket(initialTab);
    }
  }, [topic?.id]);

  const fallbackTopic: Topico = {
    id: 'geral',
    materiaId: 'geral',
    titulo: 'Sessão Livre de Estudos',
    peso: 5,
    proficiencia: 'INICIANTE',
    ordem: 0,
  };

  const effectiveTopic = topic || fallbackTopic;

  const handleToggleTicket = (ticket: TicketType) => {
    if (activeTicket === ticket) {
      setActiveTicket(null); // Recolhe o ticket se já estiver aberto
    } else {
      setActiveTicket(ticket); // Puxa o ticket selecionado
    }
  };

  const getTicketMeta = (ticket: TicketType) => {
    switch (ticket) {
      case 'pomodoro':
        return {
          label: 'Divisória: Foco Pomodoro',
          dotClass: 'bg-rose-500',
          textClass: 'text-rose-600 dark:text-rose-400',
        };
      case 'canvas':
        return {
          label: 'Divisória: Quadro de Rascunho / Canvas',
          dotClass: 'bg-amber-500',
          textClass: 'text-amber-600 dark:text-amber-400',
        };
      case 'questoes':
        return {
          label: 'Divisória: Questões de Fixação',
          dotClass: 'bg-sky-500',
          textClass: 'text-sky-600 dark:text-sky-400',
        };
      case 'flashcards':
        return {
          label: 'Divisória: Flashcards SM-2',
          dotClass: 'bg-emerald-500',
          textClass: 'text-emerald-600 dark:text-emerald-400',
        };
    }
  };

  return (
    <aside className="h-full flex select-none z-30 shrink-0">
      {/* 1. Painel Deslizante do Ticket Aberto */}
      {activeTicket !== null && (
        <div
          className={`h-full bg-white dark:bg-zinc-950 border-l-2 border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 animate-in slide-in-from-right-6 shadow-2xl ${
            isExpanded
              ? 'w-full md:w-[680px]'
              : 'w-full md:w-[440px] lg:w-[480px] xl:w-[520px]'
          }`}
        >
          {/* Header do Ticket Puxado */}
          <div className="p-4 border-b-2 border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/80 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              {/* Badge indicativo da gaveta puxada */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    getTicketMeta(activeTicket).dotClass
                  }`}
                />
                <span
                  className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    getTicketMeta(activeTicket).textClass
                  }`}
                >
                  {getTicketMeta(activeTicket).label}
                </span>
              </div>

              {/* Botões de Ação do Painel */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title={isExpanded ? 'Reduzir painel' : 'Expandir painel'}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Recolher divisória"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contexto do Tópico / Subtópico Selecionado */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  {materia && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: materia.corHex }}
                    />
                  )}
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-400 truncate">
                    {materia?.nome || 'Estudo Geral'}
                  </span>
                  {effectiveTopic.topicoPaiId && (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shrink-0">
                      SUBTÓPICO
                    </span>
                  )}
                </div>
                <div
                  className="text-sm font-bold text-zinc-950 dark:text-zinc-100 line-clamp-2 tracking-tight"
                  title={effectiveTopic.titulo}
                >
                  {effectiveTopic.titulo}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700/60 shrink-0 font-bold">
                  Peso {effectiveTopic.peso}/10
                </span>
                {topic && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                    title="Desmarcar este tópico/subtópico"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Conteúdo do Ticket Ativo */}
          <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950">
            {activeTicket === 'pomodoro' && (
              <PomodoroTab
                key={effectiveTopic.id}
                topic={effectiveTopic}
                onSessionComplete={onSessionComplete}
              />
            )}
            {activeTicket === 'canvas' && (
              <CanvasTab key={effectiveTopic.id} topic={effectiveTopic} />
            )}
            {activeTicket === 'questoes' && (
              <QuestionsTab
                key={effectiveTopic.id}
                topic={effectiveTopic}
                materia={materia}
                planoId={planoId}
                onPraticarSimulado={onPraticarSimulado}
                onStartSimulado={onStartSimulado}
              />
            )}
            {activeTicket === 'flashcards' && (
              <FlashcardsTab
                key={effectiveTopic.id}
                topic={effectiveTopic}
                materia={materia}
                planoId={planoId}
              />
            )}
          </div>
        </div>
      )}

      {/* 2. Coluna Vertical de Marcadores de Fichário (Linguetas Puxáveis Salientes) */}
      <div className="w-13 sm:w-14 h-full bg-zinc-100/70 dark:bg-zinc-950 border-l-2 border-zinc-200 dark:border-zinc-800 flex flex-col items-end justify-between py-6 shrink-0 z-40 select-none relative">
        {/* Marcadores Puxáveis do Fichário */}
        <div className="flex flex-col items-end gap-4 w-full">
          {/* Marcador 1: Pomodoro (Aba Vermelha/Rose) */}
          <button
            type="button"
            onClick={() => handleToggleTicket('pomodoro')}
            className={`w-[calc(100%+8px)] py-3 px-1.5 rounded-l-2xl rounded-r-none flex flex-col items-center justify-center gap-2 group relative border-y-2 border-l-2 border-r-0 transition-all duration-300 cursor-pointer ${
              activeTicket === 'pomodoro'
                ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white border-rose-400 shadow-[-8px_4px_16px_rgba(225,29,72,0.35)] -translate-x-3 sm:-translate-x-3.5 z-20'
                : 'bg-white dark:bg-zinc-900/90 text-rose-600 dark:text-rose-400 border-zinc-300 dark:border-zinc-800 hover:border-rose-400/80 hover:bg-rose-500 hover:text-white hover:-translate-x-2.5 shadow-[-4px_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[-4px_2px_12px_rgba(0,0,0,0.35)] z-10'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            title={activeTicket === 'pomodoro' ? 'Recolher Pomodoro' : 'Puxar Marcador: Pomodoro'}
          >
            <span
              className={`w-2 h-2 rounded-full border shadow-inner transition-colors ${
                activeTicket === 'pomodoro'
                  ? 'bg-red-800/40 border-white/50'
                  : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 group-hover:bg-red-800/40 group-hover:border-white/50'
              }`}
            />

            <Timer
              className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                activeTicket === 'pomodoro' ? 'text-white' : 'text-rose-600 dark:text-rose-400 group-hover:text-white'
              }`}
            />

            <span
              className="text-[9px] font-mono uppercase font-bold tracking-widest text-center"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Pomodoro
            </span>

            {activeTicket === 'pomodoro' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l bg-white shadow-xs" />
            )}
          </button>

          {/* Marcador 2: Rascunho / Canvas (Aba Âmbar/Dourada) */}
          <button
            type="button"
            onClick={() => handleToggleTicket('canvas')}
            className={`w-[calc(100%+8px)] py-3 px-1.5 rounded-l-2xl rounded-r-none flex flex-col items-center justify-center gap-2 group relative border-y-2 border-l-2 border-r-0 transition-all duration-300 cursor-pointer ${
              activeTicket === 'canvas'
                ? 'bg-gradient-to-b from-amber-500 to-orange-600 text-white border-amber-400 shadow-[-8px_4px_16px_rgba(245,158,11,0.35)] -translate-x-3 sm:-translate-x-3.5 z-20'
                : 'bg-white dark:bg-zinc-900/90 text-amber-600 dark:text-amber-400 border-zinc-300 dark:border-zinc-800 hover:border-amber-400/80 hover:bg-amber-500 hover:text-white hover:-translate-x-2.5 shadow-[-4px_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[-4px_2px_12px_rgba(0,0,0,0.35)] z-10'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            title={activeTicket === 'canvas' ? 'Recolher Rascunho' : 'Puxar Marcador: Rascunho'}
          >
            <span
              className={`w-2 h-2 rounded-full border shadow-inner transition-colors ${
                activeTicket === 'canvas'
                  ? 'bg-amber-800/40 border-white/50'
                  : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 group-hover:bg-amber-800/40 group-hover:border-white/50'
              }`}
            />

            <FileSignature
              className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                activeTicket === 'canvas' ? 'text-white' : 'text-amber-600 dark:text-amber-400 group-hover:text-white'
              }`}
            />

            <span
              className="text-[9px] font-mono uppercase font-bold tracking-widest text-center"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Rascunho
            </span>

            {activeTicket === 'canvas' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l bg-white shadow-xs" />
            )}
          </button>

          {/* Marcador 3: Questões de Fixação (Aba Azul/Sky) */}
          <button
            type="button"
            onClick={() => handleToggleTicket('questoes')}
            className={`w-[calc(100%+8px)] py-3 px-1.5 rounded-l-2xl rounded-r-none flex flex-col items-center justify-center gap-2 group relative border-y-2 border-l-2 border-r-0 transition-all duration-300 cursor-pointer ${
              activeTicket === 'questoes'
                ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white border-sky-400 shadow-[-8px_4px_16px_rgba(14,165,233,0.35)] -translate-x-3 sm:-translate-x-3.5 z-20'
                : 'bg-white dark:bg-zinc-900/90 text-sky-600 dark:text-sky-400 border-zinc-300 dark:border-zinc-800 hover:border-sky-400/80 hover:bg-sky-500 hover:text-white hover:-translate-x-2.5 shadow-[-4px_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[-4px_2px_12px_rgba(0,0,0,0.35)] z-10'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            title={activeTicket === 'questoes' ? 'Recolher Questões' : 'Puxar Marcador: Questões'}
          >
            <span
              className={`w-2 h-2 rounded-full border shadow-inner transition-colors ${
                activeTicket === 'questoes'
                  ? 'bg-blue-800/40 border-white/50'
                  : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 group-hover:bg-blue-800/40 group-hover:border-white/50'
              }`}
            />

            <HelpCircle
              className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                activeTicket === 'questoes' ? 'text-white' : 'text-sky-600 dark:text-sky-400 group-hover:text-white'
              }`}
            />

            <span
              className="text-[9px] font-mono uppercase font-bold tracking-widest text-center"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Questões
            </span>

            {activeTicket === 'questoes' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l bg-white shadow-xs" />
            )}
          </button>

          {/* Marcador 4: Flashcards SM-2 (Aba Esmeralda/Verde) */}
          <button
            type="button"
            onClick={() => handleToggleTicket('flashcards')}
            className={`w-[calc(100%+8px)] py-3 px-1.5 rounded-l-2xl rounded-r-none flex flex-col items-center justify-center gap-2 group relative border-y-2 border-l-2 border-r-0 transition-all duration-300 cursor-pointer ${
              activeTicket === 'flashcards'
                ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-[-8px_4px_16px_rgba(16,185,129,0.35)] -translate-x-3 sm:-translate-x-3.5 z-20'
                : 'bg-white dark:bg-zinc-900/90 text-emerald-600 dark:text-emerald-400 border-zinc-300 dark:border-zinc-800 hover:border-emerald-400/80 hover:bg-emerald-500 hover:text-white hover:-translate-x-2.5 shadow-[-4px_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[-4px_2px_12px_rgba(0,0,0,0.35)] z-10'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            title={activeTicket === 'flashcards' ? 'Recolher Flashcards' : 'Puxar Marcador: Flashcards'}
          >
            <span
              className={`w-2 h-2 rounded-full border shadow-inner transition-colors ${
                activeTicket === 'flashcards'
                  ? 'bg-emerald-800/40 border-white/50'
                  : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 group-hover:bg-emerald-800/40 group-hover:border-white/50'
              }`}
            />

            <Layers
              className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                activeTicket === 'flashcards' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400 group-hover:text-white'
              }`}
            />

            <span
              className="text-[9px] font-mono uppercase font-bold tracking-widest text-center"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Cards
            </span>

            {activeTicket === 'flashcards' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l bg-white shadow-xs" />
            )}
          </button>
        </div>

        {/* Rodapé da Barra de Fichário */}
        <div className="flex flex-col items-center gap-2 w-full pr-1">
          {activeTicket ? (
            <button
              type="button"
              onClick={() => setActiveTicket(null)}
              className="p-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white border border-zinc-300 dark:border-zinc-800 transition-colors"
              title="Recolher aba do fichário"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div
              className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
              title="Puxe uma aba para abrir o fichário"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import {
  Timer,
  FileSignature,
  HelpCircle,
  Layers,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import type { Topico, Materia } from '../../types';
import { PomodoroTab } from './PomodoroTab';
import { CanvasTab } from './CanvasTab';
import { QuestionsTab } from './QuestionsTab';
import { FlashcardsTab } from './FlashcardsTab';

export type WorkpadTab = 'pomodoro' | 'canvas' | 'questions' | 'flashcards';

interface WorkpadProps {
  topic: Topico | null;
  materia?: Materia;
  onClose: () => void;
  onSessionComplete: (seconds: number) => void;
}

export const Workpad: React.FC<WorkpadProps> = ({
  topic,
  materia,
  onClose,
  onSessionComplete,
}) => {
  const [activeTab, setActiveTab] = useState<WorkpadTab>('pomodoro');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!topic) {
    return (
      <aside className="w-[440px] xl:w-[480px] h-full bg-zinc-950 border-l border-zinc-900 flex flex-col items-center justify-center p-8 text-center select-none text-zinc-500">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-600">
          <ExternalLink className="w-5 h-5" />
        </div>
        <div className="text-sm font-medium text-zinc-300">Nenhum tópico selecionado</div>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Selecione qualquer tópico ou matéria na árvore de conhecimento para abrir o cronômetro Pomodoro, o quadro de rascunhos, questões ou flashcards.
        </p>
      </aside>
    );
  }

  const tabs = [
    { id: 'pomodoro' as WorkpadTab, label: 'Pomodoro', icon: Timer },
    { id: 'canvas' as WorkpadTab, label: 'Rascunho / Canvas', icon: FileSignature },
    { id: 'questions' as WorkpadTab, label: 'Questões', icon: HelpCircle },
    { id: 'flashcards' as WorkpadTab, label: 'Flashcards', icon: Layers },
  ];

  return (
    <aside
      className={`h-full bg-zinc-950 border-l border-zinc-900 flex flex-col transition-all duration-300 z-20 ${
        isExpanded ? 'w-full md:w-[680px]' : 'w-full md:w-[450px] lg:w-[480px] xl:w-[520px]'
      }`}
    >
      {/* Workpad Context Header */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            {materia && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: materia.corHex }}
              />
            )}
            <span className="text-[11px] font-mono text-zinc-400 truncate">
              {materia?.nome || 'Matéria'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-900 transition-colors"
              title={isExpanded ? 'Reduzir painel' : 'Expandir painel'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-900 transition-colors"
              title="Fechar painel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight leading-snug line-clamp-1">
            {topic.titulo}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
              Peso {topic.peso}/10
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                topic.proficiencia === 'AVANCADO'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : topic.proficiencia === 'INTERMEDIARIO'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              {topic.proficiencia}
            </span>
          </div>
        </div>

        {/* Minimalist Segmented Tabs */}
        <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-indigo-400' : 'text-zinc-400'
                  }`}
                />
                <span className="truncate hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Viewport */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'pomodoro' && (
          <PomodoroTab key={topic.id} topic={topic} onSessionComplete={onSessionComplete} />
        )}
        {activeTab === 'canvas' && <CanvasTab key={topic.id} topic={topic} />}
        {activeTab === 'questions' && <QuestionsTab key={topic.id} topic={topic} />}
        {activeTab === 'flashcards' && <FlashcardsTab key={topic.id} topic={topic} />}
      </div>
    </aside>
  );
};

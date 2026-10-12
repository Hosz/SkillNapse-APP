import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  X,
  Award,
  Layers,
  Timer,
  FileSignature,
} from 'lucide-react';
import type { Topico } from '../../types';

interface TopicNodeProps {
  topic: Topico;
  level?: number;
  parentTopicTitle?: string;
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topico) => void;
  onOpenWorkpad?: (topic: Topico, tab?: 'pomodoro' | 'canvas' | 'questoes' | 'flashcards') => void;
  onAddSubtopic?: (parentTopicId: string) => void;
  onEditTopic?: (topic: Topico) => void;
  onDeleteTopic?: (topicId: string) => void;
  onPraticarSimulado?: (params: {
    materiaId?: string;
    topicoId: string;
    subtopicoId?: string;
  }) => void;
  onPraticarFlashcards?: (params: {
    materiaId?: string;
    topicoId: string;
    topicoNome: string;
    subtopicoId?: string;
    subtopicoNome?: string;
  }) => void;
}

export const TopicNode: React.FC<TopicNodeProps> = ({
  topic,
  level = 0,
  parentTopicTitle,
  selectedTopicId,
  onSelectTopic,
  onOpenWorkpad,
  onAddSubtopic,
  onEditTopic,
  onDeleteTopic,
  onPraticarSimulado,
  onPraticarFlashcards,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hasSubtopics = topic.subtopicos && topic.subtopicos.length > 0;
  const isSelected = selectedTopicId === topic.id;
  const isSubtopic = level > 0;

  const getProficiencyBadge = (prof: string) => {
    switch (prof) {
      case 'AVANCADO':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'INTERMEDIARIO':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className={`relative ${isMenuOpen ? 'z-30' : ''}`}>
      {/* Node Row */}
      <div
        className={`group flex items-start sm:items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border-2 ${
          isSelected
            ? isSubtopic
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-sm text-indigo-950 dark:text-white font-semibold'
              : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/30 shadow-sm text-zinc-900 dark:text-zinc-100 font-semibold'
            : 'bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/90 border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-800 dark:text-zinc-200'
        }`}
        onClick={() => onSelectTopic(topic)}
      >
        <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0 pr-2">
          {/* Expand/Collapse Chevron for subtopics */}
          {hasSubtopics ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 mt-0.5 sm:mt-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4 sm:w-5 flex items-center justify-center shrink-0 mt-1 sm:mt-0">
              <span
                className={`w-2 h-2 rounded-full transition-transform ${
                  isSelected
                    ? isSubtopic
                      ? 'bg-indigo-600 dark:bg-indigo-400 ring-2 ring-indigo-400/50 scale-125'
                      : 'bg-indigo-600 dark:bg-indigo-400 scale-110'
                    : 'bg-zinc-400 dark:bg-zinc-700 group-hover:bg-zinc-600 dark:group-hover:bg-zinc-500'
                }`}
              />
            </div>
          )}

          {/* Topic Title & Subline Info */}
          <div className="min-w-0 flex-1">
            <span
              className={`text-xs tracking-tight break-words block leading-snug ${
                isSelected
                  ? isSubtopic
                    ? 'font-bold text-indigo-900 dark:text-indigo-200'
                    : 'font-bold text-zinc-900 dark:text-zinc-100'
                  : 'font-medium text-zinc-800 dark:text-zinc-200'
              }`}
              title={topic.titulo}
            >
              {topic.titulo}
            </span>

            {/* Mobile Subline: Badges compactos abaixo do título para liberar 100% da largura */}
            <div className="flex sm:hidden items-center gap-1.5 mt-1.5 flex-wrap">
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9px] font-mono text-zinc-700 dark:text-zinc-400"
                title={`Peso no edital: ${topic.peso}/10`}
              >
                <span>P{topic.peso}</span>
                {topic.peso >= 9 && (
                  <Sparkles className="w-2 h-2 text-amber-500 dark:text-amber-400 fill-amber-500/20" />
                )}
              </div>

              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${getProficiencyBadge(
                  topic.proficiencia
                )}`}
              >
                {topic.proficiencia.slice(0, 4)}
              </span>

              {isSelected && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Marcado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
          {/* Desktop badges (ocultos no mobile para não sobrepor o texto) */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-700 dark:text-zinc-400"
              title={`Peso no edital: ${topic.peso}/10`}
            >
              <span>P{topic.peso}</span>
              {topic.peso >= 9 && (
                <Sparkles className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 fill-amber-500/20" />
              )}
            </div>

            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${getProficiencyBadge(
                topic.proficiencia
              )}`}
            >
              {topic.proficiencia.slice(0, 4)}
            </span>

            {/* Quick Study / Desmarcar Button no Desktop */}
            <button
              type="button"
              onClick={() => onSelectTopic(topic)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold shadow-2xs'
                  : 'opacity-0 group-hover:opacity-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
              title={isSelected ? "Desmarcar este item" : "Selecionar tópico"}
            >
              {isSelected ? (
                <>
                  <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Desmarcar</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3 h-3" />
                  <span>Selecionar</span>
                </>
              )}
            </button>
          </div>

          {/* Context Dropdown / Actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Ações do item"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-1 z-50 space-y-0.5"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                {/* Opção: Estudar no Fichário / Pomodoro */}
                {onOpenWorkpad && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenWorkpad(topic, 'pomodoro');
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Timer className="w-3.5 h-3.5 text-rose-500" />
                    <span>Estudar com Pomodoro</span>
                  </button>
                )}

                {/* Opção: Rascunho / Canvas */}
                {onOpenWorkpad && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenWorkpad(topic, 'canvas');
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileSignature className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quadro de Rascunho</span>
                  </button>
                )}

                {onPraticarSimulado && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onPraticarSimulado({
                        materiaId: topic.materiaId,
                        topicoId: isSubtopic ? (topic.topicoPaiId || topic.id) : topic.id,
                        subtopicoId: isSubtopic ? topic.id : undefined,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Praticar Simulado</span>
                  </button>
                )}

                {onPraticarFlashcards && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onPraticarFlashcards({
                        materiaId: topic.materiaId,
                        topicoId: isSubtopic ? (topic.topicoPaiId || topic.id) : topic.id,
                        topicoNome: isSubtopic ? (parentTopicTitle || topic.titulo) : topic.titulo,
                        subtopicoNome: isSubtopic ? topic.titulo : undefined,
                        subtopicoId: isSubtopic ? topic.id : undefined,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Praticar Flashcards</span>
                  </button>
                )}

                {onAddSubtopic && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onAddSubtopic(topic.id);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Adicionar Subtópico</span>
                  </button>
                )}

                {onEditTopic && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEditTopic(topic);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Editar {isSubtopic ? 'Subtópico' : 'Tópico'}</span>
                  </button>
                )}

                {onDeleteTopic && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteTopic(topic.id);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-1 mt-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                    <span>Excluir {isSubtopic ? 'Subtópico' : 'Tópico'}</span>
                  </button>
                )}

                {isSelected && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSelectTopic(topic);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-1 mt-1 cursor-pointer font-medium"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Desmarcar Seleção</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recursive Subtopics */}
      {hasSubtopics && isExpanded && (
        <div className="mt-1.5 space-y-1.5 border-l-[3px] border-indigo-500/60 ml-3 sm:ml-4 pl-2.5 sm:pl-3 py-0.5">
          {topic.subtopicos!.map((sub) => (
            <TopicNode
              key={sub.id}
              topic={sub}
              level={level + 1}
              parentTopicTitle={topic.titulo}
              selectedTopicId={selectedTopicId}
              onSelectTopic={onSelectTopic}
              onOpenWorkpad={onOpenWorkpad}
              onAddSubtopic={onAddSubtopic}
              onEditTopic={onEditTopic}
              onDeleteTopic={onDeleteTopic}
              onPraticarSimulado={onPraticarSimulado}
              onPraticarFlashcards={onPraticarFlashcards}
            />
          ))}
        </div>
      )}
    </div>
  );
};

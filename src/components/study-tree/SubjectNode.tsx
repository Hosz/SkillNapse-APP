import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FolderKanban,
  Edit2,
  Trash2,
  MoreVertical,
  GitBranch,
  Award,
  Layers,
  GripVertical,
} from 'lucide-react';
import type { Materia, Topico } from '../../types';
import { TopicNode } from './TopicNode';
import { planoService } from '../../services';

interface SubjectNodeProps {
  materia: Materia;
  materiaNumero?: string;
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topico, materia: Materia) => void;
  onOpenWorkpad?: (topic: Topico, materia: Materia, tab?: 'pomodoro' | 'canvas' | 'questoes' | 'flashcards') => void;
  onAddTopic?: (materiaId: string) => void;
  onEditMateria?: (materia: Materia) => void;
  onDeleteMateria?: (materiaId: string) => void;
  onAddSubtopic?: (parentTopicId: string, materiaId: string) => void;
  onEditTopic?: (topic: Topico) => void;
  onDeleteTopic?: (topicId: string) => void;
  onPraticarSimulado?: (params: {
    planoId?: string;
    materiaId?: string;
    topicoId?: string;
    subtopicoId?: string;
  }) => void;
  onPraticarFlashcards?: (params: {
    planoId?: string;
    materiaId?: string;
    materiaNome?: string;
    topicoId?: string;
    topicoNome?: string;
    subtopicoId?: string;
    subtopicoNome?: string;
  }) => void;
}

export const SubjectNode: React.FC<SubjectNodeProps> = ({
  materia,
  materiaNumero,
  selectedTopicId,
  onSelectTopic,
  onOpenWorkpad,
  onAddTopic,
  onEditMateria,
  onDeleteMateria,
  onAddSubtopic,
  onEditTopic,
  onDeleteTopic,
  onPraticarSimulado,
  onPraticarFlashcards,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [localTopicos, setLocalTopicos] = useState<Topico[]>(() => {
    return [...(materia?.topicos || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  });
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverTopicId, setDragOverTopicId] = useState<string | null>(null);

  useEffect(() => {
    setLocalTopicos([...(materia?.topicos || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
  }, [materia?.topicos]);

  const handleTopicDrop = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const oldIndex = localTopicos.findIndex((t) => t.id === sourceId);
    const newIndex = localTopicos.findIndex((t) => t.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...localTopicos];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);

    const reordered = updated.map((t, idx) => ({ ...t, ordem: idx }));
    setLocalTopicos(reordered);

    await planoService.reordenarTopicos(
      materia.id,
      reordered.map((t) => t.id)
    );
  };

  const topicos = localTopicos;

  // Compute subtopics count
  const countSubtopics = (topicosList: Topico[]): number => {
    return topicosList.reduce((acc, t) => {
      const directSubs = t.subtopicos?.length || 0;
      const nestedSubs = t.subtopicos ? countSubtopics(t.subtopicos) : 0;
      return acc + directSubs + nestedSubs;
    }, 0);
  };

  const totalPrincipais = topicos.length;
  const totalSubtopicosMateria = countSubtopics(topicos);

  return (
    <div className={`rounded-2xl border-2 border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-950/70 shadow-xs transition-all flex relative hover:z-20 focus-within:z-30 ${isMenuOpen ? 'z-30' : ''}`}>
      {/* 1. Faixa lateral colorida destacada da matéria (visível tanto no tema escuro quanto no tema branco) */}
      <div
        className="w-2.5 shrink-0 self-stretch rounded-l-[14px]"
        style={{ backgroundColor: materia.corHex }}
        title={`Disciplina: ${materia.nome}`}
      />

      {/* 2. Conteúdo do Cartão */}
      <div className="flex-1 min-w-0">
        {/* Subject Header Card */}
        <div
          className={`p-3.5 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 cursor-pointer transition-colors ${
            isExpanded
              ? 'border-b-2 border-zinc-200 dark:border-zinc-800 rounded-tr-[14px]'
              : 'rounded-r-[14px]'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
        <div className="flex items-center gap-2.5">
          <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0" title="Arraste para reorganizar disciplina">
            <GripVertical className="w-4 h-4" />
          </div>
          <button
            type="button"
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Subject Color Badge */}
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-white/20"
            style={{ backgroundColor: materia.corHex }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {materiaNumero && (
                  <span className="font-mono text-zinc-400 dark:text-zinc-500 font-bold text-xs sm:text-sm shrink-0 select-none">
                    {materiaNumero}
                  </span>
                )}
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight break-words">
                  {materia.nome}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] flex-wrap">
                <span className="text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700/60 font-medium">
                  {totalPrincipais} {totalPrincipais === 1 ? 'tópico' : 'tópicos'}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20 font-medium flex items-center gap-1">
                  <GitBranch className="w-2.5 h-2.5" />
                  {totalSubtopicosMateria} {totalSubtopicosMateria === 1 ? 'subtópico' : 'subtópicos'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {onAddTopic && (
            <button
              onClick={() => onAddTopic(materia.id)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Adicionar tópico nesta matéria"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Context Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Opções da matéria"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-1 z-50 space-y-0.5"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                {onPraticarSimulado && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onPraticarSimulado({
                        planoId: materia.planoId,
                        materiaId: materia.id,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 font-medium"
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
                        planoId: materia.planoId,
                        materiaId: materia.id,
                        materiaNome: materia.nome,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 font-medium"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Praticar Flashcards</span>
                  </button>
                )}

                {onEditMateria && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEditMateria(materia);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Editar Matéria</span>
                  </button>
                )}

                {onDeleteMateria && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteMateria(materia.id);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-1 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                    <span>Excluir Matéria</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topics list with vertical tree guide */}
      {isExpanded && (
        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-br-[14px]">
          {topicos.length > 0 ? (
            <div
              className="pl-3.5 space-y-2.5 ml-2.5"
              style={{ borderLeft: `3.5px solid ${materia.corHex}` }}
            >
              {topicos.map((topico, idx) => (
                <div
                  key={topico.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('type', 'topic');
                    e.dataTransfer.setData('materiaId', materia.id);
                    e.dataTransfer.setData('id', topico.id);
                    setDraggedTopicId(topico.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedTopicId && draggedTopicId !== topico.id) {
                      setDragOverTopicId(topico.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (dragOverTopicId === topico.id) {
                      setDragOverTopicId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const type = e.dataTransfer.getData('type');
                    const matId = e.dataTransfer.getData('materiaId');
                    const sourceId = e.dataTransfer.getData('id') || draggedTopicId;
                    setDraggedTopicId(null);
                    setDragOverTopicId(null);
                    if (type === 'topic' && matId === materia.id && sourceId) {
                      handleTopicDrop(sourceId, topico.id);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedTopicId(null);
                    setDragOverTopicId(null);
                  }}
                  className={`transition-all ${
                    dragOverTopicId === topico.id ? 'ring-2 ring-indigo-500 rounded-xl scale-[1.01]' : ''
                  } ${draggedTopicId === topico.id ? 'opacity-50' : ''}`}
                >
                  <TopicNode
                    topic={topico}
                    topicoNumero={`${materiaNumero || ''}${idx + 1}.`}
                    parentTopicTitle={topico.titulo}
                    selectedTopicId={selectedTopicId}
                    onSelectTopic={(t) => onSelectTopic(t, materia)}
                    onOpenWorkpad={(t, tab) => onOpenWorkpad && onOpenWorkpad(t, materia, tab)}
                    onAddSubtopic={(parentId) => onAddSubtopic && onAddSubtopic(parentId, materia.id)}
                    onEditTopic={onEditTopic}
                    onDeleteTopic={onDeleteTopic}
                    onPraticarSimulado={(params) =>
                      onPraticarSimulado &&
                      onPraticarSimulado({ planoId: materia.planoId, ...params })
                    }
                    onPraticarFlashcards={(params) =>
                      onPraticarFlashcards &&
                      onPraticarFlashcards({
                        planoId: materia.planoId,
                        materiaId: materia.id,
                        materiaNome: materia.nome,
                        ...params,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <FolderKanban className="w-4 h-4 opacity-50" />
              Nenhum tópico cadastrado nesta matéria.
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

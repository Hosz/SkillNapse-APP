import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Calendar,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  MoreVertical,
  GitBranch,
  ArrowLeft,
} from 'lucide-react';
import type { PlanoEstudo, Materia, Topico } from '../../types';
import { SubjectNode } from './SubjectNode';
import { planoService } from '../../services';

interface StudyTreeProps {
  plano: PlanoEstudo;
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topico, materia: Materia) => void;
  onOpenWorkpad?: (topic: Topico, materia: Materia, tab?: 'pomodoro' | 'canvas' | 'questoes' | 'flashcards') => void;
  onBackToList?: () => void;
  onEditPlano?: (plano: PlanoEstudo) => void;
  onDeletePlano?: (planoId: string) => void;
  onAddMateria?: () => void;
  onEditMateria?: (materia: Materia) => void;
  onDeleteMateria?: (materiaId: string) => void;
  onAddTopic?: (materiaId: string) => void;
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

export const StudyTree: React.FC<StudyTreeProps> = ({
  plano,
  selectedTopicId,
  onSelectTopic,
  onOpenWorkpad,
  onBackToList,
  onEditPlano,
  onDeletePlano,
  onAddMateria,
  onEditMateria,
  onDeleteMateria,
  onAddTopic,
  onAddSubtopic,
  onEditTopic,
  onDeleteTopic,
  onPraticarSimulado,
  onPraticarFlashcards,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlanMenuOpen, setIsPlanMenuOpen] = useState(false);

  const [localMaterias, setLocalMaterias] = useState<Materia[]>(() => {
    return [...(plano?.materias || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  });
  const [draggedMateriaId, setDraggedMateriaId] = useState<string | null>(null);
  const [dragOverMateriaId, setDragOverMateriaId] = useState<string | null>(null);

  useEffect(() => {
    setLocalMaterias([...(plano?.materias || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
  }, [plano?.materias]);

  const handleMateriaDrop = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const oldIndex = localMaterias.findIndex((m) => m.id === sourceId);
    const newIndex = localMaterias.findIndex((m) => m.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...localMaterias];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);

    const reordered = updated.map((m, idx) => ({ ...m, ordem: idx }));
    setLocalMaterias(reordered);

    await planoService.reordenarMaterias(
      plano.id,
      reordered.map((m) => m.id)
    );
  };

  const materias = localMaterias;

  // Filter topics and subjects based on query
  const filteredMaterias = materias.map((mat) => {
    const topicos = mat.topicos || [];
    if (!searchQuery.trim()) return { ...mat, topicos };
    const lowerQuery = searchQuery.toLowerCase();

    const matchesTopico = (t: Topico): boolean => {
      if (t.titulo.toLowerCase().includes(lowerQuery)) return true;
      if (t.subtopicos && t.subtopicos.some(matchesTopico)) return true;
      return false;
    };

    const filteredTopicos = topicos.filter(matchesTopico);
    return {
      ...mat,
      topicos: filteredTopicos,
    };
  }).filter((mat) => (mat.topicos?.length || 0) > 0 || mat.nome.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats calculation
  const totalMaterias = materias.length;
  let totalTopicosPrincipais = 0;
  let totalSubtopicosCount = 0;
  let advancedCount = 0;

  const countSubtopics = (topicos: Topico[]): number => {
    return topicos.reduce((acc, t) => {
      const directSubs = t.subtopicos?.length || 0;
      const nestedSubs = t.subtopicos ? countSubtopics(t.subtopicos) : 0;
      return acc + directSubs + nestedSubs;
    }, 0);
  };

  const countAdvanced = (topicos: Topico[]): number => {
    return topicos.reduce((acc, t) => {
      let count = t.proficiencia === 'AVANCADO' ? 1 : 0;
      if (t.subtopicos) {
        count += countAdvanced(t.subtopicos);
      }
      return acc + count;
    }, 0);
  };

  materias.forEach((m) => {
    const topicos = m.topicos || [];
    totalTopicosPrincipais += topicos.length;
    totalSubtopicosCount += countSubtopics(topicos);
    advancedCount += countAdvanced(topicos);
  });

  const totalGeralItens = totalTopicosPrincipais + totalSubtopicosCount;
  const readinessPercent = Math.round((advancedCount / (totalGeralItens || 1)) * 100);

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none">
      {/* Plan Header */}
      <div className="p-3.5 sm:p-5 border-b-2 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-sm space-y-3 sm:space-y-4 shrink-0 relative z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {onBackToList && (
                <button
                  type="button"
                  onClick={onBackToList}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs"
                  title="Voltar para a listagem com todos os planos"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Voltar aos Planos</span>
                </button>
              )}
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                <span>Plano Ativo</span>
                <span>/</span>
                <span className="text-zinc-800 dark:text-zinc-200">{plano.cargoAlvo || 'Concurso Público'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {plano.titulo}
              </h1>
              {/* Plan Options Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPlanMenuOpen(!isPlanMenuOpen)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Opções do Plano de Estudo"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isPlanMenuOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-1 z-50 space-y-0.5"
                    onMouseLeave={() => setIsPlanMenuOpen(false)}
                  >
                    {onEditPlano && (
                  <button
                        type="button"
                        onClick={() => {
                          setIsPlanMenuOpen(false);
                          onEditPlano(plano);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>Editar Plano</span>
                      </button>
                    )}

                    {onDeletePlano && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlanMenuOpen(false);
                          onDeletePlano(plano.id);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-1 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                        <span>Excluir Plano</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {plano.dataExame && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Prova: {plano.dataExame}</span>
              </div>
            )}
            {onAddMateria && (
              <button
                onClick={onAddMateria}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Nova Matéria</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimalist Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">Disciplinas</div>
            <div className="text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
              {totalMaterias} {totalMaterias === 1 ? 'matéria' : 'matérias'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">Tópicos Principais</div>
            <div className="text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
              {totalTopicosPrincipais} {totalTopicosPrincipais === 1 ? 'tópico' : 'tópicos'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
              <GitBranch className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Subtópicos Totais
            </div>
            <div className="text-sm font-semibold font-mono text-indigo-700 dark:text-indigo-300 mt-0.5">
              {totalSubtopicosCount} {totalSubtopicosCount === 1 ? 'subtópico' : 'subtópicos'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">Score de Prontidão</div>
            <div className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {readinessPercent}%
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">Total de Conteúdos</div>
            <div className="text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-300 mt-0.5">
              {totalGeralItens} itens
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tópico, palavra-chave, remédio constitucional, tributo..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900/60 text-xs text-zinc-900 dark:text-zinc-200 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Hierarchical Knowledge Tree View */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
        {filteredMaterias.length > 0 ? (
          filteredMaterias.map((materia, idx) => (
            <div
              key={materia.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('type', 'materia');
                e.dataTransfer.setData('id', materia.id);
                setDraggedMateriaId(materia.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedMateriaId && draggedMateriaId !== materia.id) {
                  setDragOverMateriaId(materia.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverMateriaId === materia.id) {
                  setDragOverMateriaId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('type');
                const sourceId = e.dataTransfer.getData('id') || draggedMateriaId;
                setDraggedMateriaId(null);
                setDragOverMateriaId(null);
                if (type === 'materia' && sourceId) {
                  handleMateriaDrop(sourceId, materia.id);
                }
              }}
              onDragEnd={() => {
                setDraggedMateriaId(null);
                setDragOverMateriaId(null);
              }}
              className={`transition-all ${
                dragOverMateriaId === materia.id ? 'ring-2 ring-indigo-500 rounded-2xl scale-[1.01]' : ''
              } ${draggedMateriaId === materia.id ? 'opacity-50' : ''}`}
            >
              <SubjectNode
                materia={materia}
                materiaNumero={`${idx + 1}.`}
                selectedTopicId={selectedTopicId}
                onSelectTopic={onSelectTopic}
                onOpenWorkpad={onOpenWorkpad}
                onAddTopic={onAddTopic}
                onEditMateria={onEditMateria}
                onDeleteMateria={onDeleteMateria}
                onAddSubtopic={onAddSubtopic}
                onEditTopic={onEditTopic}
                onDeleteTopic={onDeleteTopic}
                onPraticarSimulado={onPraticarSimulado}
                onPraticarFlashcards={onPraticarFlashcards}
              />
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center space-y-2">
            <Layers className="w-8 h-8 opacity-40 mb-1" />
            <div className="text-xs font-medium text-zinc-400">Nenhum tópico encontrado</div>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              Tente buscar por termos mais genéricos ou adicione uma nova matéria e tópicos ao plano.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

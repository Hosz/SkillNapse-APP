import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FolderKanban,
  Edit2,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import type { Materia, Topico } from '../../types';
import { TopicNode } from './TopicNode';

interface SubjectNodeProps {
  materia: Materia;
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topico, materia: Materia) => void;
  onAddTopic?: (materiaId: string) => void;
  onEditMateria?: (materia: Materia) => void;
  onDeleteMateria?: (materiaId: string) => void;
  onAddSubtopic?: (parentTopicId: string, materiaId: string) => void;
  onEditTopic?: (topic: Topico) => void;
  onDeleteTopic?: (topicId: string) => void;
}

export const SubjectNode: React.FC<SubjectNodeProps> = ({
  materia,
  selectedTopicId,
  onSelectTopic,
  onAddTopic,
  onEditMateria,
  onDeleteMateria,
  onAddSubtopic,
  onEditTopic,
  onDeleteTopic,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Compute total topics count including subtopics
  const countTopics = (topicos: Topico[]): number => {
    return topicos.reduce((acc, t) => {
      const subs = t.subtopicos ? countTopics(t.subtopicos) : 0;
      return acc + 1 + subs;
    }, 0);
  };

  const totalTopics = countTopics(materia.topicos);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden shadow-sm">
      {/* Subject Header Card */}
      <div
        className="p-3.5 flex items-center justify-between bg-zinc-900/60 hover:bg-zinc-900/90 cursor-pointer transition-colors border-b border-zinc-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
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

          <div>
            <h3 className="text-xs font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              {materia.nome}
              <span className="text-[10px] font-mono text-zinc-400 font-normal">
                ({totalTopics} tópicos)
              </span>
            </h3>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {onAddTopic && (
            <button
              onClick={() => onAddTopic(materia.id)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Adicionar tópico nesta matéria"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Context Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Opções da matéria"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1 z-40 space-y-0.5"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                {onEditMateria && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEditMateria(materia);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Editar Matéria</span>
                  </button>
                )}

                {onDeleteMateria && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteMateria(materia.id);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 border-t border-zinc-800/80 pt-1 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Excluir Matéria</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topics list */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-zinc-950/40">
          {materia.topicos.length > 0 ? (
            materia.topicos.map((topico) => (
              <TopicNode
                key={topico.id}
                topic={topico}
                selectedTopicId={selectedTopicId}
                onSelectTopic={(t) => onSelectTopic(t, materia)}
                onAddSubtopic={(parentId) => onAddSubtopic && onAddSubtopic(parentId, materia.id)}
                onEditTopic={onEditTopic}
                onDeleteTopic={onDeleteTopic}
              />
            ))
          ) : (
            <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <FolderKanban className="w-4 h-4 opacity-50" />
              Nenhum tópico cadastrado nesta matéria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

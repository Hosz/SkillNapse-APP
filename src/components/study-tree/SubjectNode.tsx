import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, FolderKanban } from 'lucide-react';
import type { Materia, Topico } from '../../types';
import { TopicNode } from './TopicNode';

interface SubjectNodeProps {
  materia: Materia;
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topico, materia: Materia) => void;
  onAddTopic?: (materiaId: string) => void;
}

export const SubjectNode: React.FC<SubjectNodeProps> = ({
  materia,
  selectedTopicId,
  onSelectTopic,
  onAddTopic,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Compute total topics count including subtopics
  const countTopics = (topicos: Topico[]): number => {
    return topicos.reduce((acc, t) => {
      const subs = t.subtopicos ? countTopics(t.subtopicos) : 0;
      return acc + 1 + subs;
    }, 0);
  };

  const totalTopics = countTopics(materia.topicos);

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 overflow-hidden shadow-sm">
      {/* Subject Header Card */}
      <div
        className="p-3.5 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-900/70 cursor-pointer transition-colors border-b border-zinc-900"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Subject Color Badge & Icon */}
          <div
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: materia.corHex }}
          />

          <div>
            <h3 className="text-xs font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              {materia.nome}
              <span className="text-[10px] font-mono text-zinc-500 font-normal">
                ({totalTopics} tópicos)
              </span>
            </h3>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {onAddTopic && (
            <button
              onClick={() => onAddTopic(materia.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Adicionar tópico nesta matéria"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Topics list */}
      {isExpanded && (
        <div className="p-3 space-y-1.5 bg-zinc-950/40">
          {materia.topicos.length > 0 ? (
            materia.topicos.map((topico) => (
              <TopicNode
                key={topico.id}
                topic={topico}
                isSelected={selectedTopicId === topico.id}
                onSelectTopic={(t) => onSelectTopic(t, materia)}
              />
            ))
          ) : (
            <div className="p-4 text-center text-xs text-zinc-600 flex items-center justify-center gap-2">
              <FolderKanban className="w-4 h-4 opacity-50" />
              Nenhum tópico cadastrado nesta matéria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

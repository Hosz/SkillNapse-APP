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
} from 'lucide-react';
import type { Topico } from '../../types';

interface TopicNodeProps {
  topic: Topico;
  level?: number;
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topico) => void;
  onAddSubtopic?: (parentTopicId: string) => void;
  onEditTopic?: (topic: Topico) => void;
  onDeleteTopic?: (topicId: string) => void;
}

export const TopicNode: React.FC<TopicNodeProps> = ({
  topic,
  level = 0,
  selectedTopicId,
  onSelectTopic,
  onAddSubtopic,
  onEditTopic,
  onDeleteTopic,
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
    <div className="relative">
      {/* Node Row */}
      <div
        className={`group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
          isSelected
            ? isSubtopic
              ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500 shadow-md shadow-indigo-500/25 text-white font-semibold'
              : 'bg-zinc-800 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50 text-zinc-100 font-semibold'
            : 'bg-zinc-900/30 hover:bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300'
        }`}
        style={{ marginLeft: `${level * 20}px` }}
        onClick={() => onSelectTopic(topic)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          {/* Expand/Collapse Chevron for subtopics */}
          {hasSubtopics ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-5 flex items-center justify-center">
              <span
                className={`w-2 h-2 rounded-full transition-transform ${
                  isSelected
                    ? isSubtopic
                      ? 'bg-indigo-400 ring-2 ring-indigo-400/50 scale-125'
                      : 'bg-indigo-400 scale-110'
                    : 'bg-zinc-700 group-hover:bg-zinc-500'
                }`}
              />
            </div>
          )}

          {/* Subtopic Distinct Indicator Badge when selected alone */}
          {isSelected && isSubtopic && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-indigo-500 text-white font-extrabold tracking-wider shrink-0 shadow-sm">
              SUBTÓPICO ATIVO
            </span>
          )}

          {/* Topic Title */}
          <span className={`text-xs truncate tracking-tight ${isSelected ? 'font-bold' : 'font-medium'}`}>
            {topic.titulo}
          </span>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Weight Indicator (Peso 1 a 10) */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400"
            title={`Peso no edital: ${topic.peso}/10`}
          >
            <span>P{topic.peso}</span>
            {topic.peso >= 9 && (
              <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400/20" />
            )}
          </div>

          {/* Proficiency Pill */}
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${getProficiencyBadge(
              topic.proficiencia
            )}`}
          >
            {topic.proficiencia.slice(0, 4)}
          </span>

          {/* Quick Study Button */}
          <button
            onClick={() => onSelectTopic(topic)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
              isSelected
                ? 'bg-indigo-600 text-white font-semibold'
                : 'opacity-0 group-hover:opacity-100 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            title="Abrir no Workpad de estudo"
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden sm:inline">Estudar</span>
          </button>

          {/* Context Dropdown / Actions */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Ações do item"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1 z-40 space-y-0.5"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                {onAddSubtopic && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onAddSubtopic(topic.id);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Adicionar Subtópico</span>
                  </button>
                )}

                {onEditTopic && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEditTopic(topic);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Editar {isSubtopic ? 'Subtópico' : 'Tópico'}</span>
                  </button>
                )}

                {onDeleteTopic && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteTopic(topic.id);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 border-t border-zinc-800/80 pt-1 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Excluir {isSubtopic ? 'Subtópico' : 'Tópico'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recursive Subtopics */}
      {hasSubtopics && isExpanded && (
        <div className="mt-1 space-y-1 relative pl-3 before:absolute before:left-3 before:top-0 before:bottom-2 before:w-px before:bg-zinc-800">
          {topic.subtopicos!.map((sub) => (
            <TopicNode
              key={sub.id}
              topic={sub}
              level={level + 1}
              selectedTopicId={selectedTopicId}
              onSelectTopic={onSelectTopic}
              onAddSubtopic={onAddSubtopic}
              onEditTopic={onEditTopic}
              onDeleteTopic={onDeleteTopic}
            />
          ))}
        </div>
      )}
    </div>
  );
};

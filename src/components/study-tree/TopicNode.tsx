import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Sparkles, BookOpen } from 'lucide-react';
import type { Topico } from '../../types';

interface TopicNodeProps {
  topic: Topico;
  level?: number;
  isSelected: boolean;
  onSelectTopic: (topic: Topico) => void;
}

export const TopicNode: React.FC<TopicNodeProps> = ({
  topic,
  level = 0,
  isSelected,
  onSelectTopic,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubtopics = topic.subtopicos && topic.subtopicos.length > 0;

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
            ? 'bg-zinc-800/90 border-indigo-500/50 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-500/40 text-zinc-100'
            : 'bg-zinc-900/30 hover:bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-700/80 text-zinc-300'
        }`}
        style={{ marginLeft: `${level * 18}px` }}
        onClick={() => onSelectTopic(topic)}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          {/* Expand/Collapse Chevron for subtopics */}
          {hasSubtopics ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
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
                className={`w-1.5 h-1.5 rounded-full ${
                  isSelected ? 'bg-indigo-400' : 'bg-zinc-700 group-hover:bg-zinc-500'
                }`}
              />
            </div>
          )}

          {/* Topic Title */}
          <span className="text-xs font-medium truncate tracking-tight">{topic.titulo}</span>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-2 shrink-0">
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
            className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${getProficiencyBadge(
              topic.proficiencia
            )}`}
          >
            {topic.proficiencia.slice(0, 4)}
          </span>

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectTopic(topic);
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
              isSelected
                ? 'bg-indigo-600 text-white font-semibold'
                : 'opacity-0 group-hover:opacity-100 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden sm:inline">Estudar</span>
          </button>
        </div>
      </div>

      {/* Recursive Subtopics */}
      {hasSubtopics && isExpanded && (
        <div className="mt-1 space-y-1 relative pl-3 before:absolute before:left-3 before:top-0 before:bottom-2 before:w-px before:bg-zinc-800/80">
          {topic.subtopicos!.map((sub) => (
            <TopicNode
              key={sub.id}
              topic={sub}
              level={level + 1}
              isSelected={isSelected}
              onSelectTopic={onSelectTopic}
            />
          ))}
        </div>
      )}
    </div>
  );
};

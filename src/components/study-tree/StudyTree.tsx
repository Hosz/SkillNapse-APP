import React, { useState } from 'react';
import {
  Search,
  Plus,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { PlanoEstudo, Materia, Topico } from '../../types';
import { SubjectNode } from './SubjectNode';

interface StudyTreeProps {
  plano: PlanoEstudo;
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topico, materia: Materia) => void;
  onAddMateria?: () => void;
}

export const StudyTree: React.FC<StudyTreeProps> = ({
  plano,
  selectedTopicId,
  onSelectTopic,
  onAddMateria,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter topics and subjects based on query
  const filteredMaterias = plano.materias.map((mat) => {
    if (!searchQuery.trim()) return mat;
    const lowerQuery = searchQuery.toLowerCase();

    const matchesTopico = (t: Topico): boolean => {
      if (t.titulo.toLowerCase().includes(lowerQuery)) return true;
      if (t.subtopicos && t.subtopicos.some(matchesTopico)) return true;
      return false;
    };

    const filteredTopicos = mat.topicos.filter(matchesTopico);
    return {
      ...mat,
      topicos: filteredTopicos,
    };
  }).filter((mat) => mat.topicos.length > 0 || mat.nome.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats calculation
  const totalMaterias = plano.materias.length;
  let totalTopicosCount = 0;
  let advancedCount = 0;

  plano.materias.forEach((m) => {
    m.topicos.forEach((t) => {
      totalTopicosCount++;
      if (t.proficiencia === 'AVANCADO') advancedCount++;
      if (t.subtopicos) {
        totalTopicosCount += t.subtopicos.length;
        advancedCount += t.subtopicos.filter((st) => st.proficiencia === 'AVANCADO').length;
      }
    });
  });

  const readinessPercent = Math.round((advancedCount / (totalTopicosCount || 1)) * 100);

  return (
    <div className="flex-1 h-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* Plan Header */}
      <div className="p-5 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-sm space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
              <span>Plano Ativo</span>
              <span>/</span>
              <span className="text-zinc-300">{plano.cargoAlvo || 'Concurso Público'}</span>
            </div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              {plano.titulo}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {plano.dataExame && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Prova: {plano.dataExame}</span>
              </div>
            )}
            {onAddMateria && (
              <button
                onClick={onAddMateria}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
                <span>Nova Matéria</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimalist Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Disciplinas</div>
            <div className="text-sm font-semibold font-mono text-zinc-200 mt-0.5">
              {totalMaterias} matérias
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Tópicos Mapeados</div>
            <div className="text-sm font-semibold font-mono text-zinc-200 mt-0.5">
              {totalTopicosCount} itens
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Score de Prontidão</div>
            <div className="text-sm font-semibold font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {readinessPercent}%
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <div className="text-[10px] font-mono uppercase text-zinc-500">Pesos no Edital</div>
            <div className="text-sm font-semibold font-mono text-indigo-400 mt-0.5">
              Escala 1 a 10
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tópico, palavra-chave, remédio constitucional, tributo..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 text-xs text-zinc-200 rounded-xl border border-zinc-800 focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 font-mono"
            >
              limpar
            </button>
          )}
        </div>
      </div>

      {/* Hierarchical Knowledge Tree View */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {filteredMaterias.length > 0 ? (
          filteredMaterias.map((materia) => (
            <SubjectNode
              key={materia.id}
              materia={materia}
              selectedTopicId={selectedTopicId}
              onSelectTopic={onSelectTopic}
            />
          ))
        ) : (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center space-y-2">
            <Layers className="w-8 h-8 opacity-40 mb-1" />
            <div className="text-xs font-medium text-zinc-400">Nenhum tópico encontrado</div>
            <p className="text-[11px] text-zinc-600 max-w-xs">
              Tente buscar por termos mais genéricos ou adicione um novo tópico ao plano.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Sparkles,
  Briefcase,
  ArrowRight,
  Edit2,
  Trash2,
  Search,
  BookOpen,
  Loader2,
} from 'lucide-react';
import type { PlanoEstudo } from '../../types';

interface PlanosListViewProps {
  planos: PlanoEstudo[];
  onSelectPlano: (plano: PlanoEstudo) => void;
  onCreatePlano: () => void;
  onGoToEdital: () => void;
  onEditPlano?: (plano: PlanoEstudo) => void;
  onDeletePlano?: (planoId: string) => void;
  isLoading?: boolean;
}

export const PlanosListView: React.FC<PlanosListViewProps> = ({
  planos,
  onSelectPlano,
  onCreatePlano,
  onGoToEdital,
  onEditPlano,
  onDeletePlano,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlanos = planos.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.titulo.toLowerCase().includes(q) ||
      (p.cargoAlvo && p.cargoAlvo.toLowerCase().includes(q)) ||
      (p.descricao && p.descricao.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-y-auto select-none font-sans p-6 sm:p-8 space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5 font-medium">
            <FolderKanban className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Gestão de Carreiras & Concursos</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Meus Planos de Estudo
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Selecione um plano para navegar na Árvore de Conhecimento, estudar matérias específicas ou gerenciar sua preparação para o edital.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onGoToEdital}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium flex items-center gap-2 transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Importar Edital (IA)</span>
          </button>

          <button
            type="button"
            onClick={onCreatePlano}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Plano</span>
          </button>
        </div>
      </div>

      {/* Search & Counter Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por concurso ou cargo..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900/60 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-colors shadow-2xs"
          />
        </div>

        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-medium">
          {planos.length} {planos.length === 1 ? 'plano cadastrado' : 'planos cadastrados'}
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : filteredPlanos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlanos.map((plano) => {
            const totalMaterias = plano.materias?.length || 0;

            return (
              <div
                key={plano.id}
                onClick={() => onSelectPlano(plano)}
                className="group relative rounded-2xl bg-white dark:bg-zinc-900/40 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/80 border-2 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/70 p-5 flex flex-col justify-between space-y-4 cursor-pointer transition-all shadow-xs hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {plano.cargoAlvo || 'Geral'}
                    </span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {onEditPlano && (
                        <button
                          type="button"
                          onClick={() => onEditPlano(plano)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Editar plano"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeletePlano && (
                        <button
                          type="button"
                          onClick={() => onDeletePlano(plano.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Excluir plano"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {plano.titulo}
                    </h2>
                    {plano.descricao && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {plano.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Footer Info */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span>{totalMaterias} {totalMaterias === 1 ? 'matéria' : 'matérias'}</span>
                  </div>

                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Abrir <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-white dark:bg-zinc-900/30 border-2 border-dashed border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500">
            <FolderKanban className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">
              {searchTerm ? 'Nenhum plano encontrado com este filtro' : 'Nenhum plano de estudos cadastrado'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              {searchTerm
                ? 'Tente buscar com outros termos ou limpe o campo de busca.'
                : 'Crie seu primeiro plano de estudos manualmente ou faça upload do PDF do edital para extrair a grade automaticamente via IA.'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onCreatePlano}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
            >
              Criar Manualmente
            </button>
            <button
              type="button"
              onClick={onGoToEdital}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
            >
              Extrair via Edital IA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

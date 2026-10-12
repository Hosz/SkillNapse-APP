import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  Layers,
  Target,
  GitBranch,
  Palette,
  Scale,
  Sparkles,
  Check,
  Loader2,
  Briefcase,
  FileText,
} from 'lucide-react';

export type TreeItemType = 'plano' | 'materia' | 'topico' | 'subtopico';
export type TreeItemMode = 'create' | 'edit';

export interface TreeItemFormData {
  titulo: string;
  cargoAlvo?: string;
  descricao?: string;
  corHex?: string;
  peso?: number;
}

export interface TreeItemModalProps {
  isOpen: boolean;
  mode: TreeItemMode;
  type: TreeItemType;
  initialData?: Partial<TreeItemFormData>;
  onClose: () => void;
  onSave: (data: TreeItemFormData) => Promise<void> | void;
  isLoading?: boolean;
}

const PRESET_COLORS = [
  '#3b82f6', // Azul
  '#10b981', // Esmeralda
  '#f59e0b', // Âmbar
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#ef4444', // Vermelho
  '#14b8a6', // Teal
  '#6366f1', // Índigo
];

export const TreeItemModal: React.FC<TreeItemModalProps> = ({
  isOpen,
  mode,
  type,
  initialData,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [titulo, setTitulo] = useState('');
  const [cargoAlvo, setCargoAlvo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [corHex, setCorHex] = useState('#3b82f6');
  const [peso, setPeso] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitulo(initialData?.titulo || '');
      setCargoAlvo(initialData?.cargoAlvo || '');
      setDescricao(initialData?.descricao || '');
      setCorHex(initialData?.corHex || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setPeso(initialData?.peso ?? (type === 'subtopico' ? 5 : type === 'topico' ? 8 : 5));
      setError(null);

      // Foco automático no primeiro input após a montagem do modal
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, mode, type, initialData]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitulo = titulo.trim();

    if (!cleanTitulo) {
      setError(
        type === 'materia'
          ? 'Por favor, insira o nome da disciplina.'
          : 'Por favor, insira o título.'
      );
      inputRef.current?.focus();
      return;
    }

    setError(null);
    try {
      await onSave({
        titulo: cleanTitulo,
        cargoAlvo: cargoAlvo.trim(),
        descricao: descricao.trim(),
        corHex,
        peso,
      });
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao salvar as alterações.');
    }
  };

  const getHeaderInfo = () => {
    switch (type) {
      case 'plano':
        return {
          icon: BookOpen,
          title: mode === 'create' ? 'Novo Plano de Estudos' : 'Editar Plano de Estudos',
          subtitle:
            mode === 'create'
              ? 'Defina o concurso, exame ou certame para estruturar sua preparação.'
              : 'Atualize os dados e o cargo alvo do seu plano de estudos.',
          label: 'Título do Plano',
          placeholder: 'Ex: Concurso TCU - Auditor Federal de Controle Externo',
        };
      case 'materia':
        return {
          icon: Layers,
          title: mode === 'create' ? 'Nova Disciplina' : 'Editar Disciplina',
          subtitle:
            mode === 'create'
              ? 'Adicione uma matéria fundamental à grade programática.'
              : 'Edite o nome da matéria e sua cor de identificação.',
          label: 'Nome da Disciplina',
          placeholder: 'Ex: Direito Constitucional, Contabilidade Pública',
        };
      case 'subtopico':
        return {
          icon: GitBranch,
          title: mode === 'create' ? 'Novo Subtópico' : 'Editar Subtópico',
          subtitle:
            mode === 'create'
              ? 'Desdobre o tema em um ponto específico de alta precisão.'
              : 'Atualize os detalhes deste subtópico.',
          label: 'Título do Subtópico',
          placeholder: 'Ex: Teoria Tridimensional do Direito, Habeas Data',
        };
      case 'topico':
      default:
        return {
          icon: Target,
          title: mode === 'create' ? 'Novo Tópico Principal' : 'Editar Tópico',
          subtitle:
            mode === 'create'
              ? 'Estruture um assunto essencial constante no edital.'
              : 'Ajuste o título e a relevância do tópico no edital.',
          label: 'Título do Tópico',
          placeholder: 'Ex: Princípios Constitucionais e Direitos Individuais',
        };
    }
  };

  const { icon: Icon, title, subtitle, label, placeholder } = getHeaderInfo();

  // Detalhes do Badge de Peso no Edital
  const getPesoBadge = (val: number) => {
    if (val >= 9) {
      return {
        label: 'Relevância Crítica (9-10)',
        desc: 'Prioridade máxima em simulados e revisões.',
        colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    }
    if (val >= 7) {
      return {
        label: 'Alta Relevância (7-8)',
        desc: 'Cobrança frequente pela banca examinadora.',
        colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    }
    if (val >= 4) {
      return {
        label: 'Média Relevância (4-6)',
        desc: 'Conteúdo programático padrão do edital.',
        colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    }
    return {
      label: 'Baixa Relevância (1-3)',
      desc: 'Cobrança secundária ou temas conceituais leves.',
      colorClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    };
  };

  const pesoBadge = getPesoBadge(peso);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-6 text-zinc-900 dark:text-zinc-100 my-8 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>{title}</span>
                {mode === 'create' && <Sparkles className="w-4 h-4 text-indigo-500" />}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo Principal: Título / Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>{label}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={placeholder}
              required
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Campo Específico de Plano: Cargo Alvo & Descrição */}
          {type === 'plano' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Cargo ou Concurso Alvo</span>
                  <span className="text-xs text-zinc-400 font-normal lowercase">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={cargoAlvo}
                  onChange={(e) => setCargoAlvo(e.target.value)}
                  placeholder="Ex: Auditor Federal de Controle Externo, Delegado PF"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Descrição / Observações</span>
                  <span className="text-xs text-zinc-400 font-normal lowercase">(opcional)</span>
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Foco no edital 2026, banca Cebraspe, ênfase em matérias jurídicas..."
                  rows={2}
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </>
          )}

          {/* Campo Específico de Matéria: Seletor de Cores */}
          {type === 'materia' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-zinc-400" />
                <span>Cor de Identificação</span>
              </label>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {PRESET_COLORS.map((cor) => {
                  const isSelected = corHex.toLowerCase() === cor.toLowerCase();
                  return (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setCorHex(cor)}
                      disabled={isLoading}
                      style={{ backgroundColor: cor }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-zinc-900 scale-110 shadow-sm'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      title={cor}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                    </button>
                  );
                })}
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="color"
                    value={corHex}
                    onChange={(e) => setCorHex(e.target.value)}
                    disabled={isLoading}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-zinc-200 dark:border-zinc-700 bg-transparent p-0.5"
                    title="Selecione cor personalizada"
                  />
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                    {corHex}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Campo Específico de Tópico / Subtópico: Peso no Edital (1 a 10) */}
          {(type === 'topico' || type === 'subtopico') && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Peso no Edital (1 a 10)</span>
                </label>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                  Peso {peso}
                </span>
              </div>

              {/* Slider de Peso */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={peso}
                  onChange={(e) => setPeso(parseInt(e.target.value, 10))}
                  disabled={isLoading}
                  className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
                />

                <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-400">
                  <span>1 (Mínimo)</span>
                  <span>5 (Médio)</span>
                  <span>10 (Máximo)</span>
                </div>
              </div>

              {/* Pílulas de Seleção Rápida */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[1, 3, 5, 8, 10].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => setPeso(presetVal)}
                    disabled={isLoading}
                    className={`py-1 rounded-lg text-xs font-medium border transition-colors ${
                      peso === presetVal
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                    }`}
                  >
                    {presetVal === 10 ? 'Máx (10)' : presetVal}
                  </button>
                ))}
              </div>

              {/* Badge Dinâmico com descrição da importância */}
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${pesoBadge.colorClass}`}
              >
                <div className="space-y-0.5">
                  <p className="font-bold">{pesoBadge.label}</p>
                  <p className="text-[11px] opacity-90">{pesoBadge.desc}</p>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé com Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !titulo.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{mode === 'create' ? 'Criar Item' : 'Salvar Alterações'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

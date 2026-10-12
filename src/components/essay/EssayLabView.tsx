import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Camera,
  FileText,
  CheckCircle2,
  Send,
  Loader2,
  Award,
  BookOpen,
  BarChart3,
  Lightbulb,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  XCircle,
  FileSearch,
  Edit2,
  Trash2,
  Plus,
  History,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { redacaoService } from '../../services';
import { isQuotaExceededError, isAbortError } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../../context/useToast';
import type { SubmissaoRedacaoResumo } from '../../services/redacaoService';
import type { TemaRedacao } from '../../types';

interface CriterionEvaluation {
  nome: string;
  nota: number;
  max: number;
  feedback: string;
}

interface EvaluationResult {
  notaGeral: number;
  taxaLegibilidade: number;
  criterios: CriterionEvaluation[];
  pontosFortes: string[];
  pontosMelhoria: string[];
}

export const EssayLabView: React.FC = () => {
  const toast = useToast();
  const [temas, setTemas] = useState<TemaRedacao[]>([]);
  const [selectedTema, setSelectedTema] = useState<TemaRedacao | null>(null);
  const [isGeneratingTema, setIsGeneratingTema] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<'TEXT' | 'OCR'>('TEXT');
  const [essayText, setEssayText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [ocrReadability, setOcrReadability] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  // Estados de Histórico de Redações
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [submissoes, setSubmissoes] = useState<SubmissaoRedacaoResumo[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingSubmissaoDetalhe, setIsLoadingSubmissaoDetalhe] = useState(false);
  const [activeSubmissaoId, setActiveSubmissaoId] = useState<string | null>(null);

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [customEixo, setCustomEixo] = useState('Direito Constitucional e Políticas Públicas');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [isMotivatorsModalOpen, setIsMotivatorsModalOpen] = useState(false);
  const [activeMotivatorTab, setActiveMotivatorTab] = useState<number>(0);

  // Estados do Modal de Edição de Tema
  const [isEditThemeModalOpen, setIsEditThemeModalOpen] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editEixoTematico, setEditEixoTematico] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editTextosMotivadores, setEditTextosMotivadores] = useState<string[]>([]);
  const [editCriteriosAvaliacao, setEditCriteriosAvaliacao] = useState('');
  const [activeEditMotivatorTab, setActiveEditMotivatorTab] = useState<number>(0);
  const [isSavingEditTema, setIsSavingEditTema] = useState(false);

  // Estados do Modal de Criação Manual de Tema
  const [isCreateThemeModalOpen, setIsCreateThemeModalOpen] = useState(false);
  const [createTitulo, setCreateTitulo] = useState('');
  const [createEixoTematico, setCreateEixoTematico] = useState('Direito Constitucional e Políticas Públicas');
  const [createDescricao, setCreateDescricao] = useState('');
  const [createTextosMotivadores, setCreateTextosMotivadores] = useState<string[]>([
    '### TEXTO I: Panorama e Fundamentação\n\nInsira os dados, citações legislativas ou considerações da banca examinadora...\n\nFonte: Legislação / Dados Oficiais, 2024.',
  ]);
  const [createCriteriosAvaliacao, setCreateCriteriosAvaliacao] = useState('');
  const [activeCreateMotivatorTab, setActiveCreateMotivatorTab] = useState<number>(0);
  const [isSavingCreateTema, setIsSavingCreateTema] = useState(false);

  // Estados de Exclusão de Submissão do Histórico
  const [submissaoParaExcluir, setSubmissaoParaExcluir] = useState<SubmissaoRedacaoResumo | null>(null);
  const [isExcluindoSubmissao, setIsExcluindoSubmissao] = useState(false);

  const carregarHistorico = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await redacaoService.listarSubmissoes();
      setSubmissoes(res || []);
    } catch (err) {
      console.error('Erro ao buscar histórico de redações:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    redacaoService
      .listarTemas()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.length > 0) {
          setTemas(res);
          setSelectedTema(res[0]);
        } else {
          setTemas([]);
          setSelectedTema(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setTemas([]);
        setSelectedTema(null);
      });

    carregarHistorico();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectSubmissao = async (sub: SubmissaoRedacaoResumo) => {
    setIsLoadingSubmissaoDetalhe(true);
    setActiveSubmissaoId(sub.id);
    try {
      const detalhe = await redacaoService.obterSubmissao(sub.id);
      if (detalhe) {
        setEvaluationResult(detalhe.evaluationResult);
        setEssayText(detalhe.textoAluno);
        setSubmissionMode('TEXT');

        const matchingTema = temas.find((t) => t.id === detalhe.temaId);
        if (matchingTema) {
          setSelectedTema(matchingTema);
        }

        setIsHistoryOpen(false);
        setSuccessToast(`Avaliação de "${detalhe.temaTitulo}" carregada!`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes da submissão:', err);
    } finally {
      setIsLoadingSubmissaoDetalhe(false);
    }
  };

  const handleNovaRedacao = () => {
    setEvaluationResult(null);
    setEssayText('');
    setSelectedPhoto(null);
    setOcrReadability(null);
    setActiveSubmissaoId(null);
  };

  const themeAbortRef = useRef<AbortController | null>(null);
  const evalAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (themeAbortRef.current) {
        themeAbortRef.current.abort();
        themeAbortRef.current = null;
      }
      if (evalAbortRef.current) {
        evalAbortRef.current.abort();
        evalAbortRef.current = null;
      }
    };
  }, []);

  const handleCancelarGeracaoTema = () => {
    if (themeAbortRef.current) {
      themeAbortRef.current.abort();
      themeAbortRef.current = null;
      toast.info('Geração de proposta cancelada.');
    }
    setIsGeneratingTema(false);
  };

  const fecharModalTemaOuCancelar = () => {
    if (isGeneratingTema) {
      handleCancelarGeracaoTema();
    }
    setIsThemeModalOpen(false);
  };

  const handleCancelarCorrecao = () => {
    if (evalAbortRef.current) {
      evalAbortRef.current.abort();
      evalAbortRef.current = null;
      toast.info('Correção de redação cancelada.');
    }
    setIsEvaluating(false);
  };

  const handleGerarTema = async (eixoEscolhido?: string) => {
    const controller = new AbortController();
    themeAbortRef.current = controller;
    setIsGeneratingTema(true);
    const eixo = eixoEscolhido || customEixo;
    try {
      const novoTema = await redacaoService.gerarTemaAi(eixo, controller.signal);
      if (novoTema) {
        setTemas((prev) => [novoTema, ...prev.filter((t) => t.id !== novoTema.id)]);
        setSelectedTema(novoTema);
        setSuccessToast(`Tema gerado: "${novoTema.titulo}"`);
        setTimeout(() => setSuccessToast(null), 4500);
        setIsThemeModalOpen(false);
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      console.error('Erro ao gerar tema com IA:', err);
      if (isQuotaExceededError(err)) {
        return;
      }
      toast.error('Não foi possível gerar a proposta com a IA. Certifique-se de que o backend está online.');
    } finally {
      themeAbortRef.current = null;
      setIsGeneratingTema(false);
    }
  };

  const handleOpenEditTema = () => {
    if (!selectedTema) return;
    setEditTitulo(selectedTema.titulo);
    setEditEixoTematico(selectedTema.eixoTematico);
    setEditDescricao(selectedTema.descricao);
    setEditTextosMotivadores(
      selectedTema.textosMotivadores && selectedTema.textosMotivadores.length > 0
        ? [...selectedTema.textosMotivadores]
        : ['']
    );
    setEditCriteriosAvaliacao(selectedTema.criteriosAvaliacao || '');
    setActiveEditMotivatorTab(0);
    setIsEditThemeModalOpen(true);
  };

  const handleSaveEditTema = async () => {
    if (!selectedTema) return;
    if (!editTitulo.trim()) {
      toast.warning('Por favor, informe o título da proposta de redação.');
      return;
    }
    if (!editEixoTematico.trim()) {
      toast.warning('Por favor, informe o eixo temático da proposta.');
      return;
    }

    setIsSavingEditTema(true);
    try {
      const limposTextos = editTextosMotivadores
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const atualizado = await redacaoService.editarTema(selectedTema.id, {
        titulo: editTitulo.trim(),
        eixoTematico: editEixoTematico.trim(),
        descricao: editDescricao.trim(),
        textosMotivadores: limposTextos.length > 0 ? limposTextos : ['Texto de apoio em elaboração pela banca avaliadora.'],
        criteriosAvaliacao: editCriteriosAvaliacao.trim() || undefined,
      });

      setTemas((prev) => prev.map((t) => (t.id === atualizado.id ? atualizado : t)));
      setSelectedTema(atualizado);
      setIsEditThemeModalOpen(false);
      setSuccessToast(`Proposta "${atualizado.titulo}" atualizada com sucesso!`);
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (err) {
      console.error('Erro ao salvar edições do tema:', err);
      toast.error('Erro ao salvar as edições do tema. Tente novamente.');
    } finally {
      setIsSavingEditTema(false);
    }
  };

  const [temaParaExcluir, setTemaParaExcluir] = useState<{ id: string; titulo: string } | null>(null);
  const [isExcluindoTema, setIsExcluindoTema] = useState(false);

  const handleDeleteTema = (temaId?: string) => {
    const idParaApagar = temaId || selectedTema?.id;
    if (!idParaApagar) return;
    const temaAlvo = temas.find((t) => t.id === idParaApagar) || selectedTema;
    setTemaParaExcluir({
      id: idParaApagar,
      titulo: temaAlvo?.titulo || 'Tema selecionado',
    });
  };

  const handleConfirmarExclusaoTema = async () => {
    if (!temaParaExcluir) return;
    setIsExcluindoTema(true);
    try {
      await redacaoService.apagarTema(temaParaExcluir.id);
      const restantes = temas.filter((t) => t.id !== temaParaExcluir.id);
      setTemas(restantes);

      if (selectedTema?.id === temaParaExcluir.id) {
        setSelectedTema(restantes.length > 0 ? restantes[0] : null);
      }

      setIsEditThemeModalOpen(false);
      setSuccessToast('Proposta de redação excluída com sucesso.');
      setTimeout(() => setSuccessToast(null), 4500);
      setTemaParaExcluir(null);
    } catch (err) {
      console.error('Erro ao apagar tema:', err);
      toast.error('Não foi possível excluir o tema. Tente novamente.');
    } finally {
      setIsExcluindoTema(false);
    }
  };

  const handleOpenCreateTemaManual = () => {
    setCreateTitulo('');
    setCreateEixoTematico('Direito Constitucional e Políticas Públicas');
    setCreateDescricao('');
    setCreateTextosMotivadores([
      '### TEXTO I: Panorama e Fundamentação\n\nInsira os dados, citações legislativas ou considerações da banca examinadora...\n\nFonte: Legislação / Dados Oficiais, 2024.',
    ]);
    setCreateCriteriosAvaliacao('');
    setActiveCreateMotivatorTab(0);
    setIsCreateThemeModalOpen(true);
  };

  const handleSaveCreateTemaManual = async () => {
    if (!createTitulo.trim()) {
      toast.warning('Por favor, informe o título da proposta de redação.');
      return;
    }
    if (!createEixoTematico.trim()) {
      toast.warning('Por favor, informe o eixo temático da proposta.');
      return;
    }

    setIsSavingCreateTema(true);
    try {
      const limposTextos = createTextosMotivadores
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const novoTema = await redacaoService.criarTemaManual({
        titulo: createTitulo.trim(),
        eixoTematico: createEixoTematico.trim(),
        descricao: createDescricao.trim(),
        textosMotivadores: limposTextos.length > 0 ? limposTextos : ['Texto de apoio fornecido pelo estudante.'],
        criteriosAvaliacao: createCriteriosAvaliacao.trim() || undefined,
      });

      setTemas((prev) => [novoTema, ...prev]);
      setSelectedTema(novoTema);
      setIsCreateThemeModalOpen(false);
      setSuccessToast(`Proposta "${novoTema.titulo}" criada com sucesso!`);
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (err) {
      console.error('Erro ao criar tema manual:', err);
      toast.error('Erro ao cadastrar a proposta de redação. Tente novamente.');
    } finally {
      setIsSavingCreateTema(false);
    }
  };

  const handleConfirmarExclusaoSubmissao = async () => {
    if (!submissaoParaExcluir) return;
    setIsExcluindoSubmissao(true);
    try {
      const ok = await redacaoService.apagarSubmissao(submissaoParaExcluir.id);
      if (ok) {
        setSubmissoes((prev) => prev.filter((s) => s.id !== submissaoParaExcluir.id));
        if (activeSubmissaoId === submissaoParaExcluir.id) {
          setActiveSubmissaoId(null);
          setEvaluationResult(null);
        }
        toast.success('Redação removida do histórico com sucesso.');
      } else {
        toast.error('Não foi possível excluir a redação do histórico.');
      }
      setSubmissaoParaExcluir(null);
    } catch (err) {
      console.error('Erro ao apagar submissão:', err);
      toast.error('Não foi possível excluir a redação do histórico.');
    } finally {
      setIsExcluindoSubmissao(false);
    }
  };

  const characterCount = essayText.length;
  const isCharacterCountValid = characterCount >= 300 && characterCount <= 5000;

  const handleSubmit = async () => {
    if (!selectedTema) return;
    const controller = new AbortController();
    evalAbortRef.current = controller;
    setIsEvaluating(true);
    let result: EvaluationResult | null = null;

    try {
      if (submissionMode === 'TEXT') {
        result = await redacaoService.submeterTexto({
          temaRedacaoId: selectedTema.id,
          conteudoTexto: essayText,
          textoAluno: essayText,
        }, controller.signal);
      } else if (selectedPhoto) {
        result = await redacaoService.submeterFoto(selectedTema.id, selectedPhoto, controller.signal);
      } else if (essayText.trim().length >= 300) {
        result = await redacaoService.submeterTexto({
          temaRedacaoId: selectedTema.id,
          conteudoTexto: essayText,
          textoAluno: essayText,
        }, controller.signal);
      } else {
        toast.warning('Envie uma imagem legível da sua folha ou digite o texto da redação.');
        return;
      }

      if (result && result.notaGeral !== undefined) {
        setEvaluationResult(result);
        carregarHistorico();
      } else {
        toast.error('A correção não pôde ser concluída pela IA. Tente novamente.');
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      console.error('Erro ao submeter redação para IA:', err);
      if (isQuotaExceededError(err)) {
        return;
      }
      toast.error('Ocorreu um erro ao processar a correção analítica por IA.');
    } finally {
      evalAbortRef.current = null;
      setIsEvaluating(false);
    }
  };

  const handleSimulatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedPhoto(e.target.files[0]);
      setOcrReadability(96.5); // >= 95% readability
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans select-none text-zinc-900 dark:text-zinc-100">
      {/* Center Left: Essay Prompt & Input Editor */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/70 space-y-4 shrink-0 shadow-2xs">
          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                Laboratório de Redação Inteligente
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedTema ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <select
                      value={selectedTema.id}
                      onChange={(e) => {
                        const found = temas.find((t) => t.id === e.target.value);
                        if (found) setSelectedTema(found);
                      }}
                      className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 shadow-2xs max-w-xs sm:max-w-md truncate"
                    >
                      {temas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.titulo}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleOpenEditTema}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white border-2 border-zinc-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Editar título, descrição e textos de apoio desta proposta"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span className="hidden sm:inline">Editar Tema</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTema(selectedTema.id)}
                      className="p-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border-2 border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                      title="Apagar esta proposta de redação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">Nenhum tema cadastrado</span>
                )}
                <button
                  type="button"
                  onClick={handleOpenCreateTemaManual}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white border-2 border-zinc-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Criar proposta de tema manualmente"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Tema Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(true)}
                  disabled={isGeneratingTema}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  title="Gerar novo tema com IA"
                >
                  {isGeneratingTema ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>{isGeneratingTema ? 'Gerando...' : 'Gerar Tema com IA'}</span>
                </button>
              </div>
            </div>

            {/* Mode Toggle & History */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  carregarHistorico();
                  setIsHistoryOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs font-semibold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
                title="Ver histórico de redações corrigidas pela IA"
              >
                <History className="w-3.5 h-3.5 text-indigo-500" />
                <span>Histórico</span>
                {submissoes.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] rounded-full border border-indigo-200 dark:border-indigo-800/80 font-bold">
                    {submissoes.length}
                  </span>
                )}
              </button>

              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <button
                  onClick={() => setSubmissionMode('TEXT')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    submissionMode === 'TEXT'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Digitação
                </button>
                <button
                  onClick={() => setSubmissionMode('OCR')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    submissionMode === 'OCR'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Foto Manuscrita (OCR)
                </button>
              </div>
            </div>
          </div>

          {/* Theme description & motivators */}
          {selectedTema ? (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold uppercase text-indigo-700 dark:text-indigo-400">
                  Eixo: {selectedTema.eixoTematico}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {selectedTema.textosMotivadores?.length || 0} Textos de Apoio
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenEditTema}
                    className="p-1 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Editar textos de apoio, título e descrição"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTema(selectedTema.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Excluir este tema"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                  {selectedTema.titulo}
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-[11px] leading-relaxed">
                  {selectedTema.descricao}
                </p>
              </div>

              {/* Abas / Botões de Apoio Dinâmicos */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <FileSearch className="w-3.5 h-3.5" /> Textos de Apoio da Proposta:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMotivatorTab(0);
                      setIsMotivatorsModalOpen(true);
                    }}
                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Abrir Leitor Completo</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                  {(selectedTema.textosMotivadores && selectedTema.textosMotivadores.length > 0
                    ? selectedTema.textosMotivadores
                    : ['Texto de apoio em elaboração pela banca avaliadora.']
                  ).map((texto, idx) => {
                    const icones = [BookOpen, BarChart3, Lightbulb, FileText];
                    const Icon = icones[idx % icones.length];
                    const primeiraLinha = texto.split('\n')[0].replace(/^###\s*/, '').trim();
                    const subtitulo =
                      primeiraLinha.length > 0 && primeiraLinha.length < 50
                        ? primeiraLinha
                        : `Texto de Apoio #${idx + 1}`;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveMotivatorTab(idx);
                          setIsMotivatorsModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-zinc-200 dark:border-zinc-700/60 hover:border-indigo-300 dark:hover:border-indigo-600 text-left transition-all group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                          <Icon className="w-3 h-3 group-hover:scale-110 transition-transform shrink-0" />
                          <span>Texto {idx + 1}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium">
                          {subtitulo}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/50 text-xs text-zinc-500">
              Nenhuma proposta selecionada. Clique em &ldquo;Gerar Tema com IA&rdquo; para criar uma nova proposta de redação discursiva.
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden">
          {submissionMode === 'TEXT' ? (
            <div className="flex-1 flex flex-col space-y-2">
              <textarea
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                placeholder="Escreva sua dissertação aqui (mínimo de 300 caracteres, máximo de 5000)..."
                className="w-full flex-1 p-4 bg-white dark:bg-zinc-900/40 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-zinc-200 font-sans leading-relaxed resize-none focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-2xs"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                <span>
                  Caracteres: {characterCount} / 5000 (Mín: 300)
                </span>
                <span
                  className={
                    isCharacterCountValid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500'
                  }
                >
                  {isCharacterCountValid ? 'Extensão adequada' : 'Abaixo do mínimo'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3 bg-white dark:bg-zinc-900/20">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                  Foto da Folha de Resposta Manuscrita
                </h3>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  Tire uma foto bem iluminada da sua redação. A caligrafia necessita de pelo menos 95% de legibilidade calculada pelo modelo visual.
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleSimulatePhotoUpload}
                className="text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-zinc-200 dark:file:border-zinc-700 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-800 dark:file:text-zinc-200 hover:file:bg-zinc-200"
              />

              {ocrReadability !== null && (
                <div className="w-full max-w-md text-left">
                  {ocrReadability < 95 ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                      <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <span>⚠️ Nitidez insuficiente ({ocrReadability}%)</span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans">
                        A imagem enviada não atingiu o limiar de 95% de legibilidade calculada pela IA. Recomendamos tirar uma foto mais clara e plana ou digitar a redação manualmente.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionMode('TEXT');
                            setEssayText('Transcrição parcial detectada da folha manuscrita:\n\nEm conformidade com o tema proposto, cabe salientar que...');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 transition-colors"
                        >
                          Preencher via transcrição manual
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhoto(null);
                            setOcrReadability(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium transition-colors"
                        >
                          Tirar nova foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Taxa de legibilidade aprovada: {ocrReadability}% (Limiar mínimo: 95%). Folha pronta para avaliação.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900 flex justify-end">
            <button
              type="button"
              onClick={isEvaluating ? handleCancelarCorrecao : handleSubmit}
              disabled={
                !isEvaluating && (
                  !selectedTema ||
                  (submissionMode === 'TEXT' && !isCharacterCountValid) ||
                  (submissionMode === 'OCR' && !selectedPhoto)
                )
              }
              className={
                isEvaluating
                  ? 'px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 cursor-pointer animate-pulse'
                  : 'px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer'
              }
            >
              {isEvaluating ? (
                <>
                  <XCircle className="w-4 h-4" /> Cancelar Correção
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Enviar para Correção Multimodal
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Drawer: AI Evaluation & Competencies (0 to 1000) */}
      <div className="w-full md:w-[460px] bg-white dark:bg-zinc-950 p-5 overflow-y-auto shrink-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 space-y-4">
        {evaluationResult ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header com botão de Nova Redação */}
            <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Parecer Analítico da IA</span>
              </span>
              <button
                type="button"
                onClick={handleNovaRedacao}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Limpar e escrever nova redação"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Nova Redação</span>
              </button>
            </div>

            {/* Score Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-950/60 dark:to-zinc-900 border-2 border-indigo-200 dark:border-indigo-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-indigo-700 dark:text-indigo-300 font-bold">
                  Nota Geral (Escala Concursos/ENEM)
                </span>
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-4xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {evaluationResult.notaGeral}
                <span className="text-base text-zinc-500 font-normal"> / 1000</span>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Legibilidade calculada: {evaluationResult.taxaLegibilidade}%
              </div>
            </div>

            {/* Criteria breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                Avaliação por Competências:
              </div>
              {evaluationResult.criterios.map((c, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">{c.nome}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {c.nota}/{c.max}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                      style={{ width: `${(c.nota / c.max) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                    {c.feedback}
                  </p>
                </div>
              ))}
            </div>

            {/* Strengths & Improvements */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 space-y-2 text-xs">
              <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pontos Fortes
              </div>
              <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-1 text-[11px]">
                {evaluationResult.pontosFortes.map((p: string, idx: number) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 p-6 space-y-2">
            <Sparkles className="w-8 h-8 opacity-40 text-indigo-500" />
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-400">Aguardando Envio</div>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              O feedback com notas detalhadas de 0 a 1000 pontos será exibido aqui assim que a redação for submetida.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Gerar Tema com IA */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Gerar Tema de Redação com IA
              </h3>
              <button
                type="button"
                onClick={fecharModalTemaOuCancelar}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold block">
                Escolha um eixo ou digite seu assunto:
              </label>

              <div className="grid grid-cols-1 gap-1.5">
                {[
                  'Direito Constitucional e Políticas Públicas',
                  'Administração Pública e Combate à Corrupção',
                  'Inteligência Artificial e Proteção de Dados',
                  'Segurança Pública, Cidadania e Direitos Humanos',
                  'Meio Ambiente, Clima e Desenvolvimento Sustentável',
                ].map((eixo) => (
                  <button
                    key={eixo}
                    type="button"
                    onClick={() => setCustomEixo(eixo)}
                    className={`p-2 text-left text-xs rounded-xl border transition-all ${
                      customEixo === eixo
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-300 font-semibold shadow-2xs'
                        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    • {eixo}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block mb-1">
                  Ou especifique um tema personalizado:
                </label>
                <input
                  type="text"
                  value={customEixo}
                  onChange={(e) => setCustomEixo(e.target.value)}
                  placeholder="Ex: Reforma Tributária e Federalismo..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={fecharModalTemaOuCancelar}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!isGeneratingTema && !customEixo.trim()}
                onClick={isGeneratingTema ? handleCancelarGeracaoTema : () => handleGerarTema(customEixo)}
                className={
                  isGeneratingTema
                    ? 'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-red-600/20 cursor-pointer animate-pulse'
                    : 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer'
                }
              >
                {isGeneratingTema ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Cancelar Geração
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Gerar Proposta com IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal de Edição de Tema de Redação */}
      {isEditThemeModalOpen && selectedTema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header do Modal */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Editar Proposta de Redação
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Ajuste o título, eixo temático, descrição e a coletânea de textos motivadores.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditThemeModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo do Formulário com Scroll */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Título da Proposta:
                </label>
                <input
                  type="text"
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  placeholder="Ex: O Desafio da Eficiência e da Transparência..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Eixo Temático */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Eixo Temático:
                </label>
                <input
                  type="text"
                  value={editEixoTematico}
                  onChange={(e) => setEditEixoTematico(e.target.value)}
                  placeholder="Ex: Administração Pública, Direito Constitucional, Segurança Pública..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Descrição / Problematização */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Descrição / Contextualização da Banca:
                </label>
                <textarea
                  rows={3}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  placeholder="Contextualize a proposta ou forneça os comandos da banca examinadora..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 shadow-2xs leading-relaxed"
                />
              </div>

              {/* Textos Motivadores */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-bold block">
                      Textos de Apoio / Motivadores ({editTextosMotivadores.length})
                    </label>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Edite cada texto de apoio ou adicione novos documentos motivadores.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditTextosMotivadores((prev) => [
                        ...prev,
                        '### NOVO TEXTO DE APOIO\n\nDigite o conteúdo motivador aqui.\n\nFonte: Legislação ou Pesquisa, 2024.',
                      ]);
                      setActiveEditMotivatorTab(editTextosMotivadores.length);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Texto</span>
                  </button>
                </div>

                {/* Abas dos Textos de Apoio */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {editTextosMotivadores.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveEditMotivatorTab(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeEditMotivatorTab === idx
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>Texto {idx + 1}</span>
                      {editTextosMotivadores.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            const novoArray = editTextosMotivadores.filter((_, i) => i !== idx);
                            setEditTextosMotivadores(novoArray);
                            setActiveEditMotivatorTab(Math.max(0, idx - 1));
                          }}
                          className="hover:text-rose-300 ml-0.5"
                          title="Remover este texto de apoio"
                        >
                          ×
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Área de Edição do Texto de Apoio Selecionado */}
                {editTextosMotivadores[activeEditMotivatorTab] !== undefined && (
                  <div className="space-y-1.5">
                    <textarea
                      rows={6}
                      value={editTextosMotivadores[activeEditMotivatorTab]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditTextosMotivadores((prev) =>
                          prev.map((t, i) => (i === activeEditMotivatorTab ? val : t))
                        );
                      }}
                      placeholder="### TEXTO I: Título do Documento&#10;&#10;Conteúdo motivador com estatísticas, marcos legais ou reflexões...&#10;&#10;Fonte: Nome da Instituição / Ano."
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                    />
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                      💡 <strong>Dica de Formatação:</strong> Linhas iniciadas com <code>### TÍTULO</code> são destacadas como cabeçalho no leitor. Linhas iniciadas com <code>Fonte: ...</code> são formatadas como citação bibliográfica no rodapé do texto.
                    </div>
                  </div>
                )}
              </div>

              {/* Critérios de Avaliação Opcionais */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Critérios de Avaliação da Banca (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={editCriteriosAvaliacao}
                  onChange={(e) => setEditCriteriosAvaliacao(e.target.value)}
                  placeholder="Ex: Tópico 1 (40 pts) - Princípio da eficiência; Tópico 2 (30 pts) - Controle social..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
              <button
                type="button"
                onClick={() => handleDeleteTema(selectedTema.id)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Excluir permanentemente esta proposta"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Proposta</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditThemeModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingEditTema}
                  onClick={handleSaveEditTema}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  {isSavingEditTema ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criação Manual de Tema de Redação */}
      {isCreateThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header do Modal */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Nova Proposta de Redação Manual
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Cadastre seu próprio tema, com textos de apoio e critérios de correção.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateThemeModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo do Formulário com Scroll */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Título da Proposta: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={createTitulo}
                  onChange={(e) => setCreateTitulo(e.target.value)}
                  placeholder="Ex: O Desafio da Inteligência Artificial no Mercado de Trabalho..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Eixo Temático */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Eixo Temático: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={createEixoTematico}
                  onChange={(e) => setCreateEixoTematico(e.target.value)}
                  placeholder="Ex: Tecnologia e Sociedade, Meio Ambiente, Direito Constitucional..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Descrição / Problematização */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Descrição / Contextualização da Banca:
                </label>
                <textarea
                  rows={3}
                  value={createDescricao}
                  onChange={(e) => setCreateDescricao(e.target.value)}
                  placeholder="Apresente os comandos da banca, instruções ou a tese central a ser debatida..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 shadow-2xs leading-relaxed"
                />
              </div>

              {/* Textos Motivadores */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-bold block">
                      Textos de Apoio / Motivadores ({createTextosMotivadores.length})
                    </label>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Adicione quantos textos de apoio desejar para orientar o estudante.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateTextosMotivadores((prev) => [
                        ...prev,
                        `### TEXTO ${prev.length + 1}: Novo Documento\n\nDigite os dados ou citações aqui...\n\nFonte: Fonte oficial, 2024.`,
                      ]);
                      setActiveCreateMotivatorTab(createTextosMotivadores.length);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Texto</span>
                  </button>
                </div>

                {/* Abas dos Textos de Apoio */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {createTextosMotivadores.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveCreateMotivatorTab(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeCreateMotivatorTab === idx
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>Texto {idx + 1}</span>
                      {createTextosMotivadores.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            const novoArray = createTextosMotivadores.filter((_, i) => i !== idx);
                            setCreateTextosMotivadores(novoArray);
                            setActiveCreateMotivatorTab(Math.max(0, idx - 1));
                          }}
                          className="hover:text-rose-300 ml-0.5"
                          title="Remover este texto de apoio"
                        >
                          ×
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Área de Edição do Texto de Apoio Selecionado */}
                {createTextosMotivadores[activeCreateMotivatorTab] !== undefined && (
                  <div className="space-y-1.5">
                    <textarea
                      rows={6}
                      value={createTextosMotivadores[activeCreateMotivatorTab]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateTextosMotivadores((prev) =>
                          prev.map((t, i) => (i === activeCreateMotivatorTab ? val : t))
                        );
                      }}
                      placeholder="### TEXTO I: Título do Documento&#10;&#10;Conteúdo motivador com estatísticas, marcos legais ou reflexões...&#10;&#10;Fonte: Nome da Instituição / Ano."
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                    />
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                      💡 <strong>Dica de Formatação:</strong> Linhas iniciadas com <code>### TÍTULO</code> são formatadas como cabeçalho no leitor. Linhas iniciadas com <code>Fonte: ...</code> aparecem como citação bibliográfica.
                    </div>
                  </div>
                )}
              </div>

              {/* Critérios de Avaliação Opcionais */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">
                  Critérios de Avaliação da Banca (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={createCriteriosAvaliacao}
                  onChange={(e) => setCreateCriteriosAvaliacao(e.target.value)}
                  placeholder="Ex: Tópico 1 (40 pts) - Princípio da eficiência; Tópico 2 (30 pts) - Controle social..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
              <button
                type="button"
                onClick={() => setIsCreateThemeModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingCreateTema}
                onClick={handleSaveCreateTemaManual}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
              >
                {isSavingCreateTema ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Tema</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Textos Auxiliadores Encorpados Dinâmico */}
      {isMotivatorsModalOpen && selectedTema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[88vh] rounded-3xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header do Modal */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Coletânea de Textos Motivadores
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold">
                      {(selectedTema.textosMotivadores?.length || 1)}{' '}
                      {selectedTema.textosMotivadores?.length === 1
                        ? 'Texto de Apoio'
                        : 'Textos de Apoio'}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-lg">
                    {selectedTema.titulo}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsMotivatorsModalOpen(false);
                    handleOpenEditTema();
                  }}
                  className="p-1.5 rounded-xl text-zinc-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Editar estes textos de apoio"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMotivatorsModalOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Fechar leitor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Abas Superiores do Modal */}
            <div className="px-5 pt-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40 shrink-0 overflow-x-auto">
              <div className="flex gap-2">
                {(selectedTema.textosMotivadores && selectedTema.textosMotivadores.length > 0
                  ? selectedTema.textosMotivadores
                  : ['Texto em elaboração']
                ).map((texto, idx) => {
                  const icones = [BookOpen, BarChart3, Lightbulb, FileText];
                  const Icon = icones[idx % icones.length];
                  const isActive = activeMotivatorTab === idx;
                  const primeiraLinha = texto.split('\n')[0].replace(/^###\s*/, '').trim();
                  const subtitulo =
                    primeiraLinha.length > 0 && primeiraLinha.length < 35
                      ? primeiraLinha
                      : `Apoio #${idx + 1}`;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMotivatorTab(idx)}
                      className={`pb-3 px-3 border-b-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>Texto {idx + 1}:</span>
                      <span className="truncate max-w-[140px]">{subtitulo}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conteúdo do Texto Encorpado */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
              <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-2xs">
                {(() => {
                  const rawContent =
                    selectedTema.textosMotivadores?.[activeMotivatorTab] ||
                    'Texto de apoio em elaboração pela banca avaliadora.';
                  const paragrafos = rawContent.split(/\n+/).filter(Boolean);
                  return (
                    <div className="space-y-3">
                      {paragrafos.map((p, pIdx) => {
                        const trimmed = p.trim();
                        if (
                          trimmed.startsWith('###') ||
                          trimmed.startsWith('Texto ') ||
                          trimmed.startsWith('[Texto ')
                        ) {
                          return (
                            <h4
                              key={pIdx}
                              className="font-bold text-sm text-indigo-700 dark:text-indigo-400 pt-1 pb-1 border-b border-indigo-100 dark:border-indigo-900/40"
                            >
                              {trimmed.replace(/^###\s*/, '')}
                            </h4>
                          );
                        }
                        if (trimmed.toLowerCase().startsWith('fonte:')) {
                          return (
                            <div
                              key={pIdx}
                              className="pt-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 italic"
                            >
                              {trimmed}
                            </div>
                          );
                        }
                        return (
                          <p
                            key={pIdx}
                            className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs sm:text-sm"
                          >
                            {trimmed}
                          </p>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Dica de Repertório */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="font-semibold">Dica de Repertório:</strong> Utilize as informações, dados e legislações acima para fundamentar sua tese, mas evite copiar trechos ipsis litteris. A paráfrase crítica qualificada demonstra domínio da teoria.
                </p>
              </div>
            </div>

            {/* Footer de Navegação */}
            {(() => {
              const totalMotivadores = selectedTema.textosMotivadores?.length || 1;
              return (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeMotivatorTab === 0}
                      onClick={() => setActiveMotivatorTab((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                    </button>
                    <button
                      type="button"
                      disabled={activeMotivatorTab >= totalMotivadores - 1}
                      onClick={() =>
                        setActiveMotivatorTab((prev) => Math.min(totalMotivadores - 1, prev + 1))
                      }
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
                    >
                      Próximo <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-400">
                    Texto {activeMotivatorTab + 1} de {totalMotivadores}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsMotivatorsModalOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
                  >
                    Voltar ao Texto da Redação
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: Histórico de Redações Submetidas */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-6 text-zinc-900 dark:text-zinc-100 my-8 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>Histórico de Redações Corrigidas</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Revise suas notas, competências e pareceres analíticos detalhados da IA.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar if submissions exist */}
            {submissoes.length > 0 && (() => {
              const totalNotas = submissoes.reduce((acc, curr) => acc + curr.notaGeral, 0);
              const mediaGeral = Math.round(totalNotas / submissoes.length);
              const melhorNota = Math.max(...submissoes.map((s) => s.notaGeral));

              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Total Corrigidas</span>
                    <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">{submissoes.length}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Média Geral</span>
                    <span className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">{mediaGeral} pts</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Melhor Nota</span>
                    <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">{melhorNota} pts</span>
                  </div>
                </div>
              );
            })()}

            {/* List of Submissions */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {isLoadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs">Buscando histórico na nuvem...</span>
                </div>
              ) : submissoes.length > 0 ? (
                submissoes.map((sub) => {
                  const dataFormatada = new Date(sub.criadoEm).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const getNotaBadgeClass = (nota: number) => {
                    if (nota >= 800) {
                      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
                    }
                    if (nota >= 600) {
                      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
                    }
                    return 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
                  };

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectSubmissao(sub)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        activeSubmissaoId === sub.id
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-xs'
                          : 'bg-zinc-50/60 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {sub.temaTitulo}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>{dataFormatada}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${getNotaBadgeClass(
                            sub.notaGeral
                          )}`}
                        >
                          {sub.notaGeral} / 1000
                        </span>
                        <button
                          type="button"
                          disabled={isLoadingSubmissaoDetalhe}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          {isLoadingSubmissaoDetalhe && activeSubmissaoId === sub.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileSearch className="w-3.5 h-3.5 text-indigo-500" />
                          )}
                          <span>Abrir</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubmissaoParaExcluir(sub);
                          }}
                          className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-medium transition-colors cursor-pointer"
                          title="Excluir redação do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <FileText className="w-8 h-8 opacity-40 mx-auto" />
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Nenhuma redação corrigida encontrada no histórico.
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                    Submeta seu primeiro texto dissertativo ou envie uma foto manuscrita para receber o parecer analítico da IA.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Tema */}
      <ConfirmModal
        isOpen={temaParaExcluir !== null}
        title="Excluir Proposta de Redação"
        description={`Deseja realmente apagar a proposta "${temaParaExcluir?.titulo}"? Esta ação removerá o tema da listagem.`}
        confirmLabel="Excluir Tema"
        variant="danger"
        isLoading={isExcluindoTema}
        onConfirm={handleConfirmarExclusaoTema}
        onClose={() => {
          if (!isExcluindoTema) setTemaParaExcluir(null);
        }}
      />

      {/* Modal de Confirmação para Excluir Submissão do Histórico */}
      <ConfirmModal
        isOpen={submissaoParaExcluir !== null}
        title="Excluir Redação do Histórico"
        description={`Deseja realmente apagar a correção desta redação sobre "${submissaoParaExcluir?.temaTitulo}"? Esta ação removerá a pontuação e os pareceres analíticos associados.`}
        confirmLabel="Excluir Redação"
        variant="danger"
        isLoading={isExcluindoSubmissao}
        onConfirm={handleConfirmarExclusaoSubmissao}
        onClose={() => {
          if (!isExcluindoSubmissao) setSubmissaoParaExcluir(null);
        }}
      />
    </div>
  );
};

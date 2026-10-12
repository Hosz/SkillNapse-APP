import React, { useState, useEffect } from 'react';
import {
  FileUp,
  FileCheck,
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  AlertCircle,
  Clock,
  Trash2,
  Briefcase,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  GitBranch,
  Calendar,
  Sliders,
} from 'lucide-react';
import { editalService, cronogramaService } from '../../services';
import { ConfirmModal } from '../common/ConfirmModal';
import type { RascunhoEditalResponse } from '../../services/editalService';
import type {
  DiaSemana,
  EstrategiaAgendamento,
  SugestaoAutoAgendamentoResponse,
} from '../../services/cronogramaService';

interface EditalParserViewProps {
  onPlanCreated?: () => void;
}

const DIAS_SEMANA_CONFIG: Array<{ id: DiaSemana; label: string; abrev: string }> = [
  { id: 'SEGUNDA', label: 'Segunda-feira', abrev: 'Seg' },
  { id: 'TERCA', label: 'Terça-feira', abrev: 'Ter' },
  { id: 'QUARTA', label: 'Quarta-feira', abrev: 'Qua' },
  { id: 'QUINTA', label: 'Quinta-feira', abrev: 'Qui' },
  { id: 'SEXTA', label: 'Sexta-feira', abrev: 'Sex' },
  { id: 'SABADO', label: 'Sábado', abrev: 'Sáb' },
  { id: 'DOMINGO', label: 'Domingo', abrev: 'Dom' },
];

export const EditalParserView: React.FC<EditalParserViewProps> = ({ onPlanCreated }) => {
  const [cargoAlvo, setCargoAlvo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoEditalResponse | null>(null);
  const [tituloPlano, setTituloPlano] = useState('');
  const [descricaoPlano, setDescricaoPlano] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para fluxo de múltiplos cargos identificados
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [detectedCargos, setDetectedCargos] = useState<string[]>([]);
  const [selectedCargoOption, setSelectedCargoOption] = useState('');
  const [detectedConcurso, setDetectedConcurso] = useState('');
  const [cargoPredefinido, setCargoPredefinido] = useState('');
  const [novoCargoInput, setNovoCargoInput] = useState('');

  // Estado para descrição livre e particularidades do estudante no cronograma
  const [instrucoesPersonalizadas, setInstrucoesPersonalizadas] = useState('');

  // Controle de tópicos recolhidos na árvore programática
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});

  const toggleTopic = (topicKey: string) => {
    setCollapsedTopics((prev) => ({
      ...prev,
      [topicKey]: !prev[topicKey],
    }));
  };

  // Estados para criação automática de Cronograma Semanal Inteligente (IA)
  const [showCronogramaModal, setShowCronogramaModal] = useState(false);
  const [createdPlanoId, setCreatedPlanoId] = useState<string | null>(null);
  const [diasSelecionados, setDiasSelecionados] = useState<Record<DiaSemana, boolean>>({
    SEGUNDA: true,
    TERCA: true,
    QUARTA: true,
    QUINTA: true,
    SEXTA: true,
    SABADO: true,
    DOMINGO: false,
  });
  const [horariosPorDia, setHorariosPorDia] = useState<Record<DiaSemana, { inicio: string; fim: string }>>({
    SEGUNDA: { inicio: '19:00', fim: '22:00' },
    TERCA: { inicio: '19:00', fim: '22:00' },
    QUARTA: { inicio: '19:00', fim: '22:00' },
    QUINTA: { inicio: '19:00', fim: '22:00' },
    SEXTA: { inicio: '19:00', fim: '22:00' },
    SABADO: { inicio: '08:00', fim: '12:00' },
    DOMINGO: { inicio: '09:00', fim: '12:00' },
  });
  const [duracaoBlocoMinutos, setDuracaoBlocoMinutos] = useState<number>(60);
  const [intervaloDescansoMinutos, setIntervaloDescansoMinutos] = useState<number>(10);
  const [incluirRevisao, setIncluirRevisao] = useState<boolean>(true);
  const [incluirSimulado, setIncluirSimulado] = useState<boolean>(true);
  const [estrategia, setEstrategia] = useState<EstrategiaAgendamento>('FOCO_PESO_EDITAL');

  const [isGerandoSugestao, setIsGerandoSugestao] = useState(false);
  const [sugestaoCronograma, setSugestaoCronograma] = useState<SugestaoAutoAgendamentoResponse | null>(null);
  const [isAplicandoCronograma, setIsAplicandoCronograma] = useState(false);
  const [cronogramaErrorMessage, setCronogramaErrorMessage] = useState<string | null>(null);

  const toggleDiaSemana = (dia: DiaSemana) => {
    setDiasSelecionados((prev) => ({
      ...prev,
      [dia]: !prev[dia],
    }));
  };

  const handleUpdateHorarioDia = (dia: DiaSemana, campo: 'inicio' | 'fim', valor: string) => {
    setHorariosPorDia((prev) => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [campo]: valor,
      },
    }));
  };

  // Lista de rascunhos anteriores salvos no backend
  const [rascunhosSalvos, setRascunhosSalvos] = useState<RascunhoEditalResponse[]>([]);
  const [isLoadingRascunhos, setIsLoadingRascunhos] = useState(true);

  useEffect(() => {
    let isMounted = true;
    editalService
      .listarRascunhos()
      .then((lista) => {
        if (!isMounted) return;
        setRascunhosSalvos(
          lista.filter((r) => r.status === 'AGUARDANDO_APROVACAO' || r.status === 'PROCESSANDO')
        );
      })
      .catch(() => {
        // Ignora erro
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRascunhos(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectDraft = (draft: RascunhoEditalResponse) => {
    setRascunho(draft);
    const concurso = draft.conteudo?.nomeConcurso || 'Concurso Público';
    const cargo = draft.conteudo?.cargo || 'Geral';
    const defaultTitulo = `${concurso} - ${cargo}`;
    setTituloPlano(defaultTitulo.length > 150 ? defaultTitulo.substring(0, 150) : defaultTitulo);
    setDescricaoPlano(`Plano extraído via IA a partir do edital ${draft.nomeArquivo}`);
    setErrorMessage(null);
  };

  const [draftParaExcluir, setDraftParaExcluir] = useState<string | null>(null);
  const [isExcluindoDraft, setIsExcluindoDraft] = useState(false);

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftParaExcluir(id);
  };

  const handleConfirmarExclusaoDraft = async () => {
    if (!draftParaExcluir) return;
    setIsExcluindoDraft(true);
    try {
      await editalService.excluirRascunho(draftParaExcluir);
      if (rascunho?.id === draftParaExcluir) {
        setRascunho(null);
      }
      setRascunhosSalvos((prev) => prev.filter((r) => r.id !== draftParaExcluir));
      setDraftParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir rascunho de edital:', err);
    } finally {
      setIsExcluindoDraft(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setErrorMessage('Por favor, selecione um arquivo no formato PDF.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('O arquivo excede o limite máximo permitido de 25 MB.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setCargoAlvo('');
      setDetectedCargos([]);
      setRascunho(null);
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) {
      setErrorMessage('Por favor, selecione um arquivo PDF antes de processar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Se o usuário digitou previamente o cargo desejado (ex: PMPE), gera diretamente para ele
      if (cargoPredefinido && cargoPredefinido.trim()) {
        await handleConfirmSelectedCargo(cargoPredefinido.trim());
        return;
      }

      if (cargoAlvo && cargoAlvo.trim()) {
        // Se o usuário já tiver selecionado um cargo anteriormente, gera diretamente para ele
        await handleConfirmSelectedCargo(cargoAlvo.trim());
        return;
      }

      // Passo 1: A IA analisa o PDF e busca os cargos existentes no edital
      const resultadoCargos = await editalService.detectarCargos(selectedFile);

      if (resultadoCargos && resultadoCargos.cargos && resultadoCargos.cargos.length > 0) {
        setDetectedCargos(resultadoCargos.cargos);
        setDetectedConcurso(resultadoCargos.nomeConcurso || 'Concurso Identificado');
        setSelectedCargoOption(resultadoCargos.cargos[0]);
        setShowCargoModal(true);
      } else {
        // Fallback: se nenhum cargo específico foi nomeado, processa como Geral
        await handleConfirmSelectedCargo('Geral');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao analisar o edital via IA. Certifique-se de que o documento contém texto programático legível.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSelectedCargo = async (cargoParaGerar: string) => {
    if (!selectedFile || !cargoParaGerar.trim()) return;

    setShowCargoModal(false);
    setCargoAlvo(cargoParaGerar);
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsed = await editalService.parseEdital(selectedFile, cargoParaGerar);

      if (parsed && parsed.conteudo && parsed.conteudo.materias) {
        setRascunho(parsed);
        const concurso = parsed.conteudo.nomeConcurso || detectedConcurso || 'Concurso Público';
        const defaultTitulo = `${concurso} - ${cargoParaGerar}`;
        setTituloPlano(defaultTitulo.length > 150 ? defaultTitulo.substring(0, 150) : defaultTitulo);
        setDescricaoPlano(`Plano extraído via IA a partir do edital ${parsed.nomeArquivo} para o cargo ${cargoParaGerar}`);
        setRascunhosSalvos((prev) => [parsed, ...prev.filter((r) => r.id !== parsed.id)]);
        setSuccessMessage(`Árvore programática gerada com sucesso para o cargo: "${cargoParaGerar}"!`);
      } else {
        throw new Error(`Não foi possível gerar os tópicos e matérias para o cargo ${cargoParaGerar}.`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao processar o edital para o cargo selecionado.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertToPlan = async () => {
    if (!rascunho) return;

    if (!tituloPlano.trim()) {
      setErrorMessage('Por favor, informe o título do plano de estudos.');
      return;
    }

    setIsConverting(true);
    setErrorMessage(null);

    try {
      const conversao = await editalService.converterParaPlano(rascunho.id, {
        tituloPlano: tituloPlano.trim(),
        descricaoPlano: descricaoPlano.trim() || undefined,
      });

      if (conversao && conversao.planoEstudoId) {
        setCreatedPlanoId(conversao.planoEstudoId);
        setSugestaoCronograma(null);
        setCronogramaErrorMessage(null);
        setShowCronogramaModal(true);
        setSuccessMessage('Plano de estudos criado com sucesso! Agora defina seus horários para gerar o cronograma automático.');
      } else {
        throw new Error('Falha na conversão do rascunho em plano de estudo.');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao converter o rascunho do edital em plano ativo.';
      setErrorMessage(msg);
    } finally {
      setIsConverting(false);
    }
  };

  // Dispara a simulação de auto-agendamento via IA (com opções do site e/ou texto livre da situação do estudante)
  const handleGerarSugestaoCronograma = async () => {
    if (!createdPlanoId) return;

    const diasAtivos = DIAS_SEMANA_CONFIG.filter((d) => diasSelecionados[d.id]);
    let disponibilidades = diasAtivos.map((d) => ({
      diaSemana: d.id,
      horaInicio: horariosPorDia[d.id].inicio,
      horaFim: horariosPorDia[d.id].fim,
    }));

    // Se o usuário optou por não selecionar opções do site mas explicou sua situação por extenso:
    if (disponibilidades.length === 0) {
      if (instrucoesPersonalizadas.trim()) {
        disponibilidades = [
          { diaSemana: 'SEGUNDA', horaInicio: '19:00', horaFim: '22:00' },
          { diaSemana: 'TERCA', horaInicio: '19:00', horaFim: '22:00' },
          { diaSemana: 'QUARTA', horaInicio: '19:00', horaFim: '22:00' },
          { diaSemana: 'QUINTA', horaInicio: '19:00', horaFim: '22:00' },
          { diaSemana: 'SEXTA', horaInicio: '19:00', horaFim: '22:00' },
          { diaSemana: 'SABADO', horaInicio: '08:00', horaFim: '12:00' },
        ];
      } else {
        setCronogramaErrorMessage('Selecione ao menos um dia da semana para estudar ou descreva sua rotina na área de texto.');
        return;
      }
    }

    setIsGerandoSugestao(true);
    setCronogramaErrorMessage(null);

    try {
      const sugestao = await cronogramaService.gerarSugestaoAutoAgendamento({
        planoEstudoId: createdPlanoId,
        disponibilidades,
        duracaoBlocoMinutos,
        intervaloDescansoMinutos,
        incluirRevisao,
        incluirSimulado,
        estrategia,
        instrucoesPersonalizadas: instrucoesPersonalizadas.trim() || undefined,
      });

      setSugestaoCronograma(sugestao);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar a sugestão automática de cronograma. Verifique os horários informados.';
      setCronogramaErrorMessage(msg);
    } finally {
      setIsGerandoSugestao(false);
    }
  };

  // Aplica e persiste a grade no template semanal do usuário
  const handleAplicarCronograma = async () => {
    if (!createdPlanoId || !sugestaoCronograma) return;

    setIsAplicandoCronograma(true);
    setCronogramaErrorMessage(null);

    try {
      const rawNome = `Grade - ${tituloPlano.trim()}`;
      const nomeTemplateSeguro = rawNome.length > 95 ? `${rawNome.substring(0, 92).trim()}...` : rawNome;

      await cronogramaService.aplicarAutoAgendamento({
        planoEstudoId: createdPlanoId,
        nomeTemplate: nomeTemplateSeguro,
        limparBlocosExistentes: true,
        resumoPedagogico: sugestaoCronograma.resumoPedagogico,
        blocos: sugestaoCronograma.blocosSugeridos.map((b) => ({
          diaSemana: b.diaSemana,
          horaInicio: b.horaInicio,
          horaFim: b.horaFim,
          tipoBloco: b.tipoBloco,
          materiaId: b.materiaId,
          topicoId: b.topicoId,
          justificativaPedagogica: b.justificativaPedagogica,
        })),
      });

      setShowCronogramaModal(false);
      if (onPlanCreated) {
        onPlanCreated();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao aplicar os blocos no template semanal.';
      setCronogramaErrorMessage(msg);
    } finally {
      setIsAplicandoCronograma(false);
    }
  };

  const handlePularCronograma = () => {
    setShowCronogramaModal(false);
    if (onPlanCreated) {
      onPlanCreated();
    }
  };

  const totalMaterias = rascunho?.conteudo?.materias?.length || 0;
  const totalTopicos =
    rascunho?.conteudo?.materias?.reduce((acc, m) => acc + (m.topicos?.length || 0), 0) || 0;
  const totalSubtopicos =
    rascunho?.conteudo?.materias?.reduce(
      (acc, m) =>
        acc + (m.topicos?.reduce((subAcc, t) => subAcc + (t.subtopicos?.length || 0), 0) || 0),
      0
    ) || 0;

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none">
      {/* Coluna Esquerda: Upload, Configuração e Rascunhos Anteriores */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-900 overflow-y-auto p-6 space-y-6">
        <div>
          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Módulo de Inteligência Artificial
          </div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Processamento Inteligente de Edital (PDF)
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
            Faça upload do PDF oficial do edital. O modelo analisa a grade de Conteúdo Programático, decompõe as matérias em tópicos temáticos com subtópicos e atribui pesos calculados por relevância no concurso.
          </p>
        </div>

        {/* Feedback de Erro */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Feedback de Sucesso */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Card Informativo do Fluxo ou Cargo Selecionado */}
        {cargoAlvo ? (
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                  Cargo Alvo em Estudo
                </span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                  {cargoAlvo}
                </span>
              </div>
            </div>
            {detectedCargos.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCargoModal(true)}
                className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-white bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 rounded-lg transition-colors shrink-0"
              >
                Trocar Cargo
              </button>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Detecção Automática de Cargos
              </h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Envie o edital em PDF. A IA identificará os cargos disponíveis no concurso e abrirá um modal para você selecionar qual deseja estudar.
              </p>
            </div>
          </div>
        )}

        {/* Zona de Upload de PDF */}
        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-zinc-900/20 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
            <FileUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {selectedFile ? selectedFile.name : 'Selecione o arquivo PDF do edital'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Formatos aceitos: PDF oficial de até 25 MB
              {selectedFile && ` • ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`}
            </p>
          </div>

          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-200 dark:file:bg-zinc-800 file:text-zinc-800 dark:file:text-zinc-200 hover:file:bg-zinc-300 dark:hover:file:bg-zinc-700 cursor-pointer"
          />

          {/* Campo Opcional: Direcionamento Direto de Cargo */}
          <div className="w-full max-w-sm pt-2 text-left space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold block">
              Cargo Desejado (Opcional):
            </label>
            <input
              type="text"
              value={cargoPredefinido}
              onChange={(e) => setCargoPredefinido(e.target.value)}
              placeholder="Ex: Analista Judiciário, Agente de Polícia, Auditor-Fiscal..."
              className="w-full px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-zinc-500 leading-tight">
              Preencha caso já saiba o cargo exato ou se o edital tiver preâmbulos conjuntos.
            </p>
          </div>

          <button
            onClick={handleUploadAndParse}
            disabled={isProcessing || !selectedFile}
            className="mt-3 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {cargoAlvo ? `Gerando plano para "${cargoAlvo}"...` : 'Identificando cargos no edital via IA...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {cargoAlvo ? 'Regerar Conteúdo deste Cargo' : 'Analisar Edital e Identificar Cargos'}
              </>
            )}
          </button>
        </div>

        {/* Rascunhos Anteriores Salvos */}
        {rascunhosSalvos.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Rascunhos Anteriores Aguardando Aprovação:
              </span>
              {isLoadingRascunhos && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </div>

            <div className="space-y-2">
              {rascunhosSalvos.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => handleSelectDraft(draft)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    rascunho?.id === draft.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500/50 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="font-semibold truncate">
                      {draft.conteudo?.nomeConcurso || draft.nomeArquivo}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                      Cargo: {draft.conteudo?.cargo || 'Não especificado'} •{' '}
                      {draft.conteudo?.materias?.length || 0} matérias •{' '}
                      {draft.conteudo?.materias?.reduce((acc, m) => acc + (m.topicos?.length || 0), 0) || 0} tópicos •{' '}
                      {draft.conteudo?.materias?.reduce((acc, m) => acc + (m.topicos?.reduce((subAcc, t) => subAcc + (t.subtopicos?.length || 0), 0) || 0), 0) || 0} subtópicos
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title="Excluir rascunho"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Coluna Direita: Pré-visualização da Árvore Estruturada e Conversão em Plano */}
      <div className="w-full md:w-[500px] lg:w-[540px] bg-zinc-100/60 dark:bg-zinc-950 p-6 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-900 flex flex-col justify-between overflow-y-auto">
        {isProcessing ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 dark:text-zinc-400 p-6 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-500" />
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
              {cargoAlvo
                ? `Estruturando Conteúdo para "${cargoAlvo}"...`
                : 'Analisando Edital com Inteligência Artificial...'}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-500 max-w-xs leading-relaxed">
              {cargoAlvo
                ? 'O modelo está extraindo a grade programática específica deste cargo, decompondo matérias em tópicos temáticos com subtópicos e pesos pedagógicos.'
                : 'O modelo está lendo o conteúdo programático do documento, agrupando matérias, extraindo tópicos e calculando pesos pedagógicos de 1 a 10. Aguarde alguns instantes...'}
            </p>
          </div>
        ) : rascunho && rascunho.conteudo ? (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Extração Concluída com Sucesso
              </div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {rascunho.conteudo.nomeConcurso || 'Concurso Identificado'}
              </h2>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                Cargo Alvo: {rascunho.conteudo.cargo || 'Geral'} • {totalMaterias} {totalMaterias === 1 ? 'matéria' : 'matérias'} • {totalTopicos} {totalTopicos === 1 ? 'tópico' : 'tópicos'} • {totalSubtopicos} {totalSubtopicos === 1 ? 'subtópico' : 'subtópicos'}
              </div>
            </div>

            {/* Configuração de Título do Plano Final */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block font-mono uppercase">
                Título Oficial do Plano de Estudos:
              </label>
              <input
                type="text"
                value={tituloPlano}
                maxLength={150}
                onChange={(e) => setTituloPlano(e.target.value)}
                placeholder="Ex: Auditor-Fiscal da Receita Federal 2026"
                className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Listagem de Matérias e Tópicos Extraídos (Árvore Hierárquica Estruturada) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
                  <span>Árvore Programática Extraída:</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                  {totalMaterias} {totalMaterias === 1 ? 'matéria' : 'matérias'} • {totalTopicos} {totalTopicos === 1 ? 'tópico' : 'tópicos'} • {totalSubtopicos} {totalSubtopicos === 1 ? 'subtópico' : 'subtópicos'}
                </span>
              </div>

              {rascunho.conteudo.materias.map((m, idx: number) => {
                const totalSubtopicosMateria =
                  m.topicos?.reduce((acc, t) => acc + (t.subtopicos?.length || 0), 0) || 0;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-sm transition-all"
                  >
                    {/* Header da Matéria (Nível 1 da Árvore) */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 shrink-0 shadow-xs" />
                        <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">{m.nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700/60 font-medium">
                          {m.topicos?.length || 0} {m.topicos?.length === 1 ? 'tópico' : 'tópicos'}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20 font-semibold flex items-center gap-1">
                          <GitBranch className="w-2.5 h-2.5" />
                          {totalSubtopicosMateria} {totalSubtopicosMateria === 1 ? 'subtópico' : 'subtópicos'}
                        </span>
                      </div>
                    </div>

                    {/* Linha Vertical Guia da Matéria conectando os Tópicos Principais */}
                    <div className="pl-3.5 space-y-3 border-l-2 border-indigo-400 dark:border-indigo-500/30 ml-1.5">
                      {m.topicos?.map((top, tIdx: number) => {
                        const topicKey = `${idx}-${tIdx}`;
                        const hasSubtopics = top.subtopicos && top.subtopicos.length > 0;
                        const isExpanded = !collapsedTopics[topicKey];

                        return (
                          <div key={tIdx} className="space-y-2">
                            {/* Bloco / Cartão do Tópico Principal (Nível 2) */}
                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 transition-all flex items-start justify-between gap-3 shadow-2xs">
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                {hasSubtopics ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleTopic(topicKey)}
                                    className="p-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 transition-colors mt-0.5 shrink-0"
                                    title={isExpanded ? 'Recolher subtópicos' : 'Expandir subtópicos'}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2 ml-1" />
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                                    {top.titulo}
                                  </div>
                                  {hasSubtopics && (
                                    <div className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                                      <CornerDownRight className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                      <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                                        {top.subtopicos!.length} {top.subtopicos!.length === 1 ? 'subtópico ramificado' : 'subtópicos ramificados'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Badges de Peso e Metadados do Tópico */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`font-mono text-[10px] px-2 py-0.5 rounded border shrink-0 font-semibold ${
                                    (top.pesoEdital || 5) >= 8
                                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                                      : (top.pesoEdital || 5) >= 5
                                      ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/70'
                                  }`}
                                >
                                  Peso {top.pesoEdital || 5}/10
                                </span>
                              </div>
                            </div>

                            {/* Formato de Árvore com Linha Vertical Separadora para os Subtópicos (Nível 3) */}
                            {hasSubtopics && isExpanded && (
                              <div className="ml-4 pl-3.5 space-y-1.5 border-l-2 border-indigo-400 dark:border-indigo-500/25 py-1">
                                {top.subtopicos!.map((sub, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="group relative flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/70 text-xs text-zinc-800 dark:text-zinc-200 transition-all shadow-2xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0 group-hover:scale-125 transition-transform" />
                                      <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-200 leading-relaxed truncate">
                                        {sub}
                                      </span>
                                    </div>

                                    <span className="text-[9px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/50 shrink-0 font-medium">
                                      {tIdx + 1}.{sIdx + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ação de Conversão em Plano Ativo */}
            <button
              onClick={handleConvertToPlan}
              disabled={isConverting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Convertendo em Plano de Estudos...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Converter em Plano de Estudo Ativo
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6 space-y-2">
            <Layers className="w-8 h-8 opacity-30" />
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Prévia do Plano de Estudo</div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-600 max-w-xs leading-relaxed">
              Após enviar o PDF, a árvore estruturada com matérias, tópicos, subtópicos e pesos calculados pela IA aparecerá aqui para sua validação.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Cargo Alvo Identificado */}
      {showCargoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Cargos Identificados no Edital
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs font-mono">
                    {detectedConcurso || 'Concurso Identificado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCargoModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                A IA identificou <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{detectedCargos.length} cargos</span> neste edital.
                Selecione o cargo desejado ou digite outro manualmente abaixo:
              </p>

              {/* Lista de Cargos */}
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 pt-1">
                {detectedCargos.map((cargoOption, index) => {
                  const isSelected = selectedCargoOption === cargoOption;
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedCargoOption(cargoOption)}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 font-medium truncate">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span className="truncate">{cargoOption}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inserção de Novo Cargo Manual */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase font-mono block">
                  Não encontrou seu cargo? Digite aqui:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={novoCargoInput}
                    onChange={(e) => setNovoCargoInput(e.target.value)}
                    placeholder="Ex: Analista de Sistemas, Técnico Administrativo..."
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (novoCargoInput.trim()) {
                        const novo = novoCargoInput.trim();
                        if (!detectedCargos.includes(novo)) {
                          setDetectedCargos((prev) => [novo, ...prev]);
                        }
                        setSelectedCargoOption(novo);
                        setNovoCargoInput('');
                      }
                    }}
                    disabled={!novoCargoInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shrink-0 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCargoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSelectedCargo(selectedCargoOption || novoCargoInput.trim())}
                disabled={!selectedCargoOption && !novoCargoInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Árvore para este Cargo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação Automática do Cronograma Semanal Inteligente (IA) */}
      {showCronogramaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header do Modal */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Cronograma Semanal Inteligente (IA)
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Defina sua rotina de estudos para a IA distribuir suas matérias e tópicos pedagogicamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePularCronograma}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Pular"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mensagem de Erro de Cronograma se houver */}
            {cronogramaErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{cronogramaErrorMessage}</span>
              </div>
            )}

            {!sugestaoCronograma ? (
              /* Formulário de Configuração de Disponibilidade e Pedagogia */
              <div className="space-y-5">
                {/* 1. Dias da Semana de Estudo */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    1. Dias Disponíveis na Semana:
                  </label>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {DIAS_SEMANA_CONFIG.map((d) => {
                      const ativo = diasSelecionados[d.id];
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDiaSemana(d.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                            ativo
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                              : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <span>{d.abrev}</span>
                          <span className="text-[9px] font-mono opacity-80">
                            {ativo ? 'Ativo' : 'Folga'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Janelas Horárias dos Dias Ativos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
                      2. Horários de Estudo (Início e Fim):
                    </label>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {DIAS_SEMANA_CONFIG.filter((d) => diasSelecionados[d.id]).length} dias selecionados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {DIAS_SEMANA_CONFIG.filter((d) => diasSelecionados[d.id]).map((d) => (
                      <div
                        key={d.id}
                        className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 min-w-[70px]">
                          {d.label}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <input
                            type="time"
                            value={horariosPorDia[d.id].inicio}
                            onChange={(e) => handleUpdateHorarioDia(d.id, 'inicio', e.target.value)}
                            className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-1.5 py-1 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-zinc-400">às</span>
                          <input
                            type="time"
                            value={horariosPorDia[d.id].fim}
                            onChange={(e) => handleUpdateHorarioDia(d.id, 'fim', e.target.value)}
                            className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-1.5 py-1 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Duração do Bloco e Intervalo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
                      Duração de Cada Bloco:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[30, 45, 60, 90].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => setDuracaoBlocoMinutos(min)}
                          className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            duracaoBlocoMinutos === min
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {min} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
                      Descanso entre Blocos:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0, 10, 15].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => setIntervaloDescansoMinutos(min)}
                          className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            intervaloDescansoMinutos === min
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {min === 0 ? 'Sem pausa' : `${min} min`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Estratégia Pedagógica */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    Estratégia de Distribuição Inteligente:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: 'FOCO_PESO_EDITAL' as EstrategiaAgendamento,
                        title: 'Peso do Edital',
                        desc: 'Prioriza matérias com maior pontuação e relevância.',
                      },
                      {
                        id: 'EQUILIBRADA' as EstrategiaAgendamento,
                        title: 'Ciclo Equilibrado',
                        desc: 'Distribui a carga de estudo uniformemente.',
                      },
                      {
                        id: 'FOCO_DIFICULDADE' as EstrategiaAgendamento,
                        title: 'Complexidade',
                        desc: 'Aloca mais tempo para disciplinas extensas.',
                      },
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => setEstrategia(opt.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          estrategia === opt.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              estrategia === opt.id ? 'bg-indigo-600' : 'bg-zinc-400'
                            }`}
                          />
                          {opt.title}
                        </div>
                        <div className="text-[11px] mt-1 leading-snug">{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggles Pedagógicos */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={incluirRevisao}
                      onChange={(e) => setIncluirRevisao(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Intercalar blocos de Revisão Espaçada
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={incluirSimulado}
                      onChange={(e) => setIncluirSimulado(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Programar Simulados nos Finais de Semana
                  </label>
                </div>

                {/* 5. Área de Descrição Livre da Situação & Rotina Pessoal */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase font-mono flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      5. Sua Situação & Rotina Pessoal (Opcional ou Complementar):
                    </label>
                    <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Instruções Livres
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Você pode usar as opções automáticas do site acima, descrever sua situação livremente abaixo (ex: plantão 12x36, turnos, horários variáveis, pontos fortes e fracos), ou combinar os dois para um direcionamento sob medida.
                  </p>
                  <textarea
                    rows={3}
                    value={instrucoesPersonalizadas}
                    onChange={(e) => setInstrucoesPersonalizadas(e.target.value)}
                    placeholder="Ex: Trabalho em escala 12x36 nos dias pares. Tenho boa base em Língua Portuguesa e preciso de maior ênfase em Direito Constitucional e Redação. Prefiro blocos práticos à noite..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-700/60 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-2xs"
                  />
                </div>
              </div>
            ) : (
              /* Pré-visualização da Grade Gerada com IA */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 font-mono uppercase">
                      Diagnóstico Pedagógico da IA:
                    </span>
                    <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                      {sugestaoCronograma.totalHorasSemanais}h semanais • {sugestaoCronograma.totalBlocosSugeridos} blocos
                    </span>
                  </div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {sugestaoCronograma.resumoPedagogico}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
                    Grade Semanal Sugerida:
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {sugestaoCronograma.blocosSugeridos.map((bloco, bIdx) => (
                      <div
                        key={bIdx}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded">
                            {bloco.diaSemana.slice(0, 3)}
                          </span>
                          <span className="font-mono text-zinc-500 text-[11px] shrink-0">
                            {bloco.horaInicio.slice(0, 5)} - {bloco.horaFim.slice(0, 5)}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                              {bloco.materiaNome || (bloco.tipoBloco === 'SIMULADO' ? 'Simulado Geral' : 'Revisão Geral')}
                            </span>
                            {bloco.topicoTitulo && (
                              <span className="text-[11px] text-zinc-500 truncate block">
                                {bloco.topicoTitulo}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold uppercase shrink-0 ${
                            bloco.tipoBloco === 'SIMULADO'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                              : bloco.tipoBloco === 'REVISAO'
                              ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30'
                              : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/30'
                          }`}
                        >
                          {bloco.tipoBloco}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ações do Rodapé do Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={handlePularCronograma}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-center"
              >
                Pular por enquanto e ir para a Árvore
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                {!sugestaoCronograma ? (
                  <button
                    type="button"
                    onClick={handleGerarSugestaoCronograma}
                    disabled={isGerandoSugestao}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
                  >
                    {isGerandoSugestao ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando Grade com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Simular Cronograma com IA
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSugestaoCronograma(null)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                      Ajustar Parâmetros
                    </button>
                    <button
                      type="button"
                      onClick={handleAplicarCronograma}
                      disabled={isAplicandoCronograma}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                    >
                      {isAplicandoCronograma ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Aplicando no Cronograma...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Salvar no Meu Cronograma Semanal
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Rascunho */}
      <ConfirmModal
        isOpen={draftParaExcluir !== null}
        title="Excluir Rascunho de Edital"
        description="Deseja realmente excluir este rascunho de edital processado? Os dados extraídos não salvos serão descartados."
        confirmLabel="Excluir Rascunho"
        variant="danger"
        isLoading={isExcluindoDraft}
        onConfirm={handleConfirmarExclusaoDraft}
        onClose={() => {
          if (!isExcluindoDraft) setDraftParaExcluir(null);
        }}
      />
    </div>
  );
};

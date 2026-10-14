import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Sparkles,
  Clock,
  CheckCircle2,
  Play,
  ChevronRight,
  ChevronLeft,
  X,
  XCircle,
  Plus,
  Loader2,
  Trash2,
  RotateCcw,
  BookOpen,
  Layers,
  Check,
  AlertCircle,
} from 'lucide-react';
import { simuladoService, questaoService, planoService } from '../../services';
import { isQuotaExceededError, isAbortError } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../../context/useToast';
import type { SimuladoResumo, SimuladoDetalhe } from '../../services/simuladoService';
import type { PlanoEstudo, NivelProficiencia } from '../../types';

export interface SimuladoFilterInitial {
  planoId?: string;
  materiaId?: string;
  topicoId?: string;
  subtopicoId?: string;
}

const LOCAL_STORAGE_PREFIX = 'skillnapse_simulado_';

const salvarSimuladoLocal = (simulado: SimuladoDetalhe) => {
  try {
    if (simulado && simulado.simuladoId) {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${simulado.simuladoId}`, JSON.stringify(simulado));
    }
  } catch (e) {
    console.warn('Erro ao salvar simulado em cache local:', e);
  }
};

const obterSimuladoLocal = (simuladoId: string): SimuladoDetalhe | null => {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${simuladoId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.questoes) && parsed.questoes.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao obter simulado do cache local:', e);
  }
  return null;
};

const removerSimuladoLocal = (simuladoId: string) => {
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${simuladoId}`);
  } catch {}
};

const extrairIndicativosSimulado = (sim: SimuladoResumo) => {
  const cached = obterSimuladoLocal(sim.id);
  if (cached && cached.questoes && cached.questoes.length > 0) {
    const assuntos = Array.from(new Set(cached.questoes.map((q) => q.assuntoGeral).filter(Boolean)));
    const topicos = Array.from(
      new Set(cached.questoes.map((q) => q.topicoReferencia).filter(Boolean))
    );
    const bancas = Array.from(new Set(cached.questoes.map((q) => q.banca).filter(Boolean)));

    return {
      assuntos,
      topicos,
      banca: bancas[0] || undefined,
    };
  }

  let cleanTitle = sim.titulo.replace(/^Simulado:\s*/i, '').replace(/^Simulado Adaptativo IA\s*[-:]?\s*/i, '');
  let banca: string | undefined = undefined;

  const matchBanca = cleanTitle.match(/\(([^)]+)\)$/);
  if (matchBanca) {
    banca = matchBanca[1];
    cleanTitle = cleanTitle.replace(/\s*\([^)]+\)$/, '').trim();
  }

  let assuntos: string[] = [];
  let topicos: string[] = [];

  if (cleanTitle.includes(' > ')) {
    const partes = cleanTitle.split(' > ').map((p) => p.trim());
    if (partes.length >= 3) {
      assuntos = [partes[0]];
      topicos = [partes.slice(1).join(' > ')];
    } else if (partes.length === 2) {
      assuntos = [partes[0]];
      topicos = [partes[1]];
    }
  } else if (cleanTitle.includes(' - ')) {
    const partes = cleanTitle.split(' - ').map((p) => p.trim());
    assuntos = [partes[0]];
    if (partes[1]) {
      topicos = [partes.slice(1).join(' - ')];
    }
  } else if (cleanTitle.trim()) {
    assuntos = [cleanTitle.trim()];
  }

  return {
    assuntos,
    topicos,
    banca,
  };
};

const isUUID = (val?: string | null): boolean =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

interface SimuladoViewProps {
  plano: PlanoEstudo;
  planos?: PlanoEstudo[];
  onProficienciaAtualizada?: () => void;
  initialFilter?: SimuladoFilterInitial | null;
  initialSimuladoId?: string | null;
}

export const SimuladoView: React.FC<SimuladoViewProps> = ({
  plano,
  planos = [],
  onProficienciaAtualizada,
  initialFilter,
  initialSimuladoId,
}) => {
  const toast = useToast();
  const [simulados, setSimulados] = useState<SimuladoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(!!initialFilter && !initialSimuladoId);
  const [modalTab, setModalTab] = useState<'ia' | 'manual'>('ia');

  // Plan Selection & Cascading Scope for Generator
  const planosList = planos.length > 0 ? planos : [plano];
  const [selectedPlanoId, setSelectedPlanoId] = useState<string>(
    initialFilter?.planoId || plano.id
  );
  const [planoCarregado, setPlanoCarregado] = useState<PlanoEstudo | null>(null);
  const [filterMateria, setFilterMateria] = useState(!!initialFilter?.materiaId);
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>(
    initialFilter?.materiaId || ''
  );
  const [filterTopico, setFilterTopico] = useState(!!initialFilter?.topicoId);
  const [selectedTopicoId, setSelectedTopicoId] = useState<string>(
    initialFilter?.topicoId || ''
  );
  const [filterSubtopico, setFilterSubtopico] = useState(!!initialFilter?.subtopicoId);
  const [selectedSubtopico, setSelectedSubtopico] = useState<string>(
    initialFilter?.subtopicoId || ''
  );

  // Banca customizada
  const [isCustomBanca, setIsCustomBanca] = useState(false);
  const [customBanca, setCustomBanca] = useState('');

  // Max Questions rule (IA Adaptativa: entre 3 e 15 questões por geração):
  // Edital Completo: 15 | Matéria Inteira: 15 | Tópico Inteiro: 10 | Subtópico: 5
  const maxQuestoes = !filterMateria
    ? 15
    : !filterTopico
    ? 15
    : !filterSubtopico
    ? 10
    : 5;

  const [qtdQuestoes, setQtdQuestoes] = useState<number>(10);
  const [bancaAlvo, setBancaAlvo] = useState('CESPE / Cebraspe');
  const [generating, setGenerating] = useState(false);

  // Manual Question state
  const [manualEnunciado, setManualEnunciado] = useState('');
  const [manualDificuldade, setManualDificuldade] = useState<'FACIL' | 'MEDIA' | 'DIFICIL'>('MEDIA');
  const [manualGabarito, setManualGabarito] = useState('A');
  const [manualExplicacao, setManualExplicacao] = useState('');
  const [manualAlternativas, setManualAlternativas] = useState([
    { letra: 'A' as const, texto: '' },
    { letra: 'B' as const, texto: '' },
    { letra: 'C' as const, texto: '' },
    { letra: 'D' as const, texto: '' },
    { letra: 'E' as const, texto: '' },
  ]);
  const [savingManual, setSavingManual] = useState(false);

  // Active Exam state
  const [activeSimulado, setActiveSimulado] = useState<SimuladoDetalhe | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({}); // { questionId: altId }
  const [examFinished, setExamFinished] = useState(false);
  const [gabaritoResultados, setGabaritoResultados] = useState<
    Record<
      string,
      {
        acertou: boolean;
        alternativaEscolhidaId?: string;
        letraEscolhida?: string;
        alternativaCorretaId?: string;
        letraCorreta?: string;
        explicacaoGabarito?: string;
      }
    >
  >({});
  const [examResult, setExamResult] = useState<{
    total: number;
    acertos: number;
    pct: number;
    topicos?: Array<{
      topicoId: string;
      nome: string;
      total: number;
      acertos: number;
      pct: number;
      proficiencia: NivelProficiencia;
    }>;
  } | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'PENDENTES' | 'CONCLUIDOS'>('TODOS');
  const [bannerNovoSimulado, setBannerNovoSimulado] = useState<{
    id: string;
    titulo: string;
    totalQuestoes: number;
  } | null>(null);

  // Ajusta quantidade ao alterar o escopo
  useEffect(() => {
    setQtdQuestoes((prev) => Math.min(prev, maxQuestoes));
  }, [maxQuestoes]);

  // Sincroniza quando initialFilter muda
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.planoId) {
        setSelectedPlanoId(initialFilter.planoId);
      }
      if (initialFilter.materiaId) {
        setFilterMateria(true);
        setSelectedMateriaId(initialFilter.materiaId);
      }
      if (initialFilter.topicoId) {
        setFilterTopico(true);
        setSelectedTopicoId(initialFilter.topicoId);
      }
      if (initialFilter.subtopicoId) {
        setFilterSubtopico(true);
        setSelectedSubtopico(initialFilter.subtopicoId);
      }
      setModalTab('ia');
      setIsModalOpen(true);
    }
  }, [initialFilter]);

  const handleVisualizarGabarito = async (simuladoId: string) => {
    let detalhe = await simuladoService.obterSimulado(simuladoId);
    if (!detalhe || !detalhe.questoes || detalhe.questoes.length === 0) {
      detalhe = obterSimuladoLocal(simuladoId);
    } else {
      salvarSimuladoLocal(detalhe);
    }

    if (!detalhe || !detalhe.questoes || detalhe.questoes.length === 0) {
      toast.error(
        'As questões deste simulado não puderam ser recuperadas para exibir o gabarito.',
        'Gabarito Indisponível'
      );
      return;
    }

    const novosResultados: Record<
      string,
      {
        acertou: boolean;
        alternativaEscolhidaId?: string;
        letraEscolhida?: string;
        alternativaCorretaId?: string;
        letraCorreta?: string;
        explicacaoGabarito?: string;
      }
    > = {};
    const novasRespostas: Record<string, string> = {};
    let totalAcertos = 0;

    detalhe.questoes.forEach((q) => {
      const corretaAlt = q.alternativas.find((a) => a.correta);
      const altCorretaId = q.alternativaCorretaId || corretaAlt?.id;
      const letraCorreta = q.letraCorreta || corretaAlt?.letra;

      let altEscolhida = q.alternativaEscolhidaId;
      if (!altEscolhida && respostas[q.id]) {
        altEscolhida = respostas[q.id];
      }
      if (altEscolhida) {
        novasRespostas[q.id] = altEscolhida;
      }

      const acertou =
        q.acertou !== undefined && q.acertou !== null
          ? q.acertou
          : altEscolhida
          ? altEscolhida === altCorretaId
          : false;

      if (acertou) {
        totalAcertos++;
      }

      novosResultados[q.id] = {
        acertou,
        alternativaEscolhidaId: altEscolhida,
        letraEscolhida:
          q.letraEscolhida ||
          (altEscolhida ? q.alternativas.find((a) => a.id === altEscolhida)?.letra : undefined),
        alternativaCorretaId: altCorretaId,
        letraCorreta: letraCorreta,
        explicacaoGabarito: q.explicacaoGabarito,
      };
    });

    setActiveSimulado(detalhe);
    setCurrentQuestionIndex(0);
    setRespostas(novasRespostas);
    setGabaritoResultados(novosResultados);
    setExamFinished(true);
    setExamResult({
      total: detalhe.questoes.length,
      acertos: totalAcertos,
      pct: Math.round((totalAcertos / (detalhe.questoes.length || 1)) * 100),
    });
    setTimerSeconds(0);
    setIsModalOpen(false);
  };

  const handleIniciarOuRepetirSimulado = async (simuladoId: string, forcarReinicio = false) => {
    // 1. Tenta carregar do cache local
    let detalhe = obterSimuladoLocal(simuladoId);

    // 2. Se não estiver no cache local ou se forçar reinício, busca na API
    if (!detalhe || !detalhe.questoes || detalhe.questoes.length === 0 || forcarReinicio) {
      detalhe = await simuladoService.obterSimulado(simuladoId);
      if (detalhe && detalhe.questoes && detalhe.questoes.length > 0) {
        salvarSimuladoLocal(detalhe);
      }
    }

    // 3. Validação defensiva para evitar qualquer tela branca
    if (!detalhe || !detalhe.questoes || detalhe.questoes.length === 0) {
      toast.error(
        'As questões deste simulado não puderam ser recuperadas no momento. Você pode gerar um novo simulado adaptativo a qualquer hora.',
        'Simulado Indisponível'
      );
      return;
    }

    // 4. Se o simulado já estiver concluído e não for um reinício forçado, exibe diretamente o gabarito
    if (detalhe.concluido && !forcarReinicio) {
      await handleVisualizarGabarito(simuladoId);
      return;
    }

    // 5. Inicia a prova com segurança
    setActiveSimulado(detalhe);
    setCurrentQuestionIndex(0);
    setRespostas({});
    setGabaritoResultados({});
    setExamFinished(false);
    setExamResult(null);
    setTimerSeconds(0);
    setIsModalOpen(false);
  };

  // Se um simulado específico foi solicitado diretamente (ex: vindo da tela de análise de lacunas)
  useEffect(() => {
    if (initialSimuladoId) {
      handleIniciarOuRepetirSimulado(initialSimuladoId);
    }
  }, [initialSimuladoId]);

  // Carrega plano detalhado com tópicos e subtópicos preservando seleções válidas
  useEffect(() => {
    if (selectedPlanoId) {
      planoService.obterPlanoPorId(selectedPlanoId).then((p) => {
        if (p) {
          setPlanoCarregado(p);
          if (p.materias && p.materias.length > 0) {
            setSelectedMateriaId((prev) => {
              const exists = p.materias.some((m) => m.id === prev);
              return exists ? prev : p.materias[0].id;
            });
            const allTopics = p.materias.flatMap((m) => m.topicos || []);
            if (allTopics.length > 0) {
              setSelectedTopicoId((prev) => {
                const exists = allTopics.some((t) => t.id === prev);
                return exists ? prev : allTopics[0].id;
              });
              const allSubs = allTopics.flatMap((t) => t.subtopicos || []);
              if (allSubs.length > 0) {
                setSelectedSubtopico((prev) => {
                  const exists = allSubs.some((s) => s.id === prev);
                  return exists ? prev : allSubs[0].id;
                });
              }
            }
          }
        }
      });
    }
  }, [selectedPlanoId]);

  // Plano ativo para cascata
  const currentPlano = planoCarregado || planosList.find((p) => p.id === selectedPlanoId) || plano;
  const materiasDisponiveis = currentPlano?.materias || [];
  const materiaSelecionada = materiasDisponiveis.find((m) => m.id === selectedMateriaId) || materiasDisponiveis[0];
  const topicosDisponiveis = materiaSelecionada?.topicos || [];
  const topicoSelecionado = topicosDisponiveis.find((t) => t.id === selectedTopicoId) || topicosDisponiveis[0];
  const subtopicosDisponiveis = topicoSelecionado?.subtopicos || [];
  const subtopicoSelecionado = subtopicosDisponiveis.find(
    (s) => s.id === selectedSubtopico || s.titulo.trim().toLowerCase() === selectedSubtopico.trim().toLowerCase()
  );

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const carregarSimulados = () => {
    simuladoService.listarSimulados().then((lista) => {
      setSimulados(lista);
      setLoading(false);
    });
  };

  const handleExcluirSimulado = (simuladoId: string, titulo: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Simulado',
      description: `Deseja realmente excluir o simulado "${titulo}"? As estatísticas e gabarito associados serão removidos.`,
      confirmLabel: 'Excluir Simulado',
      variant: 'danger',
      onConfirm: async () => {
        setIsConfirmLoading(true);
        try {
          const ok = await simuladoService.excluirSimulado(simuladoId);
          if (ok) {
            removerSimuladoLocal(simuladoId);
            setSimulados((prev) => prev.filter((s) => s.id !== simuladoId));
            toast.success('Simulado excluído com sucesso.');
          } else {
            toast.error('Erro ao excluir simulado. Tente novamente.');
          }
          setConfirmConfig(null);
        } catch {
          toast.error('Erro ao excluir simulado. Tente novamente.');
        } finally {
          setIsConfirmLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    carregarSimulados();
  }, []);

  // Timer for active exam
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeSimulado && !examFinished) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSimulado, examFinished]);

  const simuladoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (simuladoAbortRef.current) {
        simuladoAbortRef.current.abort();
        simuladoAbortRef.current = null;
      }
    };
  }, []);

  const handleCancelarGeracao = () => {
    if (simuladoAbortRef.current) {
      simuladoAbortRef.current.abort();
      simuladoAbortRef.current = null;
      toast.info('Geração de simulado cancelada.');
    }
    setGenerating(false);
  };

  const fecharModalOuCancelar = () => {
    if (generating) {
      handleCancelarGeracao();
    }
    setIsModalOpen(false);
  };

  const handleGerarSimulado = async () => {
    const controller = new AbortController();
    simuladoAbortRef.current = controller;
    setGenerating(true);
    try {
      let targetTopicoId: string | undefined = undefined;

      if (filterSubtopico && selectedSubtopico) {
        if (subtopicoSelecionado?.id && isUUID(subtopicoSelecionado.id)) {
          targetTopicoId = subtopicoSelecionado.id;
        } else if (isUUID(selectedSubtopico)) {
          targetTopicoId = selectedSubtopico;
        }
      }

      if (!targetTopicoId && filterTopico) {
        const topicoAlvoId = selectedTopicoId || topicoSelecionado?.id;
        if (topicoAlvoId && isUUID(topicoAlvoId)) {
          targetTopicoId = topicoAlvoId;
        }
      }

      const topicosParaEnvio: string[] = targetTopicoId ? [targetTopicoId] : [];
      const bancaFinal = isCustomBanca && customBanca.trim() ? customBanca.trim() : bancaAlvo;
      const qtdFinal = Math.max(3, Math.min(15, qtdQuestoes));

      let tituloDesejado: string | undefined = undefined;
      if (filterSubtopico && subtopicoSelecionado) {
        const mat = materiaSelecionada?.nome || 'Matéria';
        const top = topicoSelecionado?.titulo || 'Tópico';
        const sub = subtopicoSelecionado.titulo || 'Subtópico';
        tituloDesejado = `${mat} > ${top} > ${sub} (${bancaFinal})`;
      } else if (filterTopico && topicoSelecionado) {
        const mat = materiaSelecionada?.nome || 'Matéria';
        const top = topicoSelecionado.titulo || 'Tópico';
        tituloDesejado = `${mat} - ${top} (${bancaFinal})`;
      } else if (filterMateria && materiaSelecionada) {
        tituloDesejado = `${materiaSelecionada.nome} (${bancaFinal})`;
      } else if (currentPlano?.titulo) {
        tituloDesejado = `${currentPlano.titulo} - Geral (${bancaFinal})`;
      }

      const novo = await simuladoService.gerarSimuladoAdaptativo({
        planoEstudoId: selectedPlanoId,
        quantidadeQuestoes: qtdFinal,
        bancaAlvo: bancaFinal,
        topicoIds: topicosParaEnvio.length > 0 ? topicosParaEnvio : undefined,
        titulo: tituloDesejado,
      }, controller.signal);

      if (novo && novo.questoes && novo.questoes.length > 0) {
        salvarSimuladoLocal(novo);
        setIsModalOpen(false);
        carregarSimulados();
        setBannerNovoSimulado({
          id: novo.simuladoId,
          titulo: novo.titulo,
          totalQuestoes: novo.questoes.length,
        });
      } else {
        throw new Error('Nenhuma questão gerada.');
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      if (isQuotaExceededError(err)) {
        return;
      }
      toast.error('Erro ao gerar simulado com a IA. Tente novamente ou ajuste os filtros.');
    } finally {
      simuladoAbortRef.current = null;
      setGenerating(false);
    }
  };

  const handleSalvarQuestaoManual = async () => {
    if (!manualEnunciado.trim()) {
      toast.warning('Por favor, informe o enunciado da questão.');
      return;
    }

    const vazias = manualAlternativas.filter((a) => !a.texto.trim());
    if (vazias.length > 0) {
      toast.warning('Por favor, preencha o texto de todas as 5 alternativas (A a E).');
      return;
    }

    setSavingManual(true);
    try {
      await questaoService.criarQuestao({
        topicoId: selectedTopicoId || undefined,
        enunciado: manualEnunciado.trim(),
        dificuldade: manualDificuldade,
        banca: bancaAlvo,
        explicacaoGabarito: manualExplicacao.trim() || undefined,
        alternativas: manualAlternativas.map((alt) => ({
          letra: alt.letra,
          texto: alt.texto.trim(),
          correta: alt.letra === manualGabarito,
        })),
      });

      toast.success('Questão cadastrada com sucesso no acervo!');
      setManualEnunciado('');
      setManualExplicacao('');
      setManualAlternativas([
        { letra: 'A', texto: '' },
        { letra: 'B', texto: '' },
        { letra: 'C', texto: '' },
        { letra: 'D', texto: '' },
        { letra: 'E', texto: '' },
      ]);
      setIsModalOpen(false);
    } catch {
      toast.error('Erro ao cadastrar questão manual.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleSelectAlternativa = (questaoId: string, alternativaId: string) => {
    if (examFinished) return;
    setRespostas((prev) => ({
      ...prev,
      [questaoId]: alternativaId,
    }));
  };

  const handleConcluirExame = () => {
    if (!activeSimulado) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Finalizar e Submeter Simulado',
      description:
        'Deseja realmente finalizar o simulado e submeter todas as suas respostas? O resultado será computado e as proficiências dos tópicos serão calibradas.',
      confirmLabel: 'Finalizar Simulado',
      variant: 'info',
      onConfirm: async () => {
        setConfirmConfig(null);
        await executarConclusaoExame();
      },
    });
  };

  const executarConclusaoExame = async () => {
    if (!activeSimulado) return;

    let acertos = 0;
    const total = activeSimulado.questoes.length;
    const topicoStats: Record<string, { total: number; acertos: number; nome?: string }> = {};
    const novosResultados: Record<
      string,
      {
        acertou: boolean;
        alternativaEscolhidaId?: string;
        letraEscolhida?: string;
        alternativaCorretaId?: string;
        letraCorreta?: string;
        explicacaoGabarito?: string;
      }
    > = {};

    // Submete respostas para a API vinculando a questão ao seu tópico
    for (const q of activeSimulado.questoes) {
      const altEscolhida = respostas[q.id];
      const tId = q.topicoId;
      if (tId) {
        if (!topicoStats[tId]) {
          topicoStats[tId] = {
            total: 0,
            acertos: 0,
            nome: q.topicoReferencia || q.assuntoGeral,
          };
        }
        topicoStats[tId].total++;
      }
      if (altEscolhida) {
        const res = await simuladoService.responderQuestao(
          q.id,
          altEscolhida,
          activeSimulado.simuladoId,
          q.topicoId
        );
        const acertou = !!res?.acertou;
        if (acertou) {
          acertos++;
          if (tId) {
            topicoStats[tId].acertos++;
          }
        }
        novosResultados[q.id] = {
          acertou,
          alternativaEscolhidaId: res?.alternativaEscolhidaId || altEscolhida,
          letraEscolhida:
            res?.letraEscolhida || q.alternativas.find((a) => a.id === altEscolhida)?.letra,
          alternativaCorretaId: res?.alternativaCorretaId,
          letraCorreta: res?.letraCorreta,
          explicacaoGabarito: res?.explicacaoGabarito || q.explicacaoGabarito,
        };
      } else {
        const corretaAlt = q.alternativas.find((a) => a.correta);
        novosResultados[q.id] = {
          acertou: false,
          alternativaCorretaId: q.alternativaCorretaId || corretaAlt?.id,
          letraCorreta: q.letraCorreta || corretaAlt?.letra,
          explicacaoGabarito: q.explicacaoGabarito,
        };
      }
    }

    const conclusao = await simuladoService.concluirSimulado(activeSimulado.simuladoId);

    if (conclusao && Array.isArray(conclusao.questoes)) {
      conclusao.questoes.forEach((q) => {
        const corretaAlt = q.alternativas.find((a) => a.correta);
        const altCorretaId = q.alternativaCorretaId || corretaAlt?.id;
        const letraCorreta = q.letraCorreta || corretaAlt?.letra;
        const altEscolhida = q.alternativaEscolhidaId || respostas[q.id];

        novosResultados[q.id] = {
          acertou:
            q.acertou !== undefined && q.acertou !== null
              ? q.acertou
              : novosResultados[q.id]?.acertou ?? false,
          alternativaEscolhidaId: altEscolhida,
          letraEscolhida: q.letraEscolhida || novosResultados[q.id]?.letraEscolhida,
          alternativaCorretaId: altCorretaId || novosResultados[q.id]?.alternativaCorretaId,
          letraCorreta: letraCorreta || novosResultados[q.id]?.letraCorreta,
          explicacaoGabarito: q.explicacaoGabarito || novosResultados[q.id]?.explicacaoGabarito,
        };
      });

      const updatedSimulado: SimuladoDetalhe = {
        ...activeSimulado,
        concluido: true,
        questoes: conclusao.questoes,
      };
      setActiveSimulado(updatedSimulado);
      salvarSimuladoLocal(updatedSimulado);
    } else {
      const updatedSimulado: SimuladoDetalhe = {
        ...activeSimulado,
        concluido: true,
      };
      setActiveSimulado(updatedSimulado);
      salvarSimuladoLocal(updatedSimulado);
    }

    // Atualiza proficiência dos tópicos baseado no aproveitamento deste simulado
    const topicosAtualizados: Array<{
      topicoId: string;
      nome: string;
      total: number;
      acertos: number;
      pct: number;
      proficiencia: NivelProficiencia;
    }> = [];

    for (const [tId, stat] of Object.entries(topicoStats)) {
      if (stat.total > 0) {
        const taxa = Math.round((stat.acertos / stat.total) * 100);
        let novaProf: NivelProficiencia = 'INICIANTE';
        if (taxa >= 80) {
          novaProf = 'AVANCADO';
        } else if (taxa >= 50) {
          novaProf = 'INTERMEDIARIO';
        }

        await planoService.atualizarProgressoTopico(tId, {
          proficiencia: novaProf,
          nivelProficiencia: novaProf,
        });

        topicosAtualizados.push({
          topicoId: tId,
          nome: stat.nome || 'Tópico',
          total: stat.total,
          acertos: stat.acertos,
          pct: taxa,
          proficiencia: novaProf,
        });
      }
    }

    const pct = Math.round((acertos / total) * 100);
    setGabaritoResultados(novosResultados);
    setExamResult({ total, acertos, pct, topicos: topicosAtualizados });
    setExamFinished(true);
    carregarSimulados();

    if (onProficienciaAtualizada) {
      onProficienciaAtualizada();
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- MODO DE RESOLUÇÃO DO SIMULADO ATIVO ---
  if (activeSimulado) {
    if (!activeSimulado.questoes || activeSimulado.questoes.length === 0) {
      return (
        <div className="flex-1 h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 text-center text-zinc-900 dark:text-zinc-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold mb-2">Simulado sem questões disponíveis</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
            Não foram encontradas questões carregadas para este simulado. Você pode gerar um novo simulado adaptativo a qualquer momento.
          </p>
          <button
            onClick={() => setActiveSimulado(null)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Voltar para Meus Simulados
          </button>
        </div>
      );
    }

    const qAtual = activeSimulado.questoes[currentQuestionIndex] || activeSimulado.questoes[0];
    const totalQ = activeSimulado.questoes.length;

    return (
      <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans select-none">
        {/* Top Navigation Bar do Simulado */}
        {/* Top Navigation Bar do Simulado (2 linhas compactas no mobile, 1 linha no desktop) */}
        <div className="border-b-2 border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md p-3 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-2 sm:gap-4 sm:h-16">
          {/* Linha Superior (Mobile) / Lado Esquerdo (Desktop) */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={() => {
                if (examFinished) {
                  setActiveSimulado(null);
                  return;
                }
                setConfirmConfig({
                  isOpen: true,
                  title: 'Sair do Simulado em Andamento',
                  description:
                    'Deseja realmente sair do simulado em andamento? O progresso não finalizado poderá ser reiniciado.',
                  confirmLabel: 'Sair do Simulado',
                  variant: 'warning',
                  onConfirm: () => {
                    setConfirmConfig(null);
                    setActiveSimulado(null);
                  },
                });
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title={examFinished ? 'Voltar à Lista' : 'Sair do Simulado'}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0">
                <span className="truncate max-w-[200px] sm:max-w-md" title={activeSimulado.titulo}>
                  {activeSimulado.titulo}
                </span>
                {examFinished ? (
                  <span className="hidden sm:inline-flex text-[10px] font-mono bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-1.5 py-0.2 rounded-full font-semibold shrink-0">
                    Modo Gabarito
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex text-[10px] font-mono bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-1.5 py-0.2 rounded-full font-semibold shrink-0">
                    IA Adaptativa
                  </span>
                )}
              </h2>
              <div className="hidden sm:block text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Questão {currentQuestionIndex + 1} de {totalQ}
              </div>
            </div>

            {/* Timer no Mobile (fica no topo direito) */}
            <div className="flex sm:hidden items-center gap-1.5 px-2 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 shrink-0 font-bold">
              <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{formatTimer(timerSeconds)}</span>
            </div>
          </div>

          {/* Linha Inferior (Mobile) / Lado Direito (Desktop) */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 shrink-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60 pt-2 sm:pt-0">
            {/* Indicador de Questão no Mobile */}
            <div className="flex sm:hidden items-center gap-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 font-semibold">
              <span>Questão {currentQuestionIndex + 1} de {totalQ}</span>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                IA
              </span>
            </div>

            {/* Timer no Desktop */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{formatTimer(timerSeconds)}</span>
            </div>

            {!examFinished ? (
              <button
                onClick={handleConcluirExame}
                className="px-3.5 py-1.5 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finalizar</span>
                <span className="hidden sm:inline">Simulado</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveSimulado(null)}
                className="px-3.5 py-1.5 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
              >
                Voltar à Lista
              </button>
            )}
          </div>
        </div>

        {/* Exam Body Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Question Viewport */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 select-text">
            {examFinished && examResult && (
              <div className="p-6 rounded-3xl bg-emerald-950/30 border-2 border-emerald-500/30 flex flex-col gap-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Simulado Concluído com Sucesso!
                    </div>
                    <p className="text-xs text-zinc-300">
                      Você acertou <strong>{examResult.acertos}</strong> de <strong>{examResult.total}</strong> questões.
                    </p>
                  </div>
                  <div className="text-3xl font-mono font-bold text-emerald-400">
                    {examResult.pct}%
                  </div>
                </div>

                {/* Exibição dos tópicos com proficiência recalculada */}
                {examResult.topicos && examResult.topicos.length > 0 && (
                  <div className="pt-4 border-t border-emerald-500/20 space-y-2">
                    <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Atualização Automática de Proficiência por Tópico
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {examResult.topicos.map((top) => (
                        <div
                          key={top.topicoId}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs shadow-2xs"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-200 block truncate">{top.nome}</span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                              {top.acertos}/{top.total} acertos ({top.pct}%)
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase shrink-0 ${
                              top.proficiencia === 'AVANCADO'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : top.proficiencia === 'INTERMEDIARIO'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            }`}
                          >
                            {top.proficiencia}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {qAtual && (() => {
              const gabAtual = gabaritoResultados[qAtual.id];
              return (
                <div className="space-y-6">
                  {/* Banner de Status da Questão quando Concluído */}
                  {examFinished && (
                    <div
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 animate-in fade-in ${
                        gabAtual?.alternativaEscolhidaId
                          ? gabAtual.acertou
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {gabAtual?.alternativaEscolhidaId ? (
                          gabAtual.acertou ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                          )
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs sm:text-sm font-bold">
                            {gabAtual?.alternativaEscolhidaId
                              ? gabAtual.acertou
                                ? 'Você acertou esta questão!'
                                : 'Você errou esta questão.'
                              : 'Questão deixada em branco (não respondida).'}
                          </div>
                          <div className="text-[11px] opacity-90 mt-0.5">
                            {gabAtual?.letraEscolhida && (
                              <span>
                                Sua resposta:{' '}
                                <strong className="font-mono font-bold">
                                  ({gabAtual.letraEscolhida})
                                </strong>{' '}
                                •{' '}
                              </span>
                            )}
                            <span>
                              Gabarito oficial:{' '}
                              <strong className="font-mono font-bold">
                                (
                                {gabAtual?.letraCorreta ||
                                  qAtual.alternativas.find((a) => a.correta)?.letra ||
                                  qAtual.letraCorreta ||
                                  '-'}
                                )
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border uppercase shrink-0 ${
                          gabAtual?.alternativaEscolhidaId
                            ? gabAtual.acertou
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400'
                              : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400'
                        }`}
                      >
                        {gabAtual?.alternativaEscolhidaId
                          ? gabAtual.acertou
                            ? 'ACERTO'
                            : 'ERRO'
                          : 'EM BRANCO'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-medium">
                      {qAtual.banca || 'Banca Oficial'}
                    </span>
                    <span>•</span>
                    <span>{qAtual.assuntoGeral}</span>
                  </div>

                  <div className="text-sm md:text-base text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800/80 shadow-2xs">
                    {qAtual.enunciado}
                  </div>

                  {/* Alternativas */}
                  <div className="space-y-2.5">
                    {qAtual.alternativas.map((alt) => {
                      const isSelected =
                        respostas[qAtual.id] === alt.id ||
                        gabAtual?.alternativaEscolhidaId === alt.id;
                      const isCorretaOficial =
                        alt.id === gabAtual?.alternativaCorretaId ||
                        alt.letra === gabAtual?.letraCorreta ||
                        Boolean(alt.correta) ||
                        alt.id === qAtual.alternativaCorretaId ||
                        alt.letra === qAtual.letraCorreta;

                      let altClasses = '';
                      let badgeClasses = '';

                      if (examFinished) {
                        if (isCorretaOficial) {
                          altClasses =
                            'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-medium shadow-sm';
                          badgeClasses = 'bg-emerald-600 text-white';
                        } else if (isSelected && !isCorretaOficial) {
                          altClasses =
                            'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100 font-medium shadow-sm';
                          badgeClasses = 'bg-rose-600 text-white';
                        } else {
                          altClasses =
                            'opacity-60 bg-white/60 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800/60 text-zinc-600 dark:text-zinc-400';
                          badgeClasses = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
                        }
                      } else {
                        if (isSelected) {
                          altClasses =
                            'bg-indigo-50 dark:bg-indigo-600/15 border-indigo-500 text-indigo-950 dark:text-zinc-100 shadow-sm font-medium';
                          badgeClasses = 'bg-indigo-600 text-white shadow-xs';
                        } else {
                          altClasses =
                            'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-300';
                          badgeClasses = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400';
                        }
                      }

                      return (
                        <div
                          key={alt.id}
                          onClick={() => !examFinished && handleSelectAlternativa(qAtual.id, alt.id)}
                          className={`p-4 rounded-xl border-2 text-xs md:text-sm flex items-start gap-3 transition-all ${
                            !examFinished ? 'cursor-pointer' : 'cursor-default'
                          } ${altClasses}`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold shrink-0 text-xs ${badgeClasses}`}
                          >
                            {alt.letra}
                          </span>
                          <div className="pt-0.5 leading-relaxed flex-1">{alt.texto}</div>
                          {examFinished && isCorretaOficial && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400 text-[10px] font-bold uppercase shrink-0 flex items-center gap-1 self-center">
                              <Check className="w-3 h-3" /> Gabarito Oficial
                            </span>
                          )}
                          {examFinished && isSelected && !isCorretaOficial && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400 text-[10px] font-bold uppercase shrink-0 flex items-center gap-1 self-center">
                              <X className="w-3 h-3" /> Sua Resposta
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Comentário e Justificativa do Gabarito */}
                  {examFinished && (gabAtual?.explicacaoGabarito || qAtual.explicacaoGabarito) && (
                    <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-200/80 dark:border-indigo-800/60 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Comentário & Justificativa do Gabarito</span>
                      </div>
                      <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line bg-white/60 dark:bg-zinc-900/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        {gabAtual?.explicacaoGabarito || qAtual.explicacaoGabarito}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bottom Question Controls */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-zinc-200 dark:border-zinc-800 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Questão Anterior
              </button>

              <button
                type="button"
                disabled={currentQuestionIndex === totalQ - 1}
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-zinc-200 dark:border-zinc-800 shadow-2xs cursor-pointer"
              >
                Próxima Questão <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Question Palette Drawer */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l-2 border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/60 p-5 space-y-4 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-bold">
                {examFinished ? 'Gabarito Final' : 'Gabarito do Simulado'}
              </div>
              {examFinished && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold">
                  {Math.round(
                    (Object.values(gabaritoResultados).filter((g) => g.acertou).length / totalQ) *
                      100
                  )}
                  % acertos
                </span>
              )}
            </div>

            {/* Resumo de Acertos / Erros / Em branco no topo da paleta quando finalizado */}
            {examFinished && (
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
                <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Acertos
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {Object.values(gabaritoResultados).filter((g) => g.acertou).length}
                  </div>
                </div>
                <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80">
                  <div className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold">
                    Erros
                  </div>
                  <div className="text-sm font-bold font-mono text-rose-700 dark:text-rose-300">
                    {
                      Object.values(gabaritoResultados).filter(
                        (g) => g.alternativaEscolhidaId && !g.acertou
                      ).length
                    }
                  </div>
                </div>
                <div className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
                    Em branco
                  </div>
                  <div className="text-sm font-bold font-mono text-zinc-600 dark:text-zinc-300">
                    {totalQ -
                      Object.values(gabaritoResultados).filter((g) => g.alternativaEscolhidaId)
                        .length}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2">
              {activeSimulado.questoes.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const gItem = gabaritoResultados[q.id];
                const isRespondida = !!respostas[q.id] || !!gItem?.alternativaEscolhidaId;

                let btnClass = '';

                if (examFinished) {
                  if (gItem?.alternativaEscolhidaId) {
                    if (gItem.acertou) {
                      btnClass = isCurrent
                        ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 shadow-sm'
                        : 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600 hover:bg-emerald-500/30';
                    } else {
                      btnClass = isCurrent
                        ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400 shadow-sm'
                        : 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-600 hover:bg-rose-500/30';
                    }
                  } else {
                    btnClass = isCurrent
                      ? 'bg-zinc-600 text-white border-zinc-700 ring-2 ring-zinc-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-300 dark:border-zinc-700';
                  }
                } else {
                  if (isCurrent) {
                    btnClass = 'border-indigo-500 ring-2 ring-indigo-500/40 text-white bg-indigo-600';
                  } else if (isRespondida) {
                    btnClass =
                      'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200';
                  } else {
                    btnClass =
                      'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300';
                  }
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-semibold flex items-center justify-center border transition-all cursor-pointer ${btnClass}`}
                    title={`Questão ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legenda quando finalizado */}
            {examFinished && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300">Legenda:</div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                  <span>Acertou questão</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-rose-500 shrink-0" />
                  <span>Errou questão</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                  <span>Não respondida</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Confirmação para Finalização/Saída do Simulado */}
        {confirmConfig && (
          <ConfirmModal
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            description={confirmConfig.description}
            confirmLabel={confirmConfig.confirmLabel}
            variant={confirmConfig.variant}
            isLoading={isConfirmLoading}
            onConfirm={confirmConfig.onConfirm}
            onClose={() => {
              if (!isConfirmLoading) setConfirmConfig(null);
            }}
          />
        )}
      </div>
    );
  }

  // --- MODO DE LISTAGEM DE HISTÓRICO DE SIMULADOS ---
  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-y-auto select-none font-sans p-6 sm:p-8 space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5 font-medium">
            <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Módulo de Provas & Questões Inéditas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Simulados Adaptativos & Provas IA
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Gere provas personalizadas com foco no edital completo, matéria, tópico ou subtópico específico com limites inteligentes de questões.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalTab('ia');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Novo Simulado Personalizado</span>
        </button>
      </div>

      {/* Banner de Simulado Recém-Criado */}
      {bannerNovoSimulado && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Simulado gerado com sucesso!
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                "{bannerNovoSimulado.titulo}" ({bannerNovoSimulado.totalQuestoes} questões) já está disponível abaixo para ser realizado quando você preferir.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                handleIniciarOuRepetirSimulado(bannerNovoSimulado.id);
                setBannerNovoSimulado(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Iniciar Agora</span>
            </button>
            <button
              type="button"
              onClick={() => setBannerNovoSimulado(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid de Simulados (Meus Simulados) */}
      <div className="space-y-4">
        {/* Header com Filtros de Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Meus Simulados
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Inicie simulados gerados ou repita provas já realizadas para fixar o aprendizado.
            </p>
          </div>

          {/* Segmented Control / Filtro de Status */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            {(() => {
              const countPendentes = simulados.filter((s) => !s.concluido && s.totalQuestoesRespondidas === 0).length;
              const countConcluidos = simulados.filter((s) => s.concluido || s.totalQuestoesRespondidas > 0).length;

              return (
                <>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('TODOS')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filtroStatus === 'TODOS'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Todos ({simulados.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('PENDENTES')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filtroStatus === 'PENDENTES'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Em Aberto ({countPendentes})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('CONCLUIDOS')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filtroStatus === 'CONCLUIDOS'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Concluídos ({countConcluidos})
                  </button>
                </>
              );
            })()}
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (() => {
          const pendentes = simulados.filter((s) => !s.concluido && s.totalQuestoesRespondidas === 0);
          const concluidos = simulados.filter((s) => s.concluido || s.totalQuestoesRespondidas > 0);
          const listaExibida =
            filtroStatus === 'PENDENTES'
              ? pendentes
              : filtroStatus === 'CONCLUIDOS'
              ? concluidos
              : simulados;

          if (simulados.length === 0) {
            return (
              <div className="text-center py-16 space-y-3 rounded-3xl bg-white dark:bg-zinc-900/30 border-2 border-dashed border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mx-auto flex items-center justify-center text-zinc-500">
                  <Award className="w-6 h-6" />
                </div>
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Nenhum simulado criado ainda.</div>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('ia');
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Gerar Primeiro Simulado com IA
                </button>
              </div>
            );
          }

          if (listaExibida.length === 0) {
            return (
              <div className="text-center py-12 space-y-2 rounded-2xl bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Nenhum simulado encontrado com o filtro selecionado ({filtroStatus === 'PENDENTES' ? 'Em Aberto' : 'Concluídos'}).
                </div>
                <button
                  type="button"
                  onClick={() => setFiltroStatus('TODOS')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Ver todos os simulados
                </button>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listaExibida.map((sim) => {
                const isPendente = !sim.concluido && sim.totalQuestoesRespondidas === 0;
                const indicativos = extrairIndicativosSimulado(sim);

                return (
                  <div
                    key={sim.id}
                    className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/90 space-y-4 flex flex-col justify-between shadow-2xs transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold">
                            {sim.tipo === 'ADAPTATIVO_IA' ? 'Adaptativo IA' : 'Manual'}
                          </span>
                          {isPendente ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-semibold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              Em Aberto
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              Concluído
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-zinc-500 dark:text-zinc-400">{new Date(sim.criadoEm).toLocaleDateString()}</span>
                          <button
                            type="button"
                            onClick={() => handleExcluirSimulado(sim.id, sim.titulo)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Excluir simulado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Título do Simulado */}
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                          {sim.titulo}
                        </h4>
                      </div>

                      {/* Indicativos de Assunto, Matéria, Tópico e Banca */}
                      {(indicativos.assuntos.length > 0 || indicativos.topicos.length > 0 || indicativos.banca) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {indicativos.assuntos.map((assunto, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[10px] font-medium flex items-center gap-1 max-w-full"
                              title="Matéria / Assunto Geral"
                            >
                              <BookOpen className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              <span className="truncate">{assunto}</span>
                            </span>
                          ))}
                          {indicativos.topicos.map((topico, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium flex items-center gap-1 max-w-full"
                              title="Tópico / Subtópico"
                            >
                              <Layers className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                              <span className="truncate">{topico}</span>
                            </span>
                          ))}
                          {indicativos.banca && (
                            <span
                              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/80 text-[10px] font-mono"
                              title="Banca Alvo"
                            >
                              {indicativos.banca}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t-2 border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                      {isPendente ? (
                        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                          Aguardando resolução
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                          Acertos: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{sim.percentualAcerto}%</strong>
                        </div>
                      )}

                      {isPendente ? (
                        <button
                          type="button"
                          onClick={() => handleIniciarOuRepetirSimulado(sim.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Iniciar Simulado</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVisualizarGabarito(sim.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ver Gabarito</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleIniciarOuRepetirSimulado(sim.id, true)}
                            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-medium flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                            title="Refazer simulado do início"
                          >
                            <RotateCcw className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Refazer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* MODAL CONFIGURADOR DE SIMULADO & QUESTÕES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Novo Simulado / Acervo de Questões
                </h3>
              </div>
              <button
                type="button"
                onClick={fecharModalOuCancelar}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Control de Abas do Modal */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 gap-1">
              <button
                type="button"
                onClick={() => setModalTab('ia')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  modalTab === 'ia'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Gerar com IA (Escopo Cascata)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('manual')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  modalTab === 'manual'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Adicionar Questão Manual</span>
              </button>
            </div>

            {/* ABA 1: GERAR COM IA (ESCOPO CASCATA) */}
            {modalTab === 'ia' ? (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {/* 1. Seleção do Edital / Plano de Estudo */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1.5 font-semibold">
                    1. Plano de Estudo / Edital Alvo:
                  </label>
                  <select
                    value={selectedPlanoId}
                    onChange={(e) => {
                      setSelectedPlanoId(e.target.value);
                      setFilterMateria(false);
                      setSelectedMateriaId('');
                      setFilterTopico(false);
                      setSelectedTopicoId('');
                      setFilterSubtopico(false);
                      setSelectedSubtopico('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {planosList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} ({p.cargoAlvo || 'Geral'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Bloco de Marcação: Matéria Específica */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterMateria}
                      onChange={(e) => {
                        setFilterMateria(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedMateriaId('');
                          setFilterTopico(false);
                          setSelectedTopicoId('');
                          setFilterSubtopico(false);
                          setSelectedSubtopico('');
                        } else if (materiasDisponiveis.length > 0) {
                          setSelectedMateriaId(materiasDisponiveis[0].id);
                        }
                      }}
                      className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Selecionar matéria específica (Focar em uma disciplina)
                    </span>
                  </label>

                  {filterMateria && (
                    <div className="pt-2 animate-in fade-in">
                      <select
                        value={selectedMateriaId}
                        onChange={(e) => {
                          setSelectedMateriaId(e.target.value);
                          setFilterTopico(false);
                          setSelectedTopicoId('');
                          setFilterSubtopico(false);
                          setSelectedSubtopico('');
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {materiasDisponiveis.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} ({m.topicos?.length || 0} tópicos)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 3. Bloco de Marcação: Tópico Específico */}
                {filterMateria && selectedMateriaId && (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterTopico}
                        onChange={(e) => {
                          setFilterTopico(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedTopicoId('');
                            setFilterSubtopico(false);
                            setSelectedSubtopico('');
                          } else if (topicosDisponiveis.length > 0) {
                            setSelectedTopicoId(topicosDisponiveis[0].id);
                          }
                        }}
                        className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Selecionar tópico específico (Focar em um assunto da matéria)
                      </span>
                    </label>

                    {filterTopico && (
                      <div className="pt-2 animate-in fade-in">
                        <select
                          value={selectedTopicoId}
                          onChange={(e) => {
                            setSelectedTopicoId(e.target.value);
                            setFilterSubtopico(false);
                            setSelectedSubtopico('');
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          {topicosDisponiveis.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.titulo} (Peso {t.peso})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Bloco de Marcação: Subtópico Específico */}
                {filterTopico && selectedTopicoId && subtopicosDisponiveis.length > 0 && (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterSubtopico}
                        onChange={(e) => {
                          setFilterSubtopico(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedSubtopico('');
                          } else if (subtopicosDisponiveis.length > 0) {
                            setSelectedSubtopico(subtopicosDisponiveis[0].id);
                          }
                        }}
                        className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Selecionar subtópico específico (Foco cirúrgico)
                      </span>
                    </label>

                    {filterSubtopico && (
                      <div className="pt-2 animate-in fade-in">
                        <select
                          value={subtopicoSelecionado?.id || selectedSubtopico}
                          onChange={(e) => setSelectedSubtopico(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          {subtopicosDisponiveis.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.titulo}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Banca Alvo com opção de Outra Banca personalizada */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold">
                      Banca Avaliadora Alvo:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomBanca(!isCustomBanca)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline font-mono cursor-pointer"
                    >
                      {isCustomBanca ? '← Selecionar da lista padrão' : '+ Outra banca específica'}
                    </button>
                  </div>

                  {!isCustomBanca ? (
                    <select
                      value={bancaAlvo}
                      onChange={(e) => {
                        if (e.target.value === 'OUTRA') {
                          setIsCustomBanca(true);
                        } else {
                          setBancaAlvo(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="CESPE / Cebraspe">CESPE / Cebraspe (Estilo Certo/Errado & Múltipla Escolha)</option>
                      <option value="Fundação Getulio Vargas (FGV)">Fundação Getulio Vargas (FGV)</option>
                      <option value="Fundação Carlos Chagas (FCC)">Fundação Carlos Chagas (FCC)</option>
                      <option value="Vunesp">Vunesp</option>
                      <option value="Cesgranrio">Fundação Cesgranrio</option>
                      <option value="Instituto AOCP">Instituto AOCP</option>
                      <option value="IDECAN">IDECAN</option>
                      <option value="IBFC">IBFC</option>
                      <option value="Quadrix">Instituto Quadrix</option>
                      <option value="OUTRA">Outra Banca (Digitar nome personalizado)...</option>
                    </select>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in">
                      <input
                        type="text"
                        value={customBanca}
                        onChange={(e) => setCustomBanca(e.target.value)}
                        placeholder="Digite o nome da banca (Ex: IDECAN, FUNCERN, FUMARC...)"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-indigo-500 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none placeholder:text-zinc-400"
                        autoFocus
                      />
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">
                        A IA calibrará o estilo, vocabulário e padrão de pegadinhas desta banca informada.
                      </span>
                    </div>
                  )}
                </div>

                {/* Slider e Input de Quantidade com Regra de Limite */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 font-semibold">
                    <span>Quantidade de Questões:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      Máximo: {maxQuestoes} questões para este escopo
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={3}
                      max={maxQuestoes}
                      value={qtdQuestoes}
                      onChange={(e) => setQtdQuestoes(parseInt(e.target.value, 10))}
                      className="flex-1 accent-indigo-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={3}
                      max={maxQuestoes}
                      value={qtdQuestoes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 3;
                        setQtdQuestoes(Math.max(3, Math.min(maxQuestoes, val)));
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-center text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200">
                  {filterSubtopico
                    ? `Foco cirúrgico em: "${subtopicoSelecionado?.titulo || selectedSubtopico || 'Subtópico específico'}". Até ${maxQuestoes} questões.`
                    : filterTopico
                    ? `Foco temático no tópico "${topicoSelecionado?.titulo || 'selecionado'}". Até ${maxQuestoes} questões.`
                    : filterMateria
                    ? `Foco em toda a matéria "${materiaSelecionada?.nome || 'selecionada'}". Até ${maxQuestoes} questões.`
                    : `Edital completo: todas as disciplinas do plano. Até ${maxQuestoes} questões.`}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={fecharModalOuCancelar}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={generating ? handleCancelarGeracao : handleGerarSimulado}
                    className={
                      generating
                        ? 'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer animate-pulse'
                        : 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer'
                    }
                  >
                    {generating ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelar Geração</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Iniciar Simulado ({qtdQuestoes} Questões)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ABA 2: CADASTRO MANUAL DE QUESTÃO */
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1.5 font-semibold">
                    Enunciado da Questão:
                  </label>
                  <textarea
                    rows={3}
                    value={manualEnunciado}
                    onChange={(e) => setManualEnunciado(e.target.value)}
                    placeholder="Digite o enunciado completo da questão..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1.5 font-semibold">
                    Dificuldade Estimada:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['FACIL', 'MEDIA', 'DIFICIL'] as const).map((dif) => (
                      <button
                        key={dif}
                        type="button"
                        onClick={() => setManualDificuldade(dif)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          manualDificuldade === dif
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {dif === 'FACIL' ? 'Fácil' : dif === 'MEDIA' ? 'Média' : 'Difícil'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alternativas A a E */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1 font-semibold">
                    Alternativas (Selecione a Correta no rádio):
                  </label>
                  {manualAlternativas.map((alt, idx) => (
                    <div key={alt.letra} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="gabaritoCorreto"
                        checked={manualGabarito === alt.letra}
                        onChange={() => setManualGabarito(alt.letra)}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        title="Marcar como gabarito correto"
                      />
                      <span className="w-6 font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        {alt.letra})
                      </span>
                      <input
                        type="text"
                        value={alt.texto}
                        onChange={(e) => {
                          const novoTexto = e.target.value;
                          setManualAlternativas((prev) =>
                            prev.map((a, i) => (i === idx ? { ...a, texto: novoTexto } : a))
                          );
                        }}
                        placeholder={`Texto da alternativa ${alt.letra}...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1.5 font-semibold">
                    Gabarito Comentado / Justificativa Pedagógica (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={manualExplicacao}
                    onChange={(e) => setManualExplicacao(e.target.value)}
                    placeholder="Explique a fundamentação da alternativa correta..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={savingManual}
                    onClick={handleSalvarQuestaoManual}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar no Acervo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Simulado */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant={confirmConfig.variant}
          isLoading={isConfirmLoading}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => {
            if (!isConfirmLoading) setConfirmConfig(null);
          }}
        />
      )}
    </div>
  );
};

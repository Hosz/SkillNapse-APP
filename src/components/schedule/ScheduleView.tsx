import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  RotateCcw,
  Coffee,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Sparkles,
  Brain,
  Loader2,
  AlertCircle,
  Layers,
  Play,
  RotateCw,
  Target,
  Edit2,
  CalendarCheck,
} from 'lucide-react';
import type { BlocoCronograma, DiaSemana, TipoBloco, PlanoEstudo, Topico } from '../../types';
import { cronogramaService, planoService } from '../../services';
import { ConfirmModal } from '../common/ConfirmModal';
import { DailyScheduleView } from './DailyScheduleView';
import { useToast } from '../../context/useToast';
import type {
  EstrategiaAgendamento,
  SugestaoAutoAgendamentoResponse,
  JanelaDisponibilidade,
} from '../../services/cronogramaService';

interface GrupoTopico {
  raiz: Topico;
  subtopicos: Array<{ id: string; titulo: string; nivel: number }>;
}

function agruparTopicosPorRaiz(topicos?: Topico[]): GrupoTopico[] {
  if (!topicos || topicos.length === 0) return [];

  // 1. Caso os tópicos já venham aninhados com o campo subtopicos preenchido
  const temSubtopicosAninhados = topicos.some((t) => t.subtopicos && t.subtopicos.length > 0);

  if (temSubtopicosAninhados) {
    const achatarFilhos = (lista: Topico[], nivel = 1): Array<{ id: string; titulo: string; nivel: number }> => {
      const res: Array<{ id: string; titulo: string; nivel: number }> = [];
      for (const item of lista) {
        res.push({ id: item.id, titulo: item.titulo, nivel });
        if (item.subtopicos && item.subtopicos.length > 0) {
          res.push(...achatarFilhos(item.subtopicos, nivel + 1));
        }
      }
      return res;
    };

    return topicos.map((raiz) => ({
      raiz,
      subtopicos: raiz.subtopicos ? achatarFilhos(raiz.subtopicos, 1) : [],
    }));
  }

  // 2. Caso seja uma lista plana com topicoPaiId
  const mapaPorPai = new Map<string | null, Topico[]>();
  topicos.forEach((t) => {
    const pai = t.topicoPaiId || null;
    if (!mapaPorPai.has(pai)) mapaPorPai.set(pai, []);
    mapaPorPai.get(pai)!.push(t);
  });

  const raizes = mapaPorPai.get(null) || [];
  raizes.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const coletarDescendentes = (paiId: string, nivel = 1): Array<{ id: string; titulo: string; nivel: number }> => {
    const filhos = mapaPorPai.get(paiId) || [];
    filhos.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const res: Array<{ id: string; titulo: string; nivel: number }> = [];
    for (const f of filhos) {
      res.push({ id: f.id, titulo: f.titulo, nivel });
      res.push(...coletarDescendentes(f.id, nivel + 1));
    }
    return res;
  };

  const grupos: GrupoTopico[] = raizes.map((raiz) => ({
    raiz,
    subtopicos: coletarDescendentes(raiz.id, 1),
  }));

  // Fallback para órfãos sem pai na lista
  const idsJaColetados = new Set<string>();
  grupos.forEach((g) => {
    idsJaColetados.add(g.raiz.id);
    g.subtopicos.forEach((s) => idsJaColetados.add(s.id));
  });

  const orfaos = topicos.filter((t) => !idsJaColetados.has(t.id));
  if (orfaos.length > 0) {
    orfaos.forEach((o) => {
      grupos.push({
        raiz: o,
        subtopicos: [],
      });
    });
  }

  return grupos;
}

interface ScheduleViewProps {
  plano?: PlanoEstudo | null;
  planos?: PlanoEstudo[];
  onStartStudyTopic?: (materiaId?: string, topicoId?: string) => void;
  onStartSimulado?: (params: { planoId?: string; materiaId?: string; topicoId?: string }) => void;
  onStartFlashcards?: (params: {
    planoId?: string;
    materiaId?: string;
    topicoId?: string;
    materiaNome?: string;
    topicoNome?: string;
  }) => void;
}

interface DiaDisponibilidadeState {
  dia: DiaSemana;
  ativo: boolean;
  horaInicio: string;
  horaFim: string;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  plano,
  planos = [],
  onStartStudyTopic,
  onStartSimulado,
  onStartFlashcards,
}) => {
  const toast = useToast();
  const [modoVisao, setModoVisao] = useState<'diaria' | 'semanal'>('diaria');
  const [selectedDay, setSelectedDay] = useState<DiaSemana>('SEGUNDA');
  const [cronograma, setCronograma] = useState<BlocoCronograma[]>([]);
  const [selectedBloco, setSelectedBloco] = useState<BlocoCronograma | null>(null);
  const [loadingGrade, setLoadingGrade] = useState(true);

  // Modal Manual Adição
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [novoPlanoId, setNovoPlanoId] = useState<string>('');
  const [novoDia, setNovoDia] = useState<DiaSemana>('SEGUNDA');
  const [horaInicio, setHoraInicio] = useState('14:00');
  const [horaFim, setHoraFim] = useState('15:30');
  const [tipoBloco, setTipoBloco] = useState<TipoBloco>('FOCO_TEORIA');
  const [tituloBloco, setTituloBloco] = useState('');
  const [novoMateriaId, setNovoMateriaId] = useState<string>('');
  const [novoTopicoId, setNovoTopicoId] = useState<string>('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Modal Manual Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [blocoEditando, setBlocoEditando] = useState<BlocoCronograma | null>(null);
  const [editPlanoId, setEditPlanoId] = useState<string>('');
  const [editDia, setEditDia] = useState<DiaSemana>('SEGUNDA');
  const [editHoraInicio, setEditHoraInicio] = useState('14:00');
  const [editHoraFim, setEditHoraFim] = useState('15:30');
  const [editTipoBloco, setEditTipoBloco] = useState<TipoBloco>('FOCO_TEORIA');
  const [editTituloBloco, setEditTituloBloco] = useState('');
  const [editMateriaId, setEditMateriaId] = useState<string>('');
  const [editTopicoId, setEditTopicoId] = useState<string>('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  // Modal IA Auto-Agendamento
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiStep, setAiStep] = useState<'config' | 'preview'>('config');
  const [planosDisponiveis, setPlanosDisponiveis] = useState<PlanoEstudo[]>([]);
  const [selectedPlanoId, setSelectedPlanoId] = useState<string>('');

  // Resolução de Matérias e Tópicos estritamente por Árvore / Plano de Estudo selecionado
  const planoSelecionadoNovo =
    planosDisponiveis.find((p) => p.id === novoPlanoId) ||
    planosDisponiveis.find((p) => p.id === selectedPlanoId) ||
    plano ||
    planosDisponiveis[0] ||
    null;
  const materiasDoPlanoNovo = planoSelecionadoNovo?.materias || [];
  const materiaSelecionadaNovo = materiasDoPlanoNovo.find((m) => m.id === novoMateriaId);
  const gruposTopicosNovo = materiaSelecionadaNovo ? agruparTopicosPorRaiz(materiaSelecionadaNovo.topicos) : [];

  const planoSelecionadoEdit =
    planosDisponiveis.find((p) => p.id === editPlanoId) ||
    planosDisponiveis.find((p) => p.id === selectedPlanoId) ||
    plano ||
    planosDisponiveis[0] ||
    null;
  const materiasDoPlanoEdit = planoSelecionadoEdit?.materias || [];
  const materiaSelecionadaEdit = materiasDoPlanoEdit.find((m) => m.id === editMateriaId);
  const gruposTopicosEdit = materiaSelecionadaEdit ? agruparTopicosPorRaiz(materiaSelecionadaEdit.topicos) : [];

  const [disponibilidades, setDisponibilidades] = useState<DiaDisponibilidadeState[]>([
    { dia: 'SEGUNDA', ativo: true, horaInicio: '19:00', horaFim: '22:00' },
    { dia: 'TERCA', ativo: true, horaInicio: '19:00', horaFim: '22:00' },
    { dia: 'QUARTA', ativo: true, horaInicio: '19:00', horaFim: '22:00' },
    { dia: 'QUINTA', ativo: true, horaInicio: '19:00', horaFim: '22:00' },
    { dia: 'SEXTA', ativo: true, horaInicio: '19:00', horaFim: '22:00' },
    { dia: 'SABADO', ativo: true, horaInicio: '08:00', horaFim: '12:00' },
    { dia: 'DOMINGO', ativo: false, horaInicio: '08:00', horaFim: '12:00' },
  ]);

  const [duracaoBlocoMinutos, setDuracaoBlocoMinutos] = useState<number>(50);
  const [intervaloDescansoMinutos, setIntervaloDescansoMinutos] = useState<number>(10);
  const [incluirRevisao, setIncluirRevisao] = useState<boolean>(true);
  const [incluirSimulado, setIncluirSimulado] = useState<boolean>(true);
  const [estrategia, setEstrategia] = useState<EstrategiaAgendamento>('FOCO_PESO_EDITAL');
  const [instrucoesPersonalizadas, setInstrucoesPersonalizadas] = useState<string>('');

  const [isGerandoSugestao, setIsGerandoSugestao] = useState(false);
  const [isAplicandoSugestao, setIsAplicandoSugestao] = useState(false);
  const [sugestaoCronograma, setSugestaoCronograma] = useState<SugestaoAutoAgendamentoResponse | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const carregarGrade = async (diaAlvo?: DiaSemana, blocoIdAlvo?: string) => {
    setLoadingGrade(true);
    try {
      const grade = await cronogramaService.obterGradeSemanal();
      if (grade && grade.length > 0) {
        setCronograma(grade);
        if (diaAlvo) {
          setSelectedDay(diaAlvo);
        }
        const blocoAlvo = blocoIdAlvo ? grade.find((b) => b.id === blocoIdAlvo) : null;
        setSelectedBloco(blocoAlvo || null);
      } else {
        setCronograma([]);
        setSelectedBloco(null);
      }
    } catch {
      setCronograma([]);
    } finally {
      setLoadingGrade(false);
    }
  };

  useEffect(() => {
    carregarGrade();
  }, []);

  const handleSelectDay = (dia: DiaSemana) => {
    setSelectedDay(dia);
    setSelectedBloco(null);
  };

  // Carrega lista de planos disponíveis para o seletor da IA
  useEffect(() => {
    if (planos && planos.length > 0) {
      setPlanosDisponiveis(planos);
      setSelectedPlanoId(plano?.id || planos[0].id);
    } else {
      planoService.listarPlanos().then((todos) => {
        if (todos && todos.length > 0) {
          setPlanosDisponiveis(todos);
          setSelectedPlanoId(plano?.id || todos[0].id);
        }
      });
    }
  }, [plano, planos]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const calcularDuracaoMinutos = (inicio: string, fim: string) => {
    try {
      const [h1, m1] = inicio.split(':').map(Number);
      const [h2, m2] = fim.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      return diff > 0 ? diff : 60;
    } catch {
      return 60;
    }
  };

  const handleStartStudy = (bloco: BlocoCronograma) => {
    switch (bloco.tipoBloco) {
      case 'SIMULADO':
        onStartSimulado?.({
          planoId: plano?.id,
          materiaId: bloco.materiaId,
          topicoId: bloco.topicoId,
        });
        break;
      case 'REVISAO':
        onStartFlashcards?.({
          planoId: plano?.id,
          materiaId: bloco.materiaId,
          topicoId: bloco.topicoId,
          materiaNome: bloco.materiaNome,
          topicoNome: bloco.topicoTitulo,
        });
        break;
      case 'FOCO_TEORIA':
      default:
        onStartStudyTopic?.(bloco.materiaId, bloco.topicoId);
        break;
    }
  };

  const days: { id: DiaSemana; label: string; short: string }[] = [
    { id: 'SEGUNDA', label: 'Segunda-feira', short: 'Seg' },
    { id: 'TERCA', label: 'Terça-feira', short: 'Ter' },
    { id: 'QUARTA', label: 'Quarta-feira', short: 'Qua' },
    { id: 'QUINTA', label: 'Quinta-feira', short: 'Qui' },
    { id: 'SEXTA', label: 'Sexta-feira', short: 'Sex' },
    { id: 'SABADO', label: 'Sábado', short: 'Sáb' },
    { id: 'DOMINGO', label: 'Domingo', short: 'Dom' },
  ];

  const blocosDoDia = cronograma.filter((b) => b.diaSemana === selectedDay);

  const getTipoBlocoMeta = (tipo: TipoBloco) => {
    switch (tipo) {
      case 'FOCO_TEORIA':
        return {
          label: 'Teoria & Aprofundamento',
          color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
          icon: BookOpen,
        };
      case 'REVISAO':
        return {
          label: 'Revisão Espaçada',
          color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
          icon: RotateCcw,
        };
      case 'SIMULADO':
        return {
          label: 'Simulado & Questões',
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
          icon: CheckCircle2,
        };
      case 'DESCANSO':
        return {
          label: 'Descanso Sináptico',
          color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/60',
          icon: Coffee,
        };
    }
  };

  // Preset rápido de turnos
  const handleApplyPreset = (tipo: 'noite' | 'manha' | 'integral') => {
    setDisponibilidades((prev) =>
      prev.map((d) => {
        if (tipo === 'noite') {
          return {
            ...d,
            ativo: d.dia !== 'DOMINGO',
            horaInicio: d.dia === 'SABADO' ? '08:00' : '19:00',
            horaFim: d.dia === 'SABADO' ? '12:00' : '22:00',
          };
        }
        if (tipo === 'manha') {
          return {
            ...d,
            ativo: d.dia !== 'DOMINGO',
            horaInicio: '08:00',
            horaFim: '12:00',
          };
        }
        // Integral
        return {
          ...d,
          ativo: d.dia !== 'DOMINGO',
          horaInicio: '08:00',
          horaFim: '18:00',
        };
      })
    );
  };

  const handleGerarCronogramaIA = async () => {
    if (!selectedPlanoId) {
      setAiErrorMessage('Por favor, selecione um plano de estudos para basear a inteligência pedagógica.');
      return;
    }

    const janelasAtivas: JanelaDisponibilidade[] = disponibilidades
      .filter((d) => d.ativo)
      .map((d) => ({
        diaSemana: d.dia,
        horaInicio: d.horaInicio,
        horaFim: d.horaFim,
      }));

    if (janelasAtivas.length === 0 && !instrucoesPersonalizadas.trim()) {
      setAiErrorMessage('Selecione ao menos um dia da semana para estudar ou descreva sua rotina na caixa de texto.');
      return;
    }

    setIsGerandoSugestao(true);
    setAiErrorMessage(null);

    try {
      const sugestao = await cronogramaService.gerarSugestaoAutoAgendamento({
        planoEstudoId: selectedPlanoId,
        disponibilidades:
          janelasAtivas.length > 0
            ? janelasAtivas
            : [
                { diaSemana: 'SEGUNDA', horaInicio: '19:00', horaFim: '22:00' },
                { diaSemana: 'TERCA', horaInicio: '19:00', horaFim: '22:00' },
                { diaSemana: 'QUARTA', horaInicio: '19:00', horaFim: '22:00' },
                { diaSemana: 'QUINTA', horaInicio: '19:00', horaFim: '22:00' },
                { diaSemana: 'SEXTA', horaInicio: '19:00', horaFim: '22:00' },
                { diaSemana: 'SABADO', horaInicio: '08:00', horaFim: '12:00' },
              ],
        duracaoBlocoMinutos,
        intervaloDescansoMinutos,
        incluirRevisao,
        incluirSimulado,
        estrategia,
        instrucoesPersonalizadas: instrucoesPersonalizadas.trim() || undefined,
      });

      setSugestaoCronograma(sugestao);
      setAiStep('preview');
    } catch (err: unknown) {
      setAiErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o cronograma automático com IA. Verifique as disponibilidades informadas.'
      );
    } finally {
      setIsGerandoSugestao(false);
    }
  };

  const handleAplicarSugestaoIA = async () => {
    if (!sugestaoCronograma || !selectedPlanoId) return;

    setIsAplicandoSugestao(true);
    setAiErrorMessage(null);

    try {
      const planoAlvo = planosDisponiveis.find((p) => p.id === selectedPlanoId);
      const rawNome = `Grade Semanal - ${(planoAlvo?.titulo || 'Plano').trim()}`;
      const nomeSeguro = rawNome.length > 95 ? `${rawNome.substring(0, 92).trim()}...` : rawNome;

      await cronogramaService.aplicarAutoAgendamento({
        planoEstudoId: selectedPlanoId,
        nomeTemplate: nomeSeguro,
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

      setIsAiModalOpen(false);
      setAiStep('config');
      setSugestaoCronograma(null);
      await carregarGrade();
      showToast('Cronograma semanal inteligente aplicado com sucesso!');
    } catch (err: unknown) {
      setAiErrorMessage(
        err instanceof Error ? err.message : 'Falha ao persistir os blocos da IA na sua grade semanal.'
      );
    } finally {
      setIsAplicandoSugestao(false);
    }
  };

  const handleAddBloco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloBloco.trim()) return;

    setSubmittingManual(true);
    try {
      const criado = await cronogramaService.adicionarBloco({
        diaSemana: novoDia,
        horaInicio,
        horaFim,
        tipoBloco,
        titulo: tituloBloco,
        topicoTitulo: tituloBloco,
        materiaId: novoMateriaId || undefined,
        topicoId: novoTopicoId || undefined,
      });

      const blocoComNomes: BlocoCronograma = {
        ...criado,
        titulo: tituloBloco,
        materiaNome: materiaSelecionadaNovo?.nome || criado.materiaNome,
      };

      setCronograma((prev) => [...prev, blocoComNomes]);
      setSelectedDay(novoDia);
      setSelectedBloco(blocoComNomes);
      await carregarGrade(novoDia, criado.id);
      setIsAddModalOpen(false);
      setTituloBloco('');
      setNovoMateriaId('');
      setNovoTopicoId('');
      showToast('Bloco adicionado com sucesso!');
    } catch {
      toast.error('Não foi possível adicionar o bloco. Verifique os dados informados.');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleOpenAddModal = () => {
    setNovoPlanoId(selectedPlanoId || plano?.id || planosDisponiveis[0]?.id || '');
    setNovoMateriaId('');
    setNovoTopicoId('');
    setTituloBloco('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (bloco: BlocoCronograma) => {
    setBlocoEditando(bloco);
    setEditDia(bloco.diaSemana);
    setEditHoraInicio(bloco.horaInicio);
    setEditHoraFim(bloco.horaFim);
    setEditTipoBloco(bloco.tipoBloco);
    setEditTituloBloco(bloco.titulo || bloco.topicoTitulo || bloco.materiaNome || '');

    const planoDoBloco = planosDisponiveis.find((p) =>
      p.materias?.some((m) => m.id === bloco.materiaId)
    );
    const planoIdAlvo = planoDoBloco?.id || selectedPlanoId || plano?.id || planosDisponiveis[0]?.id || '';
    setEditPlanoId(planoIdAlvo);

    setEditMateriaId(bloco.materiaId || '');
    setEditTopicoId(bloco.topicoId || '');
    setEditErrorMessage(null);
    setIsEditModalOpen(true);
  };

  const handleEditBloco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blocoEditando || !editTituloBloco.trim()) return;

    if (editHoraInicio >= editHoraFim) {
      setEditErrorMessage('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    // Checagem preventiva de sobreposição na grade local
    const conflitoLocal = cronograma.find(
      (b) =>
        b.id !== blocoEditando.id &&
        b.diaSemana === editDia &&
        b.horaInicio < editHoraFim &&
        b.horaFim > editHoraInicio
    );

    if (conflitoLocal) {
      const nomeConflito = conflitoLocal.titulo || conflitoLocal.topicoTitulo || conflitoLocal.materiaNome || 'Outro Bloco';
      const diaNome = days.find((d) => d.id === editDia)?.label || editDia;
      setEditErrorMessage(
        `Já existe um bloco de horário conflitante para ${diaNome}: "${nomeConflito}" (${conflitoLocal.horaInicio} às ${conflitoLocal.horaFim}). Escolha outro intervalo ou ajuste o outro bloco.`
      );
      return;
    }

    setSubmittingEdit(true);
    setEditErrorMessage(null);
    try {
      const atualizado = await cronogramaService.editarBloco(blocoEditando.id, {
        diaSemana: editDia,
        horaInicio: editHoraInicio,
        horaFim: editHoraFim,
        tipoBloco: editTipoBloco,
        titulo: editTituloBloco,
        topicoTitulo: editTituloBloco,
        materiaId: editMateriaId || undefined,
        topicoId: editTopicoId || undefined,
        materiaNome: materiaSelecionadaEdit?.nome,
      });

      const blocoAtualizadoCompleto: BlocoCronograma = {
        ...atualizado,
        titulo: editTituloBloco,
        topicoTitulo: editTituloBloco,
        materiaNome: editMateriaId ? (materiaSelecionadaEdit?.nome || atualizado.materiaNome) : undefined,
      };

      setCronograma((prev) =>
        prev.map((b) => (b.id === blocoAtualizadoCompleto.id ? blocoAtualizadoCompleto : b))
      );
      if (editDia !== selectedDay) {
        setSelectedDay(editDia);
      }
      setSelectedBloco(blocoAtualizadoCompleto);

      // Recarrega a grade do backend para consistência de ordenação e dados persistidos
      await carregarGrade(editDia, blocoAtualizadoCompleto.id);

      setIsEditModalOpen(false);
      setBlocoEditando(null);
      showToast('Planejamento do bloco atualizado com sucesso!');
    } catch (err: unknown) {
      setEditErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o bloco. Verifique se o intervalo colide com outro horário.'
      );
    } finally {
      setSubmittingEdit(false);
    }
  };

  const [blocoParaExcluir, setBlocoParaExcluir] = useState<string | null>(null);
  const [isExcluindoBloco, setIsExcluindoBloco] = useState(false);

  const handleDeleteBloco = (blocoId: string) => {
    setBlocoParaExcluir(blocoId);
  };

  const handleConfirmarExclusaoBloco = async () => {
    if (!blocoParaExcluir) return;
    setIsExcluindoBloco(true);
    try {
      await cronogramaService.excluirBloco(blocoParaExcluir);
      setCronograma((prev) => prev.filter((b) => b.id !== blocoParaExcluir));
      if (selectedBloco?.id === blocoParaExcluir) {
        setSelectedBloco(null);
      }
      showToast('Bloco removido do cronograma.');
      setBlocoParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir bloco:', err);
    } finally {
      setIsExcluindoBloco(false);
    }
  };

  const renderBlocoDetalhesConteudo = (bloco: BlocoCronograma, onClose?: () => void) => {
    const meta = getTipoBlocoMeta(bloco.tipoBloco);
    const Icon = meta.icon;

    return (
      <div className="space-y-5">
        {/* Cabeçalho do Bloco */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
              <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Detalhes da Execução</span>
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1 leading-snug break-words">
              {bloco.titulo || bloco.topicoTitulo || bloco.materiaNome || 'Bloco Selecionado'}
            </h2>
            {(bloco.materiaNome || (bloco.titulo && bloco.topicoTitulo)) && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 break-words">
                {bloco.materiaNome}
                {bloco.materiaNome && bloco.topicoTitulo && bloco.titulo ? ` • ${bloco.topicoTitulo}` : ''}
                {!bloco.materiaNome && bloco.topicoTitulo && bloco.titulo ? bloco.topicoTitulo : ''}
              </p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
              title="Fechar Detalhes"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Card com Metadados do Horário e Modalidade */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Horário & Duração:
            </span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">
              {bloco.horaInicio} às {bloco.horaFim}{' '}
              <span className="text-zinc-400 font-normal">
                ({calcularDuracaoMinutos(bloco.horaInicio, bloco.horaFim)} min)
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Modalidade:</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-semibold flex items-center gap-1 ${meta.color}`}
            >
              <Icon className="w-3 h-3" />
              {meta.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Dia da Semana:</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
              {days.find((d) => d.id === bloco.diaSemana)?.label || bloco.diaSemana}
            </span>
          </div>
        </div>

        {/* Ações de Execução Imediata de Estudo */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-mono font-semibold uppercase text-zinc-400">
            Ação Imediata
          </div>

          {bloco.tipoBloco === 'FOCO_TEORIA' && (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onStartStudyTopic?.(bloco.materiaId, bloco.topicoId);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Estudo (Abrir Pomodoro & Caderno)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onStartSimulado?.({
                    planoId: plano?.id,
                    materiaId: bloco.materiaId,
                    topicoId: bloco.topicoId,
                  });
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Praticar Questões deste Tópico</span>
              </button>
            </>
          )}

          {bloco.tipoBloco === 'REVISAO' && (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onStartFlashcards?.({
                    planoId: plano?.id,
                    materiaId: bloco.materiaId,
                    topicoId: bloco.topicoId,
                    materiaNome: bloco.materiaNome,
                    topicoNome: bloco.topicoTitulo,
                  });
                }}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Revisar com Flashcards (SM-2)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onStartStudyTopic?.(bloco.materiaId, bloco.topicoId);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Consultar Caderno de Estudos</span>
              </button>
            </>
          )}

          {bloco.tipoBloco === 'SIMULADO' && (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onStartSimulado?.({
                    planoId: plano?.id,
                    materiaId: bloco.materiaId,
                    topicoId: bloco.topicoId,
                  });
                }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span>Iniciar Simulado Deste Bloco</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onStartStudyTopic?.(bloco.materiaId, bloco.topicoId);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ver Tópico na Árvore de Conhecimento</span>
              </button>
            </>
          )}

          {bloco.tipoBloco === 'DESCANSO' && (
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-900 dark:text-teal-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-300">
                <Coffee className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Descanso Sináptico Ativo</span>
              </div>
              <p className="text-[11px] leading-relaxed text-teal-700 dark:text-teal-300/90">
                A consolidação neural da memória de longo prazo ocorre nos intervalos. Hidrate-se, faça uma pausa da tela e descanse a mente.
              </p>
            </div>
          )}
        </div>

        {/* Botões de Ação do Bloco (Editar / Excluir) */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              handleOpenEditModal(bloco);
            }}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Editar Planejamento deste Bloco</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose?.();
              handleDeleteBloco(bloco.id);
            }}
            className="w-full py-2.5 rounded-xl bg-zinc-50 hover:bg-rose-50 dark:bg-zinc-900 dark:hover:bg-rose-500/10 text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 border border-zinc-200 hover:border-rose-300 dark:border-zinc-800 dark:hover:border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remover este Bloco do Cronograma</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans select-none text-zinc-900 dark:text-zinc-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Switcher Navigation Bar */}
      <div className="px-3 sm:px-5 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 z-20 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setModoVisao('diaria')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoVisao === 'diaria'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Agenda Diária<span className="hidden sm:inline"> (Calendário)</span></span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisao('semanal')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoVisao === 'semanal'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Grade Semanal<span className="hidden sm:inline"> (Template Base)</span></span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          {modoVisao === 'diaria' ? (
            <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              Visualização de Execução & Exceções Diárias
            </span>
          ) : (
            <span className="text-[11px] bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 px-2.5 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              Configuração da Rotina Padrão Recorrente
            </span>
          )}
        </div>
      </div>

      {modoVisao === 'diaria' ? (
        <DailyScheduleView
          plano={plano}
          planos={planosDisponiveis}
          onStartStudyTopic={onStartStudyTopic}
          onStartSimulado={onStartSimulado}
          onStartFlashcards={onStartFlashcards}
          onIrParaGradeSemanal={() => setModoVisao('semanal')}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          {/* Center Left: Weekly Calendar / Timeblocking View */}
          <div className="flex-1 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/70 space-y-3 sm:space-y-4 shrink-0 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-0.5 font-medium">
                Cronograma Híbrido & Timeblocking
              </div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Planejamento Semanal
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiStep('config');
                  setAiErrorMessage(null);
                  setIsAiModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-3 sm:px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Criar ou recalibrar seu cronograma semanal automaticamente com inteligência pedagógica"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Gerar com IA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNovoDia(selectedDay);
                  handleOpenAddModal();
                }}
                className="flex-1 sm:flex-none px-3 sm:px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Bloco</span>
              </button>
            </div>
          </div>

          {/* Days Tabs */}
          <div className="flex overflow-x-auto gap-1 sm:gap-1.5 pb-1 no-scrollbar">
            {days.map((d) => {
              const isSelected = selectedDay === d.id;
              const countNoDia = cronograma.filter((b) => b.diaSemana === d.id).length;

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleSelectDay(d.id)}
                  className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs whitespace-nowrap transition-all border flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 font-bold ring-2 ring-indigo-500/25'
                      : 'bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium'
                  }`}
                >
                  <span className="font-semibold sm:hidden">{d.short}</span>
                  <span className="font-semibold hidden sm:inline">{d.label}</span>
                  {countNoDia > 0 ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60'
                      }`}
                    >
                      {countNoDia}
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] px-1 rounded font-mono ${
                        isSelected ? 'text-indigo-200' : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      0
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule Blocks for Selected Day */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 sm:space-y-3">
          {loadingGrade ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <div className="text-xs">Carregando cronograma...</div>
            </div>
          ) : blocosDoDia.length > 0 ? (
            blocosDoDia.map((bloco) => {
              const meta = getTipoBlocoMeta(bloco.tipoBloco);
              const Icon = meta.icon;
              const isSelected = selectedBloco?.id === bloco.id;

              return (
                <div
                  key={bloco.id}
                  onClick={() => setSelectedBloco((prev) => (prev?.id === bloco.id ? null : bloco))}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 border-indigo-500 ring-1 ring-indigo-500/40 shadow-sm'
                      : 'bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800/80 shadow-2xs'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {bloco.horaInicio} – {bloco.horaFim}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${meta.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {bloco.titulo || bloco.topicoTitulo || bloco.materiaNome || 'Bloco de Estudo'}
                    </h3>

                    {(bloco.materiaNome || (bloco.titulo && bloco.topicoTitulo)) && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                        {bloco.materiaNome}
                        {bloco.materiaNome && bloco.topicoTitulo && bloco.titulo ? ` • ${bloco.topicoTitulo}` : ''}
                        {!bloco.materiaNome && bloco.topicoTitulo && bloco.titulo ? bloco.topicoTitulo : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {bloco.tipoBloco !== 'DESCANSO' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartStudy(bloco);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Iniciar este bloco de estudo agora"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Iniciar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(bloco);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                      title="Editar planejamento deste bloco"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBloco(bloco.id);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir este bloco"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-zinc-500 space-y-3 bg-white dark:bg-zinc-900/20 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <CalendarIcon className="w-8 h-8 opacity-30 mx-auto" />
              <div className="text-xs font-medium">Nenhum bloco agendado para {selectedDay.toLowerCase()}.</div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setNovoDia(selectedDay);
                    handleOpenAddModal();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 font-medium transition-all"
                >
                  + Bloco Manual
                </button>
                <button
                  onClick={() => {
                    setAiStep('config');
                    setIsAiModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar com IA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Persistent Drawer */}
      <div className="hidden md:flex w-[400px] bg-white dark:bg-zinc-950 p-5 flex-col justify-between shrink-0 border-l border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        {selectedBloco ? (
          renderBlocoDetalhesConteudo(selectedBloco, () => setSelectedBloco(null))
        ) : (
          <div className="text-center text-xs text-zinc-500 my-auto py-12 space-y-2">
            <CalendarIcon className="w-8 h-8 opacity-30 mx-auto" />
            <p>Selecione um bloco na grade para ver detalhes e iniciar sua sessão de estudo.</p>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet Drawer (ativo apenas quando um bloco estiver selecionado) */}
      {selectedBloco && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
            onClick={() => setSelectedBloco(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white dark:bg-zinc-950 rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3 shrink-0" />
            {renderBlocoDetalhesConteudo(selectedBloco, () => setSelectedBloco(null))}
          </div>
        </>
      )}
        </div>
      )}

      {/* Modal Adicionar Bloco Manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Adicionar Bloco no Cronograma
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBloco} className="space-y-4">
              {/* 1. Seleção da Árvore de Conhecimento / Plano de Estudo */}
              {planosDisponiveis.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      Árvore de Estudo (Plano)
                    </span>
                  </label>
                  <select
                    value={novoPlanoId || selectedPlanoId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setNovoPlanoId(pId);
                      setNovoMateriaId('');
                      setNovoTopicoId('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {planosDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} ({p.materias?.length || 0} matérias)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2. Seleção de Matéria estritamente vinculada ao plano */}
              {materiasDoPlanoNovo.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Matéria</span>
                    <span className="text-[10px] text-zinc-400 font-sans">Opcional</span>
                  </label>
                  <select
                    value={novoMateriaId}
                    onChange={(e) => {
                      const novoId = e.target.value;
                      setNovoMateriaId(novoId);
                      setNovoTopicoId('');
                      if (novoId) {
                        const mat = materiasDoPlanoNovo.find((m) => m.id === novoId);
                        if (mat) setTituloBloco(mat.nome);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">(Sem matéria vinculada / Conteúdo Livre)</option>
                    {materiasDoPlanoNovo.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Seleção de Tópico / Subtópico com agrupamento nítido e separação visual */}
              {materiaSelecionadaNovo && gruposTopicosNovo.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Tópico ou Subtópico</span>
                    <span className="text-[10px] text-zinc-400 font-sans">Opcional</span>
                  </label>
                  <select
                    value={novoTopicoId}
                    onChange={(e) => {
                      const topId = e.target.value;
                      setNovoTopicoId(topId);
                      if (topId) {
                        for (const g of gruposTopicosNovo) {
                          if (g.raiz.id === topId) {
                            setTituloBloco(g.raiz.titulo);
                            return;
                          }
                          const s = g.subtopicos.find((sub) => sub.id === topId);
                          if (s) {
                            setTituloBloco(s.titulo);
                            return;
                          }
                        }
                      } else if (materiaSelecionadaNovo) {
                        setTituloBloco(materiaSelecionadaNovo.nome);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">(Foco geral na matéria / Sem tópico específico)</option>
                    {gruposTopicosNovo.map((grupo) => (
                      <optgroup
                        key={grupo.raiz.id}
                        label={`📁 TÓPICO: ${grupo.raiz.titulo.toUpperCase()}`}
                        className="font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/90 py-1"
                      >
                        <option value={grupo.raiz.id} className="font-normal text-zinc-900 dark:text-zinc-100 py-0.5">
                          ● {grupo.raiz.titulo} (Tópico Raiz Completo)
                        </option>
                        {grupo.subtopicos.map((sub) => (
                          <option
                            key={sub.id}
                            value={sub.id}
                            className="font-normal text-zinc-700 dark:text-zinc-300 py-0.5"
                          >
                            {'  '.repeat(sub.nivel)}↳ {sub.titulo}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Disciplina ou Conteúdo Planejado
                </label>
                <input
                  type="text"
                  required
                  value={tituloBloco}
                  onChange={(e) => setTituloBloco(e.target.value)}
                  placeholder="Ex: Direito Constitucional - Direitos Fundamentais"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Dia da Semana
                  </label>
                  <select
                    value={novoDia}
                    onChange={(e) => setNovoDia(e.target.value as DiaSemana)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Tipo de Estudo
                  </label>
                  <select
                    value={tipoBloco}
                    onChange={(e) => setTipoBloco(e.target.value as TipoBloco)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FOCO_TEORIA">Teoria & Foco</option>
                    <option value="REVISAO">Revisão Espaçada</option>
                    <option value="SIMULADO">Simulado & Questões</option>
                    <option value="DESCANSO">Descanso Sináptico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Horário Início
                  </label>
                  <input
                    type="time"
                    required
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Horário Término
                  </label>
                  <input
                    type="time"
                    required
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingManual ? 'Salvando...' : 'Salvar Bloco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Bloco */}
      {isEditModalOpen && blocoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Editar Planejamento do Bloco
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setBlocoEditando(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editErrorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{editErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleEditBloco} className="space-y-4">
              {/* 1. Seleção da Árvore de Conhecimento / Plano de Estudo */}
              {planosDisponiveis.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      Árvore de Estudo (Plano)
                    </span>
                  </label>
                  <select
                    value={editPlanoId || planoSelecionadoEdit?.id || ''}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setEditPlanoId(pId);
                      setEditMateriaId('');
                      setEditTopicoId('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {planosDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} ({p.materias?.length || 0} matérias)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2. Seleção de Matéria estritamente vinculada ao plano */}
              {materiasDoPlanoEdit.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Matéria</span>
                    <span className="text-[10px] text-zinc-400 font-sans">Opcional</span>
                  </label>
                  <select
                    value={editMateriaId}
                    onChange={(e) => {
                      const novoId = e.target.value;
                      setEditMateriaId(novoId);
                      setEditTopicoId('');
                      if (novoId) {
                        const mat = materiasDoPlanoEdit.find((m) => m.id === novoId);
                        if (mat) setEditTituloBloco(mat.nome);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">(Sem matéria vinculada / Conteúdo Livre)</option>
                    {materiasDoPlanoEdit.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Seleção de Tópico / Subtópico com agrupamento nítido e separação visual */}
              {materiaSelecionadaEdit && gruposTopicosEdit.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Tópico ou Subtópico</span>
                    <span className="text-[10px] text-zinc-400 font-sans">Opcional</span>
                  </label>
                  <select
                    value={editTopicoId}
                    onChange={(e) => {
                      const topId = e.target.value;
                      setEditTopicoId(topId);
                      if (topId) {
                        for (const g of gruposTopicosEdit) {
                          if (g.raiz.id === topId) {
                            setEditTituloBloco(g.raiz.titulo);
                            return;
                          }
                          const s = g.subtopicos.find((sub) => sub.id === topId);
                          if (s) {
                            setEditTituloBloco(s.titulo);
                            return;
                          }
                        }
                      } else if (materiaSelecionadaEdit) {
                        setEditTituloBloco(materiaSelecionadaEdit.nome);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">(Foco geral na matéria / Sem tópico específico)</option>
                    {gruposTopicosEdit.map((grupo) => (
                      <optgroup
                        key={grupo.raiz.id}
                        label={`📁 TÓPICO: ${grupo.raiz.titulo.toUpperCase()}`}
                        className="font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/90 py-1"
                      >
                        <option value={grupo.raiz.id} className="font-normal text-zinc-900 dark:text-zinc-100 py-0.5">
                          ● {grupo.raiz.titulo} (Tópico Raiz Completo)
                        </option>
                        {grupo.subtopicos.map((sub) => (
                          <option
                            key={sub.id}
                            value={sub.id}
                            className="font-normal text-zinc-700 dark:text-zinc-300 py-0.5"
                          >
                            {'  '.repeat(sub.nivel)}↳ {sub.titulo}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Disciplina ou Conteúdo Planejado
                </label>
                <input
                  type="text"
                  required
                  value={editTituloBloco}
                  onChange={(e) => setEditTituloBloco(e.target.value)}
                  placeholder="Ex: Direito Constitucional - Direitos Fundamentais"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Dia da Semana
                  </label>
                  <select
                    value={editDia}
                    onChange={(e) => setEditDia(e.target.value as DiaSemana)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Tipo de Estudo
                  </label>
                  <select
                    value={editTipoBloco}
                    onChange={(e) => setEditTipoBloco(e.target.value as TipoBloco)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FOCO_TEORIA">Teoria & Foco</option>
                    <option value="REVISAO">Revisão Espaçada</option>
                    <option value="SIMULADO">Simulado & Questões</option>
                    <option value="DESCANSO">Descanso Sináptico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Horário Início
                  </label>
                  <input
                    type="time"
                    required
                    value={editHoraInicio}
                    onChange={(e) => setEditHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Horário Término
                  </label>
                  <input
                    type="time"
                    required
                    value={editHoraFim}
                    onChange={(e) => setEditHoraFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Guia de horários já ocupados no dia selecionado */}
              {(() => {
                const outrosBlocos = cronograma.filter(
                  (b) => b.diaSemana === editDia && b.id !== blocoEditando?.id
                );
                if (outrosBlocos.length === 0) {
                  return (
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Nenhum outro bloco agendado para {days.find((d) => d.id === editDia)?.label || editDia}. Intervalo livre!</span>
                    </div>
                  );
                }
                return (
                  <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Outros blocos já agendados em {days.find((d) => d.id === editDia)?.short} (evite sobrepor):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {outrosBlocos.map((ob) => (
                        <span
                          key={ob.id}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                        >
                          {ob.horaInicio} - {ob.horaFim} ({ob.titulo || ob.topicoTitulo || ob.materiaNome || 'Estudo'})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setBlocoEditando(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerador de Cronograma Inteligente com IA */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-6 text-zinc-900 dark:text-zinc-100 my-8">
            {/* Header Modal IA */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold flex items-center gap-1.5">
                    <span>Gerador de Cronograma Semanal IA</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {aiStep === 'config'
                      ? 'Defina sua disponibilidade e preferências para a IA criar sua grade semanal ideal.'
                      : 'Revise o diagnóstico pedagógico e a distribuição dos blocos antes de aplicar.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiErrorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{aiErrorMessage}</span>
              </div>
            )}

            {aiStep === 'config' ? (
              <div className="space-y-5">
                {/* 1. Seleção de Plano */}
                {planosDisponiveis.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      Plano de Estudo Base
                    </label>
                    <select
                      value={selectedPlanoId}
                      onChange={(e) => setSelectedPlanoId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {planosDisponiveis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.titulo} ({p.materias?.length || 0} matérias)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Presets e Disponibilidade por Dia */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Janelas de Disponibilidade Semanal
                    </label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-zinc-500 mr-1">Predefinições:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('noite')}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        Noite (19h-22h)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('manha')}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        Manhã (08h-12h)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('integral')}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        Integral (08h-18h)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                    {disponibilidades.map((d, idx) => (
                      <div
                        key={d.dia}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          d.ativo
                            ? 'bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-800/50 shadow-2xs'
                            : 'bg-zinc-100/50 dark:bg-zinc-900/20 border-transparent opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={d.ativo}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setDisponibilidades((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, ativo: checked } : item))
                              );
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {days.find((x) => x.id === d.dia)?.short}
                          </span>
                        </label>

                        {d.ativo && (
                          <div className="flex items-center gap-1 text-[11px] font-mono">
                            <input
                              type="time"
                              value={d.horaInicio}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDisponibilidades((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, horaInicio: val } : item))
                                );
                              }}
                              className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                            />
                            <span className="text-zinc-400">às</span>
                            <input
                              type="time"
                              value={d.horaFim}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDisponibilidades((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, horaFim: val } : item))
                                );
                              }}
                              className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Parâmetros Pedagógicos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                      Estratégia
                    </label>
                    <select
                      value={estrategia}
                      onChange={(e) => setEstrategia(e.target.value as EstrategiaAgendamento)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="FOCO_PESO_EDITAL">Priorizar Pesos do Edital</option>
                      <option value="EQUILIBRADA">Distribuição Equilibrada</option>
                      <option value="FOCO_DIFICULDADE">Foco em Lacunas / Dificuldade</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                      Duração do Bloco
                    </label>
                    <select
                      value={duracaoBlocoMinutos}
                      onChange={(e) => setDuracaoBlocoMinutos(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={50}>50 minutos (Pomodoro)</option>
                      <option value={60}>60 minutos</option>
                      <option value={90}>90 minutos</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                      Intervalo de Descanso
                    </label>
                    <select
                      value={intervaloDescansoMinutos}
                      onChange={(e) => setIntervaloDescansoMinutos(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={5}>5 minutos</option>
                      <option value={10}>10 minutos</option>
                      <option value={15}>15 minutos</option>
                    </select>
                  </div>
                </div>

                {/* 4. Opções de Revisão e Simulado */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-700 dark:text-zinc-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={incluirRevisao}
                      onChange={(e) => setIncluirRevisao(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>Programar Revisões Espaçadas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={incluirSimulado}
                      onChange={(e) => setIncluirSimulado(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>Programar Simulados nos Finais de Semana</span>
                  </label>
                </div>

                {/* 5. Descrição Livre da Situação/Rotina */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                    <span>Particularidades da Sua Rotina (Opcional)</span>
                    <span className="text-[10px] text-zinc-400 font-normal">A IA considera no agendamento</span>
                  </label>
                  <textarea
                    rows={3}
                    value={instrucoesPersonalizadas}
                    onChange={(e) => setInstrucoesPersonalizadas(e.target.value)}
                    placeholder="Ex: Trabalho em escala 12x36, tenho facilidade em Português mas preciso focar mais em Direito Administrativo. Deixe as manhãs de sábado para simulados."
                    className="w-full p-3 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Botões de Ação do Passo 1 */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGerarCronogramaIA}
                    disabled={isGerandoSugestao}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isGerandoSugestao ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Calculando Matriz com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Gerar Sugestão Inteligente</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Passo 2: Prévia e Justificativa Pedagógica */
              <div className="space-y-5">
                {sugestaoCronograma && (
                  <>
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Diagnóstico Pedagógico da IA
                        </div>
                        <div className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                          {sugestaoCronograma.totalHorasSemanais}h semanais • {sugestaoCronograma.totalBlocosSugeridos} blocos
                        </div>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {sugestaoCronograma.resumoPedagogico}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Distribuição Sugerida na Semana
                      </h4>
                      <div className="max-h-64 overflow-y-auto space-y-2 p-1">
                        {sugestaoCronograma.blocosSugeridos.map((bloco, idx) => {
                          const meta = getTipoBlocoMeta(bloco.tipoBloco);
                          const Icon = meta.icon;

                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                                  {days.find((x) => x.id === bloco.diaSemana)?.short} {bloco.horaInicio}-{bloco.horaFim}
                                </span>
                                <div className="truncate">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                                    {bloco.titulo || bloco.topicoTitulo || bloco.materiaNome || 'Bloco de Estudo'}
                                  </span>
                                  {bloco.justificativaPedagogica && (
                                    <span className="text-[10px] text-zinc-500 block truncate">
                                      {bloco.justificativaPedagogica}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${meta.color}`}
                              >
                                <Icon className="w-3 h-3" />
                                {meta.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Botões de Ação do Passo 2 */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setAiStep('config')}
                    disabled={isAplicandoSugestao}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  >
                    ← Voltar e Ajustar Horários
                  </button>

                  <button
                    type="button"
                    onClick={handleAplicarSugestaoIA}
                    disabled={isAplicandoSugestao}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isAplicandoSugestao ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Aplicando na Grade Semanal...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar e Aplicar na Minha Grade</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Bloco */}
      <ConfirmModal
        isOpen={blocoParaExcluir !== null}
        title="Remover Bloco do Cronograma"
        description="Deseja realmente remover este bloco da sua grade semanal de estudos? Esta ação não afetará os conteúdos do plano nem as sessões já registradas."
        confirmLabel="Remover Bloco"
        variant="danger"
        isLoading={isExcluindoBloco}
        onConfirm={handleConfirmarExclusaoBloco}
        onClose={() => {
          if (!isExcluindoBloco) setBlocoParaExcluir(null);
        }}
      />
    </div>
  );
};

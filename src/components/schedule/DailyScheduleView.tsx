import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  BookOpen,
  RotateCcw,
  Coffee,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Play,
  RotateCw,
  Edit2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Undo2,
  CalendarCheck,
  SlidersHorizontal,
  Layers,
  Target,
} from 'lucide-react';
import type {
  BlocoAgendaDiaria,
  DiaSemana,
  TipoBloco,
  PlanoEstudo,
  Topico,
  AgendaDiaria,
  BlocoCronograma,
} from '../../types';
import { cronogramaService, planoService } from '../../services';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../../context/useToast';

interface GrupoTopico {
  raiz: Topico;
  subtopicos: Array<{ id: string; titulo: string; nivel: number }>;
}

function agruparTopicos(topicos?: Topico[]): GrupoTopico[] {
  if (!topicos || topicos.length === 0) return [];

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

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DIAS_SEMANA_SIGLAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DIA_SEMANA_MAP: Record<number, DiaSemana> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERCA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SABADO',
};

const DIAS_SEMANA_NOMES: Record<DiaSemana, string> = {
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terça-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

interface DiaCalendario {
  data: Date;
  dataIso: string;
  numeroDia: number;
  diaSemana: DiaSemana;
  ehMesAtual: boolean;
  ehHoje: boolean;
}

function gerarDiasDoMes(ano: number, mes: number): DiaCalendario[] {
  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  const totalDiasMes = ultimoDia.getDate();
  const primeiroDiaSemana = primeiroDia.getDay(); // 0 a 6 (0 = Dom)

  const dias: DiaCalendario[] = [];

  // 1. Dias do mês anterior para completar a primeira semana
  const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const d = ultimoDiaMesAnterior - i;
    const data = new Date(ano, mes - 1, d);
    const dataIso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    dias.push({
      data,
      dataIso,
      numeroDia: d,
      diaSemana: DIA_SEMANA_MAP[data.getDay()],
      ehMesAtual: false,
      ehHoje: dataIso === hojeIso,
    });
  }

  // 2. Dias do mês atual
  for (let d = 1; d <= totalDiasMes; d++) {
    const data = new Date(ano, mes, d);
    const dataIso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    dias.push({
      data,
      dataIso,
      numeroDia: d,
      diaSemana: DIA_SEMANA_MAP[data.getDay()],
      ehMesAtual: true,
      ehHoje: dataIso === hojeIso,
    });
  }

  // 3. Dias do próximo mês para completar a última semana (grid de 35 ou 42 dias)
  const totalSlots = Math.ceil(dias.length / 7) * 7;
  const diasRestantes = totalSlots - dias.length;
  for (let d = 1; d <= diasRestantes; d++) {
    const data = new Date(ano, mes + 1, d);
    const dataIso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    dias.push({
      data,
      dataIso,
      numeroDia: d,
      diaSemana: DIA_SEMANA_MAP[data.getDay()],
      ehMesAtual: false,
      ehHoje: dataIso === hojeIso,
    });
  }

  return dias;
}

const getTipoBlocoMeta = (tipo: TipoBloco) => {
  switch (tipo) {
    case 'FOCO_TEORIA':
      return {
        label: 'Teoria',
        corDot: 'bg-indigo-500',
        color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
        icon: BookOpen,
      };
    case 'REVISAO':
      return {
        label: 'Revisão',
        corDot: 'bg-amber-500',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
        icon: RotateCcw,
      };
    case 'SIMULADO':
      return {
        label: 'Simulado',
        corDot: 'bg-emerald-500',
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
        icon: CheckCircle2,
      };
    case 'DESCANSO':
      return {
        label: 'Descanso',
        corDot: 'bg-zinc-400',
        color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/60',
        icon: Coffee,
      };
    default:
      return {
        label: 'Estudo',
        corDot: 'bg-zinc-500',
        color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
        icon: BookOpen,
      };
  }
};

const calcularMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

interface DailyScheduleViewProps {
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
  onIrParaGradeSemanal?: () => void;
}

export const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  plano,
  planos = [],
  onStartStudyTopic,
  onStartSimulado,
  onStartFlashcards,
  onIrParaGradeSemanal,
}) => {
  const toast = useToast();
  const [dataAtual, setDataAtual] = useState<Date>(() => new Date());
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = dataAtual.getMonth();

  // Grade Semanal Base (para preview instantâneo nas células)
  const [gradeSemanal, setGradeSemanal] = useState<BlocoCronograma[]>([]);

  // Pop-up do dia selecionado
  const [diaSelecionadoPopUp, setDiaSelecionadoPopUp] = useState<DiaCalendario | null>(null);
  const [agendaPopUp, setAgendaPopUp] = useState<AgendaDiaria | null>(null);
  const [loadingAgendaPopUp, setLoadingAgendaPopUp] = useState<boolean>(false);

  // Bloco selecionado para execução no pop-up
  const [blocoDetalhe, setBlocoDetalhe] = useState<BlocoAgendaDiaria | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [planosDisponiveis, setPlanosDisponiveis] = useState<PlanoEstudo[]>(planos);

  // Modal Bloco Avulso
  const [isModalAvulsoOpen, setIsModalAvulsoOpen] = useState(false);
  const [avulsoPlanoId, setAvulsoPlanoId] = useState<string>('');
  const [avulsoMateriaId, setAvulsoMateriaId] = useState<string>('');
  const [avulsoTopicoId, setAvulsoTopicoId] = useState<string>('');
  const [avulsoTitulo, setAvulsoTitulo] = useState('');
  const [avulsoHoraInicio, setAvulsoHoraInicio] = useState('14:00');
  const [avulsoHoraFim, setAvulsoHoraFim] = useState('15:30');
  const [avulsoTipoBloco, setAvulsoTipoBloco] = useState<TipoBloco>('FOCO_TEORIA');
  const [submittingAvulso, setSubmittingAvulso] = useState(false);
  const [avulsoErrorMessage, setAvulsoErrorMessage] = useState<string | null>(null);

  // Modal Ajuste Pontual (Substituição de Horário / Matéria)
  const [isModalAjusteOpen, setIsModalAjusteOpen] = useState(false);
  const [blocoAjustando, setBlocoAjustando] = useState<BlocoAgendaDiaria | null>(null);
  const [ajustePlanoId, setAjustePlanoId] = useState<string>('');
  const [ajusteMateriaId, setAjusteMateriaId] = useState<string>('');
  const [ajusteTopicoId, setAjusteTopicoId] = useState<string>('');
  const [ajusteTitulo, setAjusteTitulo] = useState('');
  const [ajusteHoraInicio, setAjusteHoraInicio] = useState('08:00');
  const [ajusteHoraFim, setAjusteHoraFim] = useState('09:00');
  const [ajusteTipoBloco, setAjusteTipoBloco] = useState<TipoBloco>('FOCO_TEORIA');
  const [submittingAjuste, setSubmittingAjuste] = useState(false);
  const [ajusteErrorMessage, setAjusteErrorMessage] = useState<string | null>(null);

  // Confirmações
  const [blocoCancelarHoje, setBlocoCancelarHoje] = useState<BlocoAgendaDiaria | null>(null);
  const [isCancelandoBloco, setIsCancelandoBloco] = useState(false);

  const [blocoExcluirExcecao, setBlocoExcluirExcecao] = useState<BlocoAgendaDiaria | null>(null);
  const [isExcluindoExcecao, setIsExcluindoExcecao] = useState(false);

  const [isConfirmResetDiaOpen, setIsConfirmResetDiaOpen] = useState(false);
  const [isResetandoDia, setIsResetandoDia] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega a grade semanal base para popular as células do mês
  useEffect(() => {
    const carregarGradeBase = async () => {
      try {
        const grade = await cronogramaService.obterGradeSemanal();
        if (grade && grade.length > 0) {
          setGradeSemanal(grade);
        }
      } catch (err) {
        console.error('Erro ao carregar grade base:', err);
      }
    };
    carregarGradeBase();
  }, []);

  // Carrega planos se não vierem nas props
  useEffect(() => {
    if (planos && planos.length > 0) {
      setPlanosDisponiveis(planos);
      return;
    }
    const carregar = async () => {
      try {
        const lista = await planoService.listarPlanos();
        if (lista && lista.length > 0) {
          setPlanosDisponiveis(lista);
        }
      } catch {
        // Fallback
      }
    };
    carregar();
  }, [planos]);

  // Dias gerados para o grid do mês
  const diasDoMes = useMemo(() => {
    return gerarDiasDoMes(anoAtual, mesAtual);
  }, [anoAtual, mesAtual]);

  // Navegação de mês
  const navegarMes = (delta: number) => {
    setDataAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const irParaMesAtual = () => {
    setDataAtual(new Date());
  };

  // Carregar agenda diária ao clicar no dia
  const handleAbrirPopUpDia = async (dia: DiaCalendario) => {
    setDiaSelecionadoPopUp(dia);
    setBlocoDetalhe(null);
    setLoadingAgendaPopUp(true);
    try {
      const res = await cronogramaService.obterAgendaDiaria(dia.dataIso);
      setAgendaPopUp(res);
      if (res && res.blocos && res.blocos.length > 0) {
        setBlocoDetalhe(res.blocos[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar agenda diária do dia:', err);
      setAgendaPopUp(null);
    } finally {
      setLoadingAgendaPopUp(false);
    }
  };

  const handleFecharPopUpDia = () => {
    setDiaSelecionadoPopUp(null);
    setAgendaPopUp(null);
    setBlocoDetalhe(null);
  };

  // Recarregar o pop-up após alguma mutação
  const recarregarPopUp = async (dataIso: string) => {
    setLoadingAgendaPopUp(true);
    try {
      const res = await cronogramaService.obterAgendaDiaria(dataIso);
      setAgendaPopUp(res);
      if (res && res.blocos && res.blocos.length > 0) {
        setBlocoDetalhe((prev) => (prev ? res.blocos.find((b) => b.id === prev.id) || res.blocos[0] : res.blocos[0]));
      } else {
        setBlocoDetalhe(null);
      }
    } catch {
      // Ignora erro
    } finally {
      setLoadingAgendaPopUp(false);
    }
  };

  // Cálculos de horas do pop-up
  const estatisticasPopUp = useMemo(() => {
    if (!agendaPopUp || !agendaPopUp.blocos) {
      return { totalBlocos: 0, minutosTotais: 0, blocosExcecao: 0 };
    }
    let minutosTotais = 0;
    let blocosExcecao = 0;

    agendaPopUp.blocos.forEach((b) => {
      if (b.tipoBloco !== 'DESCANSO') {
        const minInicio = calcularMinutos(b.horaInicio);
        const minFim = calcularMinutos(b.horaFim);
        if (minFim > minInicio) {
          minutosTotais += minFim - minInicio;
        }
      }
      if (b.origem === 'EXCECAO') {
        blocosExcecao++;
      }
    });

    return {
      totalBlocos: agendaPopUp.blocos.length,
      minutosTotais,
      blocosExcecao,
    };
  }, [agendaPopUp]);

  // Planos e tópicos do modal de bloco avulso
  const planoSelecionadoAvulso = useMemo(() => {
    return planosDisponiveis.find((p) => p.id === avulsoPlanoId) || planosDisponiveis[0] || plano;
  }, [planosDisponiveis, avulsoPlanoId, plano]);

  const materiaSelecionadaAvulso = useMemo(() => {
    return planoSelecionadoAvulso?.materias?.find((m) => m.id === avulsoMateriaId);
  }, [planoSelecionadoAvulso, avulsoMateriaId]);

  const gruposTopicosAvulso = useMemo(() => {
    return agruparTopicos(materiaSelecionadaAvulso?.topicos);
  }, [materiaSelecionadaAvulso]);

  // Planos e tópicos do modal de ajuste pontual
  const planoSelecionadoAjuste = useMemo(() => {
    return planosDisponiveis.find((p) => p.id === ajustePlanoId) || planosDisponiveis[0] || plano;
  }, [planosDisponiveis, ajustePlanoId, plano]);

  const materiaSelecionadaAjuste = useMemo(() => {
    return planoSelecionadoAjuste?.materias?.find((m) => m.id === ajusteMateriaId);
  }, [planoSelecionadoAjuste, ajusteMateriaId]);

  const gruposTopicosAjuste = useMemo(() => {
    return agruparTopicos(materiaSelecionadaAjuste?.topicos);
  }, [materiaSelecionadaAjuste]);

  // ==========================================
  // Handlers de Exceção
  // ==========================================

  const handleConfirmarCancelarHoje = async () => {
    if (!blocoCancelarHoje || !diaSelecionadoPopUp) return;
    setIsCancelandoBloco(true);
    try {
      await cronogramaService.registrarExcecao(diaSelecionadoPopUp.dataIso, {
        tipoAcao: 'CANCELAR_BLOCO',
        blocoTemplateOrigem: blocoCancelarHoje.blocoTemplateOrigemId || blocoCancelarHoje.id,
      });
      showToast('Bloco cancelado para esta data.');
      setBlocoCancelarHoje(null);
      await recarregarPopUp(diaSelecionadoPopUp.dataIso);
    } catch (err) {
      console.error('Erro ao cancelar bloco pontualmente:', err);
      toast.error('Não foi possível cancelar o bloco pontualmente.');
    } finally {
      setIsCancelandoBloco(false);
    }
  };

  const handleOpenAddAvulso = () => {
    const planoIdAlvo = plano?.id || planosDisponiveis[0]?.id || '';
    setAvulsoPlanoId(planoIdAlvo);
    setAvulsoMateriaId('');
    setAvulsoTopicoId('');
    setAvulsoTitulo('');
    setAvulsoHoraInicio('14:00');
    setAvulsoHoraFim('15:30');
    setAvulsoTipoBloco('FOCO_TEORIA');
    setAvulsoErrorMessage(null);
    setIsModalAvulsoOpen(true);
  };

  const handleSalvarBlocoAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avulsoTitulo.trim() || !diaSelecionadoPopUp) return;

    if (avulsoHoraInicio >= avulsoHoraFim) {
      setAvulsoErrorMessage('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    setSubmittingAvulso(true);
    setAvulsoErrorMessage(null);
    try {
      await cronogramaService.registrarExcecao(diaSelecionadoPopUp.dataIso, {
        tipoAcao: 'BLOCO_AVULSO',
        horaInicio: avulsoHoraInicio,
        horaFim: avulsoHoraFim,
        tipoBloco: avulsoTipoBloco,
        titulo: avulsoTitulo.trim(),
        materiaId: avulsoMateriaId || undefined,
        topicoId: avulsoTopicoId || undefined,
      });

      showToast('Bloco avulso adicionado com sucesso para este dia!');
      setIsModalAvulsoOpen(false);
      await recarregarPopUp(diaSelecionadoPopUp.dataIso);
    } catch (err) {
      console.error('Erro ao adicionar bloco avulso:', err);
      setAvulsoErrorMessage('Não foi possível registrar o bloco avulso. Verifique possíveis sobreposições.');
    } finally {
      setSubmittingAvulso(false);
    }
  };

  const handleOpenAjusteHoje = (bloco: BlocoAgendaDiaria) => {
    setBlocoAjustando(bloco);
    setAjusteHoraInicio(bloco.horaInicio);
    setAjusteHoraFim(bloco.horaFim);
    setAjusteTipoBloco(bloco.tipoBloco);
    setAjusteTitulo(bloco.titulo || bloco.topicoTitulo || bloco.materiaNome || '');

    const planoDoBloco = planosDisponiveis.find((p) =>
      p.materias?.some((m) => m.id === bloco.materiaId)
    );
    const planoIdAlvo = planoDoBloco?.id || plano?.id || planosDisponiveis[0]?.id || '';
    setAjustePlanoId(planoIdAlvo);
    setAjusteMateriaId(bloco.materiaId || '');
    setAjusteTopicoId(bloco.topicoId || '');
    setAjusteErrorMessage(null);
    setIsModalAjusteOpen(true);
  };

  const handleSalvarAjusteHoje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blocoAjustando || !ajusteTitulo.trim() || !diaSelecionadoPopUp) return;

    if (ajusteHoraInicio >= ajusteHoraFim) {
      setAjusteErrorMessage('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    setSubmittingAjuste(true);
    setAjusteErrorMessage(null);
    try {
      if (blocoAjustando.origem === 'EXCECAO' && blocoAjustando.excecaoId) {
        await cronogramaService.editarExcecao(blocoAjustando.excecaoId, {
          horaInicio: ajusteHoraInicio,
          horaFim: ajusteHoraFim,
          tipoBloco: ajusteTipoBloco,
          titulo: ajusteTitulo.trim(),
          materiaId: ajusteMateriaId || undefined,
          topicoId: ajusteTopicoId || undefined,
        });
      } else {
        await cronogramaService.registrarExcecao(diaSelecionadoPopUp.dataIso, {
          tipoAcao: 'SUBSTITUIR_HORARIO',
          blocoTemplateOrigem: blocoAjustando.blocoTemplateOrigemId || blocoAjustando.id,
          horaInicio: ajusteHoraInicio,
          horaFim: ajusteHoraFim,
          tipoBloco: ajusteTipoBloco,
          titulo: ajusteTitulo.trim(),
          materiaId: ajusteMateriaId || undefined,
          topicoId: ajusteTopicoId || undefined,
        });
      }

      showToast('Ajuste pontual salvo com sucesso para este dia!');
      setIsModalAjusteOpen(false);
      setBlocoAjustando(null);
      await recarregarPopUp(diaSelecionadoPopUp.dataIso);
    } catch (err) {
      console.error('Erro ao salvar ajuste pontual:', err);
      setAjusteErrorMessage('Não foi possível salvar o ajuste. Verifique conflitos de horários.');
    } finally {
      setSubmittingAjuste(false);
    }
  };

  const handleConfirmarExcluirExcecao = async () => {
    if (!blocoExcluirExcecao || !blocoExcluirExcecao.excecaoId || !diaSelecionadoPopUp) return;
    setIsExcluindoExcecao(true);
    try {
      await cronogramaService.removerExcecao(blocoExcluirExcecao.excecaoId);
      showToast('Ajuste pontual removido. Restaurado ao padrão semanal.');
      setBlocoExcluirExcecao(null);
      await recarregarPopUp(diaSelecionadoPopUp.dataIso);
    } catch (err) {
      console.error('Erro ao remover exceção:', err);
      toast.error('Não foi possível remover o ajuste pontual.');
    } finally {
      setIsExcluindoExcecao(false);
    }
  };

  const handleConfirmarResetDia = async () => {
    if (!diaSelecionadoPopUp) return;
    setIsResetandoDia(true);
    try {
      await cronogramaService.resetarAgendaDia(diaSelecionadoPopUp.dataIso);
      showToast('Agenda do dia restaurada integralmente ao padrão semanal.');
      setIsConfirmResetDiaOpen(false);
      await recarregarPopUp(diaSelecionadoPopUp.dataIso);
    } catch (err) {
      console.error('Erro ao resetar dia:', err);
      toast.error('Não foi possível resetar a agenda do dia.');
    } finally {
      setIsResetandoDia(false);
    }
  };

  const handleStartStudy = (bloco: BlocoAgendaDiaria) => {
    if (onStartStudyTopic) {
      onStartStudyTopic(bloco.materiaId || undefined, bloco.topicoId || undefined);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans select-none text-zinc-900 dark:text-zinc-100 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header do Calendário Mensal */}
      <div className="p-4 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {MESES[mesAtual]} de {anoAtual}
              </h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                Visão Mensal
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Clique em qualquer dia para ver os blocos e aplicar exceções pontuais.
            </p>
          </div>
        </div>

        {/* Controles Intuitivos de Navegação de Mês */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Navegador Anterior / Próximo Mês */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => navegarMes(-1)}
              className="px-3 py-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-2xs"
              title="Ir para o mês anterior"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-500" />
              <span>Mês Anterior</span>
            </button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <button
              type="button"
              onClick={() => navegarMes(1)}
              className="px-3 py-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-2xs"
              title="Ir para o próximo mês"
            >
              <span>Próximo Mês</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Botão Independente para ir ao Mês Atual */}
          <button
            type="button"
            onClick={irParaMesAtual}
            className={`px-3 py-1.5 text-xs font-semibold rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              anoAtual === new Date().getFullYear() && mesAtual === new Date().getMonth()
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600'
            }`}
            title="Voltar para a data e mês atual"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mês Atual</span>
          </button>

          {onIrParaGradeSemanal && (
            <button
              type="button"
              onClick={onIrParaGradeSemanal}
              className="px-3.5 py-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
            >
              Ver Grade Semanal Base
            </button>
          )}
        </div>
      </div>

      {/* Grade do Calendário Mensal com Bordas em Alto Contraste */}
      <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 overflow-y-auto">
        <div className="bg-white dark:bg-zinc-900/60 p-2.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col flex-1 space-y-2 sm:space-y-3">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2.5 pb-2 border-b-2 border-zinc-200 dark:border-zinc-800">
            {DIAS_SEMANA_SIGLAS.map((sigla, idx) => (
              <div
                key={sigla}
                className={`text-center py-1 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6
                    ? 'text-zinc-400 dark:text-zinc-500 bg-zinc-100/60 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60'
                    : 'text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {sigla}
              </div>
            ))}
          </div>

          {/* Células dos Dias com Bordas Nítidas */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2.5 flex-1 auto-rows-fr">
            {diasDoMes.map((dia) => {
              // Blocos do template semanal que se aplicam a este dia da semana
              const blocosDoDia = gradeSemanal.filter((b) => b.diaSemana === dia.diaSemana);
              const isDiaAberto = diaSelecionadoPopUp?.dataIso === dia.dataIso;

              return (
                <div
                  key={dia.dataIso}
                  onClick={() => handleAbrirPopUpDia(dia)}
                  className={`p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group min-h-[64px] sm:min-h-[105px] md:min-h-[120px] ${
                    isDiaAberto
                      ? 'ring-2 ring-indigo-500 border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 shadow-md'
                      : dia.ehHoje
                      ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30 shadow-xs'
                      : dia.ehMesAtual
                      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200/80 dark:border-zinc-800/80 opacity-60 hover:opacity-90 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Topo da Célula: Número do Dia & Badge de Contagem */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all ${
                        dia.ehHoje
                          ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/25'
                          : isDiaAberto
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : dia.ehMesAtual
                          ? 'text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {dia.numeroDia}
                    </span>

                    {blocosDoDia.length > 0 && (
                      <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60">
                        {blocosDoDia.length} {blocosDoDia.length === 1 ? 'bloco' : 'blocos'}
                      </span>
                    )}
                  </div>

                  {/* Mobile Dots Indicator (sm:hidden) */}
                  {blocosDoDia.length > 0 && (
                    <div className="flex sm:hidden items-center justify-center gap-1 my-1 flex-wrap">
                      {blocosDoDia.slice(0, 3).map((b) => {
                        const meta = getTipoBlocoMeta(b.tipoBloco);
                        return (
                          <span
                            key={b.id}
                            className={`w-1.5 h-1.5 rounded-full ${meta.corDot}`}
                          />
                        );
                      })}
                      {blocosDoDia.length > 3 && (
                        <span className="text-[8px] font-mono font-bold text-zinc-400 leading-none">
                          +{blocosDoDia.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Prévia dos Blocos do Dia (Desktop sm:block) */}
                  <div className="space-y-1 my-1.5 flex-1 overflow-hidden hidden sm:block">
                    {blocosDoDia.slice(0, 2).map((b) => {
                      const meta = getTipoBlocoMeta(b.tipoBloco);
                      return (
                        <div
                          key={b.id}
                          className="text-[10px] font-mono truncate px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700/70 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.corDot}`} />
                          <span className="font-semibold">{b.horaInicio}</span>
                          <span className="truncate opacity-80">
                            {b.titulo || b.topicoTitulo || b.materiaNome}
                          </span>
                        </div>
                      );
                    })}
                    {blocosDoDia.length > 2 && (
                      <span className="text-[9px] font-mono text-zinc-400 block px-1 truncate font-medium">
                        +{blocosDoDia.length - 2} mais na rotina
                      </span>
                    )}
                  </div>

                  {/* Rodapé da Célula */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="truncate font-medium text-zinc-500 dark:text-zinc-400">
                      {DIAS_SEMANA_NOMES[dia.diaSemana].slice(0, 3)}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-indigo-600 dark:text-indigo-400 transition-opacity font-semibold">
                      Ver dia →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POP-UP DO DIA SELECIONADO ("Popupzinho que sai do dia escolhido")          */}
      {/* ========================================================================= */}
      {diaSelecionadoPopUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={handleFecharPopUpDia}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Pop-up */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  <CalendarCheck className="w-4 h-4 text-indigo-500" />
                  <span>
                    {DIAS_SEMANA_NOMES[diaSelecionadoPopUp.diaSemana]}
                    {diaSelecionadoPopUp.ehHoje ? ' (Hoje)' : ''}
                  </span>
                  {agendaPopUp?.templateOrigemNome && (
                    <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px]">
                      Template: {agendaPopUp.templateOrigemNome}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {diaSelecionadoPopUp.data.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {estatisticasPopUp.totalBlocos}{' '}
                    {estatisticasPopUp.totalBlocos === 1 ? 'bloco' : 'blocos'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                    {Math.floor(estatisticasPopUp.minutosTotais / 60)}h{' '}
                    {String(estatisticasPopUp.minutosTotais % 60).padStart(2, '0')}m previstos
                  </span>
                  {estatisticasPopUp.blocosExcecao > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800">
                      {estatisticasPopUp.blocosExcecao}{' '}
                      {estatisticasPopUp.blocosExcecao === 1 ? 'ajuste pontual' : 'ajustes pontuais'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenAddAvulso}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Bloco Avulso</span>
                </button>

                <button
                  type="button"
                  onClick={handleFecharPopUpDia}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Banner de Restauração se houver Exceções */}
            {estatisticasPopUp.blocosExcecao > 0 && (
              <div className="px-5 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shrink-0">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Este dia possui alterações pontuais que sobrepõem o template semanal.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmResetDiaOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                >
                  Restaurar Padrão
                </button>
              </div>
            )}

            {/* Conteúdo Scrollável: Lista de Blocos */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingAgendaPopUp ? (
                <div className="flex flex-col items-center justify-center p-12 text-zinc-400 space-y-2">
                  <RotateCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <div className="text-xs font-mono">Projetando blocos do dia com exceções...</div>
                </div>
              ) : agendaPopUp && agendaPopUp.blocos.length > 0 ? (
                agendaPopUp.blocos.map((bloco) => {
                  const meta = getTipoBlocoMeta(bloco.tipoBloco);
                  const Icon = meta.icon;
                  const isExcecao = bloco.origem === 'EXCECAO';
                  const isSelected = blocoDetalhe?.id === bloco.id;

                  return (
                    <div
                      key={bloco.id}
                      onClick={() => setBlocoDetalhe(bloco)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-900 border-indigo-500 ring-1 ring-indigo-500/40 shadow-sm'
                          : isExcecao
                          ? 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/30 border-amber-300/70 dark:border-amber-800/60'
                          : 'bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800/80 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            {bloco.horaInicio} – {bloco.horaFim}
                          </span>

                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${meta.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>

                          {/* Badge de Origem */}
                          {isExcecao ? (
                            bloco.tipoAcaoExcecao === 'BLOCO_AVULSO' ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 flex items-center gap-1 font-semibold">
                                <Plus className="w-2.5 h-2.5" />
                                Bloco Avulso
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 flex items-center gap-1 font-semibold">
                                <SlidersHorizontal className="w-2.5 h-2.5" />
                                Ajustado Hoje
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">
                              Grade Semanal
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {bloco.titulo || bloco.topicoTitulo || bloco.materiaNome || 'Bloco de Estudo'}
                        </h4>

                        {(bloco.materiaNome || (bloco.titulo && bloco.topicoTitulo)) && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                            {bloco.materiaNome}
                            {bloco.materiaNome && bloco.topicoTitulo && bloco.titulo
                              ? ` • ${bloco.topicoTitulo}`
                              : ''}
                            {!bloco.materiaNome && bloco.topicoTitulo && bloco.titulo
                              ? bloco.topicoTitulo
                              : ''}
                          </p>
                        )}
                      </div>

                      {/* Ações no Bloco */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        {bloco.tipoBloco !== 'DESCANSO' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartStudy(bloco);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Iniciar este bloco no Workpad"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Iniciar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAjusteHoje(bloco);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                          title={isExcecao ? 'Editar ajuste deste dia' : 'Reagendar horário para hoje'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {isExcecao ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBlocoExcluirExcecao(bloco);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                            title={
                              bloco.tipoAcaoExcecao === 'BLOCO_AVULSO'
                                ? 'Excluir bloco avulso'
                                : 'Desfazer ajuste e restaurar o bloco original do template'
                            }
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBlocoCancelarHoje(bloco);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Cancelar este bloco apenas hoje (sem afetar as próximas semanas)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-500 space-y-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <CalendarIcon className="w-7 h-7 opacity-30 mx-auto" />
                  <div className="text-xs font-medium">Nenhum bloco agendado para este dia.</div>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    Você pode adicionar um bloco avulso de estudo exclusivo para hoje.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddAvulso}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Adicionar Bloco Avulso
                  </button>
                </div>
              )}
            </div>

            {/* Rodapé do Pop-up com Ações Rápidas de Estudo */}
            {blocoDetalhe && blocoDetalhe.tipoBloco !== 'DESCANSO' && (
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="text-xs text-zinc-500">
                  Bloco em foco:{' '}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {blocoDetalhe.titulo || blocoDetalhe.topicoTitulo || blocoDetalhe.materiaNome}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onStartSimulado) {
                        onStartSimulado({
                          materiaId: blocoDetalhe.materiaId || undefined,
                          topicoId: blocoDetalhe.topicoId || undefined,
                        });
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Simulado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onStartFlashcards) {
                        onStartFlashcards({
                          materiaId: blocoDetalhe.materiaId || undefined,
                          topicoId: blocoDetalhe.topicoId || undefined,
                          materiaNome: blocoDetalhe.materiaNome || undefined,
                          topicoNome: blocoDetalhe.topicoTitulo || blocoDetalhe.titulo || undefined,
                        });
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartStudy(blocoDetalhe)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Iniciar Estudo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Adicionar Bloco Avulso (BLOCO_AVULSO)                               */}
      {/* ========================================================================= */}
      {isModalAvulsoOpen && diaSelecionadoPopUp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Adicionar Bloco Avulso
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Este bloco existirá exclusivamente em {diaSelecionadoPopUp.data.toLocaleDateString('pt-BR')}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalAvulsoOpen(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {avulsoErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{avulsoErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSalvarBlocoAvulso} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título ou Conteúdo Planejado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aula Extra de Constitucional, Resolução de Questões..."
                  value={avulsoTitulo}
                  onChange={(e) => setAvulsoTitulo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={avulsoHoraInicio}
                    onChange={(e) => setAvulsoHoraInicio(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Horário de Término *
                  </label>
                  <input
                    type="time"
                    required
                    value={avulsoHoraFim}
                    onChange={(e) => setAvulsoHoraFim(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Modalidade do Bloco
                </label>
                <select
                  value={avulsoTipoBloco}
                  onChange={(e) => setAvulsoTipoBloco(e.target.value as TipoBloco)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="FOCO_TEORIA">Teoria & Aprofundamento</option>
                  <option value="QUESTOES">Prática de Questões</option>
                  <option value="REVISAO">Revisão Espaçada (SRS)</option>
                  <option value="SIMULADO">Simulado Cronometrado</option>
                  <option value="DESCANSO">Descanso Sináptico</option>
                </select>
              </div>

              {planosDisponiveis.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Árvore de Estudo
                  </label>
                  <select
                    value={avulsoPlanoId}
                    onChange={(e) => {
                      setAvulsoPlanoId(e.target.value);
                      setAvulsoMateriaId('');
                      setAvulsoTopicoId('');
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {planosDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Disciplina (Opcional)
                  </label>
                  <select
                    value={avulsoMateriaId}
                    onChange={(e) => {
                      setAvulsoMateriaId(e.target.value);
                      setAvulsoTopicoId('');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Nenhuma disciplina</option>
                    {planoSelecionadoAvulso?.materias?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tópico (Opcional)
                  </label>
                  <select
                    value={avulsoTopicoId}
                    disabled={!avulsoMateriaId}
                    onChange={(e) => setAvulsoTopicoId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Nenhum tópico</option>
                    {gruposTopicosAvulso.map((g) => (
                      <optgroup key={g.raiz.id} label={`📂 ${g.raiz.titulo}`}>
                        <option value={g.raiz.id}>• {g.raiz.titulo}</option>
                        {g.subtopicos.map((s) => (
                          <option key={s.id} value={s.id}>
                            {'  '.repeat(s.nivel)}└ {s.titulo}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalAvulsoOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAvulso}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submittingAvulso ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Adicionar Bloco Avulso</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Reagendar / Ajustar Hoje (SUBSTITUIR_HORARIO)                       */}
      {/* ========================================================================= */}
      {isModalAjusteOpen && blocoAjustando && diaSelecionadoPopUp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Ajustar Bloco para Hoje
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Esta modificação afetará exclusivamente o dia {diaSelecionadoPopUp.data.toLocaleDateString('pt-BR')}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalAjusteOpen(false);
                  setBlocoAjustando(null);
                }}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ajusteErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{ajusteErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSalvarAjusteHoje} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Título ou Conteúdo Planejado *
                </label>
                <input
                  type="text"
                  required
                  value={ajusteTitulo}
                  onChange={(e) => setAjusteTitulo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={ajusteHoraInicio}
                    onChange={(e) => setAjusteHoraInicio(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Horário de Término *
                  </label>
                  <input
                    type="time"
                    required
                    value={ajusteHoraFim}
                    onChange={(e) => setAjusteHoraFim(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Modalidade do Bloco
                </label>
                <select
                  value={ajusteTipoBloco}
                  onChange={(e) => setAjusteTipoBloco(e.target.value as TipoBloco)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="FOCO_TEORIA">Teoria & Aprofundamento</option>
                  <option value="QUESTOES">Prática de Questões</option>
                  <option value="REVISAO">Revisão Espaçada (SRS)</option>
                  <option value="SIMULADO">Simulado Cronometrado</option>
                  <option value="DESCANSO">Descanso Sináptico</option>
                </select>
              </div>

              {planosDisponiveis.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Árvore de Estudo
                  </label>
                  <select
                    value={ajustePlanoId}
                    onChange={(e) => {
                      setAjustePlanoId(e.target.value);
                      setAjusteMateriaId('');
                      setAjusteTopicoId('');
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {planosDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Disciplina (Opcional)
                  </label>
                  <select
                    value={ajusteMateriaId}
                    onChange={(e) => {
                      setAjusteMateriaId(e.target.value);
                      setAjusteTopicoId('');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Nenhuma disciplina</option>
                    {planoSelecionadoAjuste?.materias?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tópico (Opcional)
                  </label>
                  <select
                    value={ajusteTopicoId}
                    disabled={!ajusteMateriaId}
                    onChange={(e) => setAjusteTopicoId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Nenhum tópico</option>
                    {gruposTopicosAjuste.map((g) => (
                      <optgroup key={g.raiz.id} label={`📂 ${g.raiz.titulo}`}>
                        <option value={g.raiz.id}>• {g.raiz.titulo}</option>
                        {g.subtopicos.map((s) => (
                          <option key={s.id} value={s.id}>
                            {'  '.repeat(s.nivel)}└ {s.titulo}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalAjusteOpen(false);
                    setBlocoAjustando(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAjuste}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submittingAjuste ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Salvar Ajuste para Hoje</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMAÇÕES: Cancelar Bloco Hoje, Desfazer Ajuste, Resetar Dia             */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={Boolean(blocoCancelarHoje)}
        title="Cancelar Bloco Apenas Hoje"
        description={`Tem certeza que deseja cancelar o bloco "${blocoCancelarHoje?.titulo || blocoCancelarHoje?.topicoTitulo || blocoCancelarHoje?.materiaNome || 'Bloco'}" exclusivamente para a data de hoje? O bloco permanecerá normalmente no template semanal das próximas semanas.`}
        confirmLabel="Sim, Cancelar Hoje"
        cancelLabel="Voltar"
        variant="danger"
        isLoading={isCancelandoBloco}
        onConfirm={handleConfirmarCancelarHoje}
        onClose={() => setBlocoCancelarHoje(null)}
      />

      <ConfirmModal
        isOpen={Boolean(blocoExcluirExcecao)}
        title={
          blocoExcluirExcecao?.tipoAcaoExcecao === 'BLOCO_AVULSO'
            ? 'Excluir Bloco Avulso'
            : 'Restaurar Bloco ao Padrão'
        }
        description={
          blocoExcluirExcecao?.tipoAcaoExcecao === 'BLOCO_AVULSO'
            ? 'Deseja remover este bloco avulso exclusivo de hoje?'
            : 'Deseja desfazer o ajuste pontual deste bloco e restaurar as configurações originais da grade semanal?'
        }
        confirmLabel="Confirmar"
        cancelLabel="Voltar"
        variant="info"
        isLoading={isExcluindoExcecao}
        onConfirm={handleConfirmarExcluirExcecao}
        onClose={() => setBlocoExcluirExcecao(null)}
      />

      <ConfirmModal
        isOpen={isConfirmResetDiaOpen}
        title="Restaurar Dia Inteiro ao Padrão Semanal"
        description="Esta ação removerá todas as exceções (cancelamentos, alterações de horários e blocos avulsos) registradas nesta data, fazendo a rotina retornar 100% à grade semanal padrão. Deseja continuar?"
        confirmLabel="Sim, Restaurar Dia"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isResetandoDia}
        onConfirm={handleConfirmarResetDia}
        onClose={() => setIsConfirmResetDiaOpen(false)}
      />
    </div>
  );
};

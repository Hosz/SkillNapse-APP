import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Play,
  RotateCw,
  CheckCircle2,
  X,
  XCircle,
  Flame,
  BrainCircuit,
  Loader2,
  Edit2,
  Trash2,
  Lock,
  Search,
  ChevronDown,
  ChevronRight,
  Folder,
  Tag,
} from 'lucide-react';
import type { PlanoEstudo, Flashcard, Sm2Rating } from '../../types';
import { flashcardService, planoService } from '../../services';
import { isQuotaExceededError, isAbortError } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../../context/useToast';

export interface FlashcardFilterInitial {
  planoId?: string;
  materiaId?: string;
  materiaNome?: string;
  topicoId?: string;
  topicoNome?: string;
  subtopicoId?: string;
  subtopicoNome?: string;
}

interface FlashcardsViewProps {
  planos: PlanoEstudo[];
  planoAtivo: PlanoEstudo | null;
  initialFilter?: FlashcardFilterInitial | null;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  planos,
  planoAtivo,
  initialFilter,
}) => {
  const toast = useToast();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Session state
  const [isStudying, setIsStudying] = useState(false);
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [studyTitle, setStudyTitle] = useState<string>('Acervo Geral');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Modal IA Generation state
  const [isIaModalOpen, setIsIaModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal Manual Creation state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualFrente, setManualFrente] = useState('');
  const [manualVerso, setManualVerso] = useState('');

  // Modal Edit state (Resposta só mostrada na abazinha de resposta)
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editTab, setEditTab] = useState<'frente' | 'verso'>('frente');
  const [editFrente, setEditFrente] = useState('');
  const [editVerso, setEditVerso] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Visualização e Agrupamento do Acervo
  const [buscaTermo, setBuscaTermo] = useState(
    initialFilter?.subtopicoNome || initialFilter?.topicoNome || ''
  );
  const [filtroMateriaExibicao, setFiltroMateriaExibicao] = useState<string>(
    initialFilter?.materiaNome || 'todas'
  );
  const [materiasColapsadas, setMateriasColapsadas] = useState<Record<string, boolean>>({});

  const toggleMateriaColapsada = (materiaNome: string) => {
    setMateriasColapsadas((prev) => ({
      ...prev,
      [materiaNome]: !prev[materiaNome],
    }));
  };

  const expandirTodasMaterias = () => {
    setMateriasColapsadas({});
  };

  const colapsarTodasMaterias = (nomesMaterias: string[]) => {
    const fechadas: Record<string, boolean> = {};
    nomesMaterias.forEach((n) => {
      fechadas[n] = true;
    });
    setMateriasColapsadas(fechadas);
  };

  // Cascade Selection for IA & Manual
  const [selectedPlanoId, setSelectedPlanoId] = useState<string>(
    initialFilter?.planoId || planoAtivo?.id || (planos.length > 0 ? planos[0].id : '')
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

  // Quantity calculation based on scope
  const maxQuantidade = !filterMateria
    ? 60 // Edital Completo
    : !filterTopico
    ? 40 // Matéria Inteira
    : !filterSubtopico
    ? 30 // Tópico Inteiro
    : 20; // Subtópico Específico

  const [quantidadeCards, setQuantidadeCards] = useState<number>(20);

  // Atualiza limite quando muda o escopo
  useEffect(() => {
    setQuantidadeCards((prev) => Math.min(prev, maxQuantidade));
  }, [maxQuantidade]);

  // Sincroniza quando initialFilter muda
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.planoId) {
        setSelectedPlanoId(initialFilter.planoId);
      }
      if (initialFilter.materiaNome) {
        setFiltroMateriaExibicao(initialFilter.materiaNome);
      }
      if (initialFilter.materiaId) {
        setFilterMateria(true);
        setSelectedMateriaId(initialFilter.materiaId);
      }
      if (initialFilter.subtopicoNome || initialFilter.topicoNome) {
        setBuscaTermo(initialFilter.subtopicoNome || initialFilter.topicoNome || '');
      }
      if (initialFilter.topicoId) {
        setFilterTopico(true);
        setSelectedTopicoId(initialFilter.topicoId);
      }
      if (initialFilter.subtopicoId) {
        setFilterSubtopico(true);
        setSelectedSubtopico(initialFilter.subtopicoId);
      }
    }
  }, [initialFilter]);

  // Carrega plano completo com tópicos quando altera a seleção
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

  // Carrega cards reais do backend (SEM MOCKS)
  const carregarCards = () => {
    setLoading(true);
    flashcardService.listarTodos().then((lista) => {
      setCards(lista || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    carregarCards();
  }, []);

  // Dados do plano selecionado
  const planoSelecionado = planoCarregado || planos.find((p) => p.id === selectedPlanoId) || planoAtivo;
  const materiasDisponiveis = planoSelecionado?.materias || [];
  const materiaSelecionada = materiasDisponiveis.find((m) => m.id === selectedMateriaId) || materiasDisponiveis[0];
  const topicosDisponiveis = materiaSelecionada?.topicos || [];
  const topicoSelecionado = topicosDisponiveis.find((t) => t.id === selectedTopicoId) || topicosDisponiveis[0];
  const subtopicosDisponiveis = topicoSelecionado?.subtopicos || [];

  // Handlers de Edição
  const handleOpenEdit = (card: Flashcard) => {
    setEditingCard(card);
    setEditFrente(card.frente);
    setEditVerso(card.verso);
    setEditTab('frente'); // Sempre começa na aba da frente (resposta oculta até clicar na aba)
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;
    if (!editFrente.trim() || !editVerso.trim()) {
      toast.warning('Informe a pergunta (frente) e a resposta (verso) do cartão.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const atualizado = await flashcardService.atualizarFlashcard(editingCard.id, {
        frente: editFrente.trim(),
        verso: editVerso.trim(),
        topicoId: editingCard.topicoId,
        planoId: editingCard.planoId,
        materiaId: editingCard.materiaId,
        materiaNome: editingCard.materiaNome,
        topicoNome: editingCard.topicoNome,
        subtopicoNome: editingCard.subtopicoNome,
      });
      if (atualizado) {
        setCards((prev) => prev.map((c) => (c.id === editingCard.id ? atualizado : c)));
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.id === editingCard.id
              ? { ...c, frente: editFrente.trim(), verso: editVerso.trim() }
              : c
          )
        );
      }
      setEditingCard(null);
    } catch {
      toast.error('Erro ao atualizar flashcard.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [cardParaExcluir, setCardParaExcluir] = useState<string | null>(null);
  const [isExcluindoCard, setIsExcluindoCard] = useState(false);

  const handleDeleteCard = (cardId: string) => {
    setCardParaExcluir(cardId);
  };

  const handleConfirmarExclusaoCard = async () => {
    if (!cardParaExcluir) return;
    setIsExcluindoCard(true);
    try {
      await flashcardService.apagarFlashcard(cardParaExcluir);
      setCards((prev) => prev.filter((c) => c.id !== cardParaExcluir));
      if (editingCard?.id === cardParaExcluir) {
        setEditingCard(null);
      }
      setCardParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir flashcard:', err);
    } finally {
      setIsExcluindoCard(false);
    }
  };

  // Handlers do Estudo (Geral ou por Matéria Específica)
  const handleStartStudy = (customList?: Flashcard[], title?: string) => {
    const queue = (customList && customList.length > 0) ? customList : cards;
    if (queue.length === 0) return;
    setStudyQueue(queue);
    setStudyTitle(title || 'Acervo Completo');
    setIsStudying(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  const handleRateCard = (rating: Sm2Rating) => {
    const activeList = studyQueue.length > 0 ? studyQueue : cards;
    const cardAtual = activeList[currentIndex];
    if (cardAtual) {
      const repeticoesCalculadas = rating === 'ERRO' ? 0 : (cardAtual.repeticoes || 0) + 1;
      setCards((prev) => prev.map((c) => (c.id === cardAtual.id ? { ...c, repeticoes: repeticoesCalculadas } : c)));
      setStudyQueue((prev) => prev.map((c) => (c.id === cardAtual.id ? { ...c, repeticoes: repeticoesCalculadas } : c)));

      flashcardService.revisarCard(cardAtual.id, rating).then((atualizado) => {
        if (atualizado) {
          setCards((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)));
          setStudyQueue((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)));
        }
      });
    }

    if (currentIndex + 1 < activeList.length) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 100);
    } else {
      setSessionCompleted(true);
    }
  };

  const flashcardAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (flashcardAbortRef.current) {
        flashcardAbortRef.current.abort();
        flashcardAbortRef.current = null;
      }
    };
  }, []);

  const handleCancelarGeracao = () => {
    if (flashcardAbortRef.current) {
      flashcardAbortRef.current.abort();
      flashcardAbortRef.current = null;
      toast.info('Geração de flashcards cancelada.');
    }
    setIsGenerating(false);
  };

  const fecharModalIaOuCancelar = () => {
    if (isGenerating) {
      handleCancelarGeracao();
    }
    setIsIaModalOpen(false);
  };

  // Geração com IA com enriquecimento de escopo
  const handleGerarIa = async () => {
    if (!selectedPlanoId) {
      toast.warning('Por favor, selecione um plano de estudos.');
      return;
    }

    const controller = new AbortController();
    flashcardAbortRef.current = controller;
    setIsGenerating(true);
    try {
      const materiaObj = materiasDisponiveis.find((m) => m.id === selectedMateriaId);
      const topicoObj = topicosDisponiveis.find((t) => t.id === selectedTopicoId);
      const subtopicoObj = subtopicosDisponiveis.find((s) => s.id === selectedSubtopico);

      const novos = await flashcardService.gerarFlashcardsIa({
        planoId: selectedPlanoId,
        materiaId: filterMateria ? selectedMateriaId : undefined,
        materiaNome: filterMateria ? materiaObj?.nome : undefined,
        topicoId: filterTopico ? selectedTopicoId : undefined,
        topicoNome: filterTopico ? topicoObj?.titulo : undefined,
        subtopico: filterSubtopico ? (subtopicoObj?.titulo || selectedSubtopico) : undefined,
        subtopicoId: filterSubtopico ? selectedSubtopico : undefined,
        quantidade: quantidadeCards,
      }, controller.signal);

      if (novos && novos.length > 0) {
        setCards((prev) => [...novos, ...prev]);
        setIsIaModalOpen(false);
        toast.success(`${novos.length} flashcards gerados com sucesso pela IA e organizados no escopo selecionado!`);
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      if (isQuotaExceededError(err)) {
        return;
      }
      toast.error('Falha ao gerar flashcards via IA. Tente novamente.');
    } finally {
      flashcardAbortRef.current = null;
      setIsGenerating(false);
    }
  };

  // Criação Manual com catalogação de escopo
  const handleCriarManual = async () => {
    if (!manualFrente.trim() || !manualVerso.trim()) {
      toast.warning('Informe o texto da frente e do verso do flashcard.');
      return;
    }

    const materiaObj = materiasDisponiveis.find((m) => m.id === selectedMateriaId);
    const topicoObj = topicosDisponiveis.find((t) => t.id === selectedTopicoId);
    const subtopicoObj = subtopicosDisponiveis.find((s) => s.id === selectedSubtopico);

    const criado = await flashcardService.criarFlashcard({
      planoId: selectedPlanoId || undefined,
      materiaId: filterMateria ? selectedMateriaId : undefined,
      materiaNome: filterMateria ? materiaObj?.nome : undefined,
      topicoId: filterTopico ? selectedTopicoId : undefined,
      topicoNome: filterTopico ? topicoObj?.titulo : undefined,
      subtopicoNome: filterSubtopico ? (subtopicoObj?.titulo || selectedSubtopico) : undefined,
      frente: manualFrente.trim(),
      verso: manualVerso.trim(),
    });

    if (criado) {
      setCards((prev) => [criado, ...prev]);
      setManualFrente('');
      setManualVerso('');
      setIsManualModalOpen(false);
      toast.success('Flashcard criado e catalogado com sucesso!');
    }
  };

  // Enriquecimento e agrupamento de cards
  const enrichCardWithPlanTree = (card: Flashcard): Flashcard => {
    if (card.materiaNome && card.topicoNome) return card;
    const planosParaBuscar = [
      ...(planoCarregado ? [planoCarregado] : []),
      ...planos,
    ];

    if (card.topicoId) {
      for (const plano of planosParaBuscar) {
        for (const mat of plano.materias || []) {
          for (const top of mat.topicos || []) {
            if (top.id === card.topicoId) {
              return {
                ...card,
                planoId: card.planoId || plano.id,
                materiaId: card.materiaId || mat.id,
                materiaNome: card.materiaNome || mat.nome,
                topicoNome: card.topicoNome || top.titulo,
              };
            }
            for (const sub of top.subtopicos || []) {
              if (sub.id === card.topicoId) {
                return {
                  ...card,
                  planoId: card.planoId || plano.id,
                  materiaId: card.materiaId || mat.id,
                  materiaNome: card.materiaNome || mat.nome,
                  topicoNome: card.topicoNome || top.titulo,
                  subtopicoNome: card.subtopicoNome || sub.titulo,
                };
              }
            }
          }
        }
      }
    }
    return card;
  };

  const cardsEnriquecidos = cards.map(enrichCardWithPlanTree);

  // Filtro textual
  const cardsFiltradosBusca = cardsEnriquecidos.filter((c) => {
    if (!buscaTermo.trim()) return true;
    const termo = buscaTermo.toLowerCase();
    return (
      c.frente.toLowerCase().includes(termo) ||
      c.verso.toLowerCase().includes(termo) ||
      (c.materiaNome && c.materiaNome.toLowerCase().includes(termo)) ||
      (c.topicoNome && c.topicoNome.toLowerCase().includes(termo)) ||
      (c.subtopicoNome && c.subtopicoNome.toLowerCase().includes(termo))
    );
  });

  // Agrupamento por Matéria e Tópico
  interface GrupoTopico {
    topicoNome: string;
    cards: Flashcard[];
  }

  interface GrupoMateria {
    materiaNome: string;
    corHex?: string;
    totalCards: number;
    topicos: GrupoTopico[];
  }

  const mapaMaterias = new Map<string, { corHex?: string; topicosMap: Map<string, Flashcard[]> }>();

  cardsFiltradosBusca.forEach((c) => {
    const matNome = c.materiaNome?.trim() || 'Geral & Outros Tópicos';
    const topNome = c.topicoNome?.trim() || 'Tópicos Diversos';

    if (!mapaMaterias.has(matNome)) {
      const matObj = materiasDisponiveis.find((m) => m.nome.toLowerCase() === matNome.toLowerCase());
      mapaMaterias.set(matNome, {
        corHex: matObj?.corHex,
        topicosMap: new Map(),
      });
    }

    const matData = mapaMaterias.get(matNome)!;
    if (!matData.topicosMap.has(topNome)) {
      matData.topicosMap.set(topNome, []);
    }
    matData.topicosMap.get(topNome)!.push(c);
  });

  const gruposPorMateria: GrupoMateria[] = [];
  mapaMaterias.forEach((val, matNome) => {
    const topicosList: GrupoTopico[] = [];
    let somaCards = 0;
    val.topicosMap.forEach((cardList, topNome) => {
      somaCards += cardList.length;
      topicosList.push({
        topicoNome: topNome,
        cards: cardList,
      });
    });

    gruposPorMateria.push({
      materiaNome: matNome,
      corHex: val.corHex,
      totalCards: somaCards,
      topicos: topicosList,
    });
  });

  const gruposExibidos = filtroMateriaExibicao === 'todas'
    ? gruposPorMateria
    : gruposPorMateria.filter((g) => g.materiaNome === filtroMateriaExibicao);

  const activeStudyList = studyQueue.length > 0 ? studyQueue : cards;
  const currentCard = activeStudyList[currentIndex];

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-y-auto select-none font-sans p-4 sm:p-8 space-y-5 sm:space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* 1. Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5 font-medium">
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Módulo de Retenção Ativa & Algoritmo SM-2</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Flashcards & Repetição Espaçada
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Memorize conceitos, prazos e jurisprudência com repetições inteligentes baseadas na curva do esquecimento de Ebbinghaus.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium flex items-center gap-2 transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Criar Manualmente</span>
          </button>

          <button
            type="button"
            onClick={() => setIsIaModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar com IA</span>
          </button>
        </div>
      </div>

      {/* 2. Strip de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border-2 border-zinc-200 dark:border-zinc-800 space-y-1 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">Total no Acervo</span>
          <div className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-100">{cards.length} cards</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border-2 border-zinc-200 dark:border-zinc-800 space-y-1 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-semibold">Para Revisar Hoje</span>
          <div className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            {cards.length} pendentes
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border-2 border-zinc-200 dark:border-zinc-800 space-y-1 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">Algoritmo</span>
          <div className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-1">SuperMemo SM-2</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border-2 border-zinc-200 dark:border-zinc-800 space-y-1 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">Ação Rápida</span>
          <button
            type="button"
            onClick={() => {
              if (cardsFiltradosBusca.length > 0 && (buscaTermo || filtroMateriaExibicao !== 'todas')) {
                handleStartStudy(cardsFiltradosBusca, buscaTermo || filtroMateriaExibicao);
              } else {
                handleStartStudy();
              }
            }}
            disabled={cards.length === 0}
            className="w-full mt-0.5 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer truncate"
          >
            <Play className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {cardsFiltradosBusca.length > 0 && (buscaTermo || filtroMateriaExibicao !== 'todas')
                ? `Praticar (${cardsFiltradosBusca.length})`
                : 'Praticar Agora'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Área de Estudo Ativa ou Lista de Flashcards */}
      {isStudying ? (
        <div className="rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                {studyTitle}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                ({currentIndex + 1} de {activeStudyList.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStudying(false)}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Fechar Sessão
            </button>
          </div>

          {!sessionCompleted && currentCard ? (
            <div className="space-y-6 max-w-xl mx-auto">
              {/* Card Interativo com Flip */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[260px] rounded-2xl border-2 p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative select-text ${
                  isFlipped
                    ? 'bg-indigo-50/50 dark:bg-zinc-900/90 border-indigo-500 shadow-xl shadow-indigo-500/10'
                    : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span>{isFlipped ? 'VERSO (RESPOSTA)' : 'FRENTE (CONCEITO / PERGUNTA)'}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                    <RotateCw className="w-3 h-3" /> Clique para virar
                  </span>
                </div>

                <div className="py-6 text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed text-center">
                  {isFlipped ? currentCard.verso : currentCard.frente}
                </div>

                <div className="text-[10px] font-mono text-center text-zinc-500">
                  {isFlipped ? 'Avalie sua facilidade de evocação abaixo' : 'Tente lembrar da resposta antes de virar'}
                </div>
              </div>

              {/* Botões de Classificação SM-2 */}
              {isFlipped && (
                <div className="space-y-2">
                  <div className="text-center text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    Como foi a sua lembrança?
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRateCard('ERRO')}
                      className="py-2.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border-2 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <span>Erro</span>
                      <span className="text-[9px] font-mono opacity-80">(Repetir)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRateCard('DIFICIL')}
                      className="py-2.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border-2 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <span>Difícil</span>
                      <span className="text-[9px] font-mono opacity-80">(+1 dia)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRateCard('BOM')}
                      className="py-2.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border-2 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <span>Bom</span>
                      <span className="text-[9px] font-mono opacity-80">(+3 dias)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRateCard('FACIL')}
                      className="py-2.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border-2 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <span>Fácil</span>
                      <span className="text-[9px] font-mono opacity-80">(+7 dias)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Parabéns! Sessão de Flashcards Concluída
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Você revisou todos os cartões agendados. O algoritmo SM-2 atualizou os intervalos de retenção para os próximos ciclos.
              </p>
              <button
                type="button"
                onClick={() => setIsStudying(false)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Voltar ao Acervo
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Lista Hierárquica e Organizada dos Flashcards por Matéria e Tópico */
        <div className="space-y-6">
          {initialFilter && (initialFilter.topicoNome || initialFilter.subtopicoNome || initialFilter.materiaNome) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/60 text-xs shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-zinc-700 dark:text-zinc-300 truncate">
                  Foco selecionado na Árvore: <strong className="text-indigo-700 dark:text-indigo-300 font-semibold">{initialFilter.subtopicoNome || initialFilter.topicoNome || initialFilter.materiaNome}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsIaModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gerar com IA neste tema</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBuscaTermo('');
                    setFiltroMateriaExibicao('todas');
                  }}
                  className="px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-all"
                >
                  Ver Geral
                </button>
              </div>
            </div>
          )}

          {/* Barra de Filtros e Ferramentas do Acervo */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Acervo Estruturado por Disciplinas & Tópicos
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Organizado conforme as matérias e tópicos selecionados na geração.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandirTodasMaterias}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  Expandir Todas
                </button>
                <button
                  type="button"
                  onClick={() => colapsarTodasMaterias(gruposPorMateria.map((g) => g.materiaNome))}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  Recolher Todas
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              {/* Campo de Busca Rápida */}
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={buscaTermo}
                  onChange={(e) => setBuscaTermo(e.target.value)}
                  placeholder="Pesquisar pergunta, conceito ou subtópico..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                />
                {buscaTermo && (
                  <button
                    type="button"
                    onClick={() => setBuscaTermo('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Seletor de Filtro de Matéria */}
              {gruposPorMateria.length > 1 && (
                <div className="w-full sm:w-auto shrink-0">
                  <select
                    value={filtroMateriaExibicao}
                    onChange={(e) => setFiltroMateriaExibicao(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="todas">Todas as Disciplinas ({cards.length} cards)</option>
                    {gruposPorMateria.map((g) => (
                      <option key={g.materiaNome} value={g.materiaNome}>
                        {g.materiaNome} ({g.totalCards} cards)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : cards.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs bg-white dark:bg-zinc-900/40 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 p-8">
              Nenhum flashcard cadastrado ainda. Crie manualmente ou gere com IA acima.
            </div>
          ) : gruposExibidos.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs bg-white dark:bg-zinc-900/40 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 p-8">
              Nenhum flashcard encontrado com o termo "{buscaTermo}".
            </div>
          ) : (
            <div className="space-y-6">
              {gruposExibidos.map((grupo) => {
                const isColapsada = !!materiasColapsadas[grupo.materiaNome];
                const todosOsCardsDaMateria = grupo.topicos.flatMap((t) => t.cards);

                return (
                  <div
                    key={grupo.materiaNome}
                    className="rounded-3xl bg-white dark:bg-zinc-900/40 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Header da Matéria (Acordeão) */}
                    <div
                      className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/80 cursor-pointer select-none"
                      onClick={() => toggleMateriaColapsada(grupo.materiaNome)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3.5 h-7 rounded-full shrink-0"
                          style={{ backgroundColor: grupo.corHex || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {grupo.materiaNome}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold shrink-0">
                              {grupo.totalCards} {grupo.totalCards === 1 ? 'card' : 'cards'}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {grupo.topicos.length} {grupo.topicos.length === 1 ? 'tópico cadastrado' : 'tópicos cadastrados'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartStudy(todosOsCardsDaMateria, grupo.materiaNome);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                          title="Praticar apenas esta disciplina"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">Praticar Matéria</span>
                        </button>

                        <button
                          type="button"
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          {isColapsada ? (
                            <ChevronRight className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo da Matéria: Lista de Tópicos e Seus Cards */}
                    {!isColapsada && (
                      <div className="p-4 sm:p-6 space-y-6">
                        {grupo.topicos.map((topico) => (
                          <div key={topico.topicoNome} className="space-y-3">
                            {/* Cabeçalho do Tópico */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                              <div className="flex items-center gap-2 min-w-0">
                                <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate font-mono">
                                  {topico.topicoNome}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0 font-medium">
                                {topico.cards.length} {topico.cards.length === 1 ? 'card' : 'cards'}
                              </span>
                            </div>

                            {/* Grade de Cards do Tópico */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                              {topico.cards.map((card, idx) => (
                                <div
                                  key={card.id || idx}
                                  className="p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border-2 border-zinc-200 dark:border-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-700 space-y-3 flex flex-col justify-between shadow-2xs transition-all"
                                >
                                  <div className="space-y-2">
                                    <div className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5 font-semibold">
                                      <span>Card #{idx + 1}</span>
                                      <div className="flex items-center gap-2">
                                        <span>Intervalo: {card.intervaloDias || 1}d</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCard(card.id)}
                                          className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                          title="Apagar card do acervo"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Tag de Subtópico Específico se houver */}
                                    {card.subtopicoNome && (
                                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md truncate">
                                        <Tag className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">Subtópico: {card.subtopicoNome}</span>
                                      </div>
                                    )}

                                    {/* Pergunta / Conceito Frente */}
                                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-3 leading-snug">
                                      {card.frente}
                                    </div>

                                    {/* Resposta Protegida (Anti-spoiler) */}
                                    <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/70 flex items-center justify-between">
                                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                        <Lock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                        <span>Resposta oculta (visível na edição/estudo)</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                                    <span>Repetições: {card.repeticoes || 0}</span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCard(card.id)}
                                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors cursor-pointer"
                                        title="Apagar card sem abrir edição"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(card)}
                                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Edit2 className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                                        <span>Editar</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Modal Gerador de Flashcards via IA (Escopo Cascata) */}
      {isIaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Gerar Flashcards com IA (Escopo Cascata)
                </h3>
              </div>
              <button
                type="button"
                onClick={fecharModalIaOuCancelar}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Seleção do Edital / Plano */}
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
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo} ({p.cargoAlvo || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bloco de Marcação: Matéria Específica */}
              <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
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
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Selecionar matéria específica
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

              {/* Bloco de Marcação: Tópico Específico */}
              {filterMateria && selectedMateriaId && (
                <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
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
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Selecionar tópico específico
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

              {/* Bloco de Marcação: Subtópico Específico */}
              {filterTopico && selectedTopicoId && subtopicosDisponiveis.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
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
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Selecionar subtópico específico (Foco cirúrgico)
                    </span>
                  </label>

                  {filterSubtopico && (
                    <div className="pt-2 animate-in fade-in">
                      <select
                        value={selectedSubtopico}
                        onChange={(e) => setSelectedSubtopico(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {subtopicosDisponiveis.map((s, sIdx) => (
                          <option key={s.id || sIdx} value={s.id || s.titulo}>
                            {s.titulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Slider de Quantidade e Limite Dinâmico */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 font-semibold">
                  <span>Quantidade de Flashcards:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    Máx: {maxQuantidade} cards para este escopo
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={maxQuantidade}
                    value={quantidadeCards}
                    onChange={(e) => setQuantidadeCards(parseInt(e.target.value, 10))}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={1}
                    max={maxQuantidade}
                    value={quantidadeCards}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setQuantidadeCards(Math.max(1, Math.min(maxQuantidade, val)));
                    }}
                    className="w-16 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-center text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={fecharModalIaOuCancelar}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={isGenerating ? handleCancelarGeracao : handleGerarIa}
                className={
                  isGenerating
                    ? 'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer animate-pulse'
                    : 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer'
                }
              >
                {isGenerating ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancelar Geração</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar {quantidadeCards} Flashcards</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal de Criação Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Criar Flashcard Manual</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção Opcional de Matéria e Tópico para Catalogar */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Organizar na Árvore (Opcional):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={selectedMateriaId}
                    onChange={(e) => {
                      setSelectedMateriaId(e.target.value);
                      setFilterMateria(!!e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Geral / Sem Matéria</option>
                    {materiasDisponiveis.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTopicoId}
                    onChange={(e) => {
                      setSelectedTopicoId(e.target.value);
                      setFilterTopico(!!e.target.value);
                    }}
                    disabled={!selectedMateriaId}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 disabled:opacity-50 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Geral / Sem Tópico</option>
                    {topicosDisponiveis.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5 font-semibold">
                  Frente do Cartão (Pergunta / Conceito / Artigo de Lei):
                </label>
                <textarea
                  rows={3}
                  value={manualFrente}
                  onChange={(e) => setManualFrente(e.target.value)}
                  placeholder="Ex: Qual o prazo prescricional para cobrança de tributos?"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5 font-semibold">
                  Verso do Cartão (Resposta / Mnemônico / Explicação):
                </label>
                <textarea
                  rows={3}
                  value={manualVerso}
                  onChange={(e) => setManualVerso(e.target.value)}
                  placeholder="Ex: 5 anos a contar da data de sua constituição definitiva (CTN, art. 174)."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarManual}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar Flashcard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal de Edição de Flashcard Cadastrado (Resposta Revelada Apenas na Aba de Resposta) */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Editar Flashcard Cadastrado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas de Navegação da Edição: Frente vs Verso */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border-2 border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditTab('frente')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  editTab === 'frente'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-400 shadow-xs border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                1. Frente (Pergunta / Conceito)
              </button>
              <button
                type="button"
                onClick={() => setEditTab('verso')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  editTab === 'verso'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <span>2. Área de Resposta (Verso)</span>
                {editTab !== 'verso' && <Lock className="w-3 h-3 text-zinc-400" />}
              </button>
            </div>

            {/* Conteúdo da Aba Ativa */}
            {editTab === 'frente' ? (
              <div className="space-y-2 animate-in fade-in">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-semibold block">
                  Pergunta / Conceito (Frente do Card):
                </label>
                <textarea
                  rows={4}
                  value={editFrente}
                  onChange={(e) => setEditFrente(e.target.value)}
                  placeholder="Digite a pergunta ou conceito do flashcard..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                  💡 A resposta está oculta. Para ver ou ajustar o gabarito/explicação deste card, clique na aba <strong>"2. Área de Resposta"</strong> acima.
                </div>
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold block">
                    Resposta / Fundamentação (Verso do Card):
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Modo de Edição Ativo</span>
                </div>
                <textarea
                  rows={5}
                  value={editVerso}
                  onChange={(e) => setEditVerso(e.target.value)}
                  placeholder="Digite a resposta correta, prazo ou explicação detalhada..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-2 border-emerald-500/50 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <div className="text-[10px] font-mono text-zinc-500">
                  Esta resposta continuará oculta no acervo e será revelada ao estudante apenas durante a sessão de revisão SM-2.
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t-2 border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleDeleteCard(editingCard.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Card</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Flashcard */}
      <ConfirmModal
        isOpen={cardParaExcluir !== null}
        title="Excluir Flashcard"
        description="Deseja realmente remover este flashcard do acervo? Os dados de repetição espaçada SM-2 vinculados serão excluídos permanentemente."
        confirmLabel="Excluir Flashcard"
        variant="danger"
        isLoading={isExcluindoCard}
        onConfirm={handleConfirmarExclusaoCard}
        onClose={() => {
          if (!isExcluindoCard) setCardParaExcluir(null);
        }}
      />
    </div>
  );
};

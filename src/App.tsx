import { useState, useEffect } from 'react';
import { Loader2, Menu, Sparkles, Flame } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavView } from './components/layout/Sidebar';
import { StudyTree } from './components/study-tree/StudyTree';
import { PlanosListView } from './components/study-tree/PlanosListView';
import { Workpad } from './components/workpad/Workpad';
import type { TicketType } from './components/workpad/Workpad';
import { ScheduleView } from './components/schedule/ScheduleView';
import { SimuladoView } from './components/simulado/SimuladoView';
import { FlashcardsView } from './components/flashcards/FlashcardsView';
import { EssayLabView } from './components/essay/EssayLabView';
import { EditalParserView } from './components/edital/EditalParserView';
import { PerformanceView } from './components/analytics/PerformanceView';
import { AuthScreen } from './components/auth/AuthScreen';
import { ProfileModal } from './components/profile/ProfileModal';
import { TreeItemModal } from './components/study-tree/TreeItemModal';
import type { TreeItemType, TreeItemMode, TreeItemFormData } from './components/study-tree/TreeItemModal';
import { ConfirmModal } from './components/common/ConfirmModal';
import { AiQuotaExceededModal } from './components/common/AiQuotaExceededModal';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { planoService, sessaoService, gamificacaoService, authService, ApiService } from './services';
import type { Topico, Materia, PlanoEstudo } from './types';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      const user = localStorage.getItem('skillnapse_user');
      if (user) {
        return JSON.parse(user).email || 'estudante@skillnapse.ai';
      }
    } catch {
      // Ignora erro
    }
    return 'estudante@skillnapse.ai';
  });

  const [userName, setUserName] = useState<string>(() => {
    try {
      const user = localStorage.getItem('skillnapse_user');
      if (user) {
        return JSON.parse(user).nome || '';
      }
    } catch {
      // Ignora erro
    }
    return '';
  });

  const [cargoAlvo, setCargoAlvo] = useState<string>(() => {
    try {
      const user = localStorage.getItem('skillnapse_user');
      if (user) {
        return JSON.parse(user).cargoAlvo || '';
      }
    } catch {
      // Ignora erro
    }
    return '';
  });

  const [dailyGoalHours, setDailyGoalHours] = useState<number>(() => {
    try {
      const goal = localStorage.getItem('skillnapse_daily_goal');
      if (goal) {
        const parsed = parseFloat(goal);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // Ignora erro
    }
    return 3;
  });

  const [dailyGoalQuestions, setDailyGoalQuestions] = useState<number>(() => {
    try {
      const goal = localStorage.getItem('skillnapse_daily_goal_questions');
      if (goal) {
        const parsed = parseInt(goal, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {
      // Ignora erro
    }
    return 15;
  });

  const [questionsAnsweredToday, setQuestionsAnsweredToday] = useState<number>(0);

  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<NavView>('tree');
  const [plano, setPlano] = useState<PlanoEstudo | null>(null);
  const [planosLista, setPlanosLista] = useState<PlanoEstudo[]>([]);
  const [isViewingTreeDetail, setIsViewingTreeDetail] = useState<boolean>(false);
  const [isLoadingPlano, setIsLoadingPlano] = useState<boolean>(true);

  // Selected topic and subject for the Knowledge Tree & Workpad split-view
  const [selectedTopic, setSelectedTopic] = useState<Topico | null>(null);
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null);
  const [activeWorkpadTicket, setActiveWorkpadTicket] = useState<TicketType | null>(null);

  // Gamification state
  const [streakCount, setStreakCount] = useState(0);
  const [totalStudySecondsToday, setTotalStudySecondsToday] = useState(0);

  // Practice shortcut filter states
  const [simuladoFilter, setSimuladoFilter] = useState<{
    planoId?: string;
    materiaId?: string;
    topicoId?: string;
    subtopicoId?: string;
  } | null>(null);
  const [targetSimuladoId, setTargetSimuladoId] = useState<string | null>(null);

  const [flashcardFilter, setFlashcardFilter] = useState<{
    planoId?: string;
    materiaId?: string;
    materiaNome?: string;
    topicoId?: string;
    topicoNome?: string;
    subtopicoId?: string;
    subtopicoNome?: string;
  } | null>(null);

  // Knowledge Tree Item Modal State
  const [treeModalConfig, setTreeModalConfig] = useState<{
    isOpen: boolean;
    mode: TreeItemMode;
    type: TreeItemType;
    initialData?: Partial<TreeItemFormData>;
    parentId?: string;
    materiaId?: string;
    planoId?: string;
    rawEntity?: any;
  } | null>(null);
  const [isTreeModalLoading, setIsTreeModalLoading] = useState(false);

  // Destructive Actions Custom Confirmation Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmModalLoading, setIsConfirmModalLoading] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaModalMessage, setQuotaModalMessage] = useState<string | undefined>(undefined);

  const carregarDadosIniciais = () => {
    setIsLoadingPlano(true);

    planoService
      .listarPlanos()
      .then((todos) => {
        setPlanosLista(todos || []);
      })
      .catch((err) => {
        console.error('Erro ao listar planos:', err);
      });

    planoService
      .obterPlanoAtivo()
      .then((fetchedPlano) => {
        if (fetchedPlano) {
          const planoNormalizado: PlanoEstudo = {
            ...fetchedPlano,
            materias: fetchedPlano.materias || [],
          };
          setPlano(planoNormalizado);
          setSelectedMateria(null);
          setSelectedTopic(null);
          setActiveWorkpadTicket(null);
        } else {
          setPlano(null);
          setSelectedMateria(null);
          setSelectedTopic(null);
          setActiveWorkpadTicket(null);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar plano ativo:', err);
        setPlano(null);
      })
      .finally(() => {
        setIsLoadingPlano(false);
      });

    gamificacaoService.obterOfensiva().then((ofensiva) => {
      if (ofensiva?.totalDiasConsecutivos !== undefined) {
        setStreakCount(ofensiva.totalDiasConsecutivos);
      }
    });

    sessaoService.obterResumoHoje().then((resumo) => {
      if (resumo?.totalSegundosEstudados !== undefined) {
        setTotalStudySecondsToday(resumo.totalSegundosEstudados);
      }
    });

    gamificacaoService.obterProgressoMetas().then((progresso) => {
      if (progresso) {
        if (progresso.questoesResolvidasHoje !== undefined) {
          setQuestionsAnsweredToday(progresso.questoesResolvidasHoje);
        }
        if (progresso.metaQuestoesResolvidas !== undefined) {
          setDailyGoalQuestions(progresso.metaQuestoesResolvidas);
          try {
            localStorage.setItem('skillnapse_daily_goal_questions', progresso.metaQuestoesResolvidas.toString());
          } catch {
            // Ignora erro
          }
        }
        if (progresso.minutosMetaDiaria !== undefined && progresso.minutosMetaDiaria > 0) {
          const hours = progresso.minutosMetaDiaria / 60;
          setDailyGoalHours(hours);
          try {
            localStorage.setItem('skillnapse_daily_goal', hours.toString());
          } catch {
            // Ignora erro
          }
        }
      }
    });
  };

  // Checagem ativa na inicialização / reinicialização da aplicação
  useEffect(() => {
    let isMounted = true;

    const checarAutenticacaoInicial = async () => {
      const token = ApiService.getToken();
      const refreshToken = ApiService.getRefreshToken();
      if (!token && !refreshToken) {
        authService.logout();
        if (isMounted) {
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
        }
        return;
      }

      // Valida com o backend (/auth/me) se o token JWT é realmente válido e a sessão está ativa
      const usuario = await authService.verificarSessao();
      if (isMounted) {
        if (usuario) {
          setIsAuthenticated(true);
          if (usuario.email) setUserEmail(usuario.email);
          if (usuario.nome) setUserName(usuario.nome);
        } else {
          // Token inválido, expirado ou backend reiniciado
          authService.logout();
          setIsAuthenticated(false);
        }
        setIsCheckingAuth(false);
      }
    };

    checarAutenticacaoInicial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Escuta deslogamento forçado emitido pelo ApiService (quando 401 não pode ser renovado)
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setPlano(null);
      setPlanosLista([]);
      setSelectedTopic(null);
      setSelectedMateria(null);
      setActiveWorkpadTicket(null);
    };

    window.addEventListener('skillnapse:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('skillnapse:unauthorized', handleUnauthorized);
  }, []);

  // Escuta estouro de limite de requisições / cota diária de IA
  useEffect(() => {
    const handleQuotaExceeded = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      setQuotaModalMessage(customEvent.detail?.message);
      setIsQuotaModalOpen(true);
    };

    window.addEventListener('skillnapse:quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('skillnapse:quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      carregarDadosIniciais();
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = () => {
    try {
      const user = localStorage.getItem('skillnapse_user');
      if (user) {
        const parsed = JSON.parse(user);
        setUserEmail(parsed.email || 'estudante@skillnapse.ai');
        if (parsed.nome) setUserName(parsed.nome);
        if (parsed.cargoAlvo) setCargoAlvo(parsed.cargoAlvo);
      }
    } catch {
      // Ignora
    }
    setIsAuthenticated(true);
    setIsCheckingAuth(false);
    carregarDadosIniciais();
  };

  const handleSaveProfile = (data: {
    userName: string;
    dailyGoalHours: number;
    dailyGoalQuestions?: number;
    cargoAlvo?: string;
  }) => {
    setUserName(data.userName);
    setDailyGoalHours(data.dailyGoalHours);
    if (data.dailyGoalQuestions !== undefined) {
      setDailyGoalQuestions(data.dailyGoalQuestions);
    }
    if (data.cargoAlvo !== undefined) {
      setCargoAlvo(data.cargoAlvo);
    }

    try {
      const userRaw = localStorage.getItem('skillnapse_user');
      const currentUser = userRaw ? JSON.parse(userRaw) : {};
      const updatedUser = {
        ...currentUser,
        nome: data.userName,
        cargoAlvo: data.cargoAlvo,
      };
      localStorage.setItem('skillnapse_user', JSON.stringify(updatedUser));
      localStorage.setItem('skillnapse_daily_goal', data.dailyGoalHours.toString());
      if (data.dailyGoalQuestions !== undefined) {
        localStorage.setItem('skillnapse_daily_goal_questions', data.dailyGoalQuestions.toString());
      }
      gamificacaoService
        .atualizarMetas(
          data.dailyGoalHours * 60,
          data.dailyGoalQuestions !== undefined ? data.dailyGoalQuestions : dailyGoalQuestions
        )
        .then(() => {
          carregarDadosIniciais();
        });
    } catch (e) {
      console.error('Erro ao salvar preferências do usuário:', e);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setPlano(null);
    setPlanosLista([]);
    setSelectedTopic(null);
    setSelectedMateria(null);
  };

  const handleClearSelection = () => {
    setSelectedTopic(null);
    setSelectedMateria(null);
    setActiveWorkpadTicket(null);
  };

  const handleSelectTopic = (topic: Topico | null, materia?: Materia | null) => {
    if (!topic || selectedTopic?.id === topic.id) {
      handleClearSelection();
      return;
    }
    setSelectedTopic(topic);
    setSelectedMateria(materia || null);
    if (currentView !== 'tree') {
      setCurrentView('tree');
    }
  };

  const handleOpenWorkpad = (
    topic: Topico,
    materia?: Materia | null,
    tab: TicketType = 'pomodoro'
  ) => {
    setSelectedTopic(topic);
    setSelectedMateria(materia || null);
    setActiveWorkpadTicket(tab);
    if (currentView !== 'tree') {
      setCurrentView('tree');
    }
  };

  const handleSessionComplete = async (seconds: number) => {
    setTotalStudySecondsToday((prev) => prev + seconds);
    setStreakCount((prev) => (prev === 0 ? 1 : prev));

    // Atualiza localmente o tempo líquido no tópico selecionado
    if (selectedTopic) {
      setSelectedTopic((prev) =>
        prev
          ? {
              ...prev,
              tempoLiquidoSegundos: (prev.tempoLiquidoSegundos || 0) + seconds,
            }
          : null
      );
    }

    // Atualiza também na árvore de matérias/tópicos do plano ativo em memória
    setPlano((prevPlano) => {
      if (!prevPlano) return null;
      return {
        ...prevPlano,
        materias: prevPlano.materias.map((mat) => ({
          ...mat,
          topicos: (mat.topicos || []).map((top) => {
            if (top.id === selectedTopic?.id) {
              return {
                ...top,
                tempoLiquidoSegundos: (top.tempoLiquidoSegundos || 0) + seconds,
              };
            }
            return {
              ...top,
              subtopicos: (top.subtopicos || []).map((sub) =>
                sub.id === selectedTopic?.id
                  ? {
                      ...sub,
                      tempoLiquidoSegundos: (sub.tempoLiquidoSegundos || 0) + seconds,
                    }
                  : sub
              ),
            };
          }),
        })),
      };
    });

    const targetTopicId =
      selectedTopic?.id && selectedTopic.id !== 'geral'
        ? selectedTopic.id
        : plano?.materias?.[0]?.topicos?.[0]?.id;

    if (targetTopicId && targetTopicId !== 'geral') {
      try {
        await sessaoService.registrarSessao({
          topicoId: targetTopicId,
          duracaoLiquidaSegundos: seconds,
          status: 'CONCLUIDA',
        });
        const [resumo, ofensiva] = await Promise.all([
          sessaoService.obterResumoHoje(),
          gamificacaoService.obterOfensiva(),
        ]);
        if (resumo?.totalSegundosEstudados !== undefined) {
          setTotalStudySecondsToday(resumo.totalSegundosEstudados);
        }
        if (ofensiva?.totalDiasConsecutivos !== undefined) {
          setStreakCount(ofensiva.totalDiasConsecutivos);
        }
      } catch (err) {
        console.error('Erro ao sincronizar sessão de estudo com a API:', err);
      }
    }
  };

  // --- CRUD PLANO DE ESTUDO ---
  const handleCreatePlano = () => {
    setTreeModalConfig({
      isOpen: true,
      mode: 'create',
      type: 'plano',
    });
  };

  const handleEditPlano = (planoAtual: PlanoEstudo) => {
    setTreeModalConfig({
      isOpen: true,
      mode: 'edit',
      type: 'plano',
      initialData: {
        titulo: planoAtual.titulo,
        cargoAlvo: planoAtual.cargoAlvo || '',
        descricao: planoAtual.descricao || '',
      },
      rawEntity: planoAtual,
    });
  };

  const handleDeletePlano = (planoId: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Plano de Estudos',
      description:
        'ATENÇÃO: Deseja realmente excluir este Plano de Estudo? Todas as disciplinas, tópicos, anotações e histórico associados serão removidos permanentemente.',
      confirmLabel: 'Excluir Plano',
      variant: 'danger',
      onConfirm: async () => {
        setIsConfirmModalLoading(true);
        try {
          await planoService.excluirPlano(planoId);
          setPlanosLista((prev) => prev.filter((p) => p.id !== planoId));
          if (plano?.id === planoId) {
            setPlano(null);
            setIsViewingTreeDetail(false);
            setSelectedTopic(null);
            setSelectedMateria(null);
            setActiveWorkpadTicket(null);
          }
          setConfirmModalConfig(null);
        } catch (err) {
          console.error('Erro ao excluir plano:', err);
        } finally {
          setIsConfirmModalLoading(false);
        }
      },
    });
  };

  // --- CRUD MATÉRIA ---
  const handleAddMateria = () => {
    if (!plano) return;
    setTreeModalConfig({
      isOpen: true,
      mode: 'create',
      type: 'materia',
      planoId: plano.id,
    });
  };

  const handleEditMateria = (materia: Materia) => {
    setTreeModalConfig({
      isOpen: true,
      mode: 'edit',
      type: 'materia',
      initialData: {
        titulo: materia.nome,
        corHex: materia.corHex,
      },
      rawEntity: materia,
    });
  };

  const handleDeleteMateria = (materiaId: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Disciplina',
      description:
        'Deseja realmente remover esta disciplina? Todos os tópicos, subtópicos e cadernos vinculados a ela serão excluídos.',
      confirmLabel: 'Excluir Disciplina',
      variant: 'danger',
      onConfirm: async () => {
        setIsConfirmModalLoading(true);
        try {
          await planoService.excluirMateria(materiaId);
          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  materias: (prev.materias || []).filter((m) => m.id !== materiaId),
                }
              : null
          );
          if (selectedMateria?.id === materiaId) {
            setSelectedTopic(null);
            setSelectedMateria(null);
            setActiveWorkpadTicket(null);
          }
          setConfirmModalConfig(null);
        } catch (err) {
          console.error('Erro ao excluir matéria:', err);
        } finally {
          setIsConfirmModalLoading(false);
        }
      },
    });
  };

  // --- CRUD TÓPICOS E SUBTÓPICOS ---
  const handleAddTopic = (materiaId: string) => {
    setTreeModalConfig({
      isOpen: true,
      mode: 'create',
      type: 'topico',
      materiaId,
    });
  };

  const handleAddSubtopic = (parentTopicId: string, materiaId: string) => {
    setTreeModalConfig({
      isOpen: true,
      mode: 'create',
      type: 'subtopico',
      parentId: parentTopicId,
      materiaId,
    });
  };

  const handleEditTopic = (topico: Topico) => {
    setTreeModalConfig({
      isOpen: true,
      mode: 'edit',
      type: 'topico',
      initialData: {
        titulo: topico.titulo,
        peso: topico.peso,
      },
      rawEntity: topico,
    });
  };

  const handleSaveTreeModal = async (formData: TreeItemFormData) => {
    if (!treeModalConfig) return;
    const { mode, type, parentId, materiaId, rawEntity } = treeModalConfig;
    setIsTreeModalLoading(true);

    try {
      if (type === 'plano') {
        if (mode === 'create') {
          const novo = await planoService.criarPlano({
            titulo: formData.titulo,
            cargoAlvo: formData.cargoAlvo || 'Geral',
            descricao: formData.descricao || undefined,
          });
          const planoCriado: PlanoEstudo = {
            ...novo,
            materias: novo.materias || [],
          };
          setPlano(planoCriado);
          setPlanosLista((prev) => [planoCriado, ...prev]);
          setIsViewingTreeDetail(true);
          setSelectedTopic(null);
          setSelectedMateria(null);
        } else {
          const planoAtual = rawEntity as PlanoEstudo;
          await planoService.editarPlano(planoAtual.id, {
            titulo: formData.titulo,
            descricao: formData.descricao,
          });
          const novoTitulo = formData.titulo;
          const novoCargo = formData.cargoAlvo || planoAtual.cargoAlvo;
          const novaDescricao = formData.descricao !== undefined ? formData.descricao : planoAtual.descricao;
          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  titulo: novoTitulo,
                  cargoAlvo: novoCargo,
                  descricao: novaDescricao,
                }
              : null
          );
          setPlanosLista((prev) =>
            prev.map((p) =>
              p.id === planoAtual.id
                ? { ...p, titulo: novoTitulo, cargoAlvo: novoCargo, descricao: novaDescricao }
                : p
            )
          );
        }
      } else if (type === 'materia') {
        if (mode === 'create') {
          if (!plano) return;
          const nova = await planoService.criarMateria(plano.id, {
            nome: formData.titulo,
            corHex: formData.corHex || '#3b82f6',
            ordem: (plano.materias?.length || 0) + 1,
          });
          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  materias: [...(prev.materias || []), nova],
                }
              : null
          );
        } else {
          const materiaAtual = rawEntity as Materia;
          const novoNome = formData.titulo;
          const novaCorHex = formData.corHex || materiaAtual.corHex;
          await planoService.editarMateria(materiaAtual.id, {
            nome: novoNome,
            corHex: novaCorHex,
          });
          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  materias: (prev.materias || []).map((m) =>
                    m.id === materiaAtual.id
                      ? { ...m, nome: novoNome, corHex: novaCorHex }
                      : m
                  ),
                }
              : null
          );
          if (selectedMateria?.id === materiaAtual.id) {
            setSelectedMateria((prev) =>
              prev ? { ...prev, nome: novoNome, corHex: novaCorHex } : null
            );
          }
        }
      } else if (type === 'topico') {
        if (mode === 'create') {
          if (!materiaId) return;
          const novo = await planoService.criarTopico(materiaId, {
            titulo: formData.titulo,
            peso: formData.peso || 8,
            ordem: 99,
          });
          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  materias: (prev.materias || []).map((m) =>
                    m.id === materiaId
                      ? { ...m, topicos: [...(m.topicos || []), novo] }
                      : m
                  ),
                }
              : null
          );
          setSelectedTopic(novo);
        } else {
          const topicoAtual = rawEntity as Topico;
          const novoTitulo = formData.titulo;
          const novoPeso = formData.peso ?? topicoAtual.peso;
          await planoService.editarTopico(topicoAtual.id, {
            titulo: novoTitulo,
            peso: novoPeso,
          });
          const atualizarTopico = (topicos: Topico[]): Topico[] => {
            return topicos.map((t) => {
              if (t.id === topicoAtual.id) {
                return { ...t, titulo: novoTitulo, peso: novoPeso };
              }
              if (t.subtopicos && t.subtopicos.length > 0) {
                return { ...t, subtopicos: atualizarTopico(t.subtopicos) };
              }
              return t;
            });
          };
          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  materias: (prev.materias || []).map((m) => ({
                    ...m,
                    topicos: atualizarTopico(m.topicos || []),
                  })),
                }
              : null
          );
          if (selectedTopic?.id === topicoAtual.id) {
            setSelectedTopic((prev) =>
              prev ? { ...prev, titulo: novoTitulo, peso: novoPeso } : null
            );
          }
        }
      } else if (type === 'subtopico') {
        if (mode === 'create') {
          if (!materiaId || !parentId) return;
          const novoSub = await planoService.criarTopico(materiaId, {
            titulo: formData.titulo,
            peso: formData.peso || 5,
            topicoPaiId: parentId,
            ordem: 99,
          });
          const inserirSub = (topicos: Topico[]): Topico[] => {
            return topicos.map((t) => {
              if (t.id === parentId) {
                return {
                  ...t,
                  subtopicos: [...(t.subtopicos || []), novoSub],
                };
              }
              if (t.subtopicos && t.subtopicos.length > 0) {
                return {
                  ...t,
                  subtopicos: inserirSub(t.subtopicos),
                };
              }
              return t;
            });
          };
          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  materias: (prev.materias || []).map((m) =>
                    m.id === materiaId
                      ? { ...m, topicos: inserirSub(m.topicos || []) }
                      : m
                  ),
                }
              : null
          );
          setSelectedTopic(novoSub);
        }
      }

      setTreeModalConfig(null);
    } catch (err) {
      console.error('Erro ao salvar item na árvore:', err);
      throw err;
    } finally {
      setIsTreeModalLoading(false);
    }
  };


  const handleDeleteTopic = (topicId: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Tópico / Subtópico',
      description:
        'Deseja realmente remover este tópico? Todos os subtópicos vinculados e notas associadas serão removidos da árvore de conhecimento.',
      confirmLabel: 'Excluir Tópico',
      variant: 'danger',
      onConfirm: async () => {
        setIsConfirmModalLoading(true);
        try {
          await planoService.excluirTopico(topicId);

          const removerTopico = (topicos: Topico[]): Topico[] => {
            return topicos
              .filter((t) => t.id !== topicId)
              .map((t) => ({
                ...t,
                subtopicos: t.subtopicos ? removerTopico(t.subtopicos) : [],
              }));
          };

          setPlano((prev) =>
            prev
              ? {
                  ...prev,
                  materias: (prev.materias || []).map((m) => ({
                    ...m,
                    topicos: removerTopico(m.topicos || []),
                  })),
                }
              : null
          );

          if (selectedTopic?.id === topicId) {
            setSelectedTopic(null);
            setActiveWorkpadTicket(null);
          }
          setConfirmModalConfig(null);
        } catch (err) {
          console.error('Erro ao excluir tópico:', err);
        } finally {
          setIsConfirmModalLoading(false);
        }
      },
    });
  };

  const handlePraticarSimulado = (params: {
    planoId?: string;
    materiaId?: string;
    topicoId?: string;
    subtopicoId?: string;
  }) => {
    setTargetSimuladoId(null);
    setSimuladoFilter(params);
    setCurrentView('simulado');
  };

  const handleNavigateToSimuladoFromAnalytics = (simuladoId?: string) => {
    setTargetSimuladoId(simuladoId || null);
    setSimuladoFilter(null);
    setCurrentView('simulado');
  };

  const handlePraticarFlashcards = (params: {
    planoId?: string;
    materiaId?: string;
    materiaNome?: string;
    topicoId?: string;
    topicoNome?: string;
    subtopicoId?: string;
    subtopicoNome?: string;
  }) => {
    setFlashcardFilter(params);
    setCurrentView('flashcards');
  };

  const handleStartStudyTopic = async (materiaId?: string, topicoId?: string) => {
    let targetPlano = plano;

    const findInPlan = (p: PlanoEstudo): { materia: Materia | null; topico: Topico | null } | null => {
      for (const m of p.materias || []) {
        const searchTopics = (topics: Topico[]): Topico | null => {
          for (const t of topics) {
            if (t.id === topicoId) return t;
            if (t.subtopicos && t.subtopicos.length > 0) {
              const sub = searchTopics(t.subtopicos);
              if (sub) return sub;
            }
          }
          return null;
        };

        if (topicoId) {
          const t = searchTopics(m.topicos || []);
          if (t) {
            return { materia: m, topico: t };
          }
        } else if (materiaId && m.id === materiaId) {
          return { materia: m, topico: m.topicos?.[0] || null };
        }
      }
      return null;
    };

    if (targetPlano) {
      const found = findInPlan(targetPlano);
      if (found) {
        setSelectedMateria(found.materia);
        setSelectedTopic(found.topico);
        setActiveWorkpadTicket('pomodoro');
        setIsViewingTreeDetail(true);
        setCurrentView('tree');
        return;
      }
    }

    // Se não encontrou no ativo, procurar em todos os planos da lista
    for (const p of planosLista) {
      if (p.id === targetPlano?.id) continue;
      const found = findInPlan(p);
      if (found) {
        setPlano(p);
        setSelectedMateria(found.materia);
        setSelectedTopic(found.topico);
        setActiveWorkpadTicket('pomodoro');
        setIsViewingTreeDetail(true);
        setCurrentView('tree');
        return;
      }
    }

    // Se temos materiaId mas o plano ainda não foi carregado com filhos, tenta buscar completo
    if (materiaId) {
      for (const p of planosLista) {
        try {
          const completo = await planoService.obterPlanoPorId(p.id);
          if (completo) {
            const found = findInPlan(completo);
            if (found) {
              setPlano(completo);
              setSelectedMateria(found.materia);
              setSelectedTopic(found.topico);
              setActiveWorkpadTicket('pomodoro');
              setIsViewingTreeDetail(true);
              setCurrentView('tree');
              return;
            }
          }
        } catch {
          // Continua
        }
      }
    }

    // Fallback: abre a árvore
    setIsViewingTreeDetail(true);
    setCurrentView('tree');
  };

  // 1. Enquanto checa autenticação real com a API, exibe tela de carregamento suave
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-screen bg-slate-900 dark:bg-zinc-950 items-center justify-center text-zinc-100 flex-col gap-3 font-sans select-none">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-mono text-zinc-400">Verificando autenticação...</span>
      </div>
    );
  }

  // 2. Se não autenticado (ou sessão expirada/desconectada), exige login na AuthScreen
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none print:h-auto print:w-auto print:overflow-visible print:bg-white print:text-zinc-900">
      {/* 0. Mobile Top Header (h-14, visible only on mobile md:hidden) */}
      <header className="h-14 bg-white/95 dark:bg-zinc-950/90 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between shrink-0 md:hidden z-30 backdrop-blur-md">
        {/* Hamburger Menu & Brand */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Abrir Menu de Navegação"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-xs tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
              SkillNapse
              <span className="text-[9px] font-mono uppercase bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-1 py-0.2 rounded border border-indigo-200 dark:border-indigo-500/30">
                PRO
              </span>
            </span>
          </div>
        </div>

        {/* Right Quick Stats & Avatar */}
        <div className="flex items-center gap-2">
          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 cursor-pointer"
            title={`${streakCount} dias de ofensiva`}
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{streakCount}d</span>
          </div>

          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer"
            title="Abrir Perfil"
          >
            {(userName || userEmail || 'SN').slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>

      {/* 1. Left Slim Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          setIsMobileMenuOpen(false);
        }}
        streakCount={streakCount}
        totalStudySecondsToday={totalStudySecondsToday}
        questionsAnsweredToday={questionsAnsweredToday}
        dailyGoalQuestions={dailyGoalQuestions}
        userEmail={userEmail}
        userName={userName}
        dailyGoalHours={dailyGoalHours}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 h-[calc(100vh-3.5rem)] md:h-screen flex overflow-hidden print:h-auto print:w-full print:overflow-visible print:p-0">
        {currentView === 'tree' && (
          isLoadingPlano && planosLista.length === 0 ? (
            <div className="flex-1 h-full flex items-center justify-center text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : !isViewingTreeDetail || !plano ? (
            <PlanosListView
              planos={planosLista}
              onSelectPlano={async (p) => {
                setPlano(p);
                setIsViewingTreeDetail(true);
                setSelectedMateria(null);
                setSelectedTopic(null);
                setActiveWorkpadTicket(null);
                try {
                  const completo = await planoService.obterPlanoPorId(p.id);
                  if (completo) {
                    setPlano(completo);
                    setSelectedMateria(null);
                    setSelectedTopic(null);
                    setActiveWorkpadTicket(null);
                  }
                } catch (err) {
                  console.error('Erro ao carregar detalhes do plano:', err);
                }
              }}
              onCreatePlano={handleCreatePlano}
              onGoToEdital={() => setCurrentView('edital')}
              onEditPlano={handleEditPlano}
              onDeletePlano={handleDeletePlano}
              isLoading={isLoadingPlano}
            />
          ) : (
            <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden">
              {/* Center: Árvore de Conhecimento */}
              <StudyTree
                plano={plano}
                selectedTopicId={selectedTopic?.id || null}
                onSelectTopic={handleSelectTopic}
                onOpenWorkpad={handleOpenWorkpad}
                onBackToList={() => setIsViewingTreeDetail(false)}
                onEditPlano={handleEditPlano}
                onDeletePlano={handleDeletePlano}
                onAddMateria={handleAddMateria}
                onEditMateria={handleEditMateria}
                onDeleteMateria={handleDeleteMateria}
                onAddTopic={handleAddTopic}
                onAddSubtopic={handleAddSubtopic}
                onEditTopic={handleEditTopic}
                onDeleteTopic={handleDeleteTopic}
                onPraticarSimulado={handlePraticarSimulado}
                onPraticarFlashcards={handlePraticarFlashcards}
              />

              {/* Right: Workpad Lateral Retrátil com Tickets */}
              <Workpad
                topic={selectedTopic}
                materia={selectedMateria || undefined}
                planoId={plano?.id || planosLista[0]?.id}
                activeTicket={activeWorkpadTicket}
                onActiveTicketChange={setActiveWorkpadTicket}
                streakCount={streakCount}
                onClose={handleClearSelection}
                onSessionComplete={handleSessionComplete}
                onQuestionAnswered={carregarDadosIniciais}
                onPraticarSimulado={handlePraticarSimulado}
                onStartSimulado={handleNavigateToSimuladoFromAnalytics}
              />
            </div>
          )
        )}

        {currentView === 'schedule' && (
          <ScheduleView
            plano={plano || planosLista[0]}
            planos={planosLista}
            onStartStudyTopic={handleStartStudyTopic}
            onStartSimulado={handlePraticarSimulado}
            onStartFlashcards={handlePraticarFlashcards}
          />
        )}

        {currentView === 'simulado' && (
          plano || planosLista.length > 0 ? (
            <SimuladoView
              plano={plano || planosLista[0]}
              planos={planosLista}
              onProficienciaAtualizada={carregarDadosIniciais}
              initialFilter={simuladoFilter}
              initialSimuladoId={targetSimuladoId}
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <h3 className="text-base font-bold text-zinc-200">Plano de Estudo Necessário</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Crie ou importe um plano de estudo para que a IA possa analisar sua matriz de matérias e calibrar simulados adaptativos.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('tree');
                  setIsViewingTreeDetail(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Ir para Planos de Estudos
              </button>
            </div>
          )
        )}

        {currentView === 'flashcards' && (
          <FlashcardsView
            planos={planosLista}
            planoAtivo={plano}
            initialFilter={flashcardFilter}
          />
        )}

        {currentView === 'essay' && <EssayLabView />}

        {currentView === 'edital' && (
          <EditalParserView
            onPlanCreated={() => {
              carregarDadosIniciais();
              setIsViewingTreeDetail(true);
              setCurrentView('tree');
            }}
          />
        )}

        {currentView === 'analytics' && (
          plano ? (
            <PerformanceView
              plano={plano}
              onNavigateToSimulado={handleNavigateToSimuladoFromAnalytics}
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <h3 className="text-base font-bold text-zinc-200">Plano de Estudo Necessário</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Cadastre um plano de estudo para acompanhar seu mapa de calor e análise de lacunas conceituais.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('tree')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Ir para Árvore de Estudos
              </button>
            </div>
          )
        )}
      </main>

      {/* 3. Modal de Perfil e Metas */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userEmail={userEmail}
        userName={userName}
        cargoAlvo={cargoAlvo}
        dailyGoalHours={dailyGoalHours}
        dailyGoalQuestions={dailyGoalQuestions}
        streakCount={streakCount}
        totalStudySecondsToday={totalStudySecondsToday}
        questionsAnsweredToday={questionsAnsweredToday}
        onSave={handleSaveProfile}
      />

      {/* 4. Modal Unificado de Criação e Edição da Árvore de Conhecimento */}
      {treeModalConfig && (
        <TreeItemModal
          isOpen={treeModalConfig.isOpen}
          mode={treeModalConfig.mode}
          type={treeModalConfig.type}
          initialData={treeModalConfig.initialData}
          isLoading={isTreeModalLoading}
          onClose={() => setTreeModalConfig(null)}
          onSave={handleSaveTreeModal}
        />
      )}

      {/* 5. Modal Customizado de Confirmação para Ações Destrutivas */}
      {confirmModalConfig && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          title={confirmModalConfig.title}
          description={confirmModalConfig.description}
          confirmLabel={confirmModalConfig.confirmLabel}
          variant={confirmModalConfig.variant}
          isLoading={isConfirmModalLoading}
          onConfirm={confirmModalConfig.onConfirm}
          onClose={() => {
            if (!isConfirmModalLoading) setConfirmModalConfig(null);
          }}
        />
      )}

      {/* 6. Modal Explicativo de Cota de IA Excedida */}
      <AiQuotaExceededModal
        isOpen={isQuotaModalOpen}
        message={quotaModalMessage}
        onClose={() => setIsQuotaModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

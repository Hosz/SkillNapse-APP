import { useState, useEffect } from 'react';
import { Sparkles, Plus, FileText, Loader2 } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavView } from './components/layout/Sidebar';
import { StudyTree } from './components/study-tree/StudyTree';
import { Workpad } from './components/workpad/Workpad';
import { ScheduleView } from './components/schedule/ScheduleView';
import { SimuladoView } from './components/simulado/SimuladoView';
import { EssayLabView } from './components/essay/EssayLabView';
import { EditalParserView } from './components/edital/EditalParserView';
import { PerformanceView } from './components/analytics/PerformanceView';
import { AuthScreen } from './components/auth/AuthScreen';
import { ThemeProvider } from './context/ThemeContext';
import { planoService, sessaoService, gamificacaoService, authService, ApiService } from './services';
import type { Topico, Materia, PlanoEstudo } from './types';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!ApiService.getToken() || !!localStorage.getItem('skillnapse_user');
  });

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

  const [currentView, setCurrentView] = useState<NavView>('tree');
  const [plano, setPlano] = useState<PlanoEstudo | null>(null);
  const [isLoadingPlano, setIsLoadingPlano] = useState<boolean>(true);

  // Selected topic and subject for the Knowledge Tree & Workpad split-view
  const [selectedTopic, setSelectedTopic] = useState<Topico | null>(null);
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null);

  // Gamification state
  const [streakCount, setStreakCount] = useState(0);
  const [totalStudySecondsToday, setTotalStudySecondsToday] = useState(0);

  const carregarDadosIniciais = () => {
    planoService
      .obterPlanoAtivo()
      .then((fetchedPlano) => {
        if (fetchedPlano) {
          setPlano(fetchedPlano);
          if (
            fetchedPlano.materias &&
            fetchedPlano.materias.length > 0 &&
            fetchedPlano.materias[0].topicos &&
            fetchedPlano.materias[0].topicos.length > 0
          ) {
            setSelectedMateria(fetchedPlano.materias[0]);
            setSelectedTopic(fetchedPlano.materias[0].topicos[0]);
          } else {
            setSelectedMateria(null);
            setSelectedTopic(null);
          }
        } else {
          setPlano(null);
          setSelectedMateria(null);
          setSelectedTopic(null);
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
  };

  useEffect(() => {
    if (isAuthenticated) {
      carregarDadosIniciais();
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = () => {
    try {
      const user = localStorage.getItem('skillnapse_user');
      if (user) {
        setUserEmail(JSON.parse(user).email || 'estudante@skillnapse.ai');
      }
    } catch {
      // Ignora
    }
    setIsAuthenticated(true);
    carregarDadosIniciais();
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  const handleSelectTopic = (topic: Topico, materia: Materia) => {
    setSelectedTopic(topic);
    setSelectedMateria(materia);
    if (currentView !== 'tree') {
      setCurrentView('tree');
    }
  };

  const handleSessionComplete = async (seconds: number) => {
    setTotalStudySecondsToday((prev) => prev + seconds);
    setStreakCount((prev) => (prev === 0 ? 1 : prev));

    if (selectedTopic) {
      await sessaoService.registrarSessao({
        topicoId: selectedTopic.id,
        duracaoLiquidaSegundos: seconds,
        status: 'CONCLUIDA',
      });
    }
  };

  // --- CRUD PLANO DE ESTUDO ---
  const handleCreatePlano = async () => {
    const titulo = prompt('Título do novo Plano de Estudos (Ex: Concurso TCU - Auditor Federal):');
    if (!titulo) return;
    const cargoAlvo = prompt('Cargo alvo (Ex: Auditor Federal de Controle Externo):') || 'Geral';

    try {
      const novo = await planoService.criarPlano({
        titulo,
        cargoAlvo,
      });
      const planoCriado: PlanoEstudo = {
        ...novo,
        materias: novo.materias || [],
      };
      setPlano(planoCriado);
      setSelectedTopic(null);
      setSelectedMateria(null);
    } catch (err) {
      console.error('Erro ao criar plano:', err);
    }
  };

  const handleEditPlano = async (planoAtual: PlanoEstudo) => {
    const novoTitulo = prompt('Editar título do Plano de Estudo:', planoAtual.titulo);
    if (!novoTitulo) return;
    const novoCargo = prompt('Editar cargo ou concurso alvo:', planoAtual.cargoAlvo || '');

    await planoService.editarPlano(planoAtual.id, {
      titulo: novoTitulo,
    });

    setPlano((prev) =>
      prev
        ? {
            ...prev,
            titulo: novoTitulo,
            cargoAlvo: novoCargo || prev.cargoAlvo,
          }
        : null
    );
  };

  const handleDeletePlano = async (planoId: string) => {
    const confirm = window.confirm(
      'ATENÇÃO: Deseja realmente excluir este Plano de Estudo e todas as suas matérias associadas?'
    );
    if (!confirm) return;

    await planoService.excluirPlano(planoId);
    setPlano(null);
    setSelectedTopic(null);
    setSelectedMateria(null);
  };

  // --- CRUD MATÉRIA ---
  const handleAddMateria = async () => {
    if (!plano) return;
    const nome = prompt('Nome da nova disciplina (Ex: Economia do Setor Público):');
    if (!nome) return;
    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const corHex = cores[Math.floor(Math.random() * cores.length)];

    const nova = await planoService.criarMateria(plano.id, {
      nome,
      corHex,
      ordem: (plano.materias?.length || 0) + 1,
    });

    setPlano((prev) =>
      prev
        ? {
            ...prev,
            materias: [...prev.materias, nova],
          }
        : null
    );
  };

  const handleEditMateria = async (materia: Materia) => {
    const novoNome = prompt('Editar nome da matéria:', materia.nome);
    if (!novoNome) return;

    await planoService.editarMateria(materia.id, {
      nome: novoNome,
    });

    setPlano((prev) =>
      prev
        ? {
            ...prev,
            materias: prev.materias.map((m) =>
              m.id === materia.id ? { ...m, nome: novoNome } : m
            ),
          }
        : null
    );
  };

  const handleDeleteMateria = async (materiaId: string) => {
    const confirm = window.confirm('Deseja excluir esta matéria e todos os seus tópicos?');
    if (!confirm) return;

    await planoService.excluirMateria(materiaId);
    setPlano((prev) =>
      prev
        ? {
            ...prev,
            materias: prev.materias.filter((m) => m.id !== materiaId),
          }
        : null
    );
    if (selectedMateria?.id === materiaId) {
      setSelectedTopic(null);
      setSelectedMateria(null);
    }
  };

  // --- CRUD TÓPICOS E SUBTÓPICOS ---
  const handleAddTopic = async (materiaId: string) => {
    const titulo = prompt('Título do novo tópico (Ex: Princípios Constitucionais):');
    if (!titulo) return;
    const pesoStr = prompt('Peso do tópico no edital (1 a 10):', '8');
    const peso = Math.max(1, Math.min(10, parseInt(pesoStr || '5', 10)));

    const novo = await planoService.criarTopico(materiaId, {
      titulo,
      peso,
      ordem: 99,
    });

    setPlano((prev) =>
      prev
        ? {
            ...prev,
            materias: prev.materias.map((m) =>
              m.id === materiaId ? { ...m, topicos: [...m.topicos, novo] } : m
            ),
          }
        : null
    );
    setSelectedTopic(novo);
  };

  const handleAddSubtopic = async (parentTopicId: string, materiaId: string) => {
    const titulo = prompt('Título do novo subtópico (Ex: Teoria Tridimensional do Direito):');
    if (!titulo) return;
    const pesoStr = prompt('Peso do subtópico (1 a 10):', '5');
    const peso = Math.max(1, Math.min(10, parseInt(pesoStr || '5', 10)));

    const novoSub = await planoService.criarTopico(materiaId, {
      titulo,
      peso,
      topicoPaiId: parentTopicId,
      ordem: 99,
    });

    const inserirSub = (topicos: Topico[]): Topico[] => {
      return topicos.map((t) => {
        if (t.id === parentTopicId) {
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
            materias: prev.materias.map((m) =>
              m.id === materiaId ? { ...m, topicos: inserirSub(m.topicos) } : m
            ),
          }
        : null
    );
    setSelectedTopic(novoSub);
  };

  const handleEditTopic = async (topico: Topico) => {
    const novoTitulo = prompt('Editar título do tópico:', topico.titulo);
    if (!novoTitulo) return;
    const pesoStr = prompt('Editar peso no edital (1 a 10):', topico.peso.toString());
    const novoPeso = Math.max(1, Math.min(10, parseInt(pesoStr || topico.peso.toString(), 10)));

    await planoService.editarTopico(topico.id, {
      titulo: novoTitulo,
      peso: novoPeso,
    });

    const atualizarTopico = (topicos: Topico[]): Topico[] => {
      return topicos.map((t) => {
        if (t.id === topico.id) {
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
            materias: prev.materias.map((m) => ({
              ...m,
              topicos: atualizarTopico(m.topicos),
            })),
          }
        : null
    );

    if (selectedTopic?.id === topico.id) {
      setSelectedTopic((prev) => (prev ? { ...prev, titulo: novoTitulo, peso: novoPeso } : null));
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    const confirm = window.confirm('Deseja realmente excluir este tópico/subtópico?');
    if (!confirm) return;

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
            materias: prev.materias.map((m) => ({
              ...m,
              topicos: removerTopico(m.topicos),
            })),
          }
        : null
    );

    if (selectedTopic?.id === topicId) {
      setSelectedTopic(null);
    }
  };

  // Se não autenticado, exige login ou registro na AuthScreen
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* 1. Left Slim Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        streakCount={streakCount}
        totalStudySecondsToday={totalStudySecondsToday}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 h-screen flex overflow-hidden">
        {currentView === 'tree' && (
          isLoadingPlano ? (
            <div className="flex-1 h-full flex items-center justify-center text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : plano ? (
            <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden">
              {/* Center: Árvore de Conhecimento (55% width) */}
              <StudyTree
                plano={plano}
                selectedTopicId={selectedTopic?.id || null}
                onSelectTopic={handleSelectTopic}
                onEditPlano={handleEditPlano}
                onDeletePlano={handleDeletePlano}
                onAddMateria={handleAddMateria}
                onEditMateria={handleEditMateria}
                onDeleteMateria={handleDeleteMateria}
                onAddTopic={handleAddTopic}
                onAddSubtopic={handleAddSubtopic}
                onEditTopic={handleEditTopic}
                onDeleteTopic={handleDeleteTopic}
              />

              {/* Right: Workpad Lateral Acoplado (45% width) */}
              <Workpad
                topic={selectedTopic}
                materia={selectedMateria || undefined}
                initialTab="pomodoro"
                onClose={() => setSelectedTopic(null)}
                onSessionComplete={handleSessionComplete}
              />
            </div>
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-lg font-bold text-zinc-100">Nenhum Plano de Estudo Ativo</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Você ainda não possui nenhum plano cadastrado. Comece criando um plano manualmente ou importe o edital do seu concurso para gerar a árvore automaticamente via Inteligência Artificial.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCreatePlano}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Plano Manualmente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('edital')}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Importar Edital (IA)</span>
                </button>
              </div>
            </div>
          )
        )}

        {currentView === 'schedule' && <ScheduleView />}

        {currentView === 'simulado' && (
          plano ? (
            <SimuladoView plano={plano} />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <h3 className="text-base font-bold text-zinc-200">Plano de Estudo Necessário</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Crie ou importe um plano de estudo para que a IA possa analisar sua matriz de matérias e calibrar simulados adaptativos.
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

        {currentView === 'essay' && <EssayLabView />}

        {currentView === 'edital' && (
          <EditalParserView
            onPlanCreated={() => {
              carregarDadosIniciais();
              setCurrentView('tree');
            }}
          />
        )}

        {currentView === 'analytics' && (
          plano ? (
            <PerformanceView plano={plano} />
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
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

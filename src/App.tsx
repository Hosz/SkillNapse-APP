import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavView } from './components/layout/Sidebar';
import { StudyTree } from './components/study-tree/StudyTree';
import { Workpad } from './components/workpad/Workpad';
import { ScheduleView } from './components/schedule/ScheduleView';
import { EssayLabView } from './components/essay/EssayLabView';
import { EditalParserView } from './components/edital/EditalParserView';
import { PerformanceView } from './components/analytics/PerformanceView';
import { AuthModal } from './components/layout/AuthModal';
import { mockPlano } from './data/mockData';
import { planoService, sessaoService, gamificacaoService } from './services';
import type { Topico, Materia, PlanoEstudo } from './types';

export function App() {
  const [currentView, setCurrentView] = useState<NavView>('tree');
  const [plano, setPlano] = useState<PlanoEstudo>(mockPlano);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Selected topic and subject for the Knowledge Tree & Workpad split-view
  const [selectedTopic, setSelectedTopic] = useState<Topico | null>(
    mockPlano.materias[0].topicos[0]
  );
  const [selectedMateria, setSelectedMateria] = useState<Materia>(
    mockPlano.materias[0]
  );

  // Gamification state
  const [streakCount, setStreakCount] = useState(14);
  const [totalStudySecondsToday, setTotalStudySecondsToday] = useState(9900); // 2h 45m

  const carregarDadosIniciais = () => {
    planoService.obterPlanoAtivo().then((fetchedPlano) => {
      if (fetchedPlano) {
        setPlano(fetchedPlano);
        if (fetchedPlano.materias.length > 0 && fetchedPlano.materias[0].topicos.length > 0) {
          setSelectedMateria(fetchedPlano.materias[0]);
          setSelectedTopic(fetchedPlano.materias[0].topicos[0]);
        }
      }
    });

    gamificacaoService.obterOfensiva().then((ofensiva) => {
      if (ofensiva?.totalDiasConsecutivos) {
        setStreakCount(ofensiva.totalDiasConsecutivos);
      }
    });

    sessaoService.obterResumoHoje().then((resumo) => {
      if (resumo?.totalSegundosEstudados) {
        setTotalStudySecondsToday(resumo.totalSegundosEstudados);
      }
    });
  };

  // Fetch active study plan, gamification streak and daily study time on mount
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const handleSelectTopic = (topic: Topico, materia: Materia) => {
    setSelectedTopic(topic);
    setSelectedMateria(materia);
    if (currentView !== 'tree' && currentView !== 'questions' && currentView !== 'flashcards') {
      setCurrentView('tree');
    }
  };

  const handleSessionComplete = async (seconds: number) => {
    setTotalStudySecondsToday((prev) => prev + seconds);
    setStreakCount((prev) => (prev === 14 ? 15 : prev));

    if (selectedTopic) {
      await sessaoService.registrarSessao({
        topicoId: selectedTopic.id,
        duracaoLiquidaSegundos: seconds,
        status: 'CONCLUIDA',
      });
    }
  };

  const handleAddMateria = () => {
    const nome = prompt('Nome da nova disciplina (Ex: Economia do Setor Público):');
    if (!nome) return;
    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const corHex = cores[Math.floor(Math.random() * cores.length)];
    const novaMateria: Materia = {
      id: `mat-${Date.now()}`,
      planoId: plano.id,
      nome,
      corHex,
      ordem: plano.materias.length + 1,
      topicos: [],
    };
    setPlano((prev) => ({
      ...prev,
      materias: [...prev.materias, novaMateria],
    }));
  };

  const handleAddTopic = (materiaId: string) => {
    const titulo = prompt('Título do novo tópico (Ex: Princípios Constitucionais):');
    if (!titulo) return;
    const pesoStr = prompt('Peso do tópico no edital (1 a 10):', '8');
    const peso = Math.max(1, Math.min(10, parseInt(pesoStr || '5', 10)));
    const novoTopico: Topico = {
      id: `top-${Date.now()}`,
      materiaId,
      titulo,
      peso,
      proficiencia: 'INICIANTE',
      ordem: 99,
    };
    setPlano((prev) => ({
      ...prev,
      materias: prev.materias.map((m) =>
        m.id === materiaId ? { ...m, topicos: [...m.topicos, novoTopico] } : m
      ),
    }));
    setSelectedTopic(novoTopico);
  };

  const handleSelectNavView = (view: NavView) => {
    setCurrentView(view);
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* 1. Left Slim Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={handleSelectNavView}
        streakCount={streakCount}
        totalStudySecondsToday={totalStudySecondsToday}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 h-screen flex overflow-hidden">
        {currentView === 'tree' && (
          <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden">
            {/* Center: Árvore de Conhecimento (55% width) */}
            <StudyTree
              plano={plano}
              selectedTopicId={selectedTopic?.id || null}
              onSelectTopic={handleSelectTopic}
              onAddMateria={handleAddMateria}
              onAddTopic={handleAddTopic}
            />

            {/* Right: Workpad Lateral Acoplado (45% width) */}
            <Workpad
              topic={selectedTopic}
              materia={selectedMateria}
              initialTab="pomodoro"
              onClose={() => setSelectedTopic(null)}
              onSessionComplete={handleSessionComplete}
            />
          </div>
        )}

        {currentView === 'schedule' && <ScheduleView />}

        {currentView === 'essay' && <EssayLabView />}

        {currentView === 'edital' && (
          <EditalParserView onPlanCreated={() => setCurrentView('tree')} />
        )}

        {currentView === 'analytics' && <PerformanceView plano={plano} />}

        {currentView === 'questions' && (
          <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden">
            <StudyTree
              plano={plano}
              selectedTopicId={selectedTopic?.id || null}
              onSelectTopic={handleSelectTopic}
              onAddMateria={handleAddMateria}
              onAddTopic={handleAddTopic}
            />
            <Workpad
              topic={selectedTopic}
              materia={selectedMateria}
              initialTab="questions"
              onClose={() => setSelectedTopic(null)}
              onSessionComplete={handleSessionComplete}
            />
          </div>
        )}

        {currentView === 'flashcards' && (
          <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden">
            <StudyTree
              plano={plano}
              selectedTopicId={selectedTopic?.id || null}
              onSelectTopic={handleSelectTopic}
              onAddMateria={handleAddMateria}
              onAddTopic={handleAddTopic}
            />
            <Workpad
              topic={selectedTopic}
              materia={selectedMateria}
              initialTab="flashcards"
              onClose={() => setSelectedTopic(null)}
              onSessionComplete={handleSessionComplete}
            />
          </div>
        )}
      </main>

      {/* Auth & API Connection Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={carregarDadosIniciais}
      />
    </div>
  );
}

export default App;

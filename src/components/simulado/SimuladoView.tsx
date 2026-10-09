import React, { useState, useEffect } from 'react';
import {
  Award,
  Sparkles,
  Clock,
  CheckCircle2,
  Play,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { simuladoService } from '../../services';
import type { SimuladoResumo, SimuladoDetalhe } from '../../services/simuladoService';
import type { PlanoEstudo } from '../../types';

interface SimuladoViewProps {
  plano: PlanoEstudo;
}

export const SimuladoView: React.FC<SimuladoViewProps> = ({ plano }) => {
  const [simulados, setSimulados] = useState<SimuladoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Generator form state
  const [qtdQuestoes, setQtdQuestoes] = useState(5);
  const [bancaAlvo, setBancaAlvo] = useState('CESPE / Cebraspe');
  const [generating, setGenerating] = useState(false);

  // Active Exam state
  const [activeSimulado, setActiveSimulado] = useState<SimuladoDetalhe | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({}); // { questionId: altId }
  const [examFinished, setExamFinished] = useState(false);
  const [examResult, setExamResult] = useState<{ total: number; acertos: number; pct: number } | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const carregarSimulados = () => {
    simuladoService.listarSimulados().then((lista) => {
      setSimulados(lista);
      setLoading(false);
    });
  };

  useEffect(() => {
    simuladoService.listarSimulados().then((lista) => {
      setSimulados(lista);
      setLoading(false);
    });
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

  const handleGerarSimulado = async () => {
    setGenerating(true);
    try {
      const novo = await simuladoService.gerarSimuladoAdaptativo({
        planoEstudoId: plano.id,
        quantidadeQuestoes: qtdQuestoes,
        bancaAlvo,
      });

      if (novo && novo.questoes && novo.questoes.length > 0) {
        setIsModalOpen(false);
        setActiveSimulado(novo);
        setCurrentQuestionIndex(0);
        setRespostas({});
        setExamFinished(false);
        setExamResult(null);
        setTimerSeconds(0);
      }
    } catch {
      alert('Erro ao gerar simulado com a IA. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAlternativa = (questaoId: string, alternativaId: string) => {
    if (examFinished) return;
    setRespostas((prev) => ({
      ...prev,
      [questaoId]: alternativaId,
    }));
  };

  const handleConcluirExame = async () => {
    if (!activeSimulado) return;
    const confirm = window.confirm('Deseja realmente finalizar o simulado e submeter suas respostas?');
    if (!confirm) return;

    let acertos = 0;
    const total = activeSimulado.questoes.length;

    // Submete respostas para a API
    for (const q of activeSimulado.questoes) {
      const altEscolhida = respostas[q.id];
      if (altEscolhida) {
        const acertou = await simuladoService.responderQuestao(q.id, altEscolhida, activeSimulado.simuladoId);
        if (acertou) acertos++;
      }
    }

    await simuladoService.concluirSimulado(activeSimulado.simuladoId);

    const pct = Math.round((acertos / total) * 100);
    setExamResult({ total, acertos, pct });
    setExamFinished(true);
    carregarSimulados();
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- MODO DE RESOLUÇÃO DO SIMULADO ATIVO ---
  if (activeSimulado) {
    const qAtual = activeSimulado.questoes[currentQuestionIndex];
    const totalQ = activeSimulado.questoes.length;

    return (
      <div className="flex-1 h-full flex flex-col bg-zinc-950 overflow-hidden text-zinc-100 font-sans">
        {/* Top Navigation Bar do Simulado */}
        <div className="h-16 px-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.confirm('Deseja sair do simulado em andamento? O progresso não finalizado poderá ser reiniciado.')) {
                  setActiveSimulado(null);
                }
              }}
              className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
              title="Voltar ao início"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                <span>{activeSimulado.titulo}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {activeSimulado.tipo}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Questão {currentQuestionIndex + 1} de {totalQ}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timerSeconds)}</span>
            </div>

            {!examFinished ? (
              <button
                onClick={handleConcluirExame}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finalizar Prova</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveSimulado(null)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
              >
                Voltar à Lista
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
          {/* Resultados Card se Finalizado */}
          {examFinished && examResult && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900/60 to-zinc-950 border border-indigo-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-100">Simulado Concluído com Sucesso!</h2>
                    <p className="text-xs text-zinc-400 font-mono">Tempo total: {formatTimer(timerSeconds)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-emerald-400">{examResult.pct}%</div>
                  <div className="text-[11px] text-zinc-400">Aproveitamento</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">Total de Questões</div>
                  <div className="text-sm font-bold font-mono text-zinc-200 mt-1">{examResult.total}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <div className="text-[10px] font-mono uppercase text-emerald-400">Acertos</div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-1">{examResult.acertos}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                  <div className="text-[10px] font-mono uppercase text-rose-400">Erros</div>
                  <div className="text-sm font-bold font-mono text-rose-400 mt-1">
                    {examResult.total - examResult.acertos}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enunciado e Alternativas da Questão Atual */}
          {qAtual && (
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
              {/* Metadados da Questão */}
              <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-zinc-800">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-300">
                  {qAtual.banca || 'Banca Concurso'} • {qAtual.ano || '2024'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-mono text-indigo-300">
                  {qAtual.assuntoGeral}
                </span>
                {qAtual.topicoReferencia && (
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-[11px] font-mono text-zinc-400">
                    {qAtual.topicoReferencia}
                  </span>
                )}
                <span className="ml-auto text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  {qAtual.dificuldade}
                </span>
              </div>

              {/* Enunciado */}
              <div className="text-sm text-zinc-200 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                {qAtual.enunciado}
              </div>

              {/* Alternativas */}
              <div className="space-y-3 pt-2">
                {qAtual.alternativas.map((alt) => {
                  const isSelected = respostas[qAtual.id] === alt.id;
                  return (
                    <div
                      key={alt.id}
                      onClick={() => handleSelectAlternativa(qAtual.id, alt.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/50 text-zinc-100 shadow-sm'
                          : 'bg-zinc-950/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {alt.letra}
                      </div>
                      <div className="text-xs leading-relaxed font-sans pt-0.5">{alt.texto}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Barra de Navegação Inferior das Questões */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-1.5 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {/* Marcadores rápidos de questões */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-2">
              {activeSimulado.questoes.map((q, idx) => {
                const respondida = !!respostas[q.id];
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all border ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                        : respondida
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {currentQuestionIndex < totalQ - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleConcluirExame}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- MODO LISTA DE SIMULADOS & GERADOR IA ---
  const totalSimulados = simulados.length;
  const mediaAcertos =
    totalSimulados > 0
      ? Math.round(simulados.reduce((acc, s) => acc + s.percentualAcerto, 0) / totalSimulados)
      : 0;

  return (
    <div className="flex-1 h-full flex flex-col bg-zinc-950 overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-sm space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-zinc-400 mb-1">Avaliação Sináptica</div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              Laboratório de Simulados & Provas IA
            </h1>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gerar Simulado Adaptativo IA</span>
          </button>
        </div>

        {/* Strips de Desempenho */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Simulados Realizados</div>
            <div className="text-base font-bold font-mono text-zinc-100 mt-0.5">{totalSimulados} provas</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Aproveitamento Médio</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              {mediaAcertos}% acertos
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Motor de Geração</div>
            <div className="text-base font-bold font-mono text-indigo-400 mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              LLM Adaptativa Ativa
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Simulados */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-xs font-mono text-zinc-500">
            Carregando simulados cadastrados...
          </div>
        ) : simulados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {simulados.map((sim) => (
              <div
                key={sim.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 uppercase">
                      {sim.tipo}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {new Date(sim.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 leading-snug">{sim.titulo}</h3>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <div className="text-xs font-mono">
                    <span className="text-emerald-400 font-bold text-sm">{sim.percentualAcerto}%</span>
                    <span className="text-zinc-500 ml-1.5">
                      ({sim.totalAcertos}/{sim.totalQuestoesRespondidas} certas)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      // Inicia o simulado selecionado
                      simuladoService.gerarSimuladoAdaptativo({
                        planoEstudoId: plano.id,
                        quantidadeQuestoes: 5,
                      }).then((detalhe) => {
                        setActiveSimulado(detalhe);
                        setCurrentQuestionIndex(0);
                        setRespostas({});
                        setExamFinished(false);
                        setExamResult(null);
                        setTimerSeconds(0);
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Praticar Novamente</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-500">
              <Award className="w-6 h-6" />
            </div>
            <div className="text-xs font-medium text-zinc-400">Nenhum simulado realizado ainda.</div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
            >
              Gerar Primeiro Simulado com IA
            </button>
          </div>
        )}
      </div>

      {/* Modal Gerador de Simulado Adaptativo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-100">Gerar Simulado Adaptativo IA</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Banca Alvo do Concurso
                </label>
                <select
                  value={bancaAlvo}
                  onChange={(e) => setBancaAlvo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="CESPE / Cebraspe">CESPE / Cebraspe (Estilo Certo/Errado & Múltipla Escolha)</option>
                  <option value="Fundação Getulio Vargas (FGV)">Fundação Getulio Vargas (FGV)</option>
                  <option value="Fundação Carlos Chagas (FCC)">Fundação Carlos Chagas (FCC)</option>
                  <option value="Vunesp">Vunesp</option>
                  <option value="Banca Geral Concursos">Banca Geral de Concursos</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Quantidade de Questões (3 a 15)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={qtdQuestoes}
                    onChange={(e) => setQtdQuestoes(parseInt(e.target.value, 10))}
                    className="flex-1 accent-indigo-500 cursor-pointer"
                  />
                  <span className="font-mono text-sm font-bold text-indigo-400 w-8 text-right">
                    {qtdQuestoes}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
                A IA analisará a matriz do plano <strong>{plano.titulo}</strong> e calibrará a dificuldade das questões para atacar suas maiores lacunas conceituais.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={generating}
                onClick={handleGerarSimulado}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {generating ? (
                  <span>Sintetizando Prova...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Iniciar Simulado Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  AlertOctagon,
  Target,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Play,
  X,
  XCircle,
  Sparkles,
  Printer,
  Clock,
  Award,
} from 'lucide-react';
import type { PlanoEstudo } from '../../types';
import { desempenhoService, simuladoService } from '../../services';
import { isAbortError } from '../../services/api';
import type { RelatorioLacunasResponse, TopicoCriticoItem } from '../../services/desempenhoService';

interface PerformanceViewProps {
  plano: PlanoEstudo;
  onNavigateToSimulado?: (simuladoId?: string) => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ plano, onNavigateToSimulado }) => {
  const [lacunasData, setLacunasData] = useState<RelatorioLacunasResponse | null>(null);
  const [topicosCriticos, setTopicosCriticos] = useState<TopicoCriticoItem[]>([]);
  const [generatingTopicoId, setGeneratingTopicoId] = useState<string | null>(null);
  const [generatedSimulado, setGeneratedSimulado] = useState<{
    id: string;
    total: number;
    topicoNome?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      desempenhoService.obterLacunas(plano.id),
      desempenhoService.obterTopicosCriticos(plano.id, 5),
    ])
      .then(([relatorio, criticos]) => {
        if (!isMounted) return;
        if (relatorio) setLacunasData(relatorio);
        if (criticos) {
          const criticosFiltrados = criticos.filter(
            (c) => c.totalTentativas > 0 && c.taxaAcerto < 60 && c.criticidade !== 'SEM_DADOS'
          );
          setTopicosCriticos(criticosFiltrados);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (simuladoAbortRef.current) {
        simuladoAbortRef.current.abort();
        simuladoAbortRef.current = null;
      }
    };
  }, [plano.id]);

  const simuladoAbortRef = useRef<AbortController | null>(null);

  const handleCancelarSimulado = () => {
    if (simuladoAbortRef.current) {
      simuladoAbortRef.current.abort();
      simuladoAbortRef.current = null;
    }
    setGeneratingTopicoId(null);
  };

  const handleGerarSimulado = async (topicoId?: string, topicoTitulo?: string) => {
    const targetId = topicoId || 'geral';
    setGeneratingTopicoId(targetId);
    setErrorMessage(null);
    setGeneratedSimulado(null);

    const controller = new AbortController();
    simuladoAbortRef.current = controller;

    try {
      const res = await simuladoService.gerarSimuladoAdaptativo(
        {
          planoEstudoId: plano.id,
          quantidadeQuestoes: 10,
          topicoIds: topicoId ? [topicoId] : undefined,
        },
        controller.signal
      );
      if (res?.simuladoId) {
        setGeneratedSimulado({
          id: res.simuladoId,
          total: res.totalQuestoes || 10,
          topicoNome: topicoTitulo,
        });
      } else {
        setErrorMessage('Não foi possível gerar o simulado adaptativo no momento.');
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      setErrorMessage('Erro ao comunicar com a IA para calibrar o simulado.');
    } finally {
      simuladoAbortRef.current = null;
      setGeneratingTopicoId(null);
    }
  };

  const handleExportarDiagnostico = () => {
    window.print();
  };

  // Cálculo de fallback para prontidão se ainda não tiver resposta da API
  const totalItensPlano = (plano?.materias || []).reduce((acc, m) => {
    return acc + (m.topicos || []).reduce((subAcc, t) => subAcc + 1 + (t.subtopicos?.length || 0), 0);
  }, 0);

  const avancadosPlano = (plano?.materias || []).reduce((acc, m) => {
    return (
      acc +
      (m.topicos || []).reduce((subAcc, t) => {
        const topAvancado = t.proficiencia === 'AVANCADO' ? 1 : 0;
        const subAvancados = (t.subtopicos || []).filter((s) => s.proficiencia === 'AVANCADO').length;
        return subAcc + topAvancado + subAvancados;
      }, 0)
    );
  }, 0);

  const scoreProntidaoEfetivo =
    lacunasData?.scoreProntidao !== undefined
      ? lacunasData.scoreProntidao
      : totalItensPlano > 0
      ? (avancadosPlano / totalItensPlano) * 100
      : 0;

  const taxaAcertoEfetiva = lacunasData?.taxaAcertoGeral ?? 0;
  const totalQuestoesRespondidas = lacunasData?.totalQuestoesRespondidas ?? 0;
  const totalCriticos = lacunasData?.totalTopicosCriticos ?? topicosCriticos.length;

  // Cálculo do tempo líquido dedicado acumulado no plano
  const totalSegundosAcumulados = (plano?.materias || []).reduce((acc, m) => {
    return (
      acc +
      (m.topicos || []).reduce((subAcc, t) => {
        const topTempo = t.tempoLiquidoSegundos || 0;
        const subTempo = (t.subtopicos || []).reduce((sAcc, s) => sAcc + (s.tempoLiquidoSegundos || 0), 0);
        return subAcc + topTempo + subTempo;
      }, 0)
    );
  }, 0);

  const formatHorasLiquidas = (totalSec: number) => {
    const horas = Math.floor(totalSec / 3600);
    const minutos = Math.floor((totalSec % 3600) / 60);
    if (horas === 0 && minutos === 0) return '0h 00m';
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
  };

  // Identificação das matérias de maior domínio vs. maior risco
  const materiasOrdenadas = [...(lacunasData?.materias || [])].sort(
    (a, b) => b.taxaAcerto - a.taxaAcerto
  );
  const materiaMaiorDominio =
    materiasOrdenadas.length > 0 && materiasOrdenadas[0].totalQuestoes > 0
      ? materiasOrdenadas[0]
      : null;
  const materiaMaiorRisco =
    materiasOrdenadas.length > 0
      ? [...materiasOrdenadas].reverse().find((m) => m.totalQuestoes > 0 || m.totalTopicosCriticos > 0)
      : null;

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-slate-50 dark:bg-zinc-950 overflow-y-auto md:overflow-hidden font-sans select-none text-zinc-900 dark:text-zinc-100 print:h-auto print:overflow-visible print:bg-white print:text-black print:select-auto print:p-0">
      {/* Left Column: Key Analytics & Readiness Score */}
      <div className="flex-1 flex flex-col h-auto md:h-full border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 overflow-visible md:overflow-y-auto p-4 sm:p-6 space-y-6 print:h-auto print:overflow-visible print:p-6 print:border-none shrink-0">
        {/* Executive Print-Only Header */}
        <div className="hidden print:block border-b-2 border-zinc-800 pb-4 mb-6 text-black">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold">
                SkillNapse Analytics Engine
              </div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950 mt-0.5">
                Relatório Executivo de Diagnóstico & Rendimento
              </h1>
            </div>
            <div className="text-right text-xs font-mono text-zinc-600">
              <div>Emitido em:</div>
              <div className="font-semibold text-zinc-900">
                {new Date().toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-700">
            <div>
              <span className="font-semibold text-zinc-900">Plano de Estudos: </span>
              {plano?.titulo || 'Plano de Estudos'}
            </div>
            {plano?.cargoAlvo && (
              <div>
                <span className="font-semibold text-zinc-900">Cargo Alvo: </span>
                {plano.cargoAlvo}
              </div>
            )}
          </div>
        </div>

        {/* Screen Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 font-medium flex items-center gap-2">
              <span>Motor de Inteligência Analítica</span>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
            </div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Desempenho & Mapeamento de Lacunas
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 print:hidden">
              Cálculo ponderado que cruza pesos do edital (1 a 10) com seu histórico de questões e tempo líquido.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportarDiagnostico}
            className="print:hidden shrink-0 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer hover:border-indigo-500/50"
            title="Exportar relatório ou imprimir diagnóstico"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Exportar Diagnóstico (PDF / Imprimir)</span>
          </button>
        </div>

        {/* Big Cards Strip (4 Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 space-y-1 shadow-2xs print:border-zinc-300 print:bg-white print:p-3 print:shadow-none break-inside-avoid">
            <span className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 print:text-zinc-600">
              <Target className="w-3.5 h-3.5 text-indigo-500 print:text-zinc-700" /> Score de Prontidão
            </span>
            <div className="text-3xl print:text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
              {scoreProntidaoEfetivo.toFixed(1)}%
            </div>
            <p className="text-[10px] text-zinc-500 print:text-zinc-600">Estimativa baseada em tópicos avançados</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 space-y-1 shadow-2xs print:border-zinc-300 print:bg-white print:p-3 print:shadow-none break-inside-avoid">
            <span className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 print:text-zinc-600">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 print:text-zinc-700" /> Taxa Geral de Acertos
            </span>
            <div className="text-3xl print:text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
              {taxaAcertoEfetiva.toFixed(1)}%
            </div>
            <p className="text-[10px] text-zinc-500 print:text-zinc-600">{totalQuestoesRespondidas} questões respondidas</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 space-y-1 shadow-2xs print:border-zinc-300 print:bg-white print:p-3 print:shadow-none break-inside-avoid">
            <span className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 print:text-zinc-600">
              <Clock className="w-3.5 h-3.5 text-amber-500 print:text-zinc-700" /> Tempo Líquido
            </span>
            <div className="text-3xl print:text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
              {formatHorasLiquidas(totalSegundosAcumulados)}
            </div>
            <p className="text-[10px] text-zinc-500 print:text-zinc-600">Total acumulado no plano</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 space-y-1 shadow-2xs print:border-zinc-300 print:bg-white print:p-3 print:shadow-none break-inside-avoid">
            <span className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1 print:text-zinc-600">
              <AlertOctagon className="w-3.5 h-3.5 text-red-500 print:text-zinc-700" /> Tópicos Críticos
            </span>
            <div className="text-3xl print:text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 print:text-black">
              {totalCriticos}
            </div>
            <p className="text-[10px] text-zinc-500 print:text-zinc-600">Alto peso e baixo acerto</p>
          </div>
        </div>

        {/* Executive Diagnosis Summary */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 space-y-3 shadow-2xs print:border-zinc-300 print:bg-white print:p-4 print:shadow-none break-inside-avoid">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider print:text-black">
            <Award className="w-4 h-4 text-indigo-500 print:text-zinc-700" />
            <span>Resumo Executivo do Diagnóstico</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 print:bg-zinc-50 print:border-zinc-200 print:text-black space-y-1">
              <div className="font-semibold text-emerald-800 dark:text-emerald-300 print:text-black flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 print:text-zinc-700" />
                <span>Ponto Forte / Maior Domínio</span>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 print:text-zinc-800">
                {materiaMaiorDominio ? (
                  <>
                    <strong className="text-zinc-900 dark:text-zinc-100 print:text-black">{materiaMaiorDominio.materiaNome}</strong>{' '}
                    com {materiaMaiorDominio.taxaAcerto.toFixed(1)}% de aproveitamento em {materiaMaiorDominio.totalQuestoes} questões resolvidas.
                  </>
                ) : (
                  'Ainda sem histórico suficiente para consolidar disciplina de destaque.'
                )}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 print:bg-zinc-50 print:border-zinc-200 print:text-black space-y-1">
              <div className="font-semibold text-rose-800 dark:text-rose-300 print:text-black flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 print:text-zinc-700" />
                <span>Atenção Imediata / Ponto Fraco</span>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 print:text-zinc-800">
                {materiaMaiorRisco ? (
                  <>
                    <strong className="text-zinc-900 dark:text-zinc-100 print:text-black">{materiaMaiorRisco.materiaNome}</strong>{' '}
                    com {materiaMaiorRisco.taxaAcerto.toFixed(1)}% de acerto e {materiaMaiorRisco.totalTopicosCriticos} tópicos em nível crítico.
                  </>
                ) : (
                  'Nenhuma disciplina em nível de risco crítico diagnosticada.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Disciplines Breakdown */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 print:text-black">
            Rendimento por Disciplina
          </h2>
          <div className="space-y-2">
            {(plano?.materias || []).length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 print:border-zinc-300 print:text-zinc-600">
                Nenhuma matéria cadastrada neste plano de estudo.
              </div>
            ) : (
              (plano?.materias || []).map((mat) => {
                const matInfo = lacunasData?.materias?.find((m) => m.materiaId === mat.id);
                const taxa = matInfo?.taxaAcerto ?? 0;
                const totalQ = matInfo?.totalQuestoes ?? 0;

                return (
                  <div
                    key={mat.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/70 space-y-2 shadow-2xs print:border-zinc-300 print:bg-white print:shadow-none break-inside-avoid"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full print:border print:border-zinc-400"
                          style={{ backgroundColor: mat.corHex || '#6366f1' }}
                        />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 print:text-black">{mat.nome}</span>
                      </div>
                      <span className="font-mono text-zinc-600 dark:text-zinc-300 print:text-zinc-800">
                        {totalQ > 0 ? `${taxa.toFixed(1)}% de acertos (${totalQ} questões)` : 'Sem questões resolvidas'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden print:bg-zinc-200">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: mat.corHex || '#6366f1',
                          width: `${Math.max(0, Math.min(100, taxa))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: High Priority Critical Topics */}
      <div className="w-full md:w-[450px] bg-white dark:bg-zinc-950 p-4 sm:p-6 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 overflow-visible md:overflow-y-auto space-y-4 shrink-0 print:w-full print:border-none print:h-auto print:overflow-visible print:p-6 print:mt-4 print:break-inside-avoid">
        <div>
          <div className="text-xs font-mono text-rose-600 dark:text-red-400 flex items-center gap-1.5 uppercase font-semibold print:text-red-700">
            <AlertOctagon className="w-4 h-4" /> Ação Imediata Recomendada
          </div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1 print:text-black">
            Lacunas Prioritárias Diagnosticadas
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5 print:text-zinc-600">
            Tópicos com alta relevância no edital onde o rendimento está abaixo do esperado.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between animate-in fade-in duration-200 print:hidden">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {generatedSimulado && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-500/50 text-xs text-emerald-900 dark:text-emerald-200 space-y-2.5 shadow-sm animate-in fade-in duration-200 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Simulado Focado Gerado!</span>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedSimulado(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                title="Fechar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {generatedSimulado.topicoNome
                ? `10 questões calibradas especificamente para sanar suas lacunas em "${generatedSimulado.topicoNome}".`
                : '10 questões adaptativas calibradas com foco nas suas principais dificuldades.'}
            </p>
            {onNavigateToSimulado && (
              <button
                type="button"
                onClick={() => onNavigateToSimulado(generatedSimulado.id)}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Iniciar Resolução do Simulado Agora</span>
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {topicosCriticos.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2 print:border-zinc-300 print:bg-white">
              <HelpCircle className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto print:text-zinc-400" />
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 print:text-black">
                Nenhuma lacuna crítica pendente
              </div>
              <p className="text-[11px] text-zinc-500 print:text-zinc-600">
                Seu aproveitamento está equilibrado ou você ainda não possui questões resolvidas para mapear deficiências. Realize simulados para diagnosticar seu rendimento!
              </p>
              <button
                type="button"
                disabled={generatingTopicoId !== null}
                onClick={() => handleGerarSimulado()}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 mx-auto print:hidden"
              >
                {generatingTopicoId === 'geral' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando Simulado...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Simulado Geral</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            topicosCriticos.map((top) => (
              <div
                key={top.topicoId}
                className={`p-3.5 rounded-2xl border space-y-2 break-inside-avoid print:bg-white print:border-zinc-300 ${
                  top.criticidade === 'CRITICO'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/30'
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border print:text-black print:bg-zinc-100 print:border-zinc-300 ${
                      top.criticidade === 'CRITICO'
                        ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-300 dark:border-red-500/20'
                        : 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/20'
                    }`}
                  >
                    CRITICIDADE {top.criticidade} (PESO {top.pesoEdital})
                  </span>
                  <span
                    className={`font-mono text-xs font-semibold print:text-black ${
                      top.criticidade === 'CRITICO'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {top.taxaAcerto.toFixed(1)}% acerto
                  </span>
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 print:text-black">
                  {top.tituloTopico}
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
                  {top.materiaNome} • {top.totalTentativas} tentativas registradas
                </div>
                <button
                  type="button"
                  disabled={generatingTopicoId !== null && generatingTopicoId !== top.topicoId}
                  onClick={() => {
                    if (generatingTopicoId === top.topicoId) {
                      handleCancelarSimulado();
                    } else {
                      handleGerarSimulado(top.topicoId, top.tituloTopico);
                    }
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer print:hidden ${
                    generatingTopicoId === top.topicoId
                      ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 border border-red-200 dark:border-red-800/80 animate-pulse'
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed'
                  }`}
                >
                  {generatingTopicoId === top.topicoId ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span>Cancelar Geração</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>Gerar Simulado Focado</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Motivational Streak Footer */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center space-y-1 mt-6 shadow-2xs print:border-zinc-300 print:bg-white break-inside-avoid">
          <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs print:text-zinc-800">
            <Flame className="w-4 h-4 fill-amber-500/20 print:text-zinc-600" /> Mantenha a Constância
          </div>
          <p className="text-[11px] text-zinc-500 print:text-zinc-600">
            A resolução de questões e simulados frequentes é o fator de maior impacto para sua aprovação.
          </p>
        </div>
      </div>
    </div>
  );
};

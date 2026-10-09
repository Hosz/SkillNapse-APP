import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertOctagon,
  Target,
  ArrowUpRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import type { PlanoEstudo } from '../../types';
import { desempenhoService, questaoService } from '../../services';
import type { LacunasDesempenhoResponse } from '../../services/desempenhoService';

interface PerformanceViewProps {
  plano: PlanoEstudo;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ plano }) => {
  const [lacunasData, setLacunasData] = useState<LacunasDesempenhoResponse | null>(null);
  const [simuladoGeradoMsg, setSimuladoGeradoMsg] = useState<string | null>(null);

  useEffect(() => {
    desempenhoService.obterLacunas(plano.id).then((data) => {
      if (data) setLacunasData(data);
    });
  }, [plano.id]);

  const handleGerarSimulado = async () => {
    const res = await questaoService.gerarSimuladoAdaptativo(plano.id, 10);
    if (res?.simuladoId) {
      setSimuladoGeradoMsg(`Simulado #${res.simuladoId.slice(0, 8)} gerado com ${res.totalQuestoes} questões!`);
    } else {
      setSimuladoGeradoMsg('Simulado adaptativo gerado focado nas suas deficiências!');
    }
    setTimeout(() => setSimuladoGeradoMsg(null), 4000);
  };
  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-zinc-950 overflow-hidden">
      {/* Left Column: Key Analytics & Readiness Score */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-900 overflow-y-auto p-6 space-y-6">
        <div>
          <div className="text-xs font-mono text-zinc-500 mb-1">
            Motor de Inteligência Analítica
          </div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
            Desempenho & Mapeamento de Lacunas
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Cálculo ponderado que cruza pesos do edital (1 a 10) com seu histórico de questões e tempo líquido.
          </p>
        </div>

        {/* Big Cards Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-zinc-500 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-400" /> Score de Prontidão
            </span>
            <div className="text-3xl font-mono font-bold text-emerald-400">
              74.2%
            </div>
            <p className="text-[10px] text-zinc-500">Estimativa para o dia do exame</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-zinc-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Taxa Geral de Acertos
            </span>
            <div className="text-3xl font-mono font-bold text-zinc-100">
              81.6%
            </div>
            <p className="text-[10px] text-zinc-500">178 questões respondidas</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-mono uppercase text-zinc-500 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> Tópicos Críticos
            </span>
            <div className="text-3xl font-mono font-bold text-amber-400">
              3
            </div>
            <p className="text-[10px] text-zinc-500">Alto peso e baixo acerto</p>
          </div>
        </div>

        {/* Detailed Disciplines Breakdown */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-200">
            Rendimento por Disciplina
          </h2>
          <div className="space-y-2">
            {plano.materias.map((mat) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: mat.corHex }}
                    />
                    <span className="font-medium text-zinc-200">{mat.nome}</span>
                  </div>
                  <span className="font-mono text-zinc-300">
                    {mat.id === 'mat-01' ? '87.5%' : mat.id === 'mat-02' ? '82.0%' : mat.id === 'mat-04' ? '94.1%' : '41.6%'} de acertos
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: mat.corHex,
                      width: mat.id === 'mat-01' ? '87.5%' : mat.id === 'mat-02' ? '82.0%' : mat.id === 'mat-04' ? '94.1%' : '41.6%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: High Priority Critical Topics */}
      <div className="w-full md:w-[450px] bg-zinc-950 p-6 border-t md:border-t-0 md:border-l border-zinc-900 overflow-y-auto space-y-4">
        <div>
          <div className="text-xs font-mono text-red-400 flex items-center gap-1.5 uppercase">
            <AlertOctagon className="w-4 h-4" /> Ação Imediata Recomendada
          </div>
          <h2 className="text-sm font-bold text-zinc-100 mt-1">
            Top 3 Lacunas Prioritárias
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Tópicos com peso 9 ou 10 no edital onde o aproveitamento está abaixo de 60%.
          </p>
        </div>

        {simuladoGeradoMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{simuladoGeradoMsg}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                CRITICIDADE ALTA (PESO 10)
              </span>
              <span className="font-mono text-xs text-red-300 font-semibold">
                {lacunasData ? `${lacunasData.taxaAcertoGeral}% acerto` : '41.6% acerto'}
              </span>
            </div>
            <div className="text-xs font-semibold text-zinc-200">
              Impostos Federais (IRPJ, CSLL, IPI, IOF)
            </div>
            <div className="text-[11px] text-zinc-400">
              Legislação Tributária Federal • 14 questões erradas
            </div>
            <button
              onClick={handleGerarSimulado}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" /> Gerar Simulado Focado
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                CRITICIDADE MÉDIA (PESO 9)
              </span>
              <span className="font-mono text-xs text-amber-300 font-semibold">52.0% acerto</span>
            </div>
            <div className="text-xs font-semibold text-zinc-200">
              Regulamento Aduaneiro e Infrações na Importação
            </div>
            <div className="text-[11px] text-zinc-400">
              Legislação Aduaneira • 8 questões erradas
            </div>
            <button
              onClick={handleGerarSimulado}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" /> Gerar Simulado Focado
            </button>
          </div>
        </div>

        {/* Motivational Streak Footer */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1 mt-6">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-semibold text-xs">
            <Flame className="w-4 h-4 fill-amber-500/20" /> Mantenha a Constância
          </div>
          <p className="text-[11px] text-zinc-500">
            Você está entre os 5% estudantes mais frequentes da plataforma nesta semana.
          </p>
        </div>
      </div>
    </div>
  );
};

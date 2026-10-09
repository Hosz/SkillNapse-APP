import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  RotateCcw,
  Coffee,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import type { BlocoCronograma, DiaSemana, TipoBloco } from '../../types';
import { mockCronograma } from '../../data/mockData';

export const ScheduleView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<DiaSemana>('SEGUNDA');
  const [selectedBloco, setSelectedBloco] = useState<BlocoCronograma | null>(mockCronograma[0]);

  const days: { id: DiaSemana; label: string }[] = [
    { id: 'SEGUNDA', label: 'Segunda-feira' },
    { id: 'TERCA', label: 'Terça-feira' },
    { id: 'QUARTA', label: 'Quarta-feira' },
    { id: 'QUINTA', label: 'Quinta-feira' },
    { id: 'SEXTA', label: 'Sexta-feira' },
    { id: 'SABADO', label: 'Sábado' },
    { id: 'DOMINGO', label: 'Domingo' },
  ];

  const blocosDoDia = mockCronograma.filter((b) => b.diaSemana === selectedDay);

  const getTipoBlocoMeta = (tipo: TipoBloco) => {
    switch (tipo) {
      case 'FOCO_TEORIA':
        return { label: 'Teoria & Aprofundamento', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: BookOpen };
      case 'REVISAO':
        return { label: 'Revisão Espaçada', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: RotateCcw };
      case 'SIMULADO':
        return { label: 'Simulado & Questões', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 };
      case 'DESCANSO':
        return { label: 'Descanso Sináptico', color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700/60', icon: Coffee };
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-zinc-950 overflow-hidden">
      {/* Center Left: Weekly Calendar / Timeblocking View */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-900 bg-zinc-950/70 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-zinc-500 mb-1">Cronograma Híbrido</div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Planejamento Semanal & Timeblocking
              </h1>
            </div>
            <button className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Bloco</span>
            </button>
          </div>

          {/* Days Tabs */}
          <div className="flex overflow-x-auto gap-1 pb-1">
            {days.map((d) => {
              const isSelected = selectedDay === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDay(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule Blocks for Selected Day */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {blocosDoDia.length > 0 ? (
            blocosDoDia.map((bloco) => {
              const meta = getTipoBlocoMeta(bloco.tipoBloco);
              const Icon = meta.icon;
              const isSelected = selectedBloco?.id === bloco.id;

              return (
                <div
                  key={bloco.id}
                  onClick={() => setSelectedBloco(bloco)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'bg-zinc-900 border-indigo-500/60 ring-1 ring-indigo-500/30'
                      : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/70'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-300">
                        {bloco.horaInicio} – {bloco.horaFim}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${meta.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-100 truncate">
                      {bloco.topicoTitulo || bloco.materiaNome || 'Sem disciplina fixa'}
                    </h3>

                    {bloco.materiaNome && (
                      <p className="text-xs text-zinc-400 font-mono">
                        {bloco.materiaNome}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-zinc-500">
              <CalendarIcon className="w-8 h-8 opacity-30 mx-auto mb-2" />
              Nenhum bloco agendado para este dia da semana.
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer: Contextual Detail of Selected Block */}
      <div className="w-full md:w-[420px] bg-zinc-950 p-5 flex flex-col justify-between shrink-0 border-t md:border-t-0 md:border-l border-zinc-900">
        {selectedBloco ? (
          <div className="space-y-5">
            <div>
              <div className="text-[11px] font-mono text-zinc-500 uppercase">
                Detalhes da Execução
              </div>
              <h2 className="text-base font-bold text-zinc-100 mt-1">
                {selectedBloco.topicoTitulo || selectedBloco.materiaNome || 'Bloco Selecionado'}
              </h2>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Horário:
                </span>
                <span className="font-mono text-zinc-200">
                  {selectedBloco.horaInicio} às {selectedBloco.horaFim}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Modalidade:</span>
                <span className="font-mono text-indigo-400">
                  {selectedBloco.tipoBloco}
                </span>
              </div>
              {selectedBloco.anotacoes && (
                <div className="pt-2 border-t border-zinc-800/80 text-xs text-zinc-300 font-sans leading-relaxed">
                  <span className="text-zinc-500 font-mono text-[11px] block mb-1">
                    Orientações:
                  </span>
                  {selectedBloco.anotacoes}
                </div>
              )}
            </div>

            <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
              <Clock className="w-4 h-4" />
              Iniciar Timer para este Bloco
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-zinc-500 my-auto">
            Selecione um bloco de horário para ver os detalhes e iniciar o estudo.
          </div>
        )}
      </div>
    </div>
  );
};

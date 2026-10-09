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
} from 'lucide-react';
import type { BlocoCronograma, DiaSemana, TipoBloco } from '../../types';
import { cronogramaService } from '../../services';

export const ScheduleView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<DiaSemana>('SEGUNDA');
  const [cronograma, setCronograma] = useState<BlocoCronograma[]>([]);
  const [selectedBloco, setSelectedBloco] = useState<BlocoCronograma | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for adding a new block
  const [novoDia, setNovoDia] = useState<DiaSemana>('SEGUNDA');
  const [horaInicio, setHoraInicio] = useState('14:00');
  const [horaFim, setHoraFim] = useState('15:30');
  const [tipoBloco, setTipoBloco] = useState<TipoBloco>('FOCO_TEORIA');
  const [tituloBloco, setTituloBloco] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cronogramaService.obterGradeSemanal().then((grade) => {
      if (grade && grade.length > 0) {
        setCronograma(grade);
        const primeiroDoDia = grade.find((b) => b.diaSemana === selectedDay);
        if (primeiroDoDia) setSelectedBloco(primeiroDoDia);
      }
    });
  }, [selectedDay]);

  const days: { id: DiaSemana; label: string }[] = [
    { id: 'SEGUNDA', label: 'Segunda-feira' },
    { id: 'TERCA', label: 'Terça-feira' },
    { id: 'QUARTA', label: 'Quarta-feira' },
    { id: 'QUINTA', label: 'Quinta-feira' },
    { id: 'SEXTA', label: 'Sexta-feira' },
    { id: 'SABADO', label: 'Sábado' },
    { id: 'DOMINGO', label: 'Domingo' },
  ];

  const blocosDoDia = cronograma.filter((b) => b.diaSemana === selectedDay);

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

  const handleAddBloco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloBloco.trim()) return;

    setSubmitting(true);
    try {
      const criado = await cronogramaService.adicionarBloco({
        diaSemana: novoDia,
        horaInicio,
        horaFim,
        tipoBloco,
        topicoTitulo: tituloBloco,
      });

      setCronograma((prev) => [...prev, criado]);
      setSelectedDay(novoDia);
      setSelectedBloco(criado);
      setIsAddModalOpen(false);
      setTituloBloco('');
    } catch {
      alert('Não foi possível adicionar o bloco. Verifique os dados informados.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBloco = async (blocoId: string) => {
    if (!window.confirm('Deseja realmente remover este bloco do cronograma?')) return;
    await cronogramaService.excluirBloco(blocoId);
    setCronograma((prev) => prev.filter((b) => b.id !== blocoId));
    if (selectedBloco?.id === blocoId) {
      setSelectedBloco(null);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row bg-zinc-950 overflow-hidden font-sans select-none">
      {/* Center Left: Weekly Calendar / Timeblocking View */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/70 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-zinc-400 mb-1">Cronograma Híbrido</div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Planejamento Semanal & Timeblocking
              </h1>
            </div>
            <button
              onClick={() => {
                setNovoDia(selectedDay);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
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
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm font-semibold'
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
                      ? 'bg-zinc-900 border-indigo-500/80 ring-1 ring-indigo-500/40 shadow-sm'
                      : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800'
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
                      {bloco.topicoTitulo || bloco.materiaNome || 'Bloco de Estudo'}
                    </h3>

                    {bloco.materiaNome && (
                      <p className="text-xs text-zinc-400 font-mono">
                        {bloco.materiaNome}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBloco(bloco.id);
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Excluir este bloco"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <CalendarIcon className="w-8 h-8 opacity-30 mx-auto" />
              <div className="text-xs font-medium">Nenhum bloco agendado para este dia.</div>
              <button
                onClick={() => {
                  setNovoDia(selectedDay);
                  setIsAddModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-indigo-400 font-medium transition-all"
              >
                + Criar primeiro bloco
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer: Contextual Detail of Selected Block */}
      <div className="w-full md:w-[400px] bg-zinc-950 p-5 flex flex-col justify-between shrink-0 border-t md:border-t-0 md:border-l border-zinc-800">
        {selectedBloco ? (
          <div className="space-y-5">
            <div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase">
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
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Dia:</span>
                <span className="font-mono text-zinc-300">
                  {selectedBloco.diaSemana}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDeleteBloco(selectedBloco.id)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover este Bloco do Cronograma
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-zinc-500 my-auto">
            Selecione um bloco de horário para ver os detalhes.
          </div>
        )}
      </div>

      {/* Modal Adicionar Bloco */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Adicionar Bloco no Cronograma
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBloco} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Disciplina ou Conteúdo
                </label>
                <input
                  type="text"
                  required
                  value={tituloBloco}
                  onChange={(e) => setTituloBloco(e.target.value)}
                  placeholder="Ex: Direito Constitucional - Direitos Fundamentais"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Dia da Semana
                  </label>
                  <select
                    value={novoDia}
                    onChange={(e) => setNovoDia(e.target.value as DiaSemana)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Tipo de Estudo
                  </label>
                  <select
                    value={tipoBloco}
                    onChange={(e) => setTipoBloco(e.target.value as TipoBloco)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
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
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Horário Início
                  </label>
                  <input
                    type="time"
                    required
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Horário Término
                  </label>
                  <input
                    type="time"
                    required
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Bloco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

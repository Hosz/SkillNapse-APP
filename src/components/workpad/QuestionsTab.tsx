import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import type { Topico, Materia, Questao } from '../../types';
import { questaoService, simuladoService } from '../../services';

interface QuestionsTabProps {
  topic: Topico;
  materia?: Materia;
  planoId?: string;
  onPraticarSimulado?: (params: {
    planoId?: string;
    materiaId?: string;
    topicoId?: string;
    subtopicoId?: string;
  }) => void;
  onStartSimulado?: (simuladoId?: string) => void;
  onQuestionAnswered?: () => void;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({
  topic,
  materia,
  planoId,
  onPraticarSimulado,
  onStartSimulado,
  onQuestionAnswered,
}) => {
  const [questions, setQuestions] = useState<Questao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsLoading(true);
    setQuizError(null);
    questaoService
      .listarPorTopico(topic.id)
      .then((res) => {
        setQuestions(res || []);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [topic.id]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (selectedAnswers[questionId]) return; // already answered
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setShowExplanation((prev) => ({ ...prev, [questionId]: true }));

    // Send answer to backend API
    questaoService
      .responderQuestao(questionId, {
        alternativaEscolhidaId: optionId,
        tempoGastoSegundos: 25,
        topicoId: topic.id,
      })
      .then(() => {
        onQuestionAnswered?.();
      })
      .catch((err) => {
        console.error('Erro ao submeter resposta da questão:', err);
        onQuestionAnswered?.();
      });
  };

  const handleToggleExplanation = (questionId: string) => {
    setShowExplanation((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleGerarSimuladoTopico = async () => {
    setIsGeneratingQuiz(true);
    setQuizError(null);
    const effectivePlanoId = planoId || materia?.planoId;

    try {
      if (effectivePlanoId) {
        const res = await simuladoService.gerarSimuladoAdaptativo({
          planoEstudoId: effectivePlanoId,
          topicoIds: topic.id !== 'geral' ? [topic.id] : undefined,
          quantidadeQuestoes: 10,
          bancaAlvo: 'CESPE / Cebraspe',
        });

        if (res?.simuladoId && onStartSimulado) {
          onStartSimulado(res.simuladoId);
          return;
        }
      }

      if (onPraticarSimulado) {
        onPraticarSimulado({
          planoId: effectivePlanoId,
          materiaId: materia?.id || (topic.materiaId !== 'geral' ? topic.materiaId : undefined),
          topicoId: topic.id !== 'geral' ? topic.id : undefined,
          subtopicoId: topic.topicoPaiId ? topic.id : undefined,
        });
      } else {
        setQuizError('Nenhum simulador configurado para este contexto.');
      }
    } catch (err) {
      console.error('Erro ao gerar simulado para o tópico:', err);
      if (onPraticarSimulado) {
        onPraticarSimulado({
          planoId: effectivePlanoId,
          materiaId: materia?.id || (topic.materiaId !== 'geral' ? topic.materiaId : undefined),
          topicoId: topic.id !== 'geral' ? topic.id : undefined,
          subtopicoId: topic.topicoPaiId ? topic.id : undefined,
        });
      } else {
        setQuizError('Erro ao comunicar com o gerador adaptativo de questões.');
      }
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto select-none bg-zinc-50/50 dark:bg-zinc-950/50">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>Questões de Fixação</span>
            <span className="text-[10px] font-mono font-normal text-zinc-500 dark:text-zinc-400">
              • {topic.titulo}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
            {isLoading
              ? 'Carregando itens...'
              : `${questions.length} questões disponíveis no acervo`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {questions.length > 0 && (onStartSimulado || onPraticarSimulado) && (
            <button
              type="button"
              onClick={handleGerarSimuladoTopico}
              disabled={isGeneratingQuiz}
              className="p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
              title="Gerar Simulado completo para este tópico"
            >
              {isGeneratingQuiz ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <div className="text-xs font-mono px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-700/60 font-semibold">
            {Object.keys(selectedAnswers).length} / {questions.length}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          <span className="text-xs text-zinc-500 font-mono">Carregando questões do tópico...</span>
        </div>
      ) : questions.length === 0 ? (
        /* Empty State com Ação Rápida */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="w-14 h-14 rounded-3xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-2xs">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Nenhuma questão neste tópico ainda
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Inicie um simulado adaptativo gerado por IA focado exclusivamente nos conceitos deste tópico.
            </p>
          </div>

          {quizError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs text-left max-w-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{quizError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGerarSimuladoTopico}
            disabled={isGeneratingQuiz}
            className="w-full max-w-xs py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingQuiz ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Calibrando Simulado com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white/20" />
                <span>Gerar Simulado para este Tópico</span>
              </>
            )}
          </button>

          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
            10 questões adaptativas com gabarito comentado
          </span>
        </div>
      ) : (
        /* Questions List */
        <div className="space-y-4 pb-4">
          {questions.map((q, idx) => {
            const answeredOptionId = selectedAnswers[q.id];
            const hasAnswered = !!answeredOptionId;
            const isExplOpen = showExplanation[q.id];

            return (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs space-y-3"
              >
                {/* Question metadata badge */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-zinc-500 dark:text-zinc-400 font-bold">
                    Item #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {q.banca && (
                      <span className="font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-lg text-[10px] border border-zinc-200 dark:border-zinc-700/50">
                        {q.banca}
                      </span>
                    )}
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${
                        q.dificuldade === 'FACIL'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                          : q.dificuldade === 'MEDIA'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
                      }`}
                    >
                      {q.dificuldade || 'MÉDIA'}
                    </span>
                  </div>
                </div>

                {/* Enunciado */}
                <p className="text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-sans font-medium">
                  {q.enunciado}
                </p>

                {/* Alternativas */}
                <div className="space-y-2 pt-1">
                  {q.alternativas.map((alt) => {
                    const isSelected = answeredOptionId === alt.id;
                    let optionStyle =
                      'bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200';

                    if (hasAnswered) {
                      if (alt.correta) {
                        optionStyle =
                          'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/60 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400/40 dark:ring-emerald-500/30 font-medium';
                      } else if (isSelected && !alt.correta) {
                        optionStyle =
                          'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500/60 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400/40 dark:ring-rose-500/30 font-medium';
                      } else {
                        optionStyle =
                          'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/40 opacity-60 text-zinc-500 dark:text-zinc-400';
                      }
                    }

                    return (
                      <button
                        key={alt.id}
                        onClick={() => handleSelectOption(q.id, alt.id)}
                        disabled={hasAnswered}
                        className={`w-full text-left p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all cursor-pointer ${optionStyle}`}
                      >
                        <span className="w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shadow-2xs">
                          {alt.letra}
                        </span>
                        <span className="flex-1 leading-snug">{alt.texto}</span>
                        {hasAnswered && alt.correta && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {hasAnswered && isSelected && !alt.correta && (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Accordion */}
                {hasAnswered && q.explicacaoGabarito && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleToggleExplanation(q.id)}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isExplOpen ? 'Ocultar Justificativa' : 'Ver Comentário do Gabarito'}</span>
                      {isExplOpen ? (
                        <ChevronUp className="w-3 h-3 ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      )}
                    </button>

                    {isExplOpen && (
                      <div className="mt-2 p-3.5 rounded-xl bg-sky-50/60 dark:bg-zinc-900/90 border border-sky-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans animate-in fade-in duration-200">
                        <span className="text-sky-700 dark:text-sky-400 font-bold font-mono text-[11px] block mb-1">
                          Análise Pedagógica:
                        </span>
                        {q.explicacaoGabarito}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

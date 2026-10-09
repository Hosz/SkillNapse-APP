import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import type { Topico, Questao } from '../../types';
import { mockQuestoes } from '../../data/mockData';

interface QuestionsTabProps {
  topic: Topico;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({ topic }) => {
  const [questions, setQuestions] = useState<Questao[]>(() => {
    return mockQuestoes[topic.id] || mockQuestoes['top-01'] || [];
  });
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (selectedAnswers[questionId]) return; // already answered
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setShowExplanation((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleToggleExplanation = (questionId: string) => {
    setShowExplanation((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleGenerateAiQuestion = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newQuestion: Questao = {
        id: `q-ai-${Date.now()}`,
        topicoId: topic.id,
        enunciado: `[Questão Inédita Gerada por IA — Foco nas Lacunas] Acerca de ${topic.titulo}, considere a aplicação prática e assinale a alternativa juridicamente correta conforme a jurisprudência dominante:`,
        alternativas: [
          {
            id: `alt-a-${Date.now()}`,
            letra: 'A',
            texto:
              'A jurisprudência veda expressamente qualquer modulação temporal em sede de controle difuso, mesmo sob quórum qualificado.',
            correta: false,
          },
          {
            id: `alt-b-${Date.now()}`,
            letra: 'B',
            texto:
              'É compatível com a ordem constitucional a interpretação sistemática que preserva a segurança jurídica e os direitos adquiridos.',
            correta: true,
          },
          {
            id: `alt-c-${Date.now()}`,
            letra: 'C',
            texto:
              'A revogação do ato normativo após a propositura da ação direta sempre e em qualquer hipótese acarreta prejuízo da ação.',
            correta: false,
          },
          {
            id: `alt-d-${Date.now()}`,
            letra: 'D',
            texto:
              'A súmula vinculante possui efeito vinculante exclusivo para o Poder Executivo, sendo o Judiciário imune à sua aplicação.',
            correta: false,
          },
        ],
        explicacaoGabarito:
          'Gabarito B: Princípio basilar de hermenêutica constitucional pacificado pelo STF.',
        dificuldade: 'DIFICIL',
        banca: 'SkillNapse AI Engine / FGV Pattern',
      };

      setQuestions((prev) => [newQuestion, ...prev]);
      setIsGenerating(false);
    }, 1400);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
        <div>
          <div className="text-xs font-semibold text-zinc-200">
            Questões de Fixação • {topic.titulo}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            {questions.length} questões disponíveis no acervo
          </div>
        </div>

        <button
          onClick={handleGenerateAiQuestion}
          disabled={isGenerating}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/30"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando com IA...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Gerar Questão IA
            </>
          )}
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const answeredOptionId = selectedAnswers[q.id];
          const hasAnswered = !!answeredOptionId;
          const isExplOpen = showExplanation[q.id];

          return (
            <div
              key={q.id}
              className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3"
            >
              {/* Question metadata badge */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-zinc-400">Questão #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  {q.banca && (
                    <span className="font-mono text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded text-[10px]">
                      {q.banca}
                    </span>
                  )}
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                      q.dificuldade === 'FACIL'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : q.dificuldade === 'MEDIA'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {q.dificuldade}
                  </span>
                </div>
              </div>

              {/* Enunciado */}
              <p className="text-xs text-zinc-200 leading-relaxed font-sans">{q.enunciado}</p>

              {/* Alternativas */}
              <div className="space-y-2 pt-1">
                {q.alternativas.map((alt) => {
                  const isSelected = answeredOptionId === alt.id;
                  let optionStyle =
                    'bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-300';

                  if (hasAnswered) {
                    if (alt.correta) {
                      optionStyle =
                        'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/30';
                    } else if (isSelected && !alt.correta) {
                      optionStyle =
                        'bg-red-950/40 border-red-500/60 text-red-200 ring-1 ring-red-500/30';
                    } else {
                      optionStyle = 'bg-zinc-900/40 border-zinc-800/40 opacity-60 text-zinc-400';
                    }
                  }

                  return (
                    <button
                      key={alt.id}
                      onClick={() => handleSelectOption(q.id, alt.id)}
                      disabled={hasAnswered}
                      className={`w-full text-left p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${optionStyle}`}
                    >
                      <span className="w-5 h-5 rounded-md font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 bg-zinc-800 border border-zinc-700">
                        {alt.letra}
                      </span>
                      <span className="flex-1 leading-snug">{alt.texto}</span>
                      {hasAnswered && alt.correta && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      {hasAnswered && isSelected && !alt.correta && (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Accordion */}
              {hasAnswered && (
                <div className="pt-2">
                  <button
                    onClick={() => handleToggleExplanation(q.id)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{isExplOpen ? 'Ocultar Justificativa' : 'Ver Gabarito Comentado'}</span>
                    {isExplOpen ? (
                      <ChevronUp className="w-3 h-3 ml-0.5" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    )}
                  </button>

                  {isExplOpen && (
                    <div className="mt-2 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans animate-in fade-in duration-200">
                      <span className="text-emerald-400 font-semibold font-mono text-[11px] block mb-1">
                        Gabarito Oficial & Análise:
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
    </div>
  );
};

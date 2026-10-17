import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Sparkles,
  CheckCircle2,
  Layers,
  Loader2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { Topico, Materia, Flashcard, Sm2Rating } from '../../types';
import { flashcardService } from '../../services';
import { isAbortError } from '../../services/api';

interface FlashcardsTabProps {
  topic: Topico;
  materia?: Materia;
  planoId?: string;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  topic,
  materia,
  planoId,
}) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setGenerationError(null);
    setGenerationSuccess(null);
    flashcardService
      .listarPorTopico(topic.id)
      .then((res) => {
        setCards(res || []);
        setCurrentIndex(0);
        setIsFlipped(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [topic.id]);

  const currentCard = cards[currentIndex];
  const isFinished = cards.length > 0 && currentIndex >= cards.length;

  const handleRateCard = (rating: Sm2Rating) => {
    if (currentCard) {
      flashcardService.revisarCard(currentCard.id, rating).then((atualizado) => {
        if (atualizado) {
          setCards((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)));
        }
      });
    }

    setCards((prev) =>
      prev.map((c, i) =>
        i === currentIndex
          ? {
              ...c,
              repeticoes: rating === 'ERRO' ? 0 : (c.repeticoes || 0) + 1,
            }
          : c
      )
    );
    setIsFlipped(false);
    setCompletedCount((prev) => prev + 1);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 150);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompletedCount(0);
  };

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const handleCancelarGeracao = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleGerarFlashcardsIa = async () => {
    const effectivePlanoId = planoId || materia?.planoId;
    if (!effectivePlanoId) {
      setGenerationError('Nenhum plano de estudos ativo encontrado para vincular os cartões.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const novosCards = await flashcardService.gerarFlashcardsIa({
        planoId: effectivePlanoId,
        materiaId: materia?.id || (topic.materiaId !== 'geral' ? topic.materiaId : undefined),
        materiaNome: materia?.nome,
        topicoId: topic.id !== 'geral' ? topic.id : undefined,
        topicoNome: topic.titulo,
        subtopico: topic.topicoPaiId ? topic.titulo : undefined,
        subtopicoId: topic.topicoPaiId ? topic.id : undefined,
        quantidade: 5,
      }, controller.signal);

      if (novosCards && novosCards.length > 0) {
        setCards(novosCards);
        setCurrentIndex(0);
        setIsFlipped(false);
        setCompletedCount(0);
        setGenerationSuccess(`${novosCards.length} flashcards gerados por IA com sucesso!`);
      } else {
        const atualizados = await flashcardService.listarPorTopico(topic.id);
        if (atualizados.length > 0) {
          setCards(atualizados);
          setCurrentIndex(0);
          setIsFlipped(false);
          setCompletedCount(0);
          setGenerationSuccess(`${atualizados.length} flashcards carregados!`);
        } else {
          setGenerationError('A IA não gerou novos cartões. Tente novamente em instantes.');
        }
      }
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      console.error('Erro ao gerar flashcards via IA:', err);
      setGenerationError('Falha ao comunicar com o gerador de IA para calibrar flashcards.');
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-8 items-center justify-center text-center space-y-2 select-none bg-zinc-50/50 dark:bg-zinc-950/50">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span className="text-xs text-zinc-500 font-mono">Carregando flashcards do tópico...</span>
      </div>
    );
  }

  if (cards.length === 0) {
    if (isGenerating) {
      return (
        <div className="flex flex-col h-full p-6 items-center justify-center text-center space-y-3 select-none bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Gerando Flashcards com IA...
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-mono">
              Extraindo conceitos-chave de "{topic.titulo}" e elaborando perguntas para repetição espaçada SM-2.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full p-6 items-center justify-center text-center space-y-4 select-none bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
          <Layers className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Nenhum flashcard para este tópico
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Turbine sua memória de longo prazo gerando cartões inteligentes calibrados pelo algoritmo SM-2.
          </p>
        </div>

        {generationError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs text-left max-w-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={isGenerating ? handleCancelarGeracao : handleGerarFlashcardsIa}
          className={
            isGenerating
              ? 'w-full max-w-xs py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer animate-pulse'
              : 'w-full max-w-xs py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer'
          }
        >
          {isGenerating ? (
            <>
              <XCircle className="w-4 h-4" />
              <span>Cancelar Geração</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-white/20" />
              <span>Gerar Flashcards com IA para este Tópico</span>
            </>
          )}
        </button>

        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
          Cria 5 cartões inteligentes com base pedagógica
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4 justify-between select-none bg-zinc-50/50 dark:bg-zinc-950/50">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>Repetição Espaçada (SM-2)</span>
            <span className="text-[10px] font-mono font-normal text-zinc-500 dark:text-zinc-400">
              • {topic.titulo}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
            {cards.length} cartões no baralho
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isGenerating ? handleCancelarGeracao : handleGerarFlashcardsIa}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isGenerating
                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/80 hover:bg-red-100 dark:hover:bg-red-900/60 animate-pulse'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
            title={isGenerating ? 'Cancelar geração com IA' : 'Gerar mais flashcards com IA para este tópico'}
          >
            {isGenerating ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </button>
          <div className="text-xs font-mono px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-700/60 font-semibold">
            {!isFinished ? `${currentIndex + 1} / ${cards.length}` : 'Concluído'}
          </div>
        </div>
      </div>

      {generationSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <span>{generationSuccess}</span>
          <button
            type="button"
            onClick={() => setGenerationSuccess(null)}
            className="text-xs font-bold px-1 hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {generationError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{generationError}</span>
          <button
            type="button"
            onClick={() => setGenerationError(null)}
            className="text-xs font-bold px-1 hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Flashcard Container */}
      {!isFinished && currentCard ? (
        <div className="flex-1 flex flex-col justify-center items-center py-2">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`w-full max-w-md min-h-[260px] rounded-3xl border p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative group shadow-sm ${
              isFlipped
                ? 'bg-white dark:bg-zinc-900/95 border-emerald-400 dark:border-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md'
            }`}
          >
            {/* Card top badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                {isFlipped ? 'Resposta (Verso)' : 'Pergunta / Conceito (Frente)'}
              </span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
                Repetições: {currentCard.repeticoes}
              </span>
            </div>

            {/* Content text */}
            <div className="text-center my-auto px-2 py-4">
              <p
                className={`text-sm sm:text-base leading-relaxed transition-all font-sans ${
                  isFlipped
                    ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-900 dark:text-zinc-100 font-bold'
                }`}
              >
                {isFlipped ? currentCard.verso : currentCard.frente}
              </p>
            </div>

            {/* Bottom hint */}
            <div className="text-center pt-2">
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {isFlipped ? 'Clique para virar novamente' : 'Clique para revelar a resposta'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Finished State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Revisão do Dia Concluída!
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Você revisou {completedCount} {completedCount === 1 ? 'card' : 'cards'} deste tópico. Os intervalos sinápticos foram recalculados pelo algoritmo SM-2.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestart}
              className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Revisar Novamente</span>
            </button>
            <button
              type="button"
              onClick={isGenerating ? handleCancelarGeracao : handleGerarFlashcardsIa}
              className={`px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isGenerating
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar Geração</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Mais Cards (IA)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SM-2 Rating Controls Bar */}
      {!isFinished && (
        <div className="pt-2">
          {isFlipped ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 text-center uppercase tracking-wider font-semibold">
                Como foi a recuperação desta memória?
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleRateCard('ERRO')}
                  className="py-2.5 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-medium transition-all"
                >
                  <span className="block font-bold">Erro</span>
                  <span className="text-[10px] opacity-70">1 dia</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCard('DIFICIL')}
                  className="py-2.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-medium transition-all"
                >
                  <span className="block font-bold">Difícil</span>
                  <span className="text-[10px] opacity-70">3 dias</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCard('BOM')}
                  className="py-2.5 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-all"
                >
                  <span className="block font-bold">Bom</span>
                  <span className="text-[10px] opacity-70">7 dias</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCard('FACIL')}
                  className="py-2.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-all"
                >
                  <span className="block font-bold">Fácil</span>
                  <span className="text-[10px] opacity-70">14 dias</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className="w-full py-3 rounded-2xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Mostrar Resposta (Espaço / Clique)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

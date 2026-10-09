import React, { useState } from 'react';
import { RotateCw, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Topico, Flashcard, Sm2Rating } from '../../types';
import { mockFlashcards } from '../../data/mockData';

interface FlashcardsTabProps {
  topic: Topico;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ topic }) => {
  const [cards, setCards] = useState<Flashcard[]>(() => {
    return mockFlashcards[topic.id] || mockFlashcards['top-01'] || [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const currentCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length;

  const handleRateCard = (rating: Sm2Rating) => {
    setCards((prev) =>
      prev.map((c, i) =>
        i === currentIndex
          ? {
              ...c,
              repeticoes: rating === 'ERRO' ? 0 : c.repeticoes + 1,
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

  return (
    <div className="flex flex-col h-full p-4 space-y-4 justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-zinc-900/70 p-3 rounded-xl border border-zinc-800">
        <div>
          <div className="text-xs font-semibold text-zinc-200">
            Repetição Espaçada (SRS / SM-2)
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            {topic.titulo}
          </div>
        </div>
        <div className="text-xs font-mono px-2 py-1 bg-zinc-800/80 text-zinc-300 rounded-lg border border-zinc-700/60">
          {!isFinished ? `${currentIndex + 1} / ${cards.length}` : 'Concluído'}
        </div>
      </div>

      {/* Main Flashcard Container */}
      {!isFinished && currentCard ? (
        <div className="flex-1 flex flex-col justify-center items-center py-2">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`w-full max-w-md h-72 rounded-2xl border p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative group ${
              isFlipped
                ? 'bg-zinc-900/90 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
            }`}
          >
            {/* Card top badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                {isFlipped ? 'Resposta (Verso)' : 'Pergunta / Conceito (Frente)'}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Virar card</span>
              </div>
            </div>

            {/* Card Content Text */}
            <div className="text-center my-auto px-2">
              <p className="text-sm md:text-base font-medium text-zinc-100 leading-relaxed">
                {isFlipped ? currentCard.verso : currentCard.frente}
              </p>
            </div>

            {/* Card footer info */}
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Intervalo: {currentCard.intervaloDias}d</span>
              <span>Revisão: {currentCard.proximaRevisao}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Finished State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Deck do Tópico Revisado!
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Você revisou {completedCount} cartões com o algoritmo SuperMemo SM-2. Os próximos intervalos foram recalculados.
            </p>
          </div>
          <button
            onClick={handleRestart}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-all border border-zinc-700"
          >
            Revisar Novamente
          </button>
        </div>
      )}

      {/* SM-2 Rating Controls (Only visible when flipped) */}
      {!isFinished && (
        <div className="pt-2">
          {isFlipped ? (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="text-[10px] font-mono text-zinc-500 text-center uppercase tracking-wider">
                Como foi a recuperação desta memória?
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleRateCard('ERRO')}
                  className="py-2.5 px-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-medium transition-all"
                >
                  <span className="block font-semibold">Erro</span>
                  <span className="text-[10px] opacity-70">1 dia</span>
                </button>
                <button
                  onClick={() => handleRateCard('DIFICIL')}
                  className="py-2.5 px-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all"
                >
                  <span className="block font-semibold">Difícil</span>
                  <span className="text-[10px] opacity-70">3 dias</span>
                </button>
                <button
                  onClick={() => handleRateCard('BOM')}
                  className="py-2.5 px-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-all"
                >
                  <span className="block font-semibold">Bom</span>
                  <span className="text-[10px] opacity-70">7 dias</span>
                </button>
                <button
                  onClick={() => handleRateCard('FACIL')}
                  className="py-2.5 px-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-all"
                >
                  <span className="block font-semibold">Fácil</span>
                  <span className="text-[10px] opacity-70">14 dias</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Mostrar Resposta (Espaço / Clique)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

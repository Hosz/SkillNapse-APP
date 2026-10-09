import { ApiService } from './api';
import type { Flashcard, Sm2Rating } from '../types';

export const flashcardService = {
  async listarPorTopico(topicoId: string): Promise<Flashcard[]> {
    try {
      const data = await ApiService.request<{ content?: Flashcard[] } | Flashcard[]>(`/flashcards/due?topicoId=${topicoId}`);
      if (Array.isArray(data)) {
        return data;
      }
      return data?.content || [];
    } catch {
      return [];
    }
  },

  async revisarCard(cardId: string, rating: Sm2Rating): Promise<boolean> {
    try {
      const qualidadeMap: Record<Sm2Rating, number> = {
        ERRO: 0,
        DIFICIL: 2,
        BOM: 4,
        FACIL: 5,
      };

      await ApiService.request(`/flashcards/${cardId}/revisar`, {
        method: 'POST',
        body: JSON.stringify({ qualidade: qualidadeMap[rating] ?? 4 }),
      });
      return true;
    } catch {
      return true;
    }
  },
};

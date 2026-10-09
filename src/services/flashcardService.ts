import { ApiService } from './api';
import type { Flashcard, Sm2Rating } from '../types';
import { mockFlashcards } from '../data/mockData';

export const flashcardService = {
  async listarPorTopico(topicoId: string): Promise<Flashcard[]> {
    try {
      const data = await ApiService.request<Flashcard[]>(`/flashcards?topicoId=${topicoId}`);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return mockFlashcards[topicoId] || mockFlashcards['top-01'] || [];
    } catch {
      return mockFlashcards[topicoId] || mockFlashcards['top-01'] || [];
    }
  },

  async revisarCard(cardId: string, rating: Sm2Rating): Promise<boolean> {
    try {
      await ApiService.request(`/flashcards/${cardId}/revisar`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      });
      return true;
    } catch {
      return true;
    }
  },
};

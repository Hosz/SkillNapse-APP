import { ApiService } from './api';
import type { Flashcard, Sm2Rating } from '../types';

export interface CriarFlashcardPayload {
  baralhoId?: string;
  topicoId?: string;
  frente: string;
  verso: string;
  planoId?: string;
  materiaId?: string;
  materiaNome?: string;
  topicoNome?: string;
  subtopicoNome?: string;
}

export interface AtualizarFlashcardPayload {
  topicoId?: string;
  frente: string;
  verso: string;
  planoId?: string;
  materiaId?: string;
  materiaNome?: string;
  topicoNome?: string;
  subtopicoNome?: string;
}

export interface GerarFlashcardsIaPayload {
  planoId: string;
  materiaId?: string;
  materiaNome?: string;
  topicoId?: string;
  topicoNome?: string;
  subtopico?: string;
  subtopicoId?: string;
  quantidade: number;
}

const STORAGE_METADATA_KEY = 'skillnapse_flashcards_metadata';

function getStoredMetadata(): Record<string, Partial<Flashcard>> {
  try {
    const raw = localStorage.getItem(STORAGE_METADATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredMetadata(cardId: string, meta: Partial<Flashcard>) {
  try {
    const current = getStoredMetadata();
    current[cardId] = { ...(current[cardId] || {}), ...meta };
    localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(current));
  } catch {
    // Silencia erro de storage
  }
}

function removeStoredMetadata(cardId: string) {
  try {
    const current = getStoredMetadata();
    delete current[cardId];
    localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(current));
  } catch {
    // Silencia erro de storage
  }
}

let cachedBaralhoId: string | null = null;

export const flashcardService = {
  async obterBaralhoPadrao(): Promise<string | null> {
    if (cachedBaralhoId) return cachedBaralhoId;
    try {
      const data = await ApiService.request<{ content: any[] } | any[]>('/baralhos');
      const list = Array.isArray(data) ? data : (data?.content || []);
      if (list.length > 0) {
        cachedBaralhoId = String(list[0].id);
        return cachedBaralhoId;
      }
      const novoBaralho = await ApiService.request<any>('/baralhos', {
        method: 'POST',
        body: JSON.stringify({
          nome: 'Acervo Geral de Flashcards',
          descricao: 'Baralho principal para repetição espaçada SM-2',
        }),
      });
      cachedBaralhoId = String(novoBaralho.id);
      return cachedBaralhoId;
    } catch {
      return null;
    }
  },

  async listarPorTopico(topicoId: string): Promise<Flashcard[]> {
    try {
      const data = await ApiService.request<{ content?: Flashcard[] } | Flashcard[]>(
        `/flashcards/due?topicoId=${topicoId}`
      );
      if (Array.isArray(data)) {
        return data;
      }
      return data?.content || [];
    } catch {
      return [];
    }
  },

  async listarTodos(): Promise<Flashcard[]> {
    try {
      const metas = getStoredMetadata();
      const enrich = (list: Flashcard[]): Flashcard[] =>
        list.map((c) => ({
          ...c,
          ...(metas[c.id] || {}),
        }));

      const baralhoId = await this.obterBaralhoPadrao();
      if (baralhoId) {
        const dataBaralho = await ApiService.request<{ content?: Flashcard[] } | Flashcard[]>(
          `/flashcards/baralho/${baralhoId}`
        );
        const list = Array.isArray(dataBaralho) ? dataBaralho : (dataBaralho?.content || []);
        if (list.length > 0) return enrich(list);
      }

      const dataDue = await ApiService.request<{ content?: Flashcard[] } | Flashcard[]>(
        '/flashcards/due'
      );
      if (Array.isArray(dataDue)) {
        return enrich(dataDue);
      }
      return enrich(dataDue?.content || []);
    } catch {
      return [];
    }
  },

  async criarFlashcard(payload: CriarFlashcardPayload): Promise<Flashcard | null> {
    try {
      const baralhoId = payload.baralhoId || await this.obterBaralhoPadrao();
      if (!baralhoId) {
        throw new Error('Nenhum baralho disponível para vincular o flashcard.');
      }

      const bodyPayload: any = {
        baralhoId,
        frente: payload.frente,
        verso: payload.verso,
      };
      if (payload.topicoId && payload.topicoId !== 'geral') {
        bodyPayload.topicoId = payload.topicoId;
      }

      const criado = await ApiService.request<Flashcard>('/flashcards', {
        method: 'POST',
        body: JSON.stringify(bodyPayload),
      });

      if (criado) {
        const meta = {
          planoId: payload.planoId,
          materiaId: payload.materiaId,
          materiaNome: payload.materiaNome,
          topicoNome: payload.topicoNome,
          subtopicoNome: payload.subtopicoNome,
        };
        saveStoredMetadata(criado.id, meta);
        return {
          ...criado,
          ...meta,
        };
      }
      return null;
    } catch (err) {
      console.error('Erro ao cadastrar flashcard:', err);
      return null;
    }
  },

  async atualizarFlashcard(cardId: string, payload: AtualizarFlashcardPayload): Promise<Flashcard | null> {
    try {
      const bodyPayload: any = {
        frente: payload.frente,
        verso: payload.verso,
      };
      if (payload.topicoId && payload.topicoId !== 'geral') {
        bodyPayload.topicoId = payload.topicoId;
      }

      const atualizado = await ApiService.request<Flashcard>(`/flashcards/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify(bodyPayload),
      });

      const meta: Partial<Flashcard> = {};
      if (payload.planoId) meta.planoId = payload.planoId;
      if (payload.materiaId) meta.materiaId = payload.materiaId;
      if (payload.materiaNome) meta.materiaNome = payload.materiaNome;
      if (payload.topicoNome) meta.topicoNome = payload.topicoNome;
      if (payload.subtopicoNome) meta.subtopicoNome = payload.subtopicoNome;
      saveStoredMetadata(cardId, meta);

      if (atualizado) {
        return {
          ...atualizado,
          ...meta,
        };
      }
      return null;
    } catch (err) {
      console.error('Erro ao atualizar flashcard:', err);
      return null;
    }
  },

  async apagarFlashcard(cardId: string): Promise<boolean> {
    try {
      await ApiService.request(`/flashcards/${cardId}`, {
        method: 'DELETE',
      });
      removeStoredMetadata(cardId);
      return true;
    } catch (err) {
      console.error('Erro ao excluir flashcard:', err);
      return false;
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

  async gerarFlashcardsIa(payload: GerarFlashcardsIaPayload): Promise<Flashcard[]> {
    const res = await ApiService.request<Flashcard[]>('/flashcards/ia/gerar', {
      method: 'POST',
      body: JSON.stringify({
        planoId: payload.planoId,
        materiaId: payload.materiaId,
        topicoId: payload.topicoId,
        subtopico: payload.subtopico,
        subtopicoId: payload.subtopicoId,
        quantidade: payload.quantidade,
      }),
    });
    const lista = Array.isArray(res) ? res : [];
    const meta = {
      planoId: payload.planoId,
      materiaId: payload.materiaId,
      materiaNome: payload.materiaNome,
      topicoNome: payload.topicoNome,
      subtopicoNome: payload.subtopico,
    };
    return lista.map((card) => {
      saveStoredMetadata(card.id, meta);
      return {
        ...card,
        ...meta,
      };
    });
  },
};

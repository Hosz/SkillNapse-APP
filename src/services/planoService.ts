import { ApiService } from './api';
import type { PlanoEstudo, Materia, Topico } from '../types';
import { mockPlano } from '../data/mockData';

export interface CriarPlanoPayload {
  titulo: string;
  cargoAlvo?: string;
  descricao?: string;
  orgao?: string;
  dataExame?: string;
  banca?: string;
}

export interface EditarPlanoPayload {
  titulo?: string;
  descricao?: string;
  ativo?: boolean;
}

export interface CriarMateriaPayload {
  nome: string;
  corHex?: string;
  ordem?: number;
}

export interface EditarMateriaPayload {
  nome?: string;
  corHex?: string;
  ordem?: number;
}

export interface CriarTopicoPayload {
  titulo: string;
  peso?: number;
  topicoPaiId?: string;
  ordem?: number;
}

export interface EditarTopicoPayload {
  titulo?: string;
  peso?: number;
  ordem?: number;
}

export interface AtualizarProgressoPayload {
  concluido?: boolean;
  proficiencia?: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
}

export const planoService = {
  // --- PLANOS DE ESTUDO ---
  async obterPlanoAtivo(planoId?: string): Promise<PlanoEstudo> {
    try {
      if (planoId) {
        return await ApiService.request<PlanoEstudo>(`/plano-estudo/${planoId}`);
      }
      const data = await ApiService.request<{ content: PlanoEstudo[] }>('/plano-estudo');
      if (data && data.content && data.content.length > 0) {
        return data.content[0];
      }
      return mockPlano;
    } catch {
      return mockPlano;
    }
  },

  async listarPlanos(): Promise<PlanoEstudo[]> {
    try {
      const data = await ApiService.request<{ content: PlanoEstudo[] }>('/plano-estudo');
      return data?.content || [mockPlano];
    } catch {
      return [mockPlano];
    }
  },

  async criarPlano(payload: CriarPlanoPayload): Promise<PlanoEstudo> {
    try {
      return await ApiService.request<PlanoEstudo>('/plano-estudo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        ...mockPlano,
        id: `plano-${Date.now()}`,
        titulo: payload.titulo,
        cargoAlvo: payload.cargoAlvo || '',
        dataExame: payload.dataExame,
        materias: [],
      };
    }
  },

  async editarPlano(planoId: string, payload: EditarPlanoPayload): Promise<PlanoEstudo | null> {
    try {
      return await ApiService.request<PlanoEstudo>(`/plano-estudo/${planoId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async excluirPlano(planoId: string): Promise<boolean> {
    try {
      await ApiService.request(`/plano-estudo/${planoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },

  // --- MATÉRIAS ---
  async criarMateria(planoId: string, payload: CriarMateriaPayload): Promise<Materia> {
    try {
      return await ApiService.request<Materia>(`/materias/plano/${planoId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        id: `mat-${Date.now()}`,
        planoId,
        nome: payload.nome,
        corHex: payload.corHex || '#3b82f6',
        ordem: payload.ordem || 1,
        topicos: [],
      };
    }
  },

  async editarMateria(materiaId: string, payload: EditarMateriaPayload): Promise<Materia | null> {
    try {
      return await ApiService.request<Materia>(`/materias/${materiaId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async excluirMateria(materiaId: string): Promise<boolean> {
    try {
      await ApiService.request(`/materias/${materiaId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },

  // --- TÓPICOS E SUBTÓPICOS ---
  async criarTopico(materiaId: string, payload: CriarTopicoPayload): Promise<Topico> {
    try {
      return await ApiService.request<Topico>(`/topicos/materia/${materiaId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        id: `top-${Date.now()}`,
        materiaId,
        titulo: payload.titulo,
        peso: payload.peso || 5,
        proficiencia: 'INICIANTE',
        ordem: payload.ordem || 1,
        subtopicos: [],
      };
    }
  },

  async editarTopico(topicoId: string, payload: EditarTopicoPayload): Promise<Topico | null> {
    try {
      return await ApiService.request<Topico>(`/topicos/${topicoId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async atualizarProgressoTopico(topicoId: string, payload: AtualizarProgressoPayload): Promise<Topico | null> {
    try {
      return await ApiService.request<Topico>(`/topicos/${topicoId}/progresso`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async excluirTopico(topicoId: string): Promise<boolean> {
    try {
      await ApiService.request(`/topicos/${topicoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },
};

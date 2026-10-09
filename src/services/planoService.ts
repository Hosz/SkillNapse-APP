import { ApiService } from './api';
import type { PlanoEstudo } from '../types';
import { mockPlano } from '../data/mockData';

export const planoService = {
  async obterPlanoAtivo(planoId?: string): Promise<PlanoEstudo> {
    try {
      if (planoId) {
        return await ApiService.request<PlanoEstudo>(`/plano-estudo/${planoId}`);
      }
      // Buscar primeiro plano listado
      const data = await ApiService.request<{ content: PlanoEstudo[] }>('/plano-estudo');
      if (data && data.content && data.content.length > 0) {
        return data.content[0];
      }
      return mockPlano;
    } catch {
      // Fallback transparente se API offline ou mock mode
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

  async criarPlano(titulo: string, cargoAlvo?: string): Promise<PlanoEstudo> {
    try {
      return await ApiService.request<PlanoEstudo>('/plano-estudo', {
        method: 'POST',
        body: JSON.stringify({ titulo, cargoAlvo }),
      });
    } catch {
      return {
        ...mockPlano,
        id: `plano-${Date.now()}`,
        titulo,
        cargoAlvo,
      };
    }
  },
};

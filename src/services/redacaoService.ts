import { ApiService } from './api';
import type { TemaRedacao } from '../types';
import { mockTemasRedacao } from '../data/mockData';

export interface SubmissaoTextoPayload {
  temaRedacaoId: string;
  conteudoTexto: string;
}

export const redacaoService = {
  async listarTemas(): Promise<TemaRedacao[]> {
    try {
      const data = await ApiService.request<TemaRedacao[]>('/redacoes/temas');
      return Array.isArray(data) && data.length > 0 ? data : mockTemasRedacao;
    } catch {
      return mockTemasRedacao;
    }
  },

  async submeterTexto(payload: SubmissaoTextoPayload) {
    try {
      return await ApiService.request('/redacoes/submissoes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async submeterFoto(temaId: string, imageFile: File) {
    try {
      const formData = new FormData();
      formData.append('temaRedacaoId', temaId);
      formData.append('imagem', imageFile);

      return await ApiService.request('/redacoes/submissoes/imagem', {
        method: 'POST',
        body: formData,
      });
    } catch {
      return null;
    }
  },
};

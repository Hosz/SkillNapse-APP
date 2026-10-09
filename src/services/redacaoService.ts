import { ApiService } from './api';
import type { TemaRedacao } from '../types';

export interface SubmissaoTextoPayload {
  temaRedacaoId: string;
  conteudoTexto: string;
}

export const redacaoService = {
  async listarTemas(): Promise<TemaRedacao[]> {
    try {
      const data = await ApiService.request<{ content?: TemaRedacao[] } | TemaRedacao[]>('/redacoes/temas');
      if (Array.isArray(data)) {
        return data;
      }
      return data?.content || [];
    } catch {
      return [];
    }
  },

  async gerarTemaAi(eixoTematico?: string): Promise<TemaRedacao | null> {
    try {
      return await ApiService.request<TemaRedacao>('/redacoes/temas/gerar', {
        method: 'POST',
        body: JSON.stringify({ eixoTematico }),
      });
    } catch {
      return null;
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

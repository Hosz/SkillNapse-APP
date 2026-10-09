import { ApiService } from './api';

export interface RascunhoData {
  topicoId: string;
  notasTexto: string;
  canvasDataUrl?: string;
  atualizadoEm?: string;
}

export const canvasService = {
  async obterRascunho(topicoId: string): Promise<RascunhoData> {
    try {
      return await ApiService.request<RascunhoData>(`/canvas/${topicoId}`);
    } catch {
      const saved = localStorage.getItem(`skillnapse_notes_${topicoId}`);
      return {
        topicoId,
        notasTexto: saved || '',
      };
    }
  },

  async salvarRascunho(payload: RascunhoData): Promise<boolean> {
    // Sempre garante persistência local instantânea
    localStorage.setItem(`skillnapse_notes_${payload.topicoId}`, payload.notasTexto);

    try {
      await ApiService.request(`/canvas/${payload.topicoId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return true;
    } catch {
      // Offline fallback
      return true;
    }
  },
};

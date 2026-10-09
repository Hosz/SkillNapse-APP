import { ApiService } from './api';

export const editalService = {
  async parseEdital(file: File, cargoAlvo?: string) {
    try {
      const formData = new FormData();
      formData.append('arquivo', file);

      const query = cargoAlvo ? `?cargoAlvo=${encodeURIComponent(cargoAlvo)}` : '';
      return await ApiService.request(`/editais/parse${query}`, {
        method: 'POST',
        body: formData,
      });
    } catch {
      return null;
    }
  },

  async converterParaPlano(rascunhoId: string) {
    try {
      return await ApiService.request(`/editais/rascunhos/${rascunhoId}/converter`, {
        method: 'POST',
      });
    } catch {
      return null;
    }
  },

  async listarRascunhos() {
    try {
      return await ApiService.request('/editais/rascunhos');
    } catch {
      return [];
    }
  },
};

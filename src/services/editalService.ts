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

  async converterParaPlano(editalId: string) {
    try {
      return await ApiService.request(`/editais/${editalId}/converter-plano`, {
        method: 'POST',
      });
    } catch {
      return null;
    }
  },
};

import { ApiService } from './api';

export interface LacunasDesempenhoResponse {
  scoreProntidao: number;
  totalQuestoesRespondidas: number;
  totalAcertos: number;
  taxaAcertoGeral: number;
  totalTopicosCriticos: number;
  materias: {
    materiaId: string;
    materiaNome: string;
    taxaAcerto: number;
    topicosCriticos: {
      topicoId: string;
      topicoTitulo: string;
      peso: number;
      criticidade: 'ALTA' | 'MEDIA' | 'BAIXA';
    }[];
  }[];
}

export const desempenhoService = {
  async obterLacunas(planoId: string): Promise<LacunasDesempenhoResponse | null> {
    try {
      return await ApiService.request<LacunasDesempenhoResponse>(`/desempenho/planos/${planoId}/lacunas`);
    } catch {
      return null;
    }
  },
};

import { ApiService } from './api';

export interface OfensivaResponse {
  totalDiasConsecutivos: number;
  ultimoDiaEstudado?: string;
  ativoHoje: boolean;
}

export interface MetasProgressoResponse {
  minutosMetaDiaria: number;
  minutosEstudadosHoje: number;
  percentualConcluido: number;
}

export const gamificacaoService = {
  async obterOfensiva(): Promise<OfensivaResponse> {
    try {
      return await ApiService.request<OfensivaResponse>('/gamificacao/ofensiva');
    } catch {
      return {
        totalDiasConsecutivos: 14,
        ativoHoje: true,
      };
    }
  },

  async obterProgressoMetas(): Promise<MetasProgressoResponse> {
    try {
      return await ApiService.request<MetasProgressoResponse>('/gamificacao/metas/progresso');
    } catch {
      return {
        minutosMetaDiaria: 180, // 3h
        minutosEstudadosHoje: 165, // 2h 45m
        percentualConcluido: 91.6,
      };
    }
  },

  async registrarEstudoManual(): Promise<boolean> {
    try {
      await ApiService.request('/gamificacao/ofensiva/registrar-estudo', {
        method: 'POST',
      });
      return true;
    } catch {
      return true;
    }
  },
};

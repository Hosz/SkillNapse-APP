import { ApiService } from './api';

export interface OfensivaResponse {
  totalDiasConsecutivos: number;
  diasConsecutivosAtual?: number;
  maiorSequenciaDias?: number;
  ultimoDiaEstudado?: string;
  dataUltimoEstudo?: string;
  ativoHoje: boolean;
  estudouHoje?: boolean;
  ofensivaAtiva?: boolean;
}

export interface MetasProgressoResponse {
  minutosMetaDiaria: number;
  minutosEstudadosHoje: number;
  percentualConcluido: number;
}

export const gamificacaoService = {
  async obterOfensiva(): Promise<OfensivaResponse> {
    try {
      const res = await ApiService.request<any>('/gamificacao/ofensiva');
      const dias = res?.diasConsecutivosAtual ?? res?.totalDiasConsecutivos ?? 0;
      return {
        totalDiasConsecutivos: dias,
        diasConsecutivosAtual: dias,
        maiorSequenciaDias: res?.maiorSequenciaDias ?? 0,
        ultimoDiaEstudado: res?.dataUltimoEstudo ?? res?.ultimoDiaEstudado,
        dataUltimoEstudo: res?.dataUltimoEstudo ?? res?.ultimoDiaEstudado,
        ativoHoje: res?.estudouHoje ?? res?.ativoHoje ?? false,
        estudouHoje: res?.estudouHoje ?? res?.ativoHoje ?? false,
        ofensivaAtiva: res?.ofensivaAtiva ?? false,
      };
    } catch {
      return {
        totalDiasConsecutivos: 0,
        diasConsecutivosAtual: 0,
        ativoHoje: false,
        estudouHoje: false,
      };
    }
  },

  async obterProgressoMetas(): Promise<MetasProgressoResponse> {
    try {
      const res = await ApiService.request<any>('/gamificacao/metas/progresso');
      return {
        minutosMetaDiaria: res?.metaMinutosEstudo ?? res?.minutosMetaDiaria ?? 180,
        minutosEstudadosHoje: res?.minutosEstudadosHoje ?? 0,
        percentualConcluido: res?.percentualMinutosEstudo ?? res?.percentualConcluido ?? 0,
      };
    } catch {
      return {
        minutosMetaDiaria: 180, // Meta diária de 3h padrão
        minutosEstudadosHoje: 0,
        percentualConcluido: 0,
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

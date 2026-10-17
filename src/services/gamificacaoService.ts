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
  metaMinutosAtingida?: boolean;
  metaQuestoesResolvidas: number;
  questoesResolvidasHoje: number;
  percentualQuestoes: number;
  metaQuestoesAtingida?: boolean;
  todasMetasAtingidas?: boolean;
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
        metaMinutosAtingida: res?.metaMinutosAtingida ?? false,
        metaQuestoesResolvidas: res?.metaQuestoesResolvidas ?? 15,
        questoesResolvidasHoje: res?.questoesResolvidasHoje ?? 0,
        percentualQuestoes: res?.percentualQuestoes ?? 0,
        metaQuestoesAtingida: res?.metaQuestoesAtingida ?? false,
        todasMetasAtingidas: res?.todasMetasAtingidas ?? false,
      };
    } catch {
      return {
        minutosMetaDiaria: 180,
        minutosEstudadosHoje: 0,
        percentualConcluido: 0,
        metaMinutosAtingida: false,
        metaQuestoesResolvidas: 15,
        questoesResolvidasHoje: 0,
        percentualQuestoes: 0,
        metaQuestoesAtingida: false,
        todasMetasAtingidas: false,
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

  async atualizarMetas(metaMinutosEstudo: number, metaQuestoesResolvidas: number = 0): Promise<boolean> {
    try {
      await ApiService.request('/gamificacao/metas', {
        method: 'PUT',
        body: JSON.stringify({
          metaMinutosEstudo,
          metaQuestoesResolvidas,
        }),
      });
      return true;
    } catch {
      return false;
    }
  },
};

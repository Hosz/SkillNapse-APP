import { ApiService } from './api';

export interface RegistrarSessaoPayload {
  topicoId: string;
  iniciadoEm?: string;
  finalizadoEm?: string;
  duracaoLiquidaSegundos: number;
  status: 'CONCLUIDA' | 'INTERROMPIDA';
  observacoes?: string;
}

export interface ResumoSessoesResponse {
  totalSegundosEstudados: number;
  totalSegundosLiquidos?: number;
  totalHorasLiquidas?: number;
  totalSessoesConcluidas: number;
}

export const sessaoService = {
  async registrarSessao(payload: RegistrarSessaoPayload): Promise<{ sucesso: boolean; id?: string }> {
    try {
      const duracao = Math.max(1, payload.duracaoLiquidaSegundos || 1);
      const now = new Date();
      const past = new Date(now.getTime() - (duracao + 2) * 1000);

      const response = await ApiService.request<{ id: string }>('/sessoes-estudo', {
        method: 'POST',
        body: JSON.stringify({
          topicoId: payload.topicoId,
          iniciadoEm: payload.iniciadoEm || past.toISOString(),
          finalizadoEm: payload.finalizadoEm || now.toISOString(),
          duracaoLiquidaSegundos: duracao,
          status: payload.status,
          observacoes: payload.observacoes || 'Sessão Pomodoro consolidada via frontend.',
        }),
      });

      return { sucesso: true, id: response?.id };
    } catch {
      // Salva no registro offline local
      const localHistory = JSON.parse(localStorage.getItem('skillnapse_offline_sessoes') || '[]');
      localHistory.push({ ...payload, timestamp: new Date().toISOString() });
      localStorage.setItem('skillnapse_offline_sessoes', JSON.stringify(localHistory));
      return { sucesso: true, id: `offline-${Date.now()}` };
    }
  },

  async obterResumoHoje(): Promise<ResumoSessoesResponse> {
    try {
      const res = await ApiService.request<any>('/sessoes-estudo/resumo');
      const segundos = res?.totalSegundosLiquidos ?? res?.totalSegundosEstudados ?? 0;
      return {
        totalSegundosEstudados: segundos,
        totalSegundosLiquidos: segundos,
        totalHorasLiquidas: res?.totalHorasLiquidas ?? (segundos / 3600),
        totalSessoesConcluidas: res?.totalSessoesConcluidas ?? 0,
      };
    } catch {
      return {
        totalSegundosEstudados: 0,
        totalSegundosLiquidos: 0,
        totalHorasLiquidas: 0,
        totalSessoesConcluidas: 0,
      };
    }
  },
};

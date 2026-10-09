import { ApiService } from './api';
import type { Questao } from '../types';

export interface RespostaQuestaoPayload {
  alternativaEscolhidaId: string;
  tempoGastoSegundos: number;
  topicoId?: string;
  simuladoId?: string;
}

export interface RespostaQuestaoResponse {
  acertou: boolean;
  alternativaCorretaId: string;
  explicacaoGabarito: string;
}

export const questaoService = {
  async listarPorTopico(topicoId: string): Promise<Questao[]> {
    try {
      const data = await ApiService.request<{ content: Questao[] }>(`/questoes?topicoId=${topicoId}`);
      return data?.content || [];
    } catch {
      return [];
    }
  },

  async responderQuestao(questaoId: string, payload: RespostaQuestaoPayload): Promise<RespostaQuestaoResponse> {
    return await ApiService.request<RespostaQuestaoResponse>(`/questoes/${questaoId}/responder`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async gerarSimuladoAdaptativo(planoId: string, quantidade: number = 10): Promise<{ simuladoId: string; totalQuestoes: number } | null> {
    try {
      return await ApiService.request('/simulados/adaptativo/gerar', {
        method: 'POST',
        body: JSON.stringify({ planoId, quantidade }),
      });
    } catch {
      return null;
    }
  },
};

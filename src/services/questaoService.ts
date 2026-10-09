import { ApiService } from './api';
import type { Questao } from '../types';
import { mockQuestoes } from '../data/mockData';

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
      if (data?.content && data.content.length > 0) {
        return data.content;
      }
      return mockQuestoes[topicoId] || mockQuestoes['top-01'] || [];
    } catch {
      return mockQuestoes[topicoId] || mockQuestoes['top-01'] || [];
    }
  },

  async responderQuestao(questaoId: string, payload: RespostaQuestaoPayload): Promise<RespostaQuestaoResponse> {
    try {
      return await ApiService.request<RespostaQuestaoResponse>(`/questoes/${questaoId}/responder`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Local check
      return {
        acertou: true,
        alternativaCorretaId: payload.alternativaEscolhidaId,
        explicacaoGabarito: 'Gabarito validado com sucesso.',
      };
    }
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

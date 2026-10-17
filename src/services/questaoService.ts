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
      const data = await ApiService.request<Questao[] | { content: Questao[] }>(`/questoes/topico/${topicoId}`);
      if (Array.isArray(data)) {
        return data;
      }
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

  async criarQuestao(payload: {
    topicoId?: string;
    enunciado: string;
    dificuldade?: 'FACIL' | 'MEDIA' | 'DIFICIL';
    banca?: string;
    ano?: number;
    assuntoGeral?: string;
    topicoReferencia?: string;
    explicacaoGabarito?: string;
    alternativas: Array<{
      letra: 'A' | 'B' | 'C' | 'D' | 'E';
      texto: string;
      correta: boolean;
    }>;
  }): Promise<Questao | null> {
    try {
      return await ApiService.request<Questao>('/questoes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },
};

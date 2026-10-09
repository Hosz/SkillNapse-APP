import { ApiService } from './api';

export interface SimuladoResumo {
  id: string;
  titulo: string;
  tipo: 'MANUAL' | 'ADAPTATIVO_IA';
  concluido: boolean;
  criadoEm: string;
  totalQuestoesRespondidas: number;
  totalAcertos: number;
  percentualAcerto: number;
}

export interface QuestaoSimulado {
  id: string;
  topicoId?: string;
  assuntoGeral: string;
  topicoReferencia?: string;
  enunciado: string;
  dificuldade: 'FACIL' | 'MEDIA' | 'DIFICIL';
  banca?: string;
  ano?: number;
  alternativas: Array<{
    id: string;
    letra: string;
    texto: string;
  }>;
}

export interface SimuladoDetalhe {
  simuladoId: string;
  titulo: string;
  tipo: 'MANUAL' | 'ADAPTATIVO_IA';
  concluido: boolean;
  criadoEm: string;
  totalQuestoes: number;
  questoes: QuestaoSimulado[];
}

export interface GerarSimuladoPayload {
  planoEstudoId: string;
  quantidadeQuestoes?: number;
  bancaAlvo?: string;
  topicoIds?: string[];
}

export const simuladoService = {
  async listarSimulados(): Promise<SimuladoResumo[]> {
    try {
      const data = await ApiService.request<{ content: SimuladoResumo[] }>('/simulados');
      return data?.content || [];
    } catch {
      return [];
    }
  },

  async gerarSimuladoAdaptativo(payload: GerarSimuladoPayload): Promise<SimuladoDetalhe> {
    return await ApiService.request<SimuladoDetalhe>('/simulados/adaptativo/gerar', {
      method: 'POST',
      body: JSON.stringify({
        planoEstudoId: payload.planoEstudoId,
        quantidadeQuestoes: Math.max(3, Math.min(15, payload.quantidadeQuestoes || 5)),
        bancaAlvo: payload.bancaAlvo || 'CESPE / Cebraspe',
        topicoIds: payload.topicoIds || [],
      }),
    });
  },

  async responderQuestao(questaoId: string, alternativaEscolhidaId: string, simuladoId: string): Promise<boolean> {
    try {
      const res = await ApiService.request<{ acertou: boolean }>(`/questoes/${questaoId}/responder`, {
        method: 'POST',
        body: JSON.stringify({
          alternativaEscolhidaId,
          tempoGastoSegundos: 45,
          simuladoId,
        }),
      });
      return res?.acertou ?? true;
    } catch {
      return true;
    }
  },

  async concluirSimulado(simuladoId: string): Promise<SimuladoResumo> {
    return await ApiService.request<SimuladoResumo>(`/simulados/${simuladoId}/concluir`, {
      method: 'PATCH',
    });
  },
};

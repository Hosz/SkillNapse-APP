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
  titulo?: string;
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
    const isUUID = (val?: string): boolean =>
      !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

    const validTopicoIds = (payload.topicoIds || []).filter((id) => isUUID(id));

    return await ApiService.request<SimuladoDetalhe>('/simulados/adaptativo/gerar', {
      method: 'POST',
      body: JSON.stringify({
        planoEstudoId: payload.planoEstudoId,
        quantidadeQuestoes: Math.max(3, Math.min(15, payload.quantidadeQuestoes || 10)),
        bancaAlvo: payload.bancaAlvo || 'CESPE / Cebraspe',
        topicoIds: validTopicoIds.length > 0 ? validTopicoIds : undefined,
        ...(payload.titulo ? { titulo: payload.titulo.trim() } : {}),
      }),
    });
  },

  async responderQuestao(
    questaoId: string,
    alternativaEscolhidaId: string,
    simuladoId: string,
    topicoId?: string
  ): Promise<boolean> {
    try {
      const res = await ApiService.request<{ acertou: boolean }>(`/questoes/${questaoId}/responder`, {
        method: 'POST',
        body: JSON.stringify({
          alternativaEscolhidaId,
          tempoGastoSegundos: 45,
          simuladoId,
          ...(topicoId ? { topicoId } : {}),
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

  async obterSimulado(simuladoId: string): Promise<SimuladoDetalhe | null> {
    try {
      const data = await ApiService.request<any>(`/simulados/${simuladoId}`);
      if (!data) return null;
      return {
        simuladoId: data.simuladoId || data.id || simuladoId,
        titulo: data.titulo || 'Simulado',
        tipo: data.tipo || 'ADAPTATIVO_IA',
        concluido: !!data.concluido,
        criadoEm: data.criadoEm || new Date().toISOString(),
        totalQuestoes: data.totalQuestoes || (data.questoes?.length ?? 0),
        questoes: Array.isArray(data.questoes) ? data.questoes : [],
      };
    } catch {
      return null;
    }
  },

  async excluirSimulado(simuladoId: string): Promise<boolean> {
    try {
      await ApiService.request(`/simulados/${simuladoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  },
};

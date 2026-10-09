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

const mockSimuladosList: SimuladoResumo[] = [
  {
    id: 'sim-01',
    titulo: 'Simulado Diagnóstico Inicial - Direito & TI',
    tipo: 'ADAPTATIVO_IA',
    concluido: true,
    criadoEm: new Date(Date.now() - 86400000 * 2).toISOString(),
    totalQuestoesRespondidas: 10,
    totalAcertos: 8,
    percentualAcerto: 80.0,
  },
  {
    id: 'sim-02',
    titulo: 'Simulado Rápido de Fixação - Língua Portuguesa',
    tipo: 'MANUAL',
    concluido: true,
    criadoEm: new Date(Date.now() - 86400000 * 5).toISOString(),
    totalQuestoesRespondidas: 5,
    totalAcertos: 4,
    percentualAcerto: 80.0,
  },
];

export const simuladoService = {
  async listarSimulados(): Promise<SimuladoResumo[]> {
    try {
      const data = await ApiService.request<{ content: SimuladoResumo[] }>('/simulados');
      return data?.content && data.content.length > 0 ? data.content : mockSimuladosList;
    } catch {
      return mockSimuladosList;
    }
  },

  async gerarSimuladoAdaptativo(payload: GerarSimuladoPayload): Promise<SimuladoDetalhe> {
    try {
      return await ApiService.request<SimuladoDetalhe>('/simulados/adaptativo/gerar', {
        method: 'POST',
        body: JSON.stringify({
          planoEstudoId: payload.planoEstudoId,
          quantidadeQuestoes: Math.max(3, Math.min(15, payload.quantidadeQuestoes || 5)),
          bancaAlvo: payload.bancaAlvo || 'CESPE / Cebraspe',
          topicoIds: payload.topicoIds || [],
        }),
      });
    } catch {
      // Mocked generated exam
      return {
        simuladoId: `sim-${Date.now()}`,
        titulo: `Simulado Adaptativo IA (${payload.bancaAlvo || 'Geral'})`,
        tipo: 'ADAPTATIVO_IA',
        concluido: false,
        criadoEm: new Date().toISOString(),
        totalQuestoes: payload.quantidadeQuestoes || 5,
        questoes: [
          {
            id: 'q-sim-1',
            assuntoGeral: 'Direito Constitucional',
            topicoReferencia: 'Controle de Constitucionalidade',
            enunciado: 'Acerca das ações de controle concentrado de constitucionalidade perante o Supremo Tribunal Federal (STF), assinale a alternativa correta:',
            dificuldade: 'MEDIA',
            banca: payload.bancaAlvo || 'Cebraspe',
            ano: 2024,
            alternativas: [
              { id: 'alt-1a', letra: 'A', texto: 'Apenas o Presidente da República detém legitimidade universal para propositura de ADI.' },
              { id: 'alt-1b', letra: 'B', texto: 'A decisão definitiva de mérito proferida pelo STF em sede de ADI e ADC produz eficácia erga omnes e efeito vinculante.' },
              { id: 'alt-1c', letra: 'C', texto: 'Não é cabível modulação de efeitos temporais na declaração de inconstitucionalidade.' },
              { id: 'alt-1d', letra: 'D', texto: 'A ADPF pode ser ajuizada ainda que exista outro meio eficaz de sanar a lesividade.' },
            ],
          },
          {
            id: 'q-sim-2',
            assuntoGeral: 'Direito Administrativo',
            topicoReferencia: 'Atos Administrativos',
            enunciado: 'Em relação aos atributos dos atos administrativos, a autoexecutoriedade significa que:',
            dificuldade: 'FACIL',
            banca: payload.bancaAlvo || 'FGV',
            ano: 2024,
            alternativas: [
              { id: 'alt-2a', letra: 'A', texto: 'O ato deve ser publicado no Diário Oficial para produzir efeitos jurídicos.' },
              { id: 'alt-2b', letra: 'B', texto: 'A administração pública pode executar diretamente a sua decisão sem necessidade de intervenção prévia do Poder Judiciário.' },
              { id: 'alt-2c', letra: 'C', texto: 'Presume-se que o ato foi emitido em total conformidade com a lei vigente.' },
              { id: 'alt-2d', letra: 'D', texto: 'Todos os atos administrativos impõem obrigações imediatas a terceiros independentemente de sua concordância.' },
            ],
          },
          {
            id: 'q-sim-3',
            assuntoGeral: 'Engenharia de Software',
            topicoReferencia: 'Arquitetura e Microsserviços',
            enunciado: 'No contexto de arquitetura orientada a microsserviços, o padrão Circuit Breaker tem como principal objetivo:',
            dificuldade: 'DIFICIL',
            banca: payload.bancaAlvo || 'FCC',
            ano: 2024,
            alternativas: [
              { id: 'alt-3a', letra: 'A', texto: 'Balancear a carga de requisições de forma homogênea entre todos os nós do cluster.' },
              { id: 'alt-3b', letra: 'B', texto: 'Prevenir falhas em cascata interrompendo temporariamente chamadas a serviços instáveis ou indisponíveis.' },
              { id: 'alt-3c', letra: 'C', texto: 'Encriptar os dados em trânsito com certificados TLS mutuamente autenticados.' },
              { id: 'alt-3d', letra: 'D', texto: 'Garantir que todas as transações distribuídas sigam o protocolo Two-Phase Commit (2PC).' },
            ],
          },
        ],
      };
    }
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
    try {
      return await ApiService.request<SimuladoResumo>(`/simulados/${simuladoId}/concluir`, {
        method: 'PATCH',
      });
    } catch {
      return {
        id: simuladoId,
        titulo: 'Simulado Concluído',
        tipo: 'ADAPTATIVO_IA',
        concluido: true,
        criadoEm: new Date().toISOString(),
        totalQuestoesRespondidas: 5,
        totalAcertos: 4,
        percentualAcerto: 80.0,
      };
    }
  },
};

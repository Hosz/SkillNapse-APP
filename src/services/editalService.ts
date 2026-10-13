import { ApiService } from './api';

export interface EditalTopicoItem {
  titulo: string;
  pesoEdital?: number;
  relevanciaBanca?: 'MUITO_ALTA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  justificativaPeso?: string;
  subtopicos?: string[];
}

export interface EditalMaterialItem {
  nome: string;
  topicos: EditalTopicoItem[];
}

export interface EditalArvoreEstruturada {
  nomeConcurso: string;
  banca?: string;
  carreira?: string;
  cargo: string;
  materias: EditalMaterialItem[];
}

export interface RascunhoEditalResponse {
  id: string;
  nomeArquivo: string;
  planoEstudoId?: string | null;
  status: 'PROCESSANDO' | 'AGUARDANDO_APROVACAO' | 'CONVERTIDO' | 'ERRO';
  conteudo: EditalArvoreEstruturada;
  cargosDisponiveis?: string[];
  precisaSelecionarCargo?: boolean;
  criadoEm: string;
}

export interface ConverterRascunhoPayload {
  tituloPlano: string;
  descricaoPlano?: string;
}

export interface ConversaoEditalResponse {
  rascunhoId: string;
  planoEstudoId: string;
  tituloPlano: string;
  totalMateriasCriadas: number;
  totalTopicosCriados: number;
}

export interface EditalCargosDetectados {
  nomeConcurso: string;
  cargos: string[];
}

export const editalService = {
  async detectarCargos(file: File): Promise<EditalCargosDetectados> {
    const formData = new FormData();
    formData.append('arquivo', file);

    return await ApiService.request<EditalCargosDetectados>('/editais/detectar-cargos', {
      method: 'POST',
      body: formData,
    });
  },

  async parseEdital(file: File, cargoAlvo?: string): Promise<RascunhoEditalResponse> {
    const formData = new FormData();
    formData.append('arquivo', file);

    const query = cargoAlvo && cargoAlvo.trim() ? `?cargoAlvo=${encodeURIComponent(cargoAlvo.trim())}` : '';
    return await ApiService.request<RascunhoEditalResponse>(`/editais/parse${query}`, {
      method: 'POST',
      body: formData,
    });
  },

  async converterParaPlano(
    rascunhoId: string,
    payload: ConverterRascunhoPayload
  ): Promise<ConversaoEditalResponse> {
    return await ApiService.request<ConversaoEditalResponse>(`/editais/rascunhos/${rascunhoId}/converter`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listarRascunhos(): Promise<RascunhoEditalResponse[]> {
    try {
      const data = await ApiService.request<{ content: RascunhoEditalResponse[] } | RascunhoEditalResponse[]>(
        '/editais/rascunhos'
      );
      if (Array.isArray(data)) return data;
      return data?.content || [];
    } catch {
      return [];
    }
  },

  async obterRascunho(rascunhoId: string): Promise<RascunhoEditalResponse | null> {
    try {
      return await ApiService.request<RascunhoEditalResponse>(`/editais/rascunhos/${rascunhoId}`);
    } catch {
      return null;
    }
  },

  async excluirRascunho(rascunhoId: string): Promise<boolean> {
    try {
      await ApiService.request(`/editais/rascunhos/${rascunhoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  },
};

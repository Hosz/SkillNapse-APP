import { ApiService } from './api';

export type NivelCriticidade = 'CRITICO' | 'ATENCAO' | 'ESTAVEL' | 'SEM_DADOS';

export interface TopicoLacunaItem {
  topicoId: string;
  titulo: string;
  pesoEdital: number;
  nivelProficiencia: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
  totalTentativas: number;
  totalAcertos: number;
  taxaAcerto: number;
  tempoMedioSegundos: number;
  criticidade: NivelCriticidade;
  concluido: boolean;
}

export interface MateriaDesempenhoItem {
  materiaId: string;
  materiaNome: string;
  corHex?: string;
  totalQuestoes: number;
  totalAcertos: number;
  taxaAcerto: number;
  totalTopicosCriticos: number;
  topicos: TopicoLacunaItem[];
}

export interface RelatorioLacunasResponse {
  planoId: string;
  planoTitulo: string;
  scoreProntidao: number;
  totalQuestoesRespondidas: number;
  totalAcertos: number;
  taxaAcertoGeral: number;
  totalTopicosCriticos: number;
  materias: MateriaDesempenhoItem[];
}

export interface TopicoCriticoItem {
  topicoId: string;
  tituloTopico: string;
  materiaId: string;
  materiaNome: string;
  pesoEdital: number;
  taxaAcerto: number;
  totalTentativas: number;
  indiceSeveridade: number;
  criticidade: NivelCriticidade;
}

export const desempenhoService = {
  async obterLacunas(planoId: string): Promise<RelatorioLacunasResponse | null> {
    try {
      return await ApiService.request<RelatorioLacunasResponse>(`/desempenho/planos/${planoId}/lacunas`);
    } catch {
      return null;
    }
  },

  async obterTopicosCriticos(planoId: string, limite = 5): Promise<TopicoCriticoItem[]> {
    try {
      const data = await ApiService.request<TopicoCriticoItem[]>(
        `/desempenho/planos/${planoId}/topicos-criticos?limite=${limite}`
      );
      return data || [];
    } catch {
      return [];
    }
  },
};

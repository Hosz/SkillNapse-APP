import { ApiService } from './api';
import type {
  BlocoCronograma,
  DiaSemana,
  TipoBloco,
  AgendaDiaria,
  BlocoAgendaDiaria,
  RegistrarExcecaoPayload,
  EditarExcecaoPayload,
  TipoOrigemBloco,
  TipoAcaoExcecao,
} from '../types';

export type { DiaSemana, TipoBloco, AgendaDiaria, BlocoAgendaDiaria, RegistrarExcecaoPayload, EditarExcecaoPayload, TipoOrigemBloco, TipoAcaoExcecao };

export interface CriarBlocoTemplatePayload {
  diaSemana: DiaSemana;
  horaInicio: string; // HH:mm:ss ou HH:mm
  horaFim: string;    // HH:mm:ss ou HH:mm
  tipoBloco: TipoBloco;
  titulo?: string;
  materiaId?: string;
  topicoId?: string;
  materiaNome?: string;
  topicoTitulo?: string;
}

export interface EditarBlocoTemplatePayload {
  diaSemana?: DiaSemana;
  horaInicio?: string;
  horaFim?: string;
  tipoBloco?: TipoBloco;
  titulo?: string;
  materiaId?: string;
  topicoId?: string;
  materiaNome?: string;
  topicoTitulo?: string;
}

interface GradeResponse {
  templateId: string;
  templateNome: string;
  grade?: Record<string, Array<{
    id: string;
    diaSemana: DiaSemana;
    horaInicio: string;
    horaFim: string;
    tipoBloco: TipoBloco;
    titulo?: string;
    materiaId?: string;
    materiaNome?: string;
    topicoId?: string;
    topicoTitulo?: string;
  }>>;
}

export interface JanelaDisponibilidade {
  diaSemana: DiaSemana;
  horaInicio: string; // HH:mm:ss ou HH:mm
  horaFim: string;    // HH:mm:ss ou HH:mm
}

export type EstrategiaAgendamento = 'FOCO_PESO_EDITAL' | 'EQUILIBRADA' | 'FOCO_DIFICULDADE';

export interface GerarAutoAgendamentoPayload {
  planoEstudoId: string;
  disponibilidades: JanelaDisponibilidade[];
  duracaoBlocoMinutos?: number;
  intervaloDescansoMinutos?: number;
  incluirRevisao?: boolean;
  incluirSimulado?: boolean;
  estrategia?: EstrategiaAgendamento;
  instrucoesPersonalizadas?: string;
}

export interface BlocoSugeridoResponse {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tipoBloco: TipoBloco;
  titulo?: string;
  materiaId?: string;
  materiaNome?: string;
  topicoId?: string;
  topicoTitulo?: string;
  justificativaPedagogica?: string;
}

export interface SugestaoAutoAgendamentoResponse {
  planoEstudoId: string;
  tituloPlano: string;
  totalHorasSemanais: number;
  totalBlocosSugeridos: number;
  resumoPedagogico: string;
  blocosSugeridos: BlocoSugeridoResponse[];
}

export interface AplicarAutoAgendamentoPayload {
  planoEstudoId: string;
  templateSemanalId?: string;
  nomeTemplate?: string;
  limparBlocosExistentes?: boolean;
  resumoPedagogico?: string;
  blocos: Array<{
    diaSemana: DiaSemana;
    horaInicio: string;
    horaFim: string;
    tipoBloco?: TipoBloco;
    materiaId?: string;
    topicoId?: string;
    justificativaPedagogica?: string;
  }>;
}

export interface ResultadoAutoAgendamentoResponse {
  templateSemanalId: string;
  nomeTemplate: string;
  totalBlocosPersistidos: number;
  resumoPedagogico: string;
  blocosPersistidos: BlocoSugeridoResponse[];
}

export const cronogramaService = {
  activeTemplateId: null as string | null,

  async obterTemplateAtivoId(): Promise<string> {
    if (this.activeTemplateId) return this.activeTemplateId;
    try {
      const templateAtivo = await ApiService.request<{ id: string }>('/cronogramas/templates/ativo');
      if (templateAtivo?.id) {
        this.activeTemplateId = templateAtivo.id;
        return templateAtivo.id;
      }
    } catch {
      // Ignora erro
    }
    try {
      const novo = await ApiService.request<{ id: string }>('/cronogramas/templates', {
        method: 'POST',
        body: JSON.stringify({ nome: 'Template Base Padrão' }),
      });
      if (novo?.id) {
        this.activeTemplateId = novo.id;
        return novo.id;
      }
    } catch {
      // Fallback
    }
    return 'tpl-default';
  },

  async obterGradeSemanal(): Promise<BlocoCronograma[]> {
    try {
      const templateId = await this.obterTemplateAtivoId();
      const res = await ApiService.request<GradeResponse>(`/cronogramas/templates/${templateId}/grade`);
      if (res && res.grade) {
        const blocos: BlocoCronograma[] = [];
        Object.entries(res.grade).forEach(([dia, lista]) => {
          lista.forEach((b) => {
            blocos.push({
              id: b.id,
              diaSemana: (dia as DiaSemana) || b.diaSemana,
              horaInicio: b.horaInicio.slice(0, 5),
              horaFim: b.horaFim.slice(0, 5),
              tipoBloco: b.tipoBloco,
              titulo: b.titulo || b.topicoTitulo || b.materiaNome || 'Bloco de Estudo',
              topicoTitulo: b.topicoTitulo,
              materiaNome: b.materiaNome,
              materiaId: b.materiaId,
              topicoId: b.topicoId,
            });
          });
        });
        return blocos;
      }
      return [];
    } catch {
      return [];
    }
  },

  async adicionarBloco(payload: CriarBlocoTemplatePayload): Promise<BlocoCronograma> {
    const templateId = await this.obterTemplateAtivoId();
    const horaInicioNorm = payload.horaInicio.length === 5 ? `${payload.horaInicio}:00` : payload.horaInicio;
    const horaFimNorm = payload.horaFim.length === 5 ? `${payload.horaFim}:00` : payload.horaFim;
    const tituloEfetivo = payload.titulo || payload.topicoTitulo;

    const res = await ApiService.request<{ id: string; titulo?: string }>(`/cronogramas/templates/${templateId}/blocos`, {
      method: 'POST',
      body: JSON.stringify({
        diaSemana: payload.diaSemana,
        horaInicio: horaInicioNorm,
        horaFim: horaFimNorm,
        tipoBloco: payload.tipoBloco,
        materiaId: payload.materiaId,
        topicoId: payload.topicoId,
        titulo: tituloEfetivo,
      }),
    });

    return {
      id: res?.id || `bloco-${Date.now()}`,
      diaSemana: payload.diaSemana,
      horaInicio: payload.horaInicio.slice(0, 5),
      horaFim: payload.horaFim.slice(0, 5),
      tipoBloco: payload.tipoBloco,
      titulo: tituloEfetivo || res?.titulo,
      topicoTitulo: payload.topicoTitulo,
      materiaId: payload.materiaId,
      topicoId: payload.topicoId,
    };
  },

  async editarBloco(blocoId: string, payload: EditarBlocoTemplatePayload): Promise<BlocoCronograma> {
    const templateId = await this.obterTemplateAtivoId();
    const horaInicioNorm = payload.horaInicio
      ? payload.horaInicio.length === 5
        ? `${payload.horaInicio}:00`
        : payload.horaInicio
      : undefined;
    const horaFimNorm = payload.horaFim
      ? payload.horaFim.length === 5
        ? `${payload.horaFim}:00`
        : payload.horaFim
      : undefined;

    const desvincularMateria = !payload.materiaId;
    const desvincularTopico = !payload.topicoId;
    const tituloEfetivo = payload.titulo || payload.topicoTitulo;

    const res = await ApiService.request<{
      id: string;
      diaSemana: DiaSemana;
      horaInicio: string;
      horaFim: string;
      tipoBloco: TipoBloco;
      titulo?: string;
      materiaId?: string;
      materiaNome?: string;
      topicoId?: string;
      topicoTitulo?: string;
    }>(`/cronogramas/templates/${templateId}/blocos/${blocoId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        diaSemana: payload.diaSemana,
        horaInicio: horaInicioNorm,
        horaFim: horaFimNorm,
        tipoBloco: payload.tipoBloco,
        titulo: tituloEfetivo,
        materiaId: payload.materiaId || undefined,
        topicoId: payload.topicoId || undefined,
        desvincularMateria,
        desvincularTopico,
      }),
    });

    return {
      id: res?.id || blocoId,
      diaSemana: res?.diaSemana || payload.diaSemana || 'SEGUNDA',
      horaInicio: (res?.horaInicio || payload.horaInicio || '08:00').slice(0, 5),
      horaFim: (res?.horaFim || payload.horaFim || '09:00').slice(0, 5),
      tipoBloco: res?.tipoBloco || payload.tipoBloco || 'FOCO_TEORIA',
      titulo: tituloEfetivo || res?.titulo,
      topicoTitulo: payload.topicoTitulo || res?.topicoTitulo,
      materiaNome: desvincularMateria ? undefined : (res?.materiaNome || payload.materiaNome),
      materiaId: desvincularMateria ? undefined : (res?.materiaId || payload.materiaId),
      topicoId: desvincularTopico ? undefined : (res?.topicoId || payload.topicoId),
    };
  },

  async excluirBloco(blocoId: string): Promise<boolean> {
    try {
      const templateId = await this.obterTemplateAtivoId();
      await ApiService.request(`/cronogramas/templates/${templateId}/blocos/${blocoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },

  async obterCronogramaDoDia(dataIso: string): Promise<BlocoCronograma[]> {
    try {
      const agenda = await this.obterAgendaDiaria(dataIso);
      return agenda.blocos.map((b) => ({
        id: b.id,
        diaSemana: agenda.diaSemana,
        horaInicio: b.horaInicio,
        horaFim: b.horaFim,
        tipoBloco: b.tipoBloco,
        titulo: b.titulo,
        materiaId: b.materiaId || undefined,
        materiaNome: b.materiaNome || undefined,
        topicoId: b.topicoId || undefined,
        topicoTitulo: b.topicoTitulo || undefined,
      }));
    } catch {
      return [];
    }
  },

  async obterAgendaDiaria(dataIso: string): Promise<AgendaDiaria> {
    const res = await ApiService.request<{
      data: string;
      diaSemana: DiaSemana;
      templateOrigemId?: string | null;
      templateOrigemNome?: string | null;
      blocos?: Array<{
        id: string;
        origem: TipoOrigemBloco;
        tipoAcaoExcecao?: TipoAcaoExcecao | null;
        blocoTemplateOrigemId?: string | null;
        excecaoId?: string | null;
        horaInicio: string;
        horaFim: string;
        tipoBloco: TipoBloco;
        materiaId?: string | null;
        materiaNome?: string | null;
        topicoId?: string | null;
        topicoTitulo?: string | null;
        titulo?: string;
        topicosRevisao?: Array<{
          id: string;
          titulo: string;
          materiaId?: string | null;
          materiaNome?: string | null;
        }>;
      }>;
    }>(`/cronogramas/diario/${dataIso}`);

    const blocosFormatados: BlocoAgendaDiaria[] = (res?.blocos || []).map((b) => ({
      id: b.id,
      origem: b.origem,
      tipoAcaoExcecao: b.tipoAcaoExcecao,
      blocoTemplateOrigemId: b.blocoTemplateOrigemId,
      excecaoId: b.excecaoId,
      horaInicio: b.horaInicio ? b.horaInicio.slice(0, 5) : '08:00',
      horaFim: b.horaFim ? b.horaFim.slice(0, 5) : '09:00',
      tipoBloco: b.tipoBloco,
      titulo: b.titulo || b.topicoTitulo || b.materiaNome || 'Bloco de Estudo',
      materiaId: b.materiaId,
      materiaNome: b.materiaNome,
      topicoId: b.topicoId,
      topicoTitulo: b.topicoTitulo,
      topicosRevisao: b.topicosRevisao || [],
    }));

    return {
      data: res?.data || dataIso,
      diaSemana: res?.diaSemana || 'SEGUNDA',
      templateOrigemId: res?.templateOrigemId,
      templateOrigemNome: res?.templateOrigemNome,
      blocos: blocosFormatados,
    };
  },

  async registrarExcecao(dataIso: string, payload: RegistrarExcecaoPayload): Promise<void> {
    const bodyFormatted = {
      tipoAcao: payload.tipoAcao,
      blocoTemplateOrigem: payload.blocoTemplateOrigem,
      horaInicio: payload.horaInicio ? (payload.horaInicio.length === 5 ? `${payload.horaInicio}:00` : payload.horaInicio) : undefined,
      horaFim: payload.horaFim ? (payload.horaFim.length === 5 ? `${payload.horaFim}:00` : payload.horaFim) : undefined,
      tipoBloco: payload.tipoBloco,
      materiaId: payload.materiaId || undefined,
      topicoId: payload.topicoId || undefined,
      titulo: payload.titulo,
    };

    await ApiService.request(`/cronogramas/diario/${dataIso}/excecoes`, {
      method: 'POST',
      body: JSON.stringify(bodyFormatted),
    });
  },

  async editarExcecao(excecaoId: string, payload: EditarExcecaoPayload): Promise<void> {
    const bodyFormatted = {
      tipoAcao: payload.tipoAcao,
      blocoTemplateOrigem: payload.blocoTemplateOrigem,
      horaInicio: payload.horaInicio ? (payload.horaInicio.length === 5 ? `${payload.horaInicio}:00` : payload.horaInicio) : undefined,
      horaFim: payload.horaFim ? (payload.horaFim.length === 5 ? `${payload.horaFim}:00` : payload.horaFim) : undefined,
      tipoBloco: payload.tipoBloco,
      materiaId: payload.materiaId || undefined,
      topicoId: payload.topicoId || undefined,
      titulo: payload.titulo,
    };

    await ApiService.request(`/cronogramas/diario/excecoes/${excecaoId}`, {
      method: 'PATCH',
      body: JSON.stringify(bodyFormatted),
    });
  },

  async removerExcecao(excecaoId: string): Promise<boolean> {
    try {
      await ApiService.request(`/cronogramas/diario/excecoes/${excecaoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  },

  async resetarAgendaDia(dataIso: string): Promise<boolean> {
    try {
      await ApiService.request(`/cronogramas/diario/${dataIso}/resetar`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  },

  async gerarSugestaoAutoAgendamento(payload: GerarAutoAgendamentoPayload): Promise<SugestaoAutoAgendamentoResponse> {
    const bodyFormatted = {
      ...payload,
      disponibilidades: payload.disponibilidades.map((d) => ({
        diaSemana: d.diaSemana,
        horaInicio: d.horaInicio.length === 5 ? `${d.horaInicio}:00` : d.horaInicio,
        horaFim: d.horaFim.length === 5 ? `${d.horaFim}:00` : d.horaFim,
      })),
    };

    return await ApiService.request<SugestaoAutoAgendamentoResponse>('/cronogramas/auto-agendamento/sugestao', {
      method: 'POST',
      body: JSON.stringify(bodyFormatted),
    });
  },

  async aplicarAutoAgendamento(payload: AplicarAutoAgendamentoPayload): Promise<ResultadoAutoAgendamentoResponse> {
    const rawNome = payload.nomeTemplate?.trim() || 'Grade Semanal IA';
    const nomeSeguro = rawNome.length > 100 ? `${rawNome.substring(0, 97).trim()}...` : rawNome;

    const bodyFormatted = {
      ...payload,
      nomeTemplate: nomeSeguro,
      blocos: payload.blocos.map((b) => ({
        diaSemana: b.diaSemana,
        horaInicio: b.horaInicio.length === 5 ? `${b.horaInicio}:00` : b.horaInicio,
        horaFim: b.horaFim.length === 5 ? `${b.horaFim}:00` : b.horaFim,
        tipoBloco: b.tipoBloco || 'FOCO_TEORIA',
        materiaId: b.materiaId,
        topicoId: b.topicoId,
        justificativaPedagogica: b.justificativaPedagogica,
      })),
    };

    const res = await ApiService.request<ResultadoAutoAgendamentoResponse>('/cronogramas/auto-agendamento/aplicar', {
      method: 'POST',
      body: JSON.stringify(bodyFormatted),
    });

    if (res?.templateSemanalId) {
      this.activeTemplateId = res.templateSemanalId;
    }

    return res;
  },
};

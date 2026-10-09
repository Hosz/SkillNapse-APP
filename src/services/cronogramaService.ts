import { ApiService } from './api';
import type { BlocoCronograma, DiaSemana, TipoBloco } from '../types';

export interface CriarBlocoTemplatePayload {
  diaSemana: DiaSemana;
  horaInicio: string; // HH:mm:ss ou HH:mm
  horaFim: string;    // HH:mm:ss ou HH:mm
  tipoBloco: TipoBloco;
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
    materiaNome?: string;
    topicoTitulo?: string;
  }>>;
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
              topicoTitulo: b.topicoTitulo,
              materiaNome: b.materiaNome,
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

    const res = await ApiService.request<{ id: string }>(`/cronogramas/templates/${templateId}/blocos`, {
      method: 'POST',
      body: JSON.stringify({
        diaSemana: payload.diaSemana,
        horaInicio: horaInicioNorm,
        horaFim: horaFimNorm,
        tipoBloco: payload.tipoBloco,
        materiaId: payload.materiaId,
        topicoId: payload.topicoId,
      }),
    });

    return {
      id: res?.id || `bloco-${Date.now()}`,
      diaSemana: payload.diaSemana,
      horaInicio: payload.horaInicio.slice(0, 5),
      horaFim: payload.horaFim.slice(0, 5),
      tipoBloco: payload.tipoBloco,
      topicoTitulo: payload.topicoTitulo,
      materiaId: payload.materiaId,
      topicoId: payload.topicoId,
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
      const res = await ApiService.request<BlocoCronograma[]>(`/cronogramas/diario/${dataIso}`);
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  async gerarSugestaoAutoAgendamento(horasDisponiveisPorDia: number) {
    try {
      return await ApiService.request('/cronogramas/auto-agendamento/sugestao', {
        method: 'POST',
        body: JSON.stringify({ horasDisponiveisPorDia }),
      });
    } catch {
      return null;
    }
  },
};

import { ApiService } from './api';
import type { BlocoCronograma, DiaSemana, TipoBloco } from '../types';
import { mockCronograma } from '../data/mockData';

export interface CriarBlocoTemplatePayload {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tipoBloco: TipoBloco;
  topicoId?: string;
  anotacoes?: string;
}

export const cronogramaService = {
  async obterGradeSemanal(): Promise<BlocoCronograma[]> {
    try {
      const templateAtivo = await ApiService.request<{ id: string }>('/cronogramas/templates/ativo');
      if (templateAtivo?.id) {
        const grade = await ApiService.request<BlocoCronograma[]>(`/cronogramas/templates/${templateAtivo.id}/grade`);
        if (Array.isArray(grade) && grade.length > 0) {
          return grade;
        }
      }
      return mockCronograma;
    } catch {
      return mockCronograma;
    }
  },

  async adicionarBloco(templateId: string, payload: CriarBlocoTemplatePayload): Promise<BlocoCronograma | null> {
    try {
      return await ApiService.request<BlocoCronograma>(`/cronogramas/templates/${templateId}/blocos`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async obterCronogramaDoDia(dataIso: string): Promise<BlocoCronograma[]> {
    try {
      const res = await ApiService.request<BlocoCronograma[]>(`/cronogramas/diario/${dataIso}`);
      return Array.isArray(res) ? res : mockCronograma;
    } catch {
      return mockCronograma;
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

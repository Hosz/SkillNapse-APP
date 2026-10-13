import { ApiService } from './api';
import type { PlanoEstudo, Materia, Topico } from '../types';

export interface CriarPlanoPayload {
  titulo: string;
  cargoAlvo?: string;
  descricao?: string;
  orgao?: string;
  dataExame?: string;
  banca?: string;
}

export interface EditarPlanoPayload {
  titulo?: string;
  descricao?: string;
  ativo?: boolean;
}

export interface CriarMateriaPayload {
  nome: string;
  corHex?: string;
  ordem?: number;
}

export interface EditarMateriaPayload {
  nome?: string;
  corHex?: string;
  ordem?: number;
}

export interface CriarTopicoPayload {
  titulo: string;
  peso?: number;
  pesoEdital?: number;
  topicoPaiId?: string;
  ordem?: number;
}

export interface EditarTopicoPayload {
  titulo?: string;
  peso?: number;
  pesoEdital?: number;
  ordem?: number;
}

export interface AtualizarProgressoPayload {
  concluido?: boolean;
  proficiencia?: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
  nivelProficiencia?: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
}

export const planoService = {
  // --- PLANOS DE ESTUDO ---
  async obterPlanoAtivo(planoId?: string): Promise<PlanoEstudo | null> {
    try {
      let planoBasico: any = null;
      if (planoId) {
        planoBasico = await ApiService.request<any>(`/plano-estudo/${planoId}`);
      } else {
        const data = await ApiService.request<{ content: any[] } | any[]>('/plano-estudo');
        const list = Array.isArray(data) ? data : (data?.content || []);
        if (list.length > 0) {
          planoBasico = list[0];
        }
      }

      if (!planoBasico) return null;

      // Se já veio com matérias completas
      if (Array.isArray(planoBasico.materias) && planoBasico.materias.length > 0) {
        return {
          id: String(planoBasico.id),
          titulo: planoBasico.titulo,
          descricao: planoBasico.descricao,
          cargoAlvo: planoBasico.cargoAlvo || '',
          banca: planoBasico.banca || '',
          dataCriacao: planoBasico.criadoEm || planoBasico.dataCriacao || new Date().toISOString(),
          dataExame: planoBasico.dataExame,
          materias: planoBasico.materias,
        };
      }

      // Buscar matérias vinculadas ao plano na API
      let materias: Materia[] = [];
      try {
        const matData = await ApiService.request<{ content: any[] } | any[]>(
          `/materias/plano/${planoBasico.id}`
        );
        const matList = Array.isArray(matData) ? matData : (matData?.content || []);

        const mapTopico = (t: any): Topico => ({
          id: String(t.id),
          materiaId: String(t.materiaId || ''),
          titulo: t.titulo,
          peso: t.pesoEdital ?? t.peso ?? 5,
          relevanciaBanca: t.relevanciaBanca,
          justificativaPeso: t.justificativaPeso,
          proficiencia: t.nivelProficiencia ?? t.proficiencia ?? 'INICIANTE',
          topicoPaiId: t.topicoPaiId ? String(t.topicoPaiId) : null,
          ordem: t.ordem ?? 0,
          concluido: t.concluido ?? false,
          subtopicos: Array.isArray(t.subtopicos) ? t.subtopicos.map(mapTopico) : [],
        });

        materias = await Promise.all(
          matList.map(async (m: any) => {
            let topicos: Topico[] = [];
            try {
              const topicosData = await ApiService.request<any[]>(`/topicos/materia/${m.id}`);
              topicos = Array.isArray(topicosData) ? topicosData.map(mapTopico) : [];
            } catch {
              topicos = [];
            }

            return {
              id: String(m.id),
              planoId: String(planoBasico.id),
              nome: m.nome,
              corHex: m.corHex || '#4f46e5',
              ordem: m.ordem ?? 0,
              topicos: topicos || [],
            };
          })
        );
      } catch {
        materias = [];
      }

      return {
        id: String(planoBasico.id),
        titulo: planoBasico.titulo,
        descricao: planoBasico.descricao,
        cargoAlvo: planoBasico.cargoAlvo || '',
        banca: planoBasico.banca || '',
        dataCriacao: planoBasico.criadoEm || planoBasico.dataCriacao || new Date().toISOString(),
        dataExame: planoBasico.dataExame,
        materias: materias || [],
      };
    } catch {
      return null;
    }
  },

  async obterPlanoPorId(planoId: string): Promise<PlanoEstudo | null> {
    return this.obterPlanoAtivo(planoId);
  },

  async listarPlanos(): Promise<PlanoEstudo[]> {
    try {
      const data = await ApiService.request<{ content: any[] } | any[]>('/plano-estudo');
      const list = Array.isArray(data) ? data : (data?.content || []);

      const planosCompletos = await Promise.all(
        list.map(async (p: any) => {
          const planoDetalhado = await this.obterPlanoAtivo(p.id);
          if (planoDetalhado) {
            return planoDetalhado;
          }
          return {
            id: String(p.id),
            titulo: p.titulo,
            descricao: p.descricao,
            cargoAlvo: p.cargoAlvo || '',
            banca: p.banca || '',
            dataCriacao: p.criadoEm || p.dataCriacao || new Date().toISOString(),
            dataExame: p.dataExame,
            materias: [],
          };
        })
      );
      return planosCompletos;
    } catch {
      return [];
    }
  },

  async criarPlano(payload: CriarPlanoPayload): Promise<PlanoEstudo> {
    const res = await ApiService.request<any>('/plano-estudo', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      id: String(res.id),
      titulo: res.titulo,
      descricao: res.descricao,
      cargoAlvo: payload.cargoAlvo || '',
      dataCriacao: res.criadoEm || new Date().toISOString(),
      dataExame: payload.dataExame,
      materias: [],
    };
  },

  async editarPlano(planoId: string, payload: EditarPlanoPayload): Promise<PlanoEstudo | null> {
    try {
      return await ApiService.request<PlanoEstudo>(`/plano-estudo/${planoId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  async excluirPlano(planoId: string): Promise<boolean> {
    try {
      await ApiService.request(`/plano-estudo/${planoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },

  // --- MATÉRIAS ---
  async criarMateria(planoId: string, payload: CriarMateriaPayload): Promise<Materia> {
    const res = await ApiService.request<any>(`/materias/plano/${planoId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      id: String(res.id),
      planoId: String(res.planoId || planoId),
      nome: res.nome,
      corHex: res.corHex || payload.corHex || '#3b82f6',
      ordem: res.ordem ?? payload.ordem ?? 0,
      topicos: [],
    };
  },

  async editarMateria(materiaId: string, payload: EditarMateriaPayload): Promise<Materia | null> {
    try {
      const res = await ApiService.request<any>(`/materias/${materiaId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res) return null;
      return {
        id: String(res.id),
        planoId: String(res.planoId || ''),
        nome: res.nome,
        corHex: res.corHex || payload.corHex || '#3b82f6',
        ordem: res.ordem ?? 0,
        topicos: [],
      };
    } catch {
      return null;
    }
  },

  async excluirMateria(materiaId: string): Promise<boolean> {
    try {
      await ApiService.request(`/materias/${materiaId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },

  // --- TÓPICOS E SUBTÓPICOS ---
  async criarTopico(materiaId: string, payload: CriarTopicoPayload): Promise<Topico> {
    const res = await ApiService.request<any>(`/topicos/materia/${materiaId}`, {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        pesoEdital: payload.pesoEdital ?? payload.peso ?? 5,
      }),
    });
    return {
      id: String(res.id),
      materiaId: String(res.materiaId || materiaId),
      titulo: res.titulo,
      peso: res.pesoEdital ?? res.peso ?? payload.peso ?? 5,
      proficiencia: res.nivelProficiencia ?? res.proficiencia ?? 'INICIANTE',
      topicoPaiId: res.topicoPaiId ? String(res.topicoPaiId) : (payload.topicoPaiId || null),
      ordem: res.ordem ?? payload.ordem ?? 0,
      concluido: res.concluido ?? false,
      subtopicos: Array.isArray(res.subtopicos) ? res.subtopicos : [],
    };
  },

  async editarTopico(topicoId: string, payload: EditarTopicoPayload): Promise<Topico | null> {
    try {
      const res = await ApiService.request<any>(`/topicos/${topicoId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...payload,
          pesoEdital: payload.pesoEdital ?? payload.peso,
        }),
      });
      if (!res) return null;
      return {
        id: String(res.id),
        materiaId: String(res.materiaId || ''),
        titulo: res.titulo,
        peso: res.pesoEdital ?? res.peso ?? payload.peso ?? 5,
        proficiencia: res.nivelProficiencia ?? res.proficiencia ?? 'INICIANTE',
        topicoPaiId: res.topicoPaiId ? String(res.topicoPaiId) : null,
        ordem: res.ordem ?? 0,
        concluido: res.concluido ?? false,
        subtopicos: Array.isArray(res.subtopicos) ? res.subtopicos : [],
      };
    } catch {
      return null;
    }
  },

  async atualizarProgressoTopico(topicoId: string, payload: AtualizarProgressoPayload): Promise<Topico | null> {
    try {
      return await ApiService.request<Topico>(`/topicos/${topicoId}/progresso`, {
        method: 'PATCH',
        body: JSON.stringify({
          concluido: payload.concluido,
          nivelProficiencia: payload.nivelProficiencia || payload.proficiencia,
        }),
      });
    } catch {
      return null;
    }
  },

  async excluirTopico(topicoId: string): Promise<boolean> {
    try {
      await ApiService.request(`/topicos/${topicoId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return true;
    }
  },
};

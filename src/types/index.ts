export type NivelProficiencia = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';

export type TipoBloco = 'FOCO_TEORIA' | 'REVISAO' | 'SIMULADO' | 'DESCANSO';

export type DiaSemana =
  | 'SEGUNDA'
  | 'TERCA'
  | 'QUARTA'
  | 'QUINTA'
  | 'SEXTA'
  | 'SABADO'
  | 'DOMINGO';

export type Sm2Rating = 'ERRO' | 'DIFICIL' | 'BOM' | 'FACIL';

export type RelevanciaBanca = 'MUITO_ALTA' | 'ALTA' | 'MEDIA' | 'BAIXA';

export interface Topico {
  id: string;
  materiaId: string;
  titulo: string;
  peso: number; // 1 a 10
  relevanciaBanca?: RelevanciaBanca;
  justificativaPeso?: string;
  proficiencia: NivelProficiencia;
  topicoPaiId?: string | null;
  ordem: number;
  concluido?: boolean;
  subtopicos?: Topico[];
  questoesAcertos?: number;
  questoesTotal?: number;
  tempoLiquidoSegundos?: number;
}

export interface Materia {
  id: string;
  planoId: string;
  nome: string;
  corHex: string;
  ordem: number;
  topicos: Topico[];
}

export interface PlanoEstudo {
  id: string;
  titulo: string;
  descricao?: string;
  cargoAlvo?: string;
  banca?: string;
  dataCriacao: string;
  dataExame?: string;
  materias: Materia[];
}

export interface AlternativaQuestao {
  id: string;
  letra: 'A' | 'B' | 'C' | 'D' | 'E';
  texto: string;
  correta: boolean;
}

export interface Questao {
  id: string;
  topicoId: string;
  enunciado: string;
  alternativas: AlternativaQuestao[];
  explicacaoGabarito: string;
  dificuldade: 'FACIL' | 'MEDIA' | 'DIFICIL';
  banca?: string;
}

export interface Flashcard {
  id: string;
  topicoId: string;
  frente: string;
  verso: string;
  fatorFacilidade: number;
  intervaloDias: number;
  repeticoes: number;
  proximaRevisao: string;
  planoId?: string;
  materiaId?: string;
  materiaNome?: string;
  topicoNome?: string;
  subtopicoNome?: string;
}

export interface BlocoCronograma {
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
  topicosRevisaoIds?: string[];
  anotacoes?: string;
}

export type TipoOrigemBloco = 'TEMPLATE' | 'EXCECAO';
export type TipoAcaoExcecao = 'CANCELAR_BLOCO' | 'SUBSTITUIR_HORARIO' | 'BLOCO_AVULSO';

export interface BlocoAgendaDiaria {
  id: string;
  origem: TipoOrigemBloco;
  tipoAcaoExcecao?: TipoAcaoExcecao | null;
  blocoTemplateOrigemId?: string | null;
  excecaoId?: string | null;
  horaInicio: string;
  horaFim: string;
  tipoBloco: TipoBloco;
  titulo?: string;
  materiaId?: string | null;
  materiaNome?: string | null;
  topicoId?: string | null;
  topicoTitulo?: string | null;
  topicosRevisao?: Array<{
    id: string;
    titulo: string;
    materiaId?: string | null;
    materiaNome?: string | null;
  }>;
}

export interface AgendaDiaria {
  data: string; // YYYY-MM-DD
  diaSemana: DiaSemana;
  templateOrigemId?: string | null;
  templateOrigemNome?: string | null;
  blocos: BlocoAgendaDiaria[];
}

export interface RegistrarExcecaoPayload {
  tipoAcao: TipoAcaoExcecao;
  blocoTemplateOrigem?: string;
  horaInicio?: string;
  horaFim?: string;
  tipoBloco?: TipoBloco;
  materiaId?: string;
  topicoId?: string;
  titulo?: string;
}

export interface EditarExcecaoPayload {
  tipoAcao?: TipoAcaoExcecao;
  blocoTemplateOrigem?: string;
  horaInicio?: string;
  horaFim?: string;
  tipoBloco?: TipoBloco;
  materiaId?: string;
  topicoId?: string;
  titulo?: string;
}

export interface TemaRedacao {
  id: string;
  titulo: string;
  descricao: string;
  eixoTematico: string;
  textosMotivadores: string[];
  criteriosAvaliacao?: string;
  geradoPorIa?: boolean;
}

export interface CriterioAvaliacaoRedacao {
  nome: string;
  nota: number;
  pesoMaximo: number;
  comentario: string;
}

export interface SubmissaoRedacao {
  id: string;
  temaId: string;
  tituloTema: string;
  tipo: 'TEXTO' | 'FOTO_OCR';
  conteudoTexto: string;
  taxaLegibilidade?: number;
  notaGeral: number; // 0 a 1000
  criterios: CriterioAvaliacaoRedacao[];
  pontosFortes: string[];
  pontosMelhoria: string[];
  dataSubmissao: string;
}

export interface RascunhoTopico {
  topicoId: string;
  notasTexto: string;
  canvasDrawingData?: string; // DataURL ou vetor
  atualizadoEm: string;
}

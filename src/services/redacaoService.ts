import { ApiService } from './api';
import type { TemaRedacao } from '../types';

export interface SubmissaoTextoPayload {
  temaRedacaoId: string;
  conteudoTexto: string;
}

export interface CriterionEvaluation {
  nome: string;
  nota: number;
  max: number;
  feedback: string;
}

export interface EvaluationResult {
  notaGeral: number;
  taxaLegibilidade: number;
  criterios: CriterionEvaluation[];
  pontosFortes: string[];
  pontosMelhoria: string[];
}

export interface SubmissaoRedacaoResumo {
  id: string;
  temaId: string;
  temaTitulo: string;
  notaGeral: number;
  corrigidoEm?: string;
  criadoEm: string;
}

export interface SubmissaoRedacaoDetalhe {
  id: string;
  temaId: string;
  temaTitulo: string;
  textoAluno: string;
  notaGeral: number;
  corrigidoEm?: string;
  criadoEm: string;
  evaluationResult: EvaluationResult;
}

interface BackendTemaRedacao {
  id: string;
  planoEstudoId?: string;
  titulo: string;
  textosMotivadores?: string | string[];
  criteriosAvaliacao?: string;
  descricao?: string;
  eixoTematico?: string;
  geradoPorIa?: boolean;
  criadoEm?: string;
  totalSubmissoes?: number;
}

interface BackendCompetencia {
  nomeCompetencia?: string;
  competencia?: string;
  nota?: number;
  comentarios?: string;
  justificativa?: string;
  desviosIdentificados?: string[];
}

interface BackendSugestaoReescrita {
  trechoOriginal?: string;
  trechoSugerido?: string;
  justificativa?: string;
  paragrafoOriginal?: string;
  sugestaoAprimorada?: string;
  motivo?: string;
}

interface BackendSubmissaoRedacao {
  id: string;
  temaId: string;
  temaTitulo?: string;
  textoAluno?: string;
  notaGeral?: number;
  feedback?: {
    notaGeral?: number;
    competencias?: BackendCompetencia[];
    comentariosGerais?: string;
    sugestoesReescrita?: BackendSugestaoReescrita[];
  };
}

interface BackendResultadoImagem {
  legivel: boolean;
  percentualLegibilidade: number;
  mensagem: string;
  textoTranscrito?: string;
  submissao?: BackendSubmissaoRedacao;
}

const STORAGE_TEMAS_KEY = 'skillnapse_custom_temas';
const STORAGE_DELETED_TEMAS_KEY = 'skillnapse_deleted_temas';

const TEMAS_DEFAULT: TemaRedacao[] = [
  {
    id: 'tema-def-1',
    titulo: 'O Desafio da Eficiência e da Transparência na Gestão Pública Contemporânea',
    eixoTematico: 'Administração Pública e Governança',
    descricao: 'A administração gerencial impõe aos órgãos governamentais o dever de conciliar celeridade processual, accountability e controle social, com ênfase na moralidade e na probidade administrativa.',
    textosMotivadores: [
      `### TEXTO I: O Marco Constitucional da Eficiência e do Controle Social\n\nO artigo 37 da Constituição Federal de 1988 estabelece que a administração pública direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios obedecerá aos princípios de legalidade, impessoalidade, moralidade, publicidade e eficiência. A inclusão expressa da eficiência pela Emenda Constitucional nº 19/1998 consolidou a transição do modelo burocrático estrito para o modelo gerencial, no qual a busca por resultados concretos, a otimização na aplicação dos recursos públicos e a avaliação contínua de desempenho tornam-se mandamentos vinculantes aos agentes estatais.\n\nContudo, a eficiência não pode ser interpretada de forma descolada da moralidade e da publicidade. O controle social, exercido de forma direta pela sociedade civil ou por meio de conselhos setoriais, atua como verdadeiro antídoto à opacidade decisória e ao desperdício do erário público.\n\nFonte: BRASIL. Constituição da República Federativa do Brasil de 1988. Artigo 37.`,
      `### TEXTO II: Indicadores de Governo Digital e Redução da Assimetria Informativa\n\nDe acordo com levantamentos do Índice de Governança Digital (IGD) e relatórios do Tribunal de Contas da União (TCU), mais de 80% dos serviços federais já contam com atendimento digital unificado. A implementação da Lei de Acesso à Informação (Lei nº 12.527/2011) resultou em mais de 1,2 milhão de pedidos de informação aos órgãos do Executivo, registrando índice médio de atendimento tempestivo de 97,4%.\n\nPesquisas empíricas do Instituto de Pesquisa Econômica Aplicada (IPEA) revelam que municípios com portais da transparência de alto padrão de usabilidade e dados abertos em formatos interoperáveis (CSV/JSON) apresentam taxas 35% menores de apontamentos de irregularidades por tribunais de contas locais em licitações e contratações públicas.\n\nFonte: IPEA / Controladoria-Geral da União (CGU). Relatório de Gestão e Monitoramento da Transparência Pública, 2024.`,
      `### TEXTO III: Os Limites Operacionais e o Desafio da Cidadania Ativa\n\nEmbora o arcabouço normativo brasileiro seja considerado um dos mais avançados do mundo em termos de transparência passiva e ativa, persistem gargalos profundos na capacidade efetiva do cidadão comum interpretar dados técnicos e orçamentários. Especialistas em direito público advertem que o excesso de dados desarticulados (infoxicação) pode gerar uma falsa sensação de transparência, na qual os números estão publicizados, mas a inteligibilidade das decisões orçamentárias permanece inacessível à maioria da população.\n\nPara que a transparência se converta em integridade pública e combate à corrupção, é imperativo fomentar a capacitação cidadã, fortalecer as ouvidorias públicas e incentivar o jornalismo de dados como ponte entre o aparato estatal e os anseios coletivos.\n\nFonte: FÓRUM DE GESTÃO PÚBLICA. Accountability e Participação Popular na Era dos Dados Abertos, 2024.`,
    ],
  },
  {
    id: 'tema-def-2',
    titulo: 'Inteligência Artificial, Proteção de Dados e Garantias Fundamentais no Brasil',
    eixoTematico: 'Direito Digital e Direitos Fundamentais',
    descricao: 'A rápida disseminação de algoritmos de aprendizado de máquina em decisões administrativas e judiciais suscita reflexões sobre explicabilidade algorítmica, privacidade e combate a vieses discriminatórios.',
    textosMotivadores: [
      `### TEXTO I: O Marco Constitucional da Privacidade e Proteção de Dados\n\nA Emenda Constitucional nº 115/2022 incluiu a proteção dos dados pessoais, inclusive nos meios digitais, no rol dos direitos e garantias fundamentais da Constituição Federal de 1988 (art. 5º, LXXIX). Em convergência com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018), consolidou-se no ordenamento jurídico pátrio o princípio da autodeterminação informativa, assegurando ao titular o direito de saber quais dados são coletados, a finalidade do tratamento e a possibilidade de revisão de decisões automatizadas.\n\nNenhum avanço tecnológico pode suplantar a dignidade da pessoa humana e a intangibilidade dos direitos civis básicos contra a vigilância desmedida.\n\nFonte: BRASIL. Constituição Federal de 1988, art. 5º, LXXIX; Lei Federal nº 13.709/2018 (LGPD).`,
      `### TEXTO II: Panorama de Automação de Decisões e Riscos de Vieses Algorítmicos\n\nRelatório do Centro de Estudos em Tecnologia e Sociedade aponta que mais de 65% das instituições financeiras e órgãos de segurança pública utilizam algum nível de perfilamento automatizado para concessão de crédito ou reconhecimento facial. Contudo, auditorias técnicas identificaram taxas de falsos positivos até 4 vezes maiores em populações vulneráveis e periféricas quando os bancos de dados de treinamento reproduzem desigualdades históricas.\n\nA Organização para a Cooperação e Desenvolvimento Econômico (OCDE) adverte que a ausência de auditorias algorítmicas independentes e de explicabilidade nos modelos de inteligência artificial aprofunda assimetrias e fragiliza o exercício do contraditório e da ampla defesa.\n\nFonte: OCDE / UNESCO. Relatório Global de Ética e Governança em Inteligência Artificial, 2024.`,
      `### TEXTO III: O Papel da Regulação Estatal e o Futuro da Cidadania Digital\n\nO debate legislativo em torno do Marco Legal da Inteligência Artificial no Brasil (PL 2.338/2023) busca harmonizar a inovação tecnológica com a segurança jurídica e a salvaguarda de direitos. Enquanto setores produtivos alertam contra o excesso de regulação prematura que possa inibir investimentos, juristas e entidades de direitos humanos sustentam que sistemas de alto risco — como os aplicados à saúde, segurança pública e relações de trabalho — devem obrigatoriamente submeter-se a relatórios de impacto algorítmico e responsabilização civil objetiva.\n\nO equilíbrio entre soberania tecnológica e proteção aos vulneráveis define o principal desafio democrático do século XXI.\n\nFonte: SENADO FEDERAL. Relatório da Comissão de Juristas sobre Inteligência Artificial no Brasil, 2024.`,
    ],
  },
  {
    id: 'tema-def-3',
    titulo: 'Políticas Públicas de Segurança, Direitos Humanos e Redução das Desigualdades',
    eixoTematico: 'Segurança Pública e Direitos Humanos',
    descricao: 'A busca por segurança pública cidadã demanda a articulação estratégica entre repressão qualificada, inteligência policial e investimentos em educação e inclusão social.',
    textosMotivadores: [
      `### TEXTO I: A Segurança Pública como Dever do Estado e Direito Social\n\nO artigo 144 da Constituição Federal prescreve que a segurança pública, dever do Estado, direito e responsabilidade de todos, é exercida para a preservação da ordem pública e da incolumidade das pessoas e do patrimônio. O modelo contemporâneo de segurança cidadã preconiza que o sucesso policial não se mede pelo número de confrontos armados, mas sim pela capacidade de garantir a tranquilidade pública e a inviolabilidade da vida humana em todos os territórios da Federação.\n\nA atuação policial fundamentada na legalidade estrita e na proporcionalidade do uso da força fortalece a confiança da população nas instituições de segurança.\n\nFonte: BRASIL. Constituição Federal de 1988. Artigo 144.`,
      `### TEXTO II: Estatísticas de Violência e Custo Social da Insegurança\n\nDados consolidados do Fórum Brasileiro de Segurança Pública e do Atlas da Violência (IPEA) registram que o custo econômico da violência consome anualmente cerca de 5,9% do Produto Interno Bruto (PIB) nacional em despesas públicas com segurança, perdas de produtividade e custos hospitalares. A juventude negra e moradora de periferias urbanas responde por mais de 72% das vítimas de homicídios no país.\n\nExperiências internacionais e programas municipais integrados evidenciam que cada R$ 1,00 investido em prevenção primária (escolas em tempo integral, iluminação pública e centros de convivência comunitária) gera uma economia de R$ 4,50 em custos penitenciários e repressivos.\n\nFonte: IPEA / Fórum Brasileiro de Segurança Pública. Atlas da Violência, 2024.`,
      `### TEXTO III: A Integração entre Forças Policiais e Tecnologias de Inteligência\n\nA modernização da segurança pública passa pelo abandono de operações reativas pontuais em favor de políticas de policiamento orientado por problemas (POP) e inteligência preditiva. A integração dos bancos de dados estaduais com o Sistema Único de Segurança Pública (SUSP - Lei nº 13.675/2018), aliada à perícia científica forense e ao controle de armas, constitui o caminho mais eficaz para desarticular o crime organizado sem expor a população a riscos desnecessários.\n\nA segurança eficaz é aquela que protege a cidadania e promove a paz social como pressuposto inegociável da vida em sociedade.\n\nFonte: MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA. Plano Nacional de Segurança Pública e Defesa Social, 2024.`,
    ],
  },
];

function parseTextosMotivadores(textos: string | string[] | undefined): string[] {
  if (!textos) return [];
  if (Array.isArray(textos)) {
    const limpos = textos.map((t) => String(t).trim()).filter((t) => t.length > 0);
    if (limpos.length >= 3) return limpos.slice(0, 3);
    if (limpos.length === 1) return parseTextosMotivadores(limpos[0]);
    if (limpos.length > 0) return limpos;
    return [];
  }

  const str = String(textos).trim();

  // Dividir por delimitadores explícitos gerados pela IA ou padronizados
  const regexMarcadores = /(?=(?:###\s*TEXTO\s+(?:[I|V|X\d]+|[0-9]+)|(?:^|\n)Texto\s+(?:[I|V|X\d]+|[0-9]+)[:.-]|\[TEXTO\s+(?:[I|V|X\d]+|[0-9]+)\]))/gi;
  const blocos = str
    .split(regexMarcadores)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  if (blocos.length >= 2) {
    return blocos.slice(0, 3);
  }

  // Tentar divisão por quebras duplas de parágrafos
  const byNewlines = str
    .split(/\n\s*---\s*\n|\n\s*\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  if (byNewlines.length >= 3) {
    return byNewlines.slice(0, 3);
  }

  return [str];
}

function mapBackendTema(raw: BackendTemaRedacao, fallbackEixo = 'Geral'): TemaRedacao {
  let titulo = raw.titulo?.replace(/^["']|["']$/g, '').trim() || 'Proposta de Redação';

  // Sanitização protetiva caso a IA tenha gerado comandos operacionais no título
  if (
    titulo.toLowerCase().startsWith('o texto dissertativo') ||
    titulo.toLowerCase().startsWith('redija um texto') ||
    titulo.toLowerCase().startsWith('o candidato deve')
  ) {
    const match = titulo.match(/(?:1\)|tópicos?:)\s*([^;.\n]+)/i);
    if (match && match[1]) {
      titulo = match[1].trim();
    } else {
      const matchAspas = titulo.match(/"([^"]{10,130})"/);
      if (matchAspas && matchAspas[1]) {
        titulo = matchAspas[1].trim();
      }
    }
  }

  const descricao =
    raw.descricao &&
    raw.descricao.trim().length >= 20 &&
    !raw.descricao.toLowerCase().startsWith('o texto dissertativo deve ser redigido em prosa')
      ? raw.descricao.trim()
      : 'Reflexão crítica orientada aos mandamentos constitucionais, marcos regulatórios e desafios socioeconômicos contemporâneos.';

  return {
    id: String(raw.id),
    titulo,
    descricao,
    eixoTematico: raw.eixoTematico || fallbackEixo,
    textosMotivadores: parseTextosMotivadores(raw.textosMotivadores),
    criteriosAvaliacao: raw.criteriosAvaliacao,
  };
}

function mapSubmissaoToEvaluationResult(
  submissao: BackendSubmissaoRedacao,
  taxaLegibilidade = 100
): EvaluationResult {
  const feedback = submissao.feedback;
  const notaGeral = Math.round(Number(submissao.notaGeral ?? feedback?.notaGeral ?? 0));

  const competencias = feedback?.competencias || [];
  const criterios: CriterionEvaluation[] = competencias.map((comp) => ({
    nome: comp.nomeCompetencia || comp.competencia || 'Competência Técnica',
    nota: Math.round(Number(comp.nota || 0)),
    max: 200,
    feedback: comp.comentarios || comp.justificativa || 'Avaliação satisfatória.',
  }));

  const pontosFortes: string[] = [];
  const pontosMelhoria: string[] = [];

  if (feedback?.comentariosGerais) {
    pontosFortes.push(feedback.comentariosGerais);
  }

  if (Array.isArray(feedback?.sugestoesReescrita)) {
    for (const sug of feedback.sugestoesReescrita) {
      const justificativa = sug.justificativa || sug.motivo;
      const sugerido = sug.trechoSugerido || sug.sugestaoAprimorada;
      if (justificativa || sugerido) {
        pontosMelhoria.push(
          justificativa && sugerido ? `${justificativa}: "${sugerido}"` : (justificativa || sugerido || '')
        );
      }
    }
  }

  for (const comp of competencias) {
    if (Array.isArray(comp.desviosIdentificados)) {
      for (const desvio of comp.desviosIdentificados) {
        if (desvio && !pontosMelhoria.includes(desvio)) {
          pontosMelhoria.push(desvio);
        }
      }
    }
  }

  if (pontosFortes.length === 0) {
    pontosFortes.push('Aderência ao gênero dissertativo e estruturação formal de parágrafos mantida.');
  }

  if (pontosMelhoria.length === 0) {
    pontosMelhoria.push('Aprofundar a fundamentação com repertório sociocultural e referências normativas.');
  }

  return {
    notaGeral,
    taxaLegibilidade,
    criterios: criterios.length > 0 ? criterios : [
      { nome: 'Domínio da Norma Culta', nota: Math.round(notaGeral * 0.2), max: 200, feedback: 'Avaliação consolidada' },
      { nome: 'Compreensão do Tema', nota: Math.round(notaGeral * 0.2), max: 200, feedback: 'Avaliação consolidada' },
      { nome: 'Capacidade Argumentativa', nota: Math.round(notaGeral * 0.2), max: 200, feedback: 'Avaliação consolidada' },
      { nome: 'Coesão e Estruturação', nota: Math.round(notaGeral * 0.2), max: 200, feedback: 'Avaliação consolidada' },
      { nome: 'Proposta / Conclusão Técnica', nota: Math.round(notaGeral * 0.2), max: 200, feedback: 'Avaliação consolidada' },
    ],
    pontosFortes,
    pontosMelhoria,
  };
}

export const redacaoService = {
  getDeletedTemaIds(): Set<string> {
    try {
      const stored = localStorage.getItem(STORAGE_DELETED_TEMAS_KEY);
      return new Set<string>(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set<string>();
    }
  },

  async listarTemas(): Promise<TemaRedacao[]> {
    const deletedIds = this.getDeletedTemaIds();

    try {
      const data = await ApiService.request<{ content?: BackendTemaRedacao[] } | BackendTemaRedacao[]>('/redacoes/temas');
      let apiTemas: BackendTemaRedacao[] = [];
      if (Array.isArray(data)) {
        apiTemas = data;
      } else if (data?.content) {
        apiTemas = data.content;
      }

      const mappedTemas: TemaRedacao[] = apiTemas.map((item) => mapBackendTema(item));

      const stored = localStorage.getItem(STORAGE_TEMAS_KEY);
      const customTemas: TemaRedacao[] = stored ? JSON.parse(stored) : [];

      const combinados = [...customTemas, ...mappedTemas, ...TEMAS_DEFAULT];
      const ids = new Set<string>();
      const resultado: TemaRedacao[] = [];

      for (const t of combinados) {
        if (!ids.has(t.id) && !deletedIds.has(t.id)) {
          ids.add(t.id);
          resultado.push(t);
        }
      }

      return resultado;
    } catch {
      const stored = localStorage.getItem(STORAGE_TEMAS_KEY);
      const customTemas: TemaRedacao[] = stored ? JSON.parse(stored) : [];
      const combinados = [...customTemas, ...TEMAS_DEFAULT];
      const ids = new Set<string>();
      const resultado: TemaRedacao[] = [];

      for (const t of combinados) {
        if (!ids.has(t.id) && !deletedIds.has(t.id)) {
          ids.add(t.id);
          resultado.push(t);
        }
      }

      return resultado;
    }
  },

  async gerarTemaAi(eixoTematico?: string): Promise<TemaRedacao | null> {
    const eixo = eixoTematico?.trim() || 'Direito Constitucional e Políticas Públicas';

    try {
      const res = await ApiService.request<BackendTemaRedacao>('/redacoes/temas/gerar', {
        method: 'POST',
        body: JSON.stringify({ eixoTematico: eixo }),
      });

      if (res && res.titulo) {
        const novoTema = mapBackendTema(res, eixo);
        this.salvarLocalmente(novoTema);
        return novoTema;
      }
      return null;
    } catch (error) {
      console.error('Erro ao gerar tema com IA no backend:', error);
      throw error;
    }
  },

  salvarLocalmente(tema: TemaRedacao) {
    try {
      const stored = localStorage.getItem(STORAGE_TEMAS_KEY);
      const customTemas: TemaRedacao[] = stored ? JSON.parse(stored) : [];
      const atualizados = [tema, ...customTemas.filter((t) => t.id !== tema.id)];
      localStorage.setItem(STORAGE_TEMAS_KEY, JSON.stringify(atualizados));

      // Se estava na lista de deletados, remove de lá
      const deletedStored = localStorage.getItem(STORAGE_DELETED_TEMAS_KEY);
      if (deletedStored) {
        const deletedIds: string[] = JSON.parse(deletedStored);
        const limpos = deletedIds.filter((id) => id !== tema.id);
        localStorage.setItem(STORAGE_DELETED_TEMAS_KEY, JSON.stringify(limpos));
      }
    } catch {
      // Ignora erro de cota
    }
  },

  async editarTema(temaId: string, dados: Partial<TemaRedacao>): Promise<TemaRedacao> {
    const todos = await this.listarTemas();
    const existente = todos.find((t) => t.id === temaId) || TEMAS_DEFAULT.find((t) => t.id === temaId);

    const temaAtualizado: TemaRedacao = {
      id: temaId,
      titulo: dados.titulo !== undefined ? dados.titulo.trim() : (existente?.titulo || 'Proposta de Redação'),
      descricao: dados.descricao !== undefined ? dados.descricao.trim() : (existente?.descricao || ''),
      eixoTematico: dados.eixoTematico !== undefined ? dados.eixoTematico.trim() : (existente?.eixoTematico || 'Geral'),
      textosMotivadores: dados.textosMotivadores !== undefined ? dados.textosMotivadores : (existente?.textosMotivadores || []),
      criteriosAvaliacao: dados.criteriosAvaliacao !== undefined ? dados.criteriosAvaliacao : existente?.criteriosAvaliacao,
    };

    // Tentar atualizar no backend
    try {
      await ApiService.request(`/redacoes/temas/${temaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: temaAtualizado.titulo,
          descricao: temaAtualizado.descricao,
          eixoTematico: temaAtualizado.eixoTematico,
          textosMotivadores: temaAtualizado.textosMotivadores,
          criteriosAvaliacao: temaAtualizado.criteriosAvaliacao,
        }),
      });
    } catch {
      // Backend pode não ter rota PUT; mantém garantia local
    }

    this.salvarLocalmente(temaAtualizado);
    return temaAtualizado;
  },

  async apagarTema(temaId: string): Promise<boolean> {
    // 1. Tentar apagar no backend
    try {
      await ApiService.request(`/redacoes/temas/${temaId}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignora falha de rota remota
    }

    // 2. Remover do localStorage de temas customizados
    try {
      const stored = localStorage.getItem(STORAGE_TEMAS_KEY);
      const customTemas: TemaRedacao[] = stored ? JSON.parse(stored) : [];
      const filtrados = customTemas.filter((t) => t.id !== temaId);
      localStorage.setItem(STORAGE_TEMAS_KEY, JSON.stringify(filtrados));
    } catch {
      // Ignora erro
    }

    // 3. Registrar no registro de exclusão
    try {
      const deletedStored = localStorage.getItem(STORAGE_DELETED_TEMAS_KEY);
      const deletedIds: string[] = deletedStored ? JSON.parse(deletedStored) : [];
      if (!deletedIds.includes(temaId)) {
        deletedIds.push(temaId);
        localStorage.setItem(STORAGE_DELETED_TEMAS_KEY, JSON.stringify(deletedIds));
      }
    } catch {
      // Ignora erro
    }

    return true;
  },

  async submeterTexto(payload: SubmissaoTextoPayload): Promise<EvaluationResult | null> {
    const res = await ApiService.request<BackendSubmissaoRedacao>('/redacoes/submissoes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res && (res.notaGeral !== undefined || res.feedback)) {
      return mapSubmissaoToEvaluationResult(res, 100);
    }
    return null;
  },

  async submeterFoto(temaId: string, imageFile: File): Promise<EvaluationResult | null> {
    const formData = new FormData();
    formData.append('temaRedacaoId', temaId);
    formData.append('imagem', imageFile);

    const res = await ApiService.request<BackendResultadoImagem>('/redacoes/submissoes/imagem', {
      method: 'POST',
      body: formData,
    });

    if (res && res.submissao) {
      return mapSubmissaoToEvaluationResult(res.submissao, res.percentualLegibilidade || 90);
    }
    return null;
  },

  async listarSubmissoes(temaId?: string): Promise<SubmissaoRedacaoResumo[]> {
    try {
      const query = temaId ? `?temaRedacaoId=${encodeURIComponent(temaId)}` : '';
      const data = await ApiService.request<{ content?: any[] } | any[]>(`/redacoes/submissoes${query}`);
      const list = Array.isArray(data) ? data : (data?.content || []);
      return list.map((item: any) => ({
        id: String(item.id),
        temaId: String(item.temaId),
        temaTitulo: item.temaTitulo || 'Tema de Redação',
        notaGeral: Math.round(Number(item.notaGeral ?? 0)),
        corrigidoEm: item.corrigidoEm,
        criadoEm: item.criadoEm || item.corrigidoEm || new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Erro ao listar submissões de redação:', err);
      return [];
    }
  },

  async obterSubmissao(submissaoId: string): Promise<SubmissaoRedacaoDetalhe | null> {
    try {
      const data = await ApiService.request<any>(`/redacoes/submissoes/${submissaoId}`);
      if (!data) return null;
      return {
        id: String(data.id),
        temaId: String(data.temaId),
        temaTitulo: data.temaTitulo || 'Tema de Redação',
        textoAluno: data.textoAluno || '',
        notaGeral: Math.round(Number(data.notaGeral ?? 0)),
        corrigidoEm: data.corrigidoEm,
        criadoEm: data.criadoEm || data.corrigidoEm || new Date().toISOString(),
        evaluationResult: mapSubmissaoToEvaluationResult(data, 100),
      };
    } catch (err) {
      console.error('Erro ao obter submissão de redação:', err);
      return null;
    }
  },
};


/**
 * Tipos do LICC Gov Graph.
 *
 * O modelo segue a mesma ideia do SF Government Graph do CivLab: um catálogo
 * *relacional* — entidades tipadas ligadas por relações nomeadas, cada uma
 * ancorada na norma que a institui — e não apenas um painel financeiro.
 */

/** Categorias de vértice do grafo. */
export type NodeKind =
  | "governanca"
  | "patrocinador"
  | "proponente"
  | "projeto"
  | "segmento"
  | "municipio"
  | "fundamento"
  | "publico"
  /* Camada territorial (Republic): o que acontece e onde. */
  | "evento"
  | "espaco"
  /* Quem ocupa o cargo e sob qual chamada pública. */
  | "pessoa"
  | "edital";

/** Categorias de aresta. Espelham `appoints` / `oversees` do CivLab. */
export type EdgeKind =
  | "propoe"
  | "patrocina"
  | "pertence_a"
  | "ocorre_em"
  | "aprova"
  | "regula"
  | "nomeia"
  | "fiscaliza"
  | "fundamenta"
  | "beneficia"
  | "acontece_em"
  | "sediado_em"
  | "ocupa"
  | "publica"
  | "inscrito_em";

/** Situação de um projeto na tramitação da LICC. */
export type ProjetoStatus =
  | "inscrito"
  | "habilitado"
  | "aprovado"
  | "captando"
  | "captado"
  | "em_execucao"
  | "prestacao_de_contas"
  | "concluido"
  | "inabilitado";

/** Natureza jurídica do proponente. */
export type NaturezaProponente =
  | "pessoa_fisica"
  | "pessoa_juridica"
  | "coletivo"
  | "organizacao_sem_fins_lucrativos"
  | "prefeitura";

/**
 * Proveniência de cada registro. Existe para que a interface nunca apresente
 * um dado sintético como se fosse registro oficial da SECULT.
 */
export type Proveniencia =
  /** Extraído de fonte oficial (Mapa Cultural ES, SECULT, SEFAZ, DIO-ES). */
  | "oficial"
  /** Derivado por cálculo a partir de dados oficiais. */
  | "derivado"
  /** Registro de demonstração, gerado localmente. Não é dado real. */
  | "demonstracao";

export interface Fonte {
  /** Rótulo curto exibido na interface. */
  rotulo: string;
  url?: string;
  /** ISO-8601. Quando o dado foi coletado/verificado. */
  consultadoEm?: string;
}

export interface Orcamento {
  /**
   * Teto aprovado para captação via renúncia de ICMS (R$).
   *
   * **Opcional de propósito.** A SECULT não publica valor para todo projeto, e
   * um campo obrigatório forçaria `0` no lugar da ausência — que é o modo mais
   * silencioso de mentir num painel financeiro: "não publicado" e "R$ 0" viram
   * a mesma coisa, e a soma parece completa quando não é.
   */
  autorizado?: number;
  /** Montante efetivamente aportado por patrocinadores (R$). Idem. */
  captado?: number;
  /** Mesmos valores no exercício anterior, base da variação ano a ano. */
  anterior?: { autorizado?: number; captado?: number };
  /**
   * Quantos projetos entraram na soma e quantos existem, nos nós que agregam.
   * Sem isso um agregado parcial se lê como total.
   */
  cobertura?: { comValor: number; total: number };
}

export interface Noticia {
  id: string;
  titulo: string;
  /** ISO-8601 (YYYY-MM-DD). */
  data: string;
  veiculo: string;
  url?: string;
  resumo?: string;
  proveniencia: Proveniencia;
}

/** Vértice do grafo. */
export interface GraphNode {
  id: string;
  slug: string;
  kind: NodeKind;
  nome: string;
  /** Sigla ou nome curto, quando houver. */
  sigla?: string;
  descricao?: string;
  /** Nomes alternativos — entram no índice de busca, como no CivLab v2. */
  nomesAlternativos?: string[];
  orcamento?: Orcamento;
  noticias?: Noticia[];
  /** IDs de nós `fundamento` que dão base legal a esta entidade. */
  fundamentos?: string[];
  fontes?: Fonte[];
  proveniencia: Proveniencia;
  url?: string;
  /** Posição por captação dentro da própria categoria: "3 de 22". */
  posicao?: { lugar: number; total: number };
  /** Variação da captação sobre o exercício anterior (fração; 0,039 = +3,9%). */
  variacaoAnual?: number | null;
  /** Campos específicos por tipo de nó. */
  meta?: NodeMeta;
}

export interface NodeMeta {
  // projeto
  numeroProcesso?: string;
  status?: ProjetoStatus;
  ano?: number;
  segmentoId?: string;
  municipioId?: string;
  proponenteId?: string;
  /** Marca as cotas da LICC que o projeto ocupa. */
  pautado?: boolean;
  continuado?: boolean;
  // proponente
  natureza?: NaturezaProponente;
  /** A LICC limita a quantidade de projetos por proponente no exercício. */
  projetosNoAno?: number;
  // patrocinador
  setor?: string;
  // municipio
  regiao?: string;
  regiaoMetropolitana?: boolean;
  codigoIbge?: string;
  populacao?: number;
  // fundamento
  norma?: string;
  publicadoEm?: string;
  // evento
  inicio?: string;
  fim?: string;
  espacoId?: string;
  // espaco
  endereco?: string;
  acessivel?: boolean;
  // pessoa
  cargo?: string;
  desde?: string;
  orgaoId?: string;
  // edital
  oportunidadeId?: number;
  inscricoesDe?: string;
  inscricoesAte?: string;
  encerrado?: boolean;
  // qualquer nó
  [key: string]: unknown;
}

/** Aresta do grafo. `peso` é o montante em R$ quando a relação é financeira. */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  peso?: number;
  rotulo?: string;
  proveniencia: Proveniencia;
}

export interface GraphMeta {
  /** Exercício da LICC representado. */
  ano: number;
  geradoEm: string;
  /** Teto de captação autorizado para o exercício (R$). */
  tetoAutorizado: number;
  fontes: Fonte[];
  /** Quantos registros vêm de cada proveniência — exibido no rodapé. */
  contagemPorProveniencia: Record<Proveniencia, number>;
}

export interface Graph {
  meta: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Nó já resolvido com vizinhança e agregados, servido por /api/entities/[slug]. */
export interface EntityDetail {
  node: GraphNode;
  vizinhos: Array<{
    node: GraphNode;
    edge: GraphEdge;
    direcao: "entrada" | "saida";
  }>;
  agregado: Orcamento & {
    /** Percentual captado sobre o autorizado (0–1); null quando não se aplica. */
    execucao: number | null;
    projetos: number;
  };
  noticias: Noticia[];
  /** Normas que fundamentam a entidade, já resolvidas para exibição. */
  fundamentos: Array<{ id: string; slug: string; nome: string }>;
}

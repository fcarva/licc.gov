import type { NodeKind } from "@/types/graph";

/** Formas do grafo radial, na gramática aferida no CivLab. */
export type Forma =
  | "estrela"
  | "circulo"
  | "losango"
  | "ponto"
  | "quadrado"
  | "oculto";

export interface NodeKindSpec {
  kind: NodeKind;
  rotulo: string;
  rotuloPlural: string;
  descricao: string;
  cor: string;
  /**
   * Anel do layout radial. `0` é o centro; `null` mantém o vértice fora do
   * desenho — segmentos e municípios agrupam e colorem, mas não ocupam anel.
   */
  anel: number | null;
  /** Rótulo em versalete desenhado no raio do anel. */
  rotuloAnel?: string;
  /** Papel do vértice no fluxo do valor — subtítulo do anel. */
  papel?: string;
  forma: Forma;
  /** Raio base em px, antes da escala por captação. */
  raioBase: number;
  analogoCivLab: string;
  rota: string;
}

/**
 * As oito categorias de vértice do LICC Gov Graph.
 *
 * Os anéis seguem o **fluxo do valor**, não uma taxonomia. O cidadão capixaba
 * está no centro por ser as duas pontas ao mesmo tempo: financiador indireto,
 * porque o Estado abre mão de ICMS, e beneficiário final do bem público
 * gerado. De dentro para fora o dinheiro atravessa quem aprova, quem aporta,
 * quem executa e o que se produz.
 *
 * A paleta é sóbria e cada matiz se distingue em escala de cinza.
 */
export const NODE_KINDS: Record<NodeKind, NodeKindSpec> = {
  publico: {
    kind: "publico",
    rotulo: "População",
    rotuloPlural: "População",
    descricao:
      "A população capixaba. Financiadora indireta, porque o Estado abre mão de ICMS para que a política exista, e destinatária final do bem público gerado.",
    cor: "#c2410c",
    anel: 0,
    papel: "Origem e destino do valor",
    forma: "estrela",
    raioBase: 34,
    analogoCivLab: "People of San Francisco",
    rota: "/entidade",
  },
  governanca: {
    kind: "governanca",
    rotulo: "Órgão",
    rotuloPlural: "Aprovação e fomento",
    descricao:
      "Quem institui a política, autoriza o teto de renúncia, julga o mérito dos projetos e fiscaliza a execução: SECULT-ES, SEFAZ-ES, o Conselho Estadual de Cultura e a Comissão de Análise de Projetos.",
    cor: "#1e3a5f",
    anel: 1,
    rotuloAnel: "APROVAÇÃO E FOMENTO",
    papel: "Define diretrizes e o teto do orçamento",
    forma: "circulo",
    raioBase: 9,
    analogoCivLab: "Elected",
    rota: "/entidade",
  },
  patrocinador: {
    kind: "patrocinador",
    rotulo: "Patrocinador",
    rotuloPlural: "O capital",
    descricao:
      "Empresas contribuintes do ICMS. Operam como intermediárias que escolhem onde alocar a renúncia fiscal — é aqui que se decide, na prática, qual cultura recebe dinheiro.",
    cor: "#0f766e",
    anel: 2,
    rotuloAnel: "O CAPITAL",
    papel: "Aloca a renúncia de ICMS",
    forma: "losango",
    raioBase: 7,
    analogoCivLab: "Commission",
    rota: "/entidade",
  },
  proponente: {
    kind: "proponente",
    rotulo: "Proponente",
    rotuloPlural: "A execução",
    descricao:
      "Quem faz: produtoras, organizações sem fins lucrativos, coletivos, artistas e prefeituras do interior, com sede no Espírito Santo.",
    cor: "#7c2d92",
    anel: 3,
    rotuloAnel: "A EXECUÇÃO",
    papel: "Realiza o projeto",
    forma: "ponto",
    raioBase: 4,
    analogoCivLab: "Advisory",
    rota: "/entidade",
  },
  projeto: {
    kind: "projeto",
    rotulo: "Projeto",
    rotuloPlural: "O bem público",
    descricao:
      "O que a política produz: festivais, mostras, obras de restauro, salvaguarda de patrimônio, planos anuais de espaços e grupos estáveis.",
    cor: "#b45309",
    anel: 4,
    rotuloAnel: "O BEM PÚBLICO",
    papel: "Resultado entregue à população",
    forma: "quadrado",
    raioBase: 6,
    analogoCivLab: "Department",
    rota: "/entidade",
  },

  /* Agrupadores: dão cor e recorte, mas não ocupam anel no radial. */
  segmento: {
    kind: "segmento",
    rotulo: "Segmento",
    rotuloPlural: "Segmentos",
    descricao:
      "Área cultural que agrupa os projetos, alinhada à taxonomia de área da plataforma Mapas Culturais. Representa o bem cultural entregue à população.",
    cor: "#be123c",
    anel: 5,
    rotuloAnel: "O BEM CULTURAL",
    papel: "Área cultural entregue à população",
    forma: "circulo",
    raioBase: 12,
    analogoCivLab: "Topic",
    rota: "/segmentos",
  },
  municipio: {
    kind: "municipio",
    rotulo: "Município",
    rotuloPlural: "Municípios",
    descricao:
      "Os 78 municípios capixabas onde os projetos são executados. Sustentam a auditoria da cota territorial da LICC.",
    cor: "#4d7c0f",
    anel: null,
    forma: "oculto",
    raioBase: 6,
    analogoCivLab: "District",
    rota: "/municipios",
  },
  evento: {
    kind: "evento",
    rotulo: "Evento",
    rotuloPlural: "Agenda cultural",
    descricao:
      "Ocorrências culturais cadastradas no Mapa Cultural do Espírito Santo: shows, mostras, feiras, oficinas e apresentações.",
    cor: "#a16207",
    anel: null,
    forma: "oculto",
    raioBase: 4,
    analogoCivLab: "Events (Republic)",
    rota: "/monitor",
  },
  espaco: {
    kind: "espaco",
    rotulo: "Espaço",
    rotuloPlural: "Espaços culturais",
    descricao:
      "Teatros, centros culturais, bibliotecas, praças e sedes de coletivos cadastrados no Mapa Cultural do Espírito Santo.",
    cor: "#0e7490",
    anel: null,
    forma: "oculto",
    raioBase: 5,
    analogoCivLab: "Community groups (Republic)",
    rota: "/monitor",
  },
  fundamento: {
    kind: "fundamento",
    rotulo: "Fundamento legal",
    rotuloPlural: "Fundamentos legais",
    descricao:
      "Leis, portarias e instruções normativas que dão base a cada entidade do grafo.",
    cor: "#3f3f46",
    anel: null,
    forma: "oculto",
    raioBase: 8,
    analogoCivLab: "Legal source",
    rota: "/entidade",
  },
};

export const NODE_KIND_LIST: NodeKindSpec[] = Object.values(NODE_KINDS);

/** Categorias desenhadas no radial, do centro para fora. */
export const ANEIS: NodeKindSpec[] = NODE_KIND_LIST.filter(
  (k) => k.anel !== null,
).sort((a, b) => (a.anel ?? 0) - (b.anel ?? 0));

export function corDoNo(kind: NodeKind): string {
  return NODE_KINDS[kind].cor;
}

export function formaDoNo(kind: NodeKind): Forma {
  return NODE_KINDS[kind].forma;
}

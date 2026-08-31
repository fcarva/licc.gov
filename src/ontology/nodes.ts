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
  /**
   * Cor da categoria: traço, texto e rótulo do anel — e, a 50% de opacidade
   * sobre branco, o preenchimento do vértice aceso. Não há segunda cor.
   */
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
 * A paleta das cinco categorias com anel vem do **HTML do SF Government
 * Graph**, não de amostragem de pixels: houve uma versão em que eu media o
 * vértice *aceso* e guardava o resultado como se fosse a cor da categoria, o
 * que trocava a causa pelo efeito. A regra real é uma cor só —
 *
 *     <circle fill="var(--white)"/>            fundo branco
 *     <circle fill="#f2686f" fill-opacity=".5"/>  a mesma cor, a 50%
 *     <circle stroke="#f2686f"/>               o traço, cheia
 *
 * — e a correspondência com a LICC é **por posição no anel**, que é onde mora
 * o significado do desenho. Em repouso o vértice é só contorno; o pastel
 * aparece quando ele acende, e é derivado, nunca armazenado.
 *
 * As sete categorias sem anel mantêm matiz próprio: não há original a copiar.
 * O fundo `#ebeae4` continua o aferido — foi amostrado do plano de fundo, não
 * de um vértice aceso, então não sofre do erro acima.
 */
export const NODE_KINDS: Record<NodeKind, NodeKindSpec> = {
  publico: {
    kind: "publico",
    rotulo: "População",
    rotuloPlural: "População",
    descricao:
      "A população capixaba. Financiadora indireta, porque o Estado abre mão de ICMS para que a política exista, e destinatária final do bem público gerado.",
    cor: "#f27836",
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
    cor: "#f2686f",
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
    cor: "#c15ef2",
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
    cor: "#f25eef",
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
    cor: "#826dc8",
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
      "Área cultural que agrupa os projetos, alinhada à taxonomia de área da plataforma Mapas Culturais. Colore os projetos no grafo e recorta as leituras de orçamento.",
    cor: "#be5a70",
    anel: null,
    forma: "oculto",
    raioBase: 8,
    analogoCivLab: "Topic",
    rota: "/segmentos",
  },
  municipio: {
    kind: "municipio",
    rotulo: "Município",
    rotuloPlural: "Municípios",
    descricao:
      "Os 78 municípios capixabas onde os projetos são executados. Sustentam a auditoria da cota territorial da LICC.",
    cor: "#6a8f4d",
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
    cor: "#b08040",
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
    cor: "#4d8a9c",
    anel: null,
    forma: "oculto",
    raioBase: 5,
    analogoCivLab: "Community groups (Republic)",
    rota: "/monitor",
  },
  pessoa: {
    kind: "pessoa",
    rotulo: "Titular",
    rotuloPlural: "Titulares",
    descricao:
      "Quem ocupa o cargo à frente de um órgão — o Secretário de Estado da Cultura, por exemplo. Separar a pessoa do órgão permite acompanhar a gestão sem confundi-la com a instituição.",
    cor: "#b06a86",
    anel: null,
    forma: "oculto",
    raioBase: 5,
    analogoCivLab: "Officeholder (Mayor · José Cisneros)",
    rota: "/entidade",
  },
  edital: {
    kind: "edital",
    rotulo: "Edital",
    rotuloPlural: "Editais",
    descricao:
      "A chamada pública de um exercício da LICC, publicada pela SECULT-ES no Mapa Cultural do Espírito Santo. É nela que os proponentes inscrevem seus projetos.",
    cor: "#8a7f5a",
    anel: null,
    forma: "oculto",
    raioBase: 7,
    analogoCivLab: "Legislative item",
    rota: "/entidade",
  },
  fundamento: {
    kind: "fundamento",
    rotulo: "Fundamento legal",
    rotuloPlural: "Fundamentos legais",
    descricao:
      "Leis, portarias e instruções normativas que dão base a cada entidade do grafo.",
    cor: "#6b6b78",
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

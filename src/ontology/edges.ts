import type { EdgeKind } from "@/types/graph";

export interface EdgeKindSpec {
  kind: EdgeKind;
  /** Verbo exibido na interface: "SECULT-ES *fiscaliza* Projeto X". */
  rotulo: string;
  /** Forma passiva, para listar a relação a partir do alvo: "fiscalizado por". */
  rotuloInverso: string;
  descricao: string;
  cor: string;
  /** Se verdadeiro, `peso` da aresta é um valor em reais. */
  financeira: boolean;
  /** Traço pontilhado para relações institucionais, contínuo para fluxo de recurso. */
  tracejada: boolean;
  analogoCivLab: string;
}

/**
 * As dez relações do grafo.
 *
 * `patrocina` é a única aresta cujo peso move dinheiro de fato — é ela que
 * dimensiona a espessura do traço no canvas. As demais são institucionais e
 * existem para responder "quem responde por quê", que é a pergunta que o
 * CivLab resolve com `appoints` e `oversees`.
 */
export const EDGE_KINDS: Record<EdgeKind, EdgeKindSpec> = {
  propoe: {
    kind: "propoe",
    rotulo: "propõe",
    rotuloInverso: "proposto por",
    descricao: "O agente cultural inscreveu o projeto na LICC.",
    cor: "#7c2d92",
    financeira: false,
    tracejada: false,
    analogoCivLab: "sponsors",
  },
  patrocina: {
    kind: "patrocina",
    rotulo: "patrocina",
    rotuloInverso: "patrocinado por",
    descricao:
      "Empresa contribuinte do ICMS aportou recursos no projeto. O peso da aresta é o valor captado em reais.",
    cor: "#0f766e",
    financeira: true,
    tracejada: false,
    analogoCivLab: "funds",
  },
  pertence_a: {
    kind: "pertence_a",
    rotulo: "pertence a",
    rotuloInverso: "reúne",
    descricao: "Agrupamento setorial do projeto por área cultural.",
    cor: "#be123c",
    financeira: false,
    tracejada: true,
    analogoCivLab: "tagged with topic",
  },
  ocorre_em: {
    kind: "ocorre_em",
    rotulo: "ocorre em",
    rotuloInverso: "recebe",
    descricao: "Município capixaba onde o projeto é executado prioritariamente.",
    cor: "#4d7c0f",
    financeira: false,
    tracejada: true,
    analogoCivLab: "serves district",
  },
  aprova: {
    kind: "aprova",
    rotulo: "aprova",
    rotuloInverso: "aprovado por",
    descricao:
      "A Comissão de Análise de Projetos ou a SECULT-ES deferiu a habilitação ou a aprovação do projeto.",
    cor: "#1e3a5f",
    financeira: false,
    tracejada: false,
    analogoCivLab: "approves",
  },
  regula: {
    kind: "regula",
    rotulo: "regula",
    rotuloInverso: "regulado por",
    descricao: "O órgão edita as normas que disciplinam a política.",
    cor: "#1e3a5f",
    financeira: false,
    tracejada: true,
    analogoCivLab: "regulates",
  },
  nomeia: {
    kind: "nomeia",
    rotulo: "nomeia",
    rotuloInverso: "nomeado por",
    descricao: "O órgão designa os integrantes do colegiado.",
    cor: "#1e3a5f",
    financeira: false,
    tracejada: true,
    analogoCivLab: "appoints",
  },
  fiscaliza: {
    kind: "fiscaliza",
    rotulo: "fiscaliza",
    rotuloInverso: "fiscalizado por",
    descricao:
      "O órgão acompanha a execução e julga a prestação de contas do projeto.",
    cor: "#334155",
    financeira: false,
    tracejada: true,
    analogoCivLab: "oversees",
  },
  fundamenta: {
    kind: "fundamenta",
    rotulo: "fundamenta",
    rotuloInverso: "fundamentado em",
    descricao:
      "A norma dá base legal à entidade. Toda entidade do grafo tem ao menos um fundamento.",
    cor: "#71717a",
    financeira: false,
    tracejada: true,
    analogoCivLab: "enabled by legal source",
  },
  acontece_em: {
    kind: "acontece_em",
    rotulo: "acontece em",
    rotuloInverso: "recebe",
    descricao: "O evento ocorre neste espaço cultural.",
    cor: "#a16207",
    financeira: false,
    tracejada: true,
    analogoCivLab: "takes place at",
  },
  sediado_em: {
    kind: "sediado_em",
    rotulo: "fica em",
    rotuloInverso: "abriga",
    descricao: "O espaço cultural fica neste município.",
    cor: "#0e7490",
    financeira: false,
    tracejada: true,
    analogoCivLab: "located in",
  },
  beneficia: {
    kind: "beneficia",
    rotulo: "beneficia",
    rotuloInverso: "beneficiado por",
    descricao:
      "Alcance da política sobre a população capixaba — a visão centrada no cidadão.",
    cor: "#0369a1",
    financeira: false,
    tracejada: true,
    analogoCivLab: "serves residents",
  },
};

export const EDGE_KIND_LIST: EdgeKindSpec[] = Object.values(EDGE_KINDS);

export function corDaAresta(kind: EdgeKind): string {
  return EDGE_KINDS[kind].cor;
}

import type { Fonte } from "@/types/graph";

export interface FundamentoLegal {
  id: string;
  slug: string;
  norma: string;
  nome: string;
  descricao: string;
  publicadoEm?: string;
  url?: string;
  /** `false` quando a redação exata não pôde ser conferida na fonte primária. */
  verificado: boolean;
  fonte: Fonte;
}

/**
 * Normas que sustentam a LICC.
 *
 * Cada item carrega `verificado` porque a interface exibe esse selo: a mesma
 * disciplina do CivLab, que ancora toda entidade na norma que a institui, só
 * tem valor se o elo for auditável. `verificado: false` significa "a norma é
 * citada por fonte secundária e ainda não foi conferida no texto oficial".
 */
export const FUNDAMENTOS: FundamentoLegal[] = [
  {
    id: "lei-11246-2021",
    slug: "lei-11246-2021",
    norma: "Lei nº 11.246/2021",
    nome: "Lei de Incentivo à Cultura Capixaba (LICC)",
    descricao:
      "Institui a LICC alterando a Lei nº 7.000/2001. Permite que agentes e grupos culturais recebam patrocínio de empresas contribuintes do ICMS, que em contrapartida obtêm crédito presumido abatível do imposto devido.",
    publicadoEm: "2021-04-07",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Sobre a LICC",
      url: "https://secult.es.gov.br/sobre-a-licc",
    },
  },
  {
    id: "lei-7000-2001",
    slug: "lei-7000-2001",
    norma: "Lei nº 7.000/2001",
    nome: "Lei do ICMS do Espírito Santo",
    descricao:
      "Norma geral do ICMS estadual, alterada pela Lei nº 11.246/2021 para acomodar o crédito presumido da LICC.",
    publicadoEm: "2001-12-27",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Sobre a LICC",
      url: "https://secult.es.gov.br/sobre-a-licc",
    },
  },
  {
    id: "portaria-sefaz-01r-2025",
    slug: "portaria-sefaz-01r-2025",
    norma: "Portaria SEFAZ nº 01-R/2025",
    nome: "Autorização do teto anual de captação",
    descricao:
      "Autoriza a captação de R$ 25 milhões em benefícios fiscais relativos ao ICMS estadual para a LICC.",
    publicadoEm: "2025-01-07",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — ampliação para R$ 25 milhões",
      url: "https://secult.es.gov.br/governo-amplia-para-r-25-milhoes-os-recursos-destinados-a-lei-de-incentivo-a-cultura-capixaba-licc",
    },
  },
  {
    id: "in-licc-2026",
    slug: "instrucao-normativa-licc-2026",
    norma: "Instrução Normativa LICC 2026",
    nome: "Instrução Normativa da LICC para o exercício de 2026",
    descricao:
      "Disciplina a inscrição, a habilitação, a análise de mérito e a tramitação dos projetos da LICC no exercício de 2026. As inscrições ocorrem exclusivamente pelo Mapa Cultural do Espírito Santo.",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Instrução Normativa LICC 2026",
      url: "https://secult.es.gov.br/instrucao-normativa-licc-2026",
    },
  },
  {
    id: "in-licc-001-2025",
    slug: "instrucao-normativa-licc-001-2025",
    norma: "Instrução Normativa LICC nº 001/2025",
    nome: "Instrução Normativa da LICC para o exercício de 2025",
    descricao:
      "Norma do exercício anterior, publicada como anexo da oportunidade 1878 no Mapa Cultural do Espírito Santo.",
    url: "https://mapa.cultura.es.gov.br/files/opportunity/1878/instrucao-normativa-licc-no-001-2025-2.pdf",
    verificado: true,
    fonte: {
      rotulo: "Mapa Cultural ES — anexo da oportunidade 1878",
      url: "https://mapa.cultura.es.gov.br/files/opportunity/1878/instrucao-normativa-licc-no-001-2025-2.pdf",
    },
  },
];

export interface RegraLICC {
  id: string;
  titulo: string;
  descricao: string;
  /** Fração do teto reservada, quando a regra for uma cota. */
  cota?: number;
  /** Limite absoluto, quando a regra for um teto de contagem. */
  limite?: number;
  fundamentoId: string;
  verificado: boolean;
  fonte: Fonte;
}

/**
 * Regras estruturais da LICC que o grafo audita.
 *
 * A interface usa `cota` para desenhar as barras de reserva no painel de
 * orçamento e `limite` para sinalizar proponentes acima do teto de projetos.
 */
export const REGRAS: RegraLICC[] = [
  {
    id: "cota-pautados",
    titulo: "30% para projetos pautados",
    descricao:
      "Trinta por cento dos recursos são reservados a projetos pautados pela SECULT-ES.",
    cota: 0.3,
    fundamentoId: "in-licc-2026",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — LICC 2026: inscrições abertas",
      url: "https://secult.es.gov.br/Noticia/licc-2026-inscricoes-para-projetos-culturais-estao-abertas",
    },
  },
  {
    id: "cota-fora-rmgv",
    titulo: "10% fora da Região Metropolitana",
    descricao:
      "Dez por cento dos recursos são reservados a projetos executados fora da Região Metropolitana da Grande Vitória.",
    cota: 0.1,
    fundamentoId: "in-licc-2026",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — LICC 2026: inscrições abertas",
      url: "https://secult.es.gov.br/Noticia/licc-2026-inscricoes-para-projetos-culturais-estao-abertas",
    },
  },
  {
    id: "cota-continuados",
    titulo: "10% para programas continuados",
    descricao:
      "Dez por cento dos recursos são reservados a programas de caráter continuado.",
    cota: 0.1,
    fundamentoId: "in-licc-2026",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — LICC 2026: inscrições abertas",
      url: "https://secult.es.gov.br/Noticia/licc-2026-inscricoes-para-projetos-culturais-estao-abertas",
    },
  },
  {
    id: "limite-projetos-por-proponente",
    titulo: "Máximo de 3 projetos por proponente ao ano",
    descricao:
      "Cada proponente pode manter no máximo três projetos no exercício. O grafo sinaliza quem atinge o limite.",
    limite: 3,
    fundamentoId: "in-licc-2026",
    verificado: false,
    fonte: {
      rotulo:
        "Regra informada no briefing do projeto (LegisWeb); pendente de conferência na Instrução Normativa vigente",
    },
  },
];

/** Teto de captação do exercício, em reais. */
export const TETO_AUTORIZADO = 25_000_000;

export const FONTE_TETO: Fonte = {
  rotulo: "Portaria SEFAZ nº 01-R, de 07/01/2025",
  url: "https://secult.es.gov.br/governo-amplia-para-r-25-milhoes-os-recursos-destinados-a-lei-de-incentivo-a-cultura-capixaba-licc",
};

export function fundamentoPorId(id: string): FundamentoLegal | undefined {
  return FUNDAMENTOS.find((f) => f.id === id);
}

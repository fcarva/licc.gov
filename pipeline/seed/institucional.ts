/**
 * Núcleo institucional do grafo.
 *
 * Diferente do restante do conjunto de demonstração, estes nós descrevem
 * órgãos e normas que existem de fato. Cada um traz `fontes` apontando para a
 * página oficial correspondente e proveniência `oficial`.
 */

import type { GraphEdge, GraphNode, Noticia } from "@/types/graph";
import { FUNDAMENTOS, TETO_AUTORIZADO, FONTE_TETO } from "@/ontology";

/** Notícias verificadas nos portais do Governo do ES e da SECULT. */
const NOTICIAS_SECULT: Noticia[] = [
  {
    id: "not-licc-2026-inscricoes",
    titulo: "LICC 2026: inscrições para projetos culturais estão abertas",
    data: "2026-01-15",
    veiculo: "SECULT-ES",
    url: "https://secult.es.gov.br/Noticia/licc-2026-inscricoes-para-projetos-culturais-estao-abertas",
    resumo:
      "Inscrições até 30 de junho de 2026, exclusivamente pelo Mapa Cultural do Espírito Santo. A LICC reserva 30% para projetos pautados, 10% para projetos fora da Região Metropolitana e 10% para programas continuados.",
    proveniencia: "oficial",
  },
  {
    id: "not-licc-25-milhoes",
    titulo:
      "Governo amplia para R$ 25 milhões os recursos destinados à Lei de Incentivo à Cultura Capixaba",
    data: "2025-01-07",
    veiculo: "SECULT-ES",
    url: "https://secult.es.gov.br/governo-amplia-para-r-25-milhoes-os-recursos-destinados-a-lei-de-incentivo-a-cultura-capixaba-licc",
    resumo:
      "A Portaria nº 01-R da SEFAZ autoriza a captação de R$ 25 milhões em benefícios fiscais relativos ao ICMS estadual.",
    proveniencia: "oficial",
  },
  {
    id: "not-premio-licc",
    titulo:
      "Governo entrega Prêmio LICC e anuncia ampliação dos recursos para a Lei de Incentivo",
    data: "2024-12-10",
    veiculo: "Governo do Espírito Santo",
    url: "https://www.es.gov.br/Noticia/governo-entrega-premio-licc-e-anuncia-ampliacao-do-investimento-em-cultura-no-estado-por-meio-da-lei-de-incentivo",
    resumo:
      "Premiação de patrocinadores e proponentes, com anúncio da ampliação do investimento estadual em cultura via lei de incentivo.",
    proveniencia: "oficial",
  },
  {
    id: "not-aprimoramento-licc",
    titulo:
      "Secretaria da Cultura realiza aprimoramento da LICC em diálogo com a sociedade",
    data: "2024-08-20",
    veiculo: "Governo do Espírito Santo",
    url: "https://www.es.gov.br/Noticia/secretaria-da-cultura-realiza-aprimoramento-da-lei-de-incentivo-a-cultura-capixaba-licc-em-dialogo-com-sociedade",
    resumo:
      "Revisão das regras da LICC a partir de escuta pública com agentes culturais capixabas.",
    proveniencia: "oficial",
  },
  {
    id: "not-tramitacao-licc",
    titulo:
      "LICC: Secult aprimora e otimiza tramitação de projetos destinados à Lei de Incentivo",
    data: "2024-05-14",
    veiculo: "Governo do Espírito Santo",
    url: "https://www.es.gov.br/Noticia/licc-secult-aprimora-e-otimiza-tramitacao-de-projetos-destinados-a-lei-de-incentivo-a-cultura-capixaba",
    resumo:
      "Mudanças no fluxo de análise documental, análise de mérito e deliberação da Comissão de Análise de Projetos.",
    proveniencia: "oficial",
  },
];

/** Órgãos, programa, normas e a raiz cidadã. */
export function nosFixos(ano: number): GraphNode[] {
  const nos: GraphNode[] = [
    {
      id: "publico-es",
      slug: "populacao-capixaba",
      kind: "publico",
      nome: "População Capixaba",
      descricao:
        "Destinatária final da política cultural do Estado. Raiz da visão centrada no cidadão: todo caminho no grafo termina aqui.",
      proveniencia: "oficial",
      fundamentos: ["lei-11246-2021"],
    },
    {
      id: "governo-es",
      slug: "governo-do-espirito-santo",
      kind: "governanca",
      nome: "Governo do Estado do Espírito Santo",
      sigla: "Governo ES",
      descricao:
        "Poder Executivo estadual. Nomeia a titularidade da SECULT-ES e os membros do Conselho Estadual de Cultura.",
      url: "https://www.es.gov.br",
      proveniencia: "oficial",
      fundamentos: ["lei-11246-2021"],
      fontes: [{ rotulo: "Portal do Governo do ES", url: "https://www.es.gov.br" }],
    },
    {
      id: "secult-es",
      slug: "secult-es",
      kind: "governanca",
      nome: "Secretaria de Estado da Cultura",
      sigla: "SECULT-ES",
      descricao:
        "Órgão gestor da LICC. Publica a instrução normativa do exercício, recebe as inscrições pelo Mapa Cultural, conduz a análise documental e de mérito e fiscaliza a execução dos projetos.",
      nomesAlternativos: ["Secretaria da Cultura", "SECULT", "Secult ES"],
      url: "https://secult.es.gov.br",
      proveniencia: "oficial",
      fundamentos: ["lei-11246-2021", "in-licc-2026"],
      noticias: NOTICIAS_SECULT,
      fontes: [
        { rotulo: "SECULT-ES — Sobre a LICC", url: "https://secult.es.gov.br/sobre-a-licc" },
      ],
    },
    {
      id: "sefaz-es",
      slug: "sefaz-es",
      kind: "governanca",
      nome: "Secretaria de Estado da Fazenda",
      sigla: "SEFAZ-ES",
      descricao:
        "Autoriza o teto anual de renúncia de ICMS destinado à LICC e controla o crédito presumido apropriado pelas empresas patrocinadoras.",
      nomesAlternativos: ["Secretaria da Fazenda", "SEFAZ"],
      url: "https://sefaz.es.gov.br",
      proveniencia: "oficial",
      fundamentos: ["lei-7000-2001", "portaria-sefaz-01r-2025"],
      fontes: [FONTE_TETO],
    },
    {
      id: "cec-es",
      slug: "conselho-estadual-de-cultura",
      kind: "governanca",
      nome: "Conselho Estadual de Cultura",
      sigla: "CEC",
      descricao:
        "Colegiado de participação social na política cultural capixaba.",
      nomesAlternativos: ["CEC-ES", "Conselho de Cultura"],
      proveniencia: "oficial",
      fundamentos: ["lei-11246-2021"],
    },
    {
      id: "cap-licc",
      slug: "comissao-de-analise-de-projetos",
      kind: "governanca",
      nome: "Comissão de Análise de Projetos",
      sigla: "CAP",
      descricao:
        "Delibera sobre os projetos após a análise documental e o parecer de mérito: aprova integralmente, converte em diligência ou declara a inabilitação.",
      nomesAlternativos: ["CAP LICC", "Comissão de Avaliação"],
      proveniencia: "oficial",
      fundamentos: ["in-licc-2026"],
      fontes: [
        {
          rotulo: "Mapa Cultural ES — LICC 2026 (oportunidade 2317)",
          url: "https://mapa.cultura.es.gov.br/oportunidade/2317/",
        },
      ],
    },
    {
      id: "licc-programa",
      slug: "licc",
      kind: "governanca",
      nome: `Lei de Incentivo à Cultura Capixaba — exercício ${ano}`,
      sigla: "LICC",
      descricao:
        "Mecanismo de renúncia fiscal que permite a empresas contribuintes do ICMS patrocinar projetos culturais e abater o valor do imposto devido via crédito presumido.",
      nomesAlternativos: ["LICC", "Lei de Incentivo à Cultura"],
      url: "https://secult.es.gov.br/sobre-a-licc",
      orcamento: { autorizado: TETO_AUTORIZADO, captado: 0 },
      proveniencia: "oficial",
      fundamentos: FUNDAMENTOS.map((f) => f.id),
      noticias: NOTICIAS_SECULT,
      fontes: [
        { rotulo: "SECULT-ES — Sobre a LICC", url: "https://secult.es.gov.br/sobre-a-licc" },
        FONTE_TETO,
      ],
    },
  ];

  for (const f of FUNDAMENTOS) {
    nos.push({
      id: f.id,
      slug: f.slug,
      kind: "fundamento",
      nome: f.norma,
      sigla: f.norma,
      descricao: `${f.nome} — ${f.descricao}`,
      nomesAlternativos: [f.nome],
      url: f.url ?? f.fonte.url,
      proveniencia: "oficial",
      fontes: [f.fonte],
      meta: {
        norma: f.norma,
        publicadoEm: f.publicadoEm,
        verificado: f.verificado,
      },
    });
  }

  return nos;
}

/** Arestas institucionais fixas que independem da coleta do Mapa Cultural. */
export function arestasFixas(ano: number): GraphEdge[] {
  const prov = (source: string, target: string, kind: GraphEdge["kind"], rotulo: string): GraphEdge => ({
    id: `${kind}:${source}->${target}`,
    source,
    target,
    kind,
    rotulo,
    proveniencia: "oficial",
  });

  return [
    prov("governo-es", "secult-es", "nomeia", "Governo nomeia o titular da SECULT-ES"),
    prov("governo-es", "cec-es", "nomeia", "Governo nomeia os membros do CEC"),
    prov("secult-es", "cap-licc", "nomeia", "SECULT designa os membros da Comissão de Análise"),
    prov("secult-es", "licc-programa", "regula", "SECULT é o órgão gestor da LICC"),
    prov("sefaz-es", "licc-programa", "regula", "SEFAZ autoriza o teto via portaria"),
    prov("licc-programa", "publico-es", "beneficia", "A LICC beneficia a população capixaba"),
  ];
}

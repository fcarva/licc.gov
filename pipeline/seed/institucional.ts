/**
 * Núcleo institucional do grafo.
 *
 * Diferente do restante do conjunto de demonstração, estes nós descrevem
 * órgãos e normas que existem de fato. Cada um traz `fontes` apontando para a
 * página oficial correspondente e proveniência `oficial`.
 */

import type { GraphEdge, GraphNode, Noticia } from "@/types/graph";
import {
  FUNDAMENTOS,
  MUNICIPIOS,
  SEGMENTOS,
  TETO_AUTORIZADO,
  FONTE_TETO,
  normaDoExercicio,
} from "@/ontology";

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
      fundamentos: ["lei-11246-2021", normaDoExercicio(ano)],
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
      fundamentos: [normaDoExercicio(ano)],
      fontes: [
        {
          rotulo:
            ano >= 2026
              ? "Mapa Cultural ES — LICC 2026 (oportunidade 2317)"
              : "Mapa Cultural ES — LICC 2025 (oportunidade 1878)",
          url:
            ano >= 2026
              ? "https://mapa.cultura.es.gov.br/oportunidade/2317/"
              : "https://mapa.cultura.es.gov.br/oportunidade/1878/",
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

  /* ------------------- chamada pública do exercício ------------------- */

  const oportunidade = ano >= 2026 ? 2317 : 1878;
  nos.push({
    id: `edital-licc-${ano}`,
    slug: `edital-licc-${ano}`,
    kind: "edital",
    nome: `Edital LICC ${ano}`,
    sigla: `LICC ${ano}`,
    descricao:
      `Chamada pública da Lei de Incentivo à Cultura Capixaba para o exercício de ${ano}, ` +
      "publicada pela SECULT-ES. As inscrições ocorrem exclusivamente pelo Mapa Cultural " +
      "do Espírito Santo: a Secretaria publica o edital e os proponentes inscrevem nele os " +
      "seus projetos.",
    nomesAlternativos: [`LICC ${ano}`, `oportunidade ${oportunidade}`],
    url: `https://mapa.cultura.es.gov.br/oportunidade/${oportunidade}/`,
    proveniencia: "oficial",
    fundamentos: [normaDoExercicio(ano)],
    meta: {
      ano,
      oportunidadeId: oportunidade,
      encerrado: ano < 2026,
      inscricoesAte: ano >= 2026 ? "2026-06-30" : undefined,
    },
    fontes: [
      {
        rotulo: `Mapa Cultural ES — oportunidade ${oportunidade}`,
        url: `https://mapa.cultura.es.gov.br/oportunidade/${oportunidade}/`,
      },
    ],
  });

  /* --------------------------- titular do órgão ------------------------ */

  // A pessoa é modelada à parte do órgão, como no CivLab (Mayor · José
  // Cisneros). O nome do titular em exercício não foi conferido em fonte
  // primária, então o cargo entra sem atribuir nome a ninguém.
  nos.push({
    id: "titular-secult",
    slug: "secretario-de-estado-da-cultura",
    kind: "pessoa",
    nome: "Secretário de Estado da Cultura",
    descricao:
      "Titular da SECULT-ES. Responde pela publicação da instrução normativa do " +
      "exercício e pela condução da política estadual de cultura.",
    proveniencia: "oficial",
    fundamentos: ["lei-11246-2021"],
    meta: { cargo: "Secretário de Estado da Cultura", orgaoId: "secult-es" },
    fontes: [{ rotulo: "SECULT-ES", url: "https://secult.es.gov.br" }],
  });

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

  // Camada territorial e de linguagens.
  //
  // Mora aqui, e não no conjunto de demonstração, porque não é demonstração
  // nenhuma: são os 78 municípios do Espírito Santo e a taxonomia de área da
  // plataforma Mapas Culturais. Enquanto o seed os emitia, trocar o seed pelo
  // anexo real da SECULT levava os dois embora junto — `/monitor` passou a
  // listar zero municípios e `/municipios` esvaziou, como se o Estado tivesse
  // deixado de ter território. A lacuna que importa mostrar é "nenhum projeto
  // chegou aqui", e para mostrá-la o município precisa existir.
  for (const seg of SEGMENTOS) {
    nos.push({
      id: seg.id,
      slug: seg.slug,
      kind: "segmento",
      nome: seg.nome,
      descricao: seg.descricao,
      nomesAlternativos: seg.termosMapaCultural,
      proveniencia: "derivado",
      meta: { cor: seg.cor, slugSegmento: seg.slug },
      fundamentos: [normaDoExercicio(ano)],
      fontes: [
        {
          rotulo: "Taxonomia de área — plataforma Mapas Culturais",
          url: "https://docs.mapasculturais.org/mc_config_api/",
        },
      ],
    });
  }

  for (const mun of MUNICIPIOS) {
    nos.push({
      id: mun.id,
      slug: mun.slug,
      kind: "municipio",
      nome: mun.nome,
      descricao: `Município capixaba — microrregião ${mun.regiao}${
        mun.rmgv ? ", integrante da Região Metropolitana da Grande Vitória" : ""
      }.`,
      proveniencia: "derivado",
      meta: { regiao: mun.regiao, regiaoMetropolitana: mun.rmgv },
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

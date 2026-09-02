/**
 * Gerador do conjunto de demonstração.
 *
 * O `licc.gov` precisa renderizar mesmo sem acesso de rede ao Mapa Cultural do
 * Espírito Santo. Este módulo produz um grafo completo e coerente com as regras
 * da LICC — cotas, teto, limite de projetos por proponente — para que a
 * interface possa ser desenvolvida e revisada offline.
 *
 * REGRA DE OURO: tudo que sai daqui é carimbado `proveniencia: "demonstracao"`.
 * Nomes de empresas e de proponentes usam letras gregas justamente para que
 * ninguém os confunda com registros reais da SECULT. Só o teto de R$ 25 milhões
 * e as cotas de 30/10/10 são números oficiais, e entram carimbados como tal.
 */

import type {
  GraphEdge,
  GraphNode,
  NaturezaProponente,
  Noticia,
  ProjetoStatus,
} from "@/types/graph";
import {
  MUNICIPIOS,
  SEGMENTOS,
  TETO_AUTORIZADO,
  EXERCICIO_PADRAO,
  normaDoExercicio,
  type Municipio,
  type Segmento,
} from "@/ontology";
import { slugificar } from "@/lib/text";
import { nosFixos } from "./institucional";
import { gerarTerritorio } from "./territorio";

/** PRNG determinístico: o mesmo `seed` sempre gera o mesmo grafo. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LETRAS_GREGAS = [
  "Alfa", "Beta", "Gama", "Delta", "Épsilon", "Zeta", "Eta", "Teta",
  "Iota", "Capa", "Lambda", "Miu", "Niu", "Csi", "Ómicron", "Pi",
  "Rô", "Sigma", "Tau", "Ípsilon", "Fi", "Qui", "Psi", "Ômega",
];

const SETORES = [
  "Siderurgia", "Celulose", "Mineração", "Logística Portuária",
  "Rochas Ornamentais", "Energia", "Varejo", "Alimentos",
  "Petróleo e Gás", "Serviços Financeiros", "Saúde", "Construção Civil",
];

const FORMATOS: Record<string, string[]> = {
  "seg-musica": ["Festival de Música", "Circuito Musical", "Mostra Sonora", "Encontro de Bandas"],
  "seg-audiovisual": ["Mostra de Cinema", "Festival Audiovisual", "Cineclube Itinerante", "Documentário"],
  "seg-artes-cenicas": ["Mostra de Teatro", "Festival de Dança", "Circuito Circense", "Temporada Cênica"],
  "seg-patrimonio": ["Salvaguarda do Patrimônio", "Restauro do Casarão", "Inventário de Bens Culturais", "Registro de Saberes"],
  "seg-literatura": ["Feira Literária", "Programa de Mediação de Leitura", "Coleção Editorial", "Salão do Livro"],
  "seg-artes-visuais": ["Exposição de Artes Visuais", "Bienal de Arte", "Residência Artística", "Mostra de Design"],
  "seg-culturas-populares": ["Encontro de Congo", "Festa das Tradições", "Mostra de Artesanato", "Circuito de Mestres"],
  "seg-museus-memoria": ["Programa Museológico", "Digitalização de Acervo", "Centro de Memória", "Exposição de Longa Duração"],
  "seg-cultura-digital": ["Laboratório de Cultura Digital", "Festival de Jogos", "Formação em Gestão Cultural", "Hub Criativo"],
};

/**
 * Perfis de proponente na LICC, com o peso aproximado de cada um.
 * Prefeituras do interior entram porque são justamente o proponente que a
 * cota territorial de 10% pretende alcançar.
 */
const NATUREZAS: Array<[NaturezaProponente, number, string]> = [
  ["pessoa_juridica", 0.38, "Produtora"],
  ["coletivo", 0.22, "Coletivo"],
  ["pessoa_fisica", 0.2, "Agente"],
  ["organizacao_sem_fins_lucrativos", 0.12, "Instituto"],
  ["prefeitura", 0.08, "Prefeitura"],
];

const PREFIXO_POR_NATUREZA = Object.fromEntries(
  NATUREZAS.map(([n, , prefixo]) => [n, prefixo]),
) as Record<NaturezaProponente, string>;

function sortearNatureza(rnd: () => number): NaturezaProponente {
  const sorteio = rnd();
  let acumulado = 0;
  for (const [natureza, peso] of NATUREZAS) {
    acumulado += peso;
    if (sorteio <= acumulado) return natureza;
  }
  return "pessoa_juridica";
}

const STATUS_POSSIVEIS: Array<[ProjetoStatus, number]> = [
  ["habilitado", 0.18],
  ["aprovado", 0.14],
  ["captando", 0.22],
  ["captado", 0.12],
  ["em_execucao", 0.16],
  ["prestacao_de_contas", 0.08],
  ["concluido", 0.07],
  ["inabilitado", 0.03],
];

/** Projetos já em execução ou adiante têm captação integral. */
const STATUS_CAPTACAO_PLENA: ReadonlySet<ProjetoStatus> = new Set([
  "captado",
  "em_execucao",
  "prestacao_de_contas",
  "concluido",
]);

export interface ResultadoSeed {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface OpcoesSeed {
  ano?: number;
  /**
   * Quantidade de projetos gerados.
   *
   * O padrão 82 vem da lista de habilitados da LICC 1 de **2026**, usada aqui
   * apenas para calibrar a ordem de grandeza — não é a contagem de 2025, que
   * não foi conferida. Como todo projeto sai carimbado `demonstracao`, o
   * número não afirma nada sobre o exercício real.
   */
  totalProjetos?: number;
  totalProponentes?: number;
  totalPatrocinadores?: number;
  seed?: number;
}

export function gerarSeed(opcoes: OpcoesSeed = {}): ResultadoSeed {
  const ano = opcoes.ano ?? EXERCICIO_PADRAO;
  const totalProjetos = opcoes.totalProjetos ?? 82;
  const totalProponentes = opcoes.totalProponentes ?? 54;
  const totalPatrocinadores = opcoes.totalPatrocinadores ?? 22;
  const rnd = mulberry32(opcoes.seed ?? 20260630);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const aresta = (
    source: string,
    target: string,
    kind: GraphEdge["kind"],
    extras: Partial<GraphEdge> = {},
  ) => {
    edges.push({
      id: `${kind}:${source}->${target}`,
      source,
      target,
      kind,
      proveniencia: extras.proveniencia ?? "demonstracao",
      ...extras,
    });
  };

  /* ---------------- núcleo institucional (dados oficiais) --------------- */

  nodes.push(...nosFixos(ano));
  for (const g of ["secult-es", "sefaz-es", "cec-es", "cap-licc"]) {
    aresta("lei-11246-2021", g, "fundamenta", { proveniencia: "oficial" });
  }
  aresta("governo-es", "cec-es", "nomeia", { proveniencia: "oficial" });
  aresta("governo-es", "secult-es", "nomeia", { proveniencia: "oficial" });
  aresta("secult-es", "cap-licc", "nomeia", { proveniencia: "oficial" });
  aresta("secult-es", "licc-programa", "regula", { proveniencia: "oficial" });
  aresta("sefaz-es", "licc-programa", "regula", { proveniencia: "oficial" });
  aresta("lei-11246-2021", "licc-programa", "fundamenta", { proveniencia: "oficial" });
  aresta("lei-7000-2001", "licc-programa", "fundamenta", { proveniencia: "oficial" });
  aresta("portaria-sefaz-01r-2025", "licc-programa", "fundamenta", { proveniencia: "oficial" });
  aresta(normaDoExercicio(ano), "licc-programa", "fundamenta", { proveniencia: "oficial" });
  aresta("licc-programa", "publico-es", "beneficia", { proveniencia: "oficial" });
  aresta("titular-secult", "secult-es", "ocupa", { proveniencia: "oficial" });
  aresta("secult-es", `edital-licc-${ano}`, "publica", { proveniencia: "oficial" });
  aresta(`edital-licc-${ano}`, "licc-programa", "regula", { proveniencia: "oficial" });

  /* ------------------------- segmentos e municípios --------------------- */

  for (const seg of SEGMENTOS) {
    nodes.push({
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
    aresta(seg.id, "publico-es", "beneficia", { proveniencia: "derivado" });
  }

  for (const mun of MUNICIPIOS) {
    nodes.push(noMunicipio(mun));
  }

  /* ----------------------------- proponentes ---------------------------- */

  const proponentes: GraphNode[] = [];
  for (let i = 0; i < totalProponentes; i++) {
    const letra = LETRAS_GREGAS[i % LETRAS_GREGAS.length];
    const ciclo = Math.floor(i / LETRAS_GREGAS.length) + 1;
    const sufixo = ciclo > 1 ? ` ${ciclo}` : "";
    const natureza = sortearNatureza(rnd);
    const rotulo = `${PREFIXO_POR_NATUREZA[natureza]} ${letra}${sufixo}`;
    // Prefeituras só existem fora da Região Metropolitana: é o perfil de
    // proponente que a cota territorial de 10% pretende alcançar.
    const universo =
      natureza === "prefeitura" ? MUNICIPIOS.filter((m) => !m.rmgv) : MUNICIPIOS;
    const mun = universo[Math.floor(rnd() * universo.length)];
    const nome =
      natureza === "prefeitura" ? `Prefeitura de ${mun.nome}` : rotulo;

    const no: GraphNode = {
      id: `prop-${slugificar(nome)}`,
      slug: slugificar(nome),
      kind: "proponente",
      nome,
      descricao: `Agente cultural sediado em ${mun.nome} (${mun.regiao}).`,
      proveniencia: "demonstracao",
      fundamentos: ["lei-11246-2021"],
      meta: { natureza, municipioId: mun.id, projetosNoAno: 0 },
    };
    proponentes.push(no);
    nodes.push(no);
    aresta("lei-11246-2021", no.id, "fundamenta");
  }

  /* ---------------------------- patrocinadores -------------------------- */

  const patrocinadores: GraphNode[] = [];
  for (let i = 0; i < totalPatrocinadores; i++) {
    const letra = LETRAS_GREGAS[(i * 5 + 3) % LETRAS_GREGAS.length];
    const setor = SETORES[i % SETORES.length];
    const nome = `Empresa ${letra} ${setor}`;
    const no: GraphNode = {
      id: `patr-${slugificar(nome)}`,
      slug: slugificar(nome),
      kind: "patrocinador",
      nome,
      descricao: `Contribuinte do ICMS no Espírito Santo — setor de ${setor.toLowerCase()}.`,
      proveniencia: "demonstracao",
      fundamentos: ["lei-11246-2021", "lei-7000-2001"],
      orcamento: { autorizado: 0, captado: 0 },
      meta: { setor },
    };
    patrocinadores.push(no);
    nodes.push(no);
    aresta("lei-7000-2001", no.id, "fundamenta");
    aresta("sefaz-es", no.id, "fiscaliza");
  }

  /* ------------------------------- projetos ----------------------------- */

  // O somatório dos tetos aproxima o teto do exercício sem estourá-lo.
  const alvoAutorizado = TETO_AUTORIZADO * 0.96;
  const pesos = Array.from({ length: totalProjetos }, () => 0.35 + rnd() * 1.3);
  const somaPesos = pesos.reduce((a, b) => a + b, 0);

  let indicePatrocinador = 0;

  for (let i = 0; i < totalProjetos; i++) {
    const seg = SEGMENTOS[Math.floor(rnd() * SEGMENTOS.length)];
    // 42% dos projetos fora da RMGV: acima da cota de 10%, como convém a uma demo.
    const foraRmgv = rnd() < 0.42;
    const universo = MUNICIPIOS.filter((m) => m.rmgv !== foraRmgv);
    const mun = universo[Math.floor(rnd() * universo.length)];
    const proponente = escolherProponente(proponentes, rnd);

    const status = sortearStatus(rnd);
    const autorizado = arredondarMil((pesos[i] / somaPesos) * alvoAutorizado);
    const fracaoCaptada = STATUS_CAPTACAO_PLENA.has(status)
      ? 1
      : status === "captando"
        ? 0.2 + rnd() * 0.6
        : status === "inabilitado"
          ? 0
          : rnd() * 0.25;
    const captado = arredondarMil(autorizado * fracaoCaptada);

    const formato = FORMATOS[seg.id][Math.floor(rnd() * FORMATOS[seg.id].length)];
    const nome = `${formato} de ${mun.nome}`;
    const numeroProcesso = `LICC/${ano}/${String(i + 1).padStart(4, "0")}`;
    const id = `proj-${ano}-${String(i + 1).padStart(4, "0")}`;

    const projeto: GraphNode = {
      id,
      slug: `${slugificar(nome)}-${String(i + 1).padStart(4, "0")}`,
      kind: "projeto",
      nome,
      descricao: `${seg.nome} — execução prioritária em ${mun.nome} (${mun.regiao}).`,
      nomesAlternativos: [numeroProcesso],
      orcamento: {
        autorizado,
        captado,
        // Exercício anterior: teto menor (o teto estadual subiu) e captação
        // que oscila em torno da atual. É o que dá lastro à variação anual.
        anterior: {
          autorizado: arredondarMil(autorizado * (0.82 + rnd() * 0.16)),
          captado: arredondarMil(captado * (0.72 + rnd() * 0.5)),
        },
      },
      proveniencia: "demonstracao",
      fundamentos: ["lei-11246-2021", normaDoExercicio(ano)],
      meta: {
        numeroProcesso,
        status,
        ano,
        segmentoId: seg.id,
        municipioId: mun.id,
        proponenteId: proponente.id,
        pautado: rnd() < 0.3,
        continuado: rnd() < 0.12,
      },
      noticias: gerarNoticiasProjeto(id, nome, status, ano, rnd),
    };
    nodes.push(projeto);

    aresta(proponente.id, id, "propoe");
    aresta(id, seg.id, "pertence_a");
    aresta(id, mun.id, "ocorre_em");
    aresta(id, `edital-licc-${ano}`, "inscrito_em");
    aresta("cap-licc", id, "aprova");
    aresta("secult-es", id, "fiscaliza");
    aresta(normaDoExercicio(ano), id, "fundamenta");

    // Divide o valor captado entre um a três patrocinadores.
    if (captado > 0) {
      const quantos = captado > 400_000 ? (rnd() < 0.5 ? 3 : 2) : rnd() < 0.35 ? 2 : 1;
      const fatias = repartir(captado, quantos, rnd);
      for (const fatia of fatias) {
        const patr = patrocinadores[indicePatrocinador % patrocinadores.length];
        indicePatrocinador += 1 + Math.floor(rnd() * 3);
        aresta(patr.id, id, "patrocina", { peso: fatia, rotulo: formatarPeso(fatia) });
        patr.orcamento!.captado = (patr.orcamento!.captado ?? 0) + fatia;
      }
    }
  }

  // Camada territorial: espaços e agenda, alimentando o monitor por município.
  const territorio = gerarTerritorio(
    nodes.filter((n) => n.kind === "projeto"),
    rnd,
    ano,
  );
  nodes.push(...territorio.nodes);
  edges.push(...territorio.edges);

  return { nodes, edges };
}

/* ------------------------------ auxiliares ------------------------------ */

function escolherProponente(
  proponentes: GraphNode[],
  rnd: () => number,
): GraphNode {
  // Respeita o limite de 3 projetos por proponente no exercício.
  const disponiveis = proponentes.filter(
    (p) => ((p.meta?.projetosNoAno as number) ?? 0) < 3,
  );
  const alvo = disponiveis.length
    ? disponiveis[Math.floor(rnd() * disponiveis.length)]
    : proponentes[Math.floor(rnd() * proponentes.length)];
  alvo.meta!.projetosNoAno = ((alvo.meta?.projetosNoAno as number) ?? 0) + 1;
  return alvo;
}

function sortearStatus(rnd: () => number): ProjetoStatus {
  const sorteio = rnd();
  let acumulado = 0;
  for (const [status, peso] of STATUS_POSSIVEIS) {
    acumulado += peso;
    if (sorteio <= acumulado) return status;
  }
  return "habilitado";
}

/** Reparte um total em `n` fatias desiguais que somam exatamente o total. */
function repartir(total: number, n: number, rnd: () => number): number[] {
  const brutos = Array.from({ length: n }, () => 0.5 + rnd());
  const soma = brutos.reduce((a, b) => a + b, 0);
  const fatias = brutos.map((b) => arredondarMil((b / soma) * total));
  const diferenca = total - fatias.reduce((a, b) => a + b, 0);
  fatias[0] += diferenca;
  return fatias;
}

const arredondarMil = (v: number) => Math.round(v / 1000) * 1000;

const formatarPeso = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

function noMunicipio(mun: Municipio): GraphNode {
  return {
    id: mun.id,
    slug: mun.slug,
    kind: "municipio",
    nome: mun.nome,
    descricao: `Município capixaba — microrregião ${mun.regiao}${
      mun.rmgv ? ", integrante da Região Metropolitana da Grande Vitória" : ""
    }.`,
    proveniencia: "derivado",
    meta: { regiao: mun.regiao, regiaoMetropolitana: mun.rmgv },
  };
}

function gerarNoticiasProjeto(
  id: string,
  nome: string,
  status: ProjetoStatus,
  ano: number,
  rnd: () => number,
): Noticia[] {
  const marcos: Partial<Record<ProjetoStatus, string>> = {
    habilitado: "Projeto habilitado na LICC",
    aprovado: "Aprovação de captação publicada no DIO-ES",
    captando: "Autorização de captação em vigor",
    captado: "Captação integral concluída",
    em_execucao: "Início da execução do projeto",
    prestacao_de_contas: "Prestação de contas protocolada",
    concluido: "Prestação de contas aprovada",
    inabilitado: "Projeto inabilitado na análise documental",
  };
  const titulo = marcos[status];
  if (!titulo) return [];
  const mes = String(1 + Math.floor(rnd() * 12)).padStart(2, "0");
  const dia = String(1 + Math.floor(rnd() * 28)).padStart(2, "0");
  return [
    {
      id: `${id}-not-1`,
      titulo: `${titulo}: ${nome}`,
      data: `${ano}-${mes}-${dia}`,
      veiculo: "Diário Oficial do Espírito Santo (exemplo)",
      resumo:
        "Registro de demonstração. Substituído por publicações reais do DIO-ES quando o pipeline roda com acesso de rede.",
      proveniencia: "demonstracao",
    },
  ];
}

/**
 * Coleta os dados abertos do Mapa Cultural do Espírito Santo e escreve
 * `data/raw/licc-{ano}.json`, que o `build-graph.ts` consome no lugar do
 * conjunto de demonstração.
 *
 *   npm run ingest              # exercício corrente
 *   LICC_ANO=2025 npm run ingest
 *   LICC_BASE=https://... npm run ingest
 *
 * ## O que a API dá, e o que ela não dá
 *
 * A plataforma Mapas Culturais não expõe publicamente as inscrições
 * (`registration`) de uma oportunidade — esse endpoint exige JWT. É ali que
 * vivem os projetos da LICC. O que é público são agentes, espaços, eventos,
 * oportunidades e `project`.
 *
 * **`project` do Mapa Cultural NÃO é projeto da LICC.** É qualquer projeto
 * cultural que um agente cadastrou na plataforma. Houve aqui uma versão que
 * transformava cada um deles em `kind: "projeto"` com `proveniencia:
 * "oficial"` e fundamento na Lei 11.246/2021 — ou seja, afirmava que todo
 * projeto cultural do Espírito Santo é incentivado pela LICC. Era pior que o
 * conjunto de demonstração, que ao menos se identifica como fictício.
 *
 * Agora esses registros formam apenas um **índice de enriquecimento**: quando
 * o nome casa com uma linha da lista de habilitados, o projeto da LICC ganha
 * URL, descrição e o id da plataforma. Nunca a existência, nunca a base legal.
 *
 * Quem cria projeto aqui é `data/raw/habilitados-{ano}.csv`, lido por
 * `./habilitados`. Sem essa planilha a coleta produz o grafo institucional e a
 * camada territorial, **zero projetos**, e diz isso em voz alta. Um grafo que
 * admite não saber vale mais que um que preenche a lacuna com dado alheio.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GraphEdge, GraphNode } from "@/types/graph";
import {
  segmentoPorTermo,
  municipioPorNome,
  SEGMENTOS,
  MUNICIPIOS,
  EXERCICIO_PADRAO,
  normaDoExercicio,
} from "@/ontology";
import { slugificar, normalizar, nomesCorrespondem } from "@/lib/text";
import {
  MapasCulturais,
  CONSULTA_AGENTES,
  CONSULTA_PROJETOS,
  CONSULTA_OPORTUNIDADES,
  CONSULTA_ESPACOS,
  CONSULTA_EVENTOS,
  OPORTUNIDADES_LICC,
  type AgenteBruto,
  type ProjetoBruto,
  type OportunidadeBruta,
  type EspacoBruto,
  type EventoBruto,
} from "./sources/mapas-culturais";
import { nosFixos, arestasFixas } from "./seed/institucional";
import { lerHabilitados, montarHabilitados, type RelatorioHabilitados } from "./habilitados";

const DIR_BRUTO = join(process.cwd(), "data", "raw");

interface Coleta {
  agentes: AgenteBruto[];
  projetos: ProjetoBruto[];
  oportunidades: OportunidadeBruta[];
  espacos: EspacoBruto[];
  eventos: EventoBruto[];
}

async function coletar(cliente: MapasCulturais, maximo?: number): Promise<Coleta> {
  console.log("→ conectando ao Mapa Cultural do Espírito Santo…");
  const versao = await cliente.versao();
  console.log(`  plataforma Mapas Culturais ${versao}`);

  console.log("→ oportunidades (editais)");
  const oportunidades = await cliente.buscar<OportunidadeBruta>("opportunity", {
    ...CONSULTA_OPORTUNIDADES,
    maximo: maximo ?? 500,
  });

  console.log("→ agentes culturais");
  const agentes = await cliente.buscar<AgenteBruto>("agent", {
    ...CONSULTA_AGENTES,
    maximo,
  });

  console.log("→ projetos");
  const projetos = await cliente.buscar<ProjetoBruto>("project", {
    ...CONSULTA_PROJETOS,
    maximo,
  });

  console.log("→ espaços culturais");
  const espacos = await cliente.buscar<EspacoBruto>("space", {
    ...CONSULTA_ESPACOS,
    maximo,
  });

  console.log("→ agenda cultural");
  const eventos = await cliente.buscar<EventoBruto>("event", {
    ...CONSULTA_EVENTOS,
    maximo,
  });

  return { agentes, projetos, oportunidades, espacos, eventos };
}

/** Traduz a coleta bruta para os vértices e arestas do LICC Gov Graph. */
function transformar(
  coleta: Coleta,
  ano: number,
  habilitados: { nodes: GraphNode[]; edges: GraphEdge[] },
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [...nosFixos(ano)];
  const edges: GraphEdge[] = [...arestasFixas(ano)];
  const vistos = new Set(nodes.map((n) => n.id));

  const adicionar = (n: GraphNode) => {
    if (vistos.has(n.id)) return;
    vistos.add(n.id);
    nodes.push(n);
  };
  const ligar = (
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
      proveniencia: "oficial",
      ...extras,
    });
  };

  for (const seg of SEGMENTOS) {
    adicionar({
      id: seg.id,
      slug: seg.slug,
      kind: "segmento",
      nome: seg.nome,
      descricao: seg.descricao,
      nomesAlternativos: seg.termosMapaCultural,
      proveniencia: "derivado",
      meta: { cor: seg.cor, slugSegmento: seg.slug },
    });
  }
  for (const mun of MUNICIPIOS) {
    adicionar({
      id: mun.id,
      slug: mun.slug,
      kind: "municipio",
      nome: mun.nome,
      descricao: `Município capixaba — microrregião ${mun.regiao}.`,
      proveniencia: "derivado",
      meta: { regiao: mun.regiao, regiaoMetropolitana: mun.rmgv },
    });
  }

  // Oportunidades da LICC viram nós de governança ligados ao programa.
  const idsLicc = new Set<number>(Object.values(OPORTUNIDADES_LICC));
  for (const op of coleta.oportunidades) {
    const ehLicc = idsLicc.has(op.id) || /licc|incentivo à cultura/i.test(op.name);
    if (!ehLicc) continue;
    const id = `edital-${op.id}`;
    adicionar({
      id,
      slug: slugificar(`${op.name}-${op.id}`),
      kind: "governanca",
      nome: op.name,
      descricao: op.shortDescription ?? undefined,
      url: op.singleUrl ?? `https://mapa.cultura.es.gov.br/oportunidade/${op.id}/`,
      proveniencia: "oficial",
      fundamentos: ["lei-11246-2021"],
      meta: {
        oportunidadeId: op.id,
        inscricoesDe: dataDe(op.registrationFrom),
        inscricoesAte: dataDe(op.registrationTo),
      },
    });
    ligar("secult-es", id, "regula");
    ligar(id, "licc-programa", "regula");
  }

  const agentesPorId = new Map(coleta.agentes.map((a) => [a.id, a]));

  /* ---------------- projetos da LICC: só os habilitados ---------------- */

  // A lista oficial cria os projetos. A plataforma só enriquece o que já
  // existe nela — ver o cabeçalho deste arquivo.
  for (const n of habilitados.nodes) adicionar(n);
  for (const e of habilitados.edges) edges.push(e);

  enriquecerPelaPlataforma(nodes, coleta, agentesPorId);

  /* ---------------- camada territorial (Republic) ---------------- */

  for (const e of coleta.espacos) {
    const mun = e.En_Municipio ? municipioPorNome(e.En_Municipio) : undefined;
    const id = `espaco-${e.id}`;
    adicionar({
      id,
      slug: slugificar(`${e.name}-${e.id}`),
      kind: "espaco",
      nome: e.name,
      descricao: e.endereco ?? undefined,
      url: e.singleUrl ?? undefined,
      proveniencia: "oficial",
      meta: {
        mapaCulturalId: e.id,
        municipioId: mun?.id,
        endereco: e.endereco ?? undefined,
      },
    });
    if (mun) ligar(id, mun.id, "sediado_em", { proveniencia: "derivado" });
  }

  for (const ev of coleta.eventos) {
    const id = `evento-${ev.id}`;
    const ocorrencia = ev.occurrences?.[0];
    const regra = ocorrencia?.rule;
    adicionar({
      id,
      slug: slugificar(`${ev.name}-${ev.id}`),
      kind: "evento",
      nome: ev.name,
      descricao: ev.shortDescription ?? undefined,
      url: ev.singleUrl ?? undefined,
      proveniencia: "oficial",
      meta: {
        mapaCulturalId: ev.id,
        espacoId: ocorrencia?.space ? `espaco-${ocorrencia.space.id}` : undefined,
        quando: typeof regra === "object" ? regra?.description : (regra ?? undefined),
      },
    });
    if (ocorrencia?.space) {
      ligar(id, `espaco-${ocorrencia.space.id}`, "acontece_em", { proveniencia: "oficial" });
    }
  }

  return { nodes, edges };
}

/**
 * Enriquece os projetos e proponentes da lista oficial com o que a plataforma
 * publica: URL, descrição, id e — só quando o anexo não trouxe — segmento,
 * município e natureza jurídica.
 *
 * Enriquecer nunca cria vértice nem altera valor financeiro. Se o casamento
 * por nome errar, o pior que acontece é um link errado; se ele criasse
 * projeto, o erro viraria uma afirmação falsa sobre a política pública.
 */
function enriquecerPelaPlataforma(
  nodes: GraphNode[],
  coleta: Coleta,
  agentesPorId: Map<number, AgenteBruto>,
): { projetos: number; proponentes: number } {
  // Caminho rápido por nome exato; a varredura difusa só entra quando falha.
  const projetosPorNome = new Map(coleta.projetos.map((p) => [normalizar(p.name), p]));
  const agentesPorNome = new Map(coleta.agentes.map((a) => [normalizar(a.name), a]));

  let projetos = 0;
  let proponentes = 0;

  for (const no of nodes) {
    if (no.kind === "projeto") {
      const achado =
        projetosPorNome.get(normalizar(no.nome)) ??
        coleta.projetos.find((p) => nomesCorrespondem(p.name, no.nome));
      if (!achado) continue;
      projetos++;
      no.url ??= achado.singleUrl ?? undefined;
      no.descricao ??= achado.shortDescription ?? undefined;

      const dono = achado.owner ? agentesPorId.get(achado.owner.id) : undefined;
      const areas = [
        ...(Array.isArray(achado.terms?.area) ? (achado.terms!.area as string[]) : []),
        ...(Array.isArray(dono?.terms?.area) ? (dono!.terms!.area as string[]) : []),
      ];
      const seg = resolverSegmento(areas);
      const mun = dono?.En_Municipio ? municipioPorNome(dono.En_Municipio) : undefined;
      no.meta = {
        ...no.meta,
        mapaCulturalId: achado.id,
        segmentoId: no.meta?.segmentoId ?? seg?.id,
        municipioId: no.meta?.municipioId ?? mun?.id,
      };
      continue;
    }

    if (no.kind === "proponente") {
      const achado =
        agentesPorNome.get(normalizar(no.nome)) ??
        coleta.agentes.find((a) => nomesCorrespondem(a.name, no.nome));
      if (!achado) continue;
      proponentes++;
      no.url ??= achado.singleUrl ?? undefined;
      no.descricao ??= achado.shortDescription ?? undefined;
      no.meta = {
        ...no.meta,
        mapaCulturalId: achado.id,
        natureza: no.meta?.natureza ?? naturezaDe(achado),
      };
    }
  }

  return { projetos, proponentes };
}

function resolverSegmento(areas: string[]) {
  for (const area of areas) {
    const seg = segmentoPorTermo(area);
    if (seg) return seg;
  }
  return undefined;
}

function naturezaDe(a: AgenteBruto | undefined) {
  const tipo = typeof a?.type === "object" ? a?.type?.id : a?.type;
  // Na plataforma Mapas Culturais, tipo 1 = pessoa física, 2 = pessoa jurídica.
  return tipo === 2 ? "pessoa_juridica" : tipo === 1 ? "pessoa_fisica" : undefined;
}

function dataDe(v: { date: string } | string | null | undefined): string | undefined {
  if (!v) return undefined;
  return typeof v === "string" ? v : v.date;
}

/**
 * Carrega `data/raw/habilitados-{ano}.csv`, se existir.
 *
 * Compartilhada com `importar-habilitados.ts`, para que o caminho com rede e o
 * caminho sem rede leiam a planilha exatamente do mesmo jeito.
 */
export function carregarHabilitados(
  ano: number,
): { nodes: GraphNode[]; edges: GraphEdge[]; relatorio?: RelatorioHabilitados } {
  const arquivo = join(DIR_BRUTO, `habilitados-${ano}.csv`);
  if (!existsSync(arquivo)) return { nodes: [], edges: [] };

  const { linhas, problemas } = lerHabilitados(readFileSync(arquivo, "utf8"));
  for (const pb of problemas) {
    console.warn(`  ! linha ${pb.linha}, ${pb.campo}: ${pb.motivo}`);
  }
  const montado = montarHabilitados(linhas, ano);
  return { ...montado, relatorio: { ...montado.relatorio, problemas } };
}

/** Imprime a cobertura da planilha — o que entrou e, sobretudo, o que faltou. */
export function relatar(r: RelatorioHabilitados, ano: number): void {
  const pct = (n: number) => (r.lidas ? `${Math.round((n / r.lidas) * 100)}%` : "—");
  console.log(`\n  lista de habilitados ${ano}: ${r.lidas} linhas`);
  console.log(`    com valor autorizado ... ${r.comValorAutorizado} (${pct(r.comValorAutorizado)})`);
  console.log(`    com valor captado ...... ${r.comValorCaptado} (${pct(r.comValorCaptado)})`);
  console.log(`    município resolvido .... ${r.municipiosResolvidos} (${pct(r.municipiosResolvidos)})`);
  console.log(`    segmento resolvido ..... ${r.segmentosResolvidos} (${pct(r.segmentosResolvidos)})`);
  if (r.semFonte) {
    console.log(`    ! ${r.semFonte} sem fonte_url — entraram como demonstração, não como oficial`);
  }
  if (r.municipiosDesconhecidos.length) {
    console.log(`    ! municípios não reconhecidos: ${r.municipiosDesconhecidos.join(", ")}`);
  }
  if (r.segmentosDesconhecidos.length) {
    console.log(`    ! segmentos não reconhecidos: ${r.segmentosDesconhecidos.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const ano = Number(process.env.LICC_ANO ?? EXERCICIO_PADRAO);
  const maximo = process.env.LICC_MAX ? Number(process.env.LICC_MAX) : undefined;
  const cliente = new MapasCulturais({
    base: process.env.LICC_BASE,
    log: (m) => console.log(m),
  });

  const habilitados = carregarHabilitados(ano);

  try {
    const coleta = await coletar(cliente, maximo);
    const { nodes, edges } = transformar(coleta, ano, habilitados);

    mkdirSync(DIR_BRUTO, { recursive: true });
    const destino = join(DIR_BRUTO, `licc-${ano}.json`);
    writeFileSync(
      destino,
      JSON.stringify(
        { coletadoEm: new Date().toISOString(), ano, nodes, edges },
        null,
        2,
      ),
    );

    console.log(`\n✓ coleta gravada em ${destino}`);
    console.log(`  plataforma: ${coleta.agentes.length} agentes, ${coleta.projetos.length} projetos cadastrados, ${coleta.oportunidades.length} oportunidades`);
    if (habilitados.relatorio) relatar(habilitados.relatorio, ano);
    else avisarSemLista(ano);
    console.log(`\n  → ${nodes.length} nós e ${edges.length} arestas`);
    console.log("  execute `npm run build:graph` para consolidar data/graph.json");
  } catch (erro) {
    console.error("\n✗ coleta falhou:", erro instanceof Error ? erro.message : erro);
    console.error(
      "  O grafo continua sendo servido a partir do conjunto de demonstração.\n" +
        "  Verifique o acesso de rede a https://mapa.cultura.es.gov.br e repita.",
    );
    process.exitCode = 1;
  }
}

/** Sem a lista oficial não há projeto da LICC — e isso precisa ser dito. */
export function avisarSemLista(ano: number): void {
  console.log(`\n  ! sem data/raw/habilitados-${ano}.csv: nenhum projeto da LICC foi criado.`);
  console.log("    Os projetos cadastrados no Mapa Cultural NÃO são projetos da LICC —");
  console.log("    são projetos culturais quaisquer, e tratá-los como incentivados");
  console.log("    afirmaria algo falso sobre a política. O grafo sai com o conjunto");
  console.log("    institucional e a camada territorial.");
  console.log("    Molde da planilha: data/raw/habilitados-exemplo.csv");
}

if (process.argv[1]?.includes("ingest")) void main();

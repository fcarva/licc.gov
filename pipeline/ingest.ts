/**
 * Coleta os dados abertos do Mapa Cultural do Espírito Santo e escreve
 * `data/raw/licc-{ano}.json`, que o `build-graph.ts` consome no lugar do
 * conjunto de demonstração.
 *
 *   npm run ingest              # exercício corrente
 *   LICC_ANO=2025 npm run ingest
 *   LICC_BASE=https://... npm run ingest
 *
 * A plataforma Mapas Culturais não expõe publicamente as inscrições
 * (`registration`) de uma oportunidade — esse endpoint exige autenticação por
 * JWT. O que é público são agentes, espaços, projetos e as próprias
 * oportunidades. O grafo é montado a partir daí; os valores financeiros da
 * LICC entram pelos anexos da SECULT quando disponíveis, e ficam ausentes
 * (nunca inventados) quando não estiverem.
 */

import { mkdirSync, writeFileSync } from "node:fs";
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
import { slugificar } from "@/lib/text";
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
import { nosFixos } from "./seed/institucional";

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
function transformar(coleta: Coleta, ano: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [...nosFixos(ano)];
  const edges: GraphEdge[] = [];
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
      meta: { cor: seg.cor, corPastel: seg.corPastel, slugSegmento: seg.slug },
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

  for (const p of coleta.projetos) {
    const id = `proj-mc-${p.id}`;
    const seg = resolverSegmento(p.terms?.area ?? []);
    const dono = p.owner ? agentesPorId.get(p.owner.id) : undefined;
    const mun = dono?.En_Municipio ? municipioPorNome(dono.En_Municipio) : undefined;

    adicionar({
      id,
      slug: slugificar(`${p.name}-${p.id}`),
      kind: "projeto",
      nome: p.name,
      descricao: p.shortDescription ?? undefined,
      url: p.singleUrl ?? undefined,
      proveniencia: "oficial",
      fundamentos: ["lei-11246-2021", normaDoExercicio(ano)],
      // Sem orçamento: a API pública não expõe os valores da LICC. Deixar o
      // campo ausente é preferível a estimá-lo.
      meta: {
        ano,
        mapaCulturalId: p.id,
        segmentoId: seg?.id,
        municipioId: mun?.id,
        proponenteId: p.owner ? `prop-mc-${p.owner.id}` : undefined,
      },
    });

    if (seg) ligar(id, seg.id, "pertence_a", { proveniencia: "derivado" });
    if (mun) ligar(id, mun.id, "ocorre_em", { proveniencia: "derivado" });
    ligar("secult-es", id, "fiscaliza", { proveniencia: "derivado" });

    if (p.owner) {
      const idProp = `prop-mc-${p.owner.id}`;
      const bruto = agentesPorId.get(p.owner.id);
      adicionar({
        id: idProp,
        slug: slugificar(`${p.owner.name}-${p.owner.id}`),
        kind: "proponente",
        nome: p.owner.name,
        descricao: bruto?.shortDescription ?? undefined,
        url: bruto?.singleUrl ?? undefined,
        proveniencia: "oficial",
        fundamentos: ["lei-11246-2021"],
        meta: {
          mapaCulturalId: p.owner.id,
          municipioId: mun?.id,
          natureza: naturezaDe(bruto),
        },
      });
      ligar(idProp, id, "propoe");
    }
  }

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

async function main(): Promise<void> {
  const ano = Number(process.env.LICC_ANO ?? EXERCICIO_PADRAO);
  const maximo = process.env.LICC_MAX ? Number(process.env.LICC_MAX) : undefined;
  const cliente = new MapasCulturais({
    base: process.env.LICC_BASE,
    log: (m) => console.log(m),
  });

  try {
    const coleta = await coletar(cliente, maximo);
    const { nodes, edges } = transformar(coleta, ano);

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
    console.log(`  ${coleta.agentes.length} agentes, ${coleta.projetos.length} projetos, ${coleta.oportunidades.length} oportunidades`);
    console.log(`  → ${nodes.length} nós e ${edges.length} arestas`);
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

if (process.argv[1]?.includes("ingest")) void main();

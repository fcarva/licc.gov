/**
 * Constrói `data/graph.json` — o artefato que a aplicação serve.
 *
 * Entrada: `data/raw/*.json` gerado por `pipeline/ingest.ts` quando há acesso
 * ao Mapa Cultural do ES; na ausência dele, o conjunto de demonstração.
 *
 * Saída: um grafo consolidado, com os agregados financeiros já propagados
 * (segmento, município, proponente e patrocinador herdam a soma dos projetos
 * ligados a eles) e com a conferência das cotas da LICC.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Graph,
  GraphEdge,
  GraphNode,
  Orcamento,
  Proveniencia,
} from "@/types/graph";
import {
  REGRAS,
  TETO_AUTORIZADO,
  FONTE_TETO,
  MUNICIPIOS,
  EXERCICIO_PADRAO,
} from "@/ontology";
import { gerarSeed } from "./seed/gerar";
import { nosFixos, arestasFixas } from "./seed/institucional";

const RAIZ = process.cwd();
const DIR_DADOS = join(RAIZ, "data");
const DIR_BRUTO = join(DIR_DADOS, "raw");

export interface RelatorioCotas {
  regraId: string;
  titulo: string;
  /** Fração do teto reservada pela norma. */
  cota: number;
  reservado: number;
  /** Valor autorizado que efetivamente se enquadra na cota. */
  alocado: number;
  /** `alocado / reservado`. Abaixo de 1 significa cota não preenchida. */
  cumprimento: number;
  atendida: boolean;
}

export interface Estatisticas {
  totalProjetos: number;
  totalProponentes: number;
  totalPatrocinadores: number;
  totalMunicipiosAtendidos: number;
  autorizado: number;
  captado: number;
  /** Fração do teto do exercício já comprometida em tetos de projeto. */
  comprometimentoDoTeto: number;
  /** Fração do autorizado efetivamente captada. */
  execucao: number;
  cotas: RelatorioCotas[];
  /** Proponentes que atingiram o limite de projetos no exercício. */
  proponentesNoLimite: string[];
}

/** Soma os orçamentos dos projetos para dentro dos nós que os agrupam. */
function propagarAgregados(nodes: GraphNode[], edges: GraphEdge[]): void {
  const porId = new Map(nodes.map((n) => [n.id, n]));
  const zerar = (n: GraphNode) => {
    if (n.kind === "projeto" || n.kind === "publico") return;
    n.orcamento = {
      autorizado: 0,
      captado: 0,
      anterior: { autorizado: 0, captado: 0 },
    };
  };
  nodes.forEach(zerar);

  const somar = (alvo: GraphNode | undefined, o: Orcamento) => {
    if (!alvo?.orcamento) return;
    alvo.orcamento.autorizado += o.autorizado;
    alvo.orcamento.captado += o.captado;
    if (alvo.orcamento.anterior && o.anterior) {
      alvo.orcamento.anterior.autorizado += o.anterior.autorizado;
      alvo.orcamento.anterior.captado += o.anterior.captado;
    }
  };

  for (const projeto of nodes) {
    if (projeto.kind !== "projeto" || !projeto.orcamento) continue;
    const o = projeto.orcamento;
    somar(porId.get(String(projeto.meta?.segmentoId ?? "")), o);
    somar(porId.get(String(projeto.meta?.municipioId ?? "")), o);
    somar(porId.get(String(projeto.meta?.proponenteId ?? "")), o);
  }

  // Patrocinador acumula pelo peso real das arestas de patrocínio, não pelo
  // teto do projeto: é o que ele de fato aportou.
  for (const n of nodes) {
    if (n.kind === "patrocinador" && n.orcamento) n.orcamento.captado = 0;
  }
  for (const e of edges) {
    if (e.kind !== "patrocina" || !e.peso) continue;
    const patr = porId.get(e.source);
    if (!patr?.orcamento) continue;
    patr.orcamento.captado += e.peso;
    // O aporte do patrocinador acompanha a variação do projeto que ele banca.
    const projeto = porId.get(e.target);
    const proj = projeto?.orcamento;
    if (patr.orcamento.anterior && proj?.anterior && proj.captado > 0) {
      patr.orcamento.anterior.captado += (e.peso * proj.anterior.captado) / proj.captado;
    }
  }

  // A LICC como programa espelha o total do exercício.
  const licc = porId.get("licc-programa");
  if (licc) {
    const projetos = nodes.filter((n) => n.kind === "projeto");
    licc.orcamento = {
      autorizado: TETO_AUTORIZADO,
      captado: projetos.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0),
    };
  }
}

/**
 * Atribui a cada vértice sua posição por captação dentro da própria categoria
 * e a variação sobre o exercício anterior — as duas métricas que o painel do
 * CivLab exibe como "Rank 1 of 54" e "↑3.90% from last year".
 */
function posicionarEVariar(nodes: GraphNode[]): void {
  const porCategoria = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    if (!n.orcamento) continue;
    const lista = porCategoria.get(n.kind) ?? [];
    lista.push(n);
    porCategoria.set(n.kind, lista);
  }

  for (const lista of porCategoria.values()) {
    const ordenada = [...lista].sort(
      (a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0),
    );
    // Só posiciona quem de fato movimenta recurso: "posição 40 de 54" entre
    // entidades todas zeradas não informa nada.
    const comValor = ordenada.filter((n) => (n.orcamento?.captado ?? 0) > 0);
    comValor.forEach((n, i) => {
      n.posicao = { lugar: i + 1, total: comValor.length };
    });

    for (const n of lista) {
      const antes = n.orcamento?.anterior?.captado ?? 0;
      const agora = n.orcamento?.captado ?? 0;
      n.variacaoAnual = antes > 0 ? (agora - antes) / antes : null;
    }
  }
}

/** Confere as cotas de 30% / 10% / 10% e o limite por proponente. */
function apurarEstatisticas(nodes: GraphNode[]): Estatisticas {
  const projetos = nodes.filter((n) => n.kind === "projeto");
  const rmgv = new Set(MUNICIPIOS.filter((m) => m.rmgv).map((m) => m.id));

  const autorizado = projetos.reduce((s, p) => s + (p.orcamento?.autorizado ?? 0), 0);
  const captado = projetos.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0);

  const somaSe = (teste: (p: GraphNode) => boolean) =>
    projetos.filter(teste).reduce((s, p) => s + (p.orcamento?.autorizado ?? 0), 0);

  const alocadoPorRegra: Record<string, number> = {
    "cota-pautados": somaSe((p) => Boolean(p.meta?.pautado)),
    "cota-fora-rmgv": somaSe((p) => !rmgv.has(String(p.meta?.municipioId ?? ""))),
    "cota-continuados": somaSe((p) => Boolean(p.meta?.continuado)),
  };

  const cotas: RelatorioCotas[] = REGRAS.filter((r) => r.cota !== undefined).map(
    (r) => {
      const reservado = TETO_AUTORIZADO * r.cota!;
      const alocado = alocadoPorRegra[r.id] ?? 0;
      return {
        regraId: r.id,
        titulo: r.titulo,
        cota: r.cota!,
        reservado,
        alocado,
        cumprimento: reservado > 0 ? alocado / reservado : 0,
        atendida: alocado >= reservado,
      };
    },
  );

  const limite = REGRAS.find((r) => r.id === "limite-projetos-por-proponente")?.limite ?? 3;
  const proponentesNoLimite = nodes
    .filter(
      (n) =>
        n.kind === "proponente" && ((n.meta?.projetosNoAno as number) ?? 0) >= limite,
    )
    .map((n) => n.id);

  const municipiosAtendidos = new Set(
    projetos.map((p) => String(p.meta?.municipioId ?? "")).filter(Boolean),
  );

  return {
    totalProjetos: projetos.length,
    totalProponentes: nodes.filter((n) => n.kind === "proponente").length,
    totalPatrocinadores: nodes.filter((n) => n.kind === "patrocinador").length,
    totalMunicipiosAtendidos: municipiosAtendidos.size,
    autorizado,
    captado,
    comprometimentoDoTeto: autorizado / TETO_AUTORIZADO,
    execucao: autorizado > 0 ? captado / autorizado : 0,
    cotas,
    proponentesNoLimite,
  };
}

function contarProveniencia(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Record<Proveniencia, number> {
  const contagem: Record<Proveniencia, number> = {
    oficial: 0,
    derivado: 0,
    demonstracao: 0,
  };
  for (const item of [...nodes, ...edges]) contagem[item.proveniencia] += 1;
  return contagem;
}

/** Descarta arestas órfãs — um nó removido não pode deixar aresta pendurada. */
function podarArestas(nodes: GraphNode[], edges: GraphEdge[]): GraphEdge[] {
  const ids = new Set(nodes.map((n) => n.id));
  return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
}

/** Converte o campo `fundamentos` de cada nó em arestas `fundamenta`. */
function criarArestasFundamento(nodes: GraphNode[], existentes: GraphEdge[]): GraphEdge[] {
  const ids = new Set(nodes.map((n) => n.id));
  const existentesSet = new Set(existentes.map((e) => e.id));
  const novas: GraphEdge[] = [];
  for (const no of nodes) {
    if (!no.fundamentos?.length) continue;
    for (const fundId of no.fundamentos) {
      if (!ids.has(fundId)) continue;
      const id = `fundamenta:${no.id}->${fundId}`;
      if (existentesSet.has(id)) continue;
      novas.push({ id, source: no.id, target: fundId, kind: "fundamenta", proveniencia: no.proveniencia });
    }
  }
  return novas;
}

export function construirGrafo(ano = EXERCICIO_PADRAO): { grafo: Graph; stats: Estatisticas } {
  const arquivoBruto = join(DIR_BRUTO, `licc-${ano}.json`);
  let nodes: GraphNode[];
  let edges: GraphEdge[];

  if (existsSync(arquivoBruto)) {
    console.log(`→ usando coleta real: ${arquivoBruto}`);
    const bruto = JSON.parse(readFileSync(arquivoBruto, "utf-8")) as {
      nodes: GraphNode[];
      edges: GraphEdge[];
    };
    nodes = bruto.nodes;
    edges = bruto.edges;
  } else {
    console.log("→ sem coleta em data/raw; gerando conjunto de demonstração");
    const seed = gerarSeed({ ano });
    nodes = seed.nodes;
    edges = seed.edges;
  }

  // Garante que os nós e arestas institucionais estejam presentes,
  // independente de quando o ingest foi rodado.
  const idsExistentes = new Set(nodes.map((n) => n.id));
  for (const no of nosFixos(ano)) {
    if (!idsExistentes.has(no.id)) {
      nodes.push(no);
      idsExistentes.add(no.id);
    }
  }
  const idsArestas = new Set(edges.map((e) => e.id));
  for (const aresta of arestasFixas(ano)) {
    if (!idsArestas.has(aresta.id)) {
      edges.push(aresta);
      idsArestas.add(aresta.id);
    }
  }

  edges = podarArestas(nodes, edges);
  edges = [...edges, ...criarArestasFundamento(nodes, edges)];
  propagarAgregados(nodes, edges);
  posicionarEVariar(nodes);
  const stats = apurarEstatisticas(nodes);

  const grafo: Graph = {
    meta: {
      ano,
      geradoEm: new Date().toISOString(),
      tetoAutorizado: TETO_AUTORIZADO,
      fontes: [
        FONTE_TETO,
        {
          rotulo: "Mapa Cultural do Espírito Santo",
          url: "https://mapa.cultura.es.gov.br",
        },
        { rotulo: "SECULT-ES — Sobre a LICC", url: "https://secult.es.gov.br/sobre-a-licc" },
      ],
      contagemPorProveniencia: contarProveniencia(nodes, edges),
    },
    nodes,
    edges,
  };

  return { grafo, stats };
}

function main(): void {
  const ano = Number(process.env.LICC_ANO ?? EXERCICIO_PADRAO);
  const { grafo, stats } = construirGrafo(ano);

  mkdirSync(DIR_DADOS, { recursive: true });
  writeFileSync(join(DIR_DADOS, "graph.json"), JSON.stringify(grafo, null, 2));
  writeFileSync(join(DIR_DADOS, "stats.json"), JSON.stringify(stats, null, 2));

  const brl = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  console.log(`\n  LICC ${ano} — grafo construído`);
  console.log(`  ${grafo.nodes.length} nós, ${grafo.edges.length} arestas`);
  console.log(`  teto autorizado ......... ${brl(TETO_AUTORIZADO)}`);
  console.log(`  autorizado em projetos .. ${brl(stats.autorizado)} (${pct(stats.comprometimentoDoTeto)} do teto)`);
  console.log(`  captado ................. ${brl(stats.captado)} (${pct(stats.execucao)} do autorizado)`);
  console.log(`  projetos ................ ${stats.totalProjetos}`);
  console.log(`  municípios atendidos .... ${stats.totalMunicipiosAtendidos} de 78`);
  console.log("\n  cotas:");
  for (const c of stats.cotas) {
    console.log(
      `   ${c.atendida ? "✓" : "✗"} ${c.titulo}: ${brl(c.alocado)} de ${brl(c.reservado)} (${pct(c.cumprimento)})`,
    );
  }
  console.log("\n  proveniência:", JSON.stringify(grafo.meta.contagemPorProveniencia));
}

// Só roda como script; permanece importável pelos testes e pela aplicação.
if (process.argv[1]?.includes("build-graph")) main();

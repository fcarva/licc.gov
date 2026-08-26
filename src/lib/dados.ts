import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  EntityDetail,
  Graph,
  GraphEdge,
  GraphNode,
  NodeKind,
  Noticia,
} from "@/types/graph";
import { construirGrafo, type Estatisticas } from "../../pipeline/build-graph";
import { normalizar } from "@/lib/text";

/**
 * Acesso ao grafo pelo lado do servidor.
 *
 * Lê `data/graph.json` quando existe; se o artefato não tiver sido gerado,
 * constrói o grafo em memória — assim a aplicação nunca sobe quebrada por
 * falta de um passo de build.
 */

interface Cache {
  grafo: Graph;
  stats: Estatisticas;
  porId: Map<string, GraphNode>;
  porSlug: Map<string, GraphNode>;
  saidas: Map<string, GraphEdge[]>;
  entradas: Map<string, GraphEdge[]>;
}

let cache: Cache | null = null;

function carregar(): Cache {
  if (cache) return cache;

  const dir = join(process.cwd(), "data");
  const arquivoGrafo = join(dir, "graph.json");
  const arquivoStats = join(dir, "stats.json");

  let grafo: Graph;
  let stats: Estatisticas;

  if (existsSync(arquivoGrafo) && existsSync(arquivoStats)) {
    grafo = JSON.parse(readFileSync(arquivoGrafo, "utf-8")) as Graph;
    stats = JSON.parse(readFileSync(arquivoStats, "utf-8")) as Estatisticas;
  } else {
    const construido = construirGrafo();
    grafo = construido.grafo;
    stats = construido.stats;
  }

  const porId = new Map(grafo.nodes.map((n) => [n.id, n]));
  const porSlug = new Map(grafo.nodes.map((n) => [n.slug, n]));
  const saidas = new Map<string, GraphEdge[]>();
  const entradas = new Map<string, GraphEdge[]>();

  for (const e of grafo.edges) {
    (saidas.get(e.source) ?? saidas.set(e.source, []).get(e.source)!).push(e);
    (entradas.get(e.target) ?? entradas.set(e.target, []).get(e.target)!).push(e);
  }

  cache = { grafo, stats, porId, porSlug, saidas, entradas };
  return cache;
}

export function obterGrafo(): Graph {
  return carregar().grafo;
}

export function obterEstatisticas(): Estatisticas {
  return carregar().stats;
}

export function obterNoPorSlug(slug: string): GraphNode | undefined {
  return carregar().porSlug.get(slug);
}

export function obterNoPorId(id: string): GraphNode | undefined {
  return carregar().porId.get(id);
}

export function listarNos(kind?: NodeKind): GraphNode[] {
  const { grafo } = carregar();
  return kind ? grafo.nodes.filter((n) => n.kind === kind) : grafo.nodes;
}

/** Nó + vizinhança + agregados, na forma que o painel lateral consome. */
export function obterDetalhe(slug: string): EntityDetail | undefined {
  const c = carregar();
  const node = c.porSlug.get(slug);
  if (!node) return undefined;

  const vizinhos: EntityDetail["vizinhos"] = [];
  for (const e of c.saidas.get(node.id) ?? []) {
    const alvo = c.porId.get(e.target);
    if (alvo) vizinhos.push({ node: alvo, edge: e, direcao: "saida" });
  }
  for (const e of c.entradas.get(node.id) ?? []) {
    const origem = c.porId.get(e.source);
    if (origem) vizinhos.push({ node: origem, edge: e, direcao: "entrada" });
  }

  // Projetos alcançáveis a partir deste nó — base dos agregados exibidos.
  const projetos = node.kind === "projeto"
    ? [node]
    : vizinhos.map((v) => v.node).filter((n) => n.kind === "projeto");

  const autorizado = node.orcamento?.autorizado
    ?? projetos.reduce((s, p) => s + (p.orcamento?.autorizado ?? 0), 0);
  const captado = node.orcamento?.captado
    ?? projetos.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0);

  const noticias = coletarNoticias(node, vizinhos.map((v) => v.node));

  return {
    node,
    vizinhos: ordenarVizinhos(vizinhos),
    agregado: {
      autorizado,
      captado,
      execucao: autorizado > 0 ? captado / autorizado : null,
      projetos: projetos.length,
    },
    noticias,
    fundamentos: (node.fundamentos ?? [])
      .map((id) => c.porId.get(id))
      .filter((n): n is GraphNode => Boolean(n))
      .map((n) => ({ id: n.id, slug: n.slug, nome: n.nome })),
  };
}

/**
 * Notícias do próprio nó primeiro, depois as dos vizinhos — é assim que o
 * painel do CivLab monta o feed contextual de uma entidade.
 */
function coletarNoticias(node: GraphNode, vizinhos: GraphNode[]): Noticia[] {
  const vistas = new Set<string>();
  const saida: Noticia[] = [];
  for (const n of [node, ...vizinhos]) {
    for (const not of n.noticias ?? []) {
      if (vistas.has(not.id)) continue;
      vistas.add(not.id);
      saida.push(not);
    }
  }
  return saida.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 40);
}

/** Financeiros primeiro e maiores no topo; o resto por nome. */
function ordenarVizinhos(v: EntityDetail["vizinhos"]): EntityDetail["vizinhos"] {
  return v.sort((a, b) => {
    const pa = a.edge.peso ?? 0;
    const pb = b.edge.peso ?? 0;
    if (pa !== pb) return pb - pa;
    const oa = a.node.orcamento?.captado ?? 0;
    const ob = b.node.orcamento?.captado ?? 0;
    if (oa !== ob) return ob - oa;
    return a.node.nome.localeCompare(b.node.nome, "pt-BR");
  });
}

export interface ResultadoBusca {
  slug: string;
  nome: string;
  kind: NodeKind;
  descricao?: string;
  /** Trecho que casou, quando o acerto veio de um nome alternativo. */
  casouEm?: string;
  pontuacao: number;
}

/**
 * Busca global sobre nome, sigla, nomes alternativos e descrição — o mesmo
 * escopo que o CivLab v2 adotou ao ampliar a busca para além do nome.
 */
export function buscar(termo: string, limite = 20): ResultadoBusca[] {
  const q = normalizar(termo);
  if (q.length < 2) return [];

  const resultados: ResultadoBusca[] = [];

  for (const n of carregar().grafo.nodes) {
    const nome = normalizar(n.nome);
    const sigla = n.sigla ? normalizar(n.sigla) : "";
    let pontuacao = 0;
    let casouEm: string | undefined;

    if (nome === q || sigla === q) pontuacao = 100;
    else if (nome.startsWith(q) || sigla.startsWith(q)) pontuacao = 80;
    else if (nome.includes(q)) pontuacao = 60;
    else {
      const alt = (n.nomesAlternativos ?? []).find((a) => normalizar(a).includes(q));
      if (alt) {
        pontuacao = 45;
        casouEm = alt;
      } else if (n.descricao && normalizar(n.descricao).includes(q)) {
        pontuacao = 20;
        casouEm = n.descricao;
      }
    }

    if (pontuacao === 0) continue;

    // Entidades com mais dinheiro sob gestão sobem no empate.
    const relevancia = Math.log10(1 + (n.orcamento?.captado ?? 0)) / 10;
    resultados.push({
      slug: n.slug,
      nome: n.nome,
      kind: n.kind,
      descricao: n.descricao,
      casouEm,
      pontuacao: pontuacao + relevancia,
    });
  }

  return resultados
    .sort((a, b) => b.pontuacao - a.pontuacao || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

/** Todas as notícias do grafo, mais recentes primeiro. */
export function listarNoticias(limite = 100): Array<Noticia & { entidade: string; entidadeSlug: string }> {
  const saida: Array<Noticia & { entidade: string; entidadeSlug: string }> = [];
  const vistas = new Set<string>();
  for (const n of carregar().grafo.nodes) {
    for (const not of n.noticias ?? []) {
      if (vistas.has(not.id)) continue;
      vistas.add(not.id);
      saida.push({ ...not, entidade: n.nome, entidadeSlug: n.slug });
    }
  }
  return saida.sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite);
}

export interface PanoramaMunicipio {
  municipio: GraphNode;
  projetos: GraphNode[];
  espacos: GraphNode[];
  eventos: GraphNode[];
  proponentes: GraphNode[];
  autorizado: number;
  captado: number;
}

/**
 * Panorama territorial de um município — a camada que responde "o que existe e
 * o que acontece aqui", no espírito do Republic do CivLab.
 */
export function obterPanorama(slugMunicipio: string): PanoramaMunicipio | undefined {
  const c = carregar();
  const municipio = c.porSlug.get(slugMunicipio);
  if (!municipio || municipio.kind !== "municipio") return undefined;

  const doMunicipio = (n: GraphNode) => n.meta?.municipioId === municipio.id;

  const projetos = c.grafo.nodes.filter((n) => n.kind === "projeto" && doMunicipio(n));
  const espacos = c.grafo.nodes.filter((n) => n.kind === "espaco" && doMunicipio(n));
  const idsEspaco = new Set(espacos.map((e) => e.id));
  const eventos = c.grafo.nodes.filter(
    (n) => n.kind === "evento" && (doMunicipio(n) || idsEspaco.has(String(n.meta?.espacoId ?? ""))),
  );
  const proponentes = c.grafo.nodes.filter((n) => n.kind === "proponente" && doMunicipio(n));

  return {
    municipio,
    projetos,
    espacos,
    eventos: [...eventos].sort((a, b) =>
      String(a.meta?.inicio ?? "").localeCompare(String(b.meta?.inicio ?? "")),
    ),
    proponentes,
    autorizado: projetos.reduce((s, p) => s + (p.orcamento?.autorizado ?? 0), 0),
    captado: projetos.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0),
  };
}

/** Todos os municípios com a contagem de cada camada — índice do monitor. */
export function listarPanoramas(): Array<{
  slug: string;
  nome: string;
  regiao: string;
  rmgv: boolean;
  projetos: number;
  espacos: number;
  eventos: number;
  captado: number;
}> {
  const c = carregar();
  const contar = (kind: GraphNode["kind"]) => {
    const m = new Map<string, number>();
    for (const n of c.grafo.nodes) {
      if (n.kind !== kind) continue;
      const id = String(n.meta?.municipioId ?? "");
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  };
  const projetos = contar("projeto");
  const espacos = contar("espaco");
  const eventos = contar("evento");

  return c.grafo.nodes
    .filter((n) => n.kind === "municipio")
    .map((m) => ({
      slug: m.slug,
      nome: m.nome,
      regiao: String(m.meta?.regiao ?? ""),
      rmgv: Boolean(m.meta?.regiaoMetropolitana),
      projetos: projetos.get(m.id) ?? 0,
      espacos: espacos.get(m.id) ?? 0,
      eventos: eventos.get(m.id) ?? 0,
      captado: m.orcamento?.captado ?? 0,
    }))
    .sort((a, b) => b.captado - a.captado || a.nome.localeCompare(b.nome, "pt-BR"));
}

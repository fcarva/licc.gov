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
import { basename, join } from "node:path";
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
import { carregarHabilitados, lotesDoExercicio } from "./ingest";

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
  /** `null` quando a fonte não publica o campo que classifica esta cota. */
  atendida: boolean | null;
  /** Projetos que a fonte permite classificar nesta cota, sobre o total. */
  classificaveis: { comDado: number; total: number };
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
  cobertura: Cobertura;
}

/**
 * O que se sabe, campo a campo.
 *
 * Existe porque num projeto de transparência a lacuna medida é conteúdo. Um
 * total de R$ 13,8 mi apurado sobre 40 dos 82 projetos não é o mesmo número
 * que o mesmo total apurado sobre os 82 — e sem este bloco a página apresenta
 * os dois do mesmo jeito.
 */
export interface Cobertura {
  projetos: number;
  /** Projetos vindos de fonte oficial com endereço para conferir. */
  oficiais: number;
  comValorAutorizado: number;
  comValorCaptado: number;
  comMunicipio: number;
  comSegmento: number;
  comPatrocinador: number;
}

/**
 * Soma os orçamentos dos projetos para dentro dos nós que os agrupam.
 *
 * O agregado soma **só o que existe** e guarda em `cobertura` quantos projetos
 * entraram na conta. Um segmento com 12 projetos dos quais a SECULT publicou
 * valor de 4 tem um total legítimo — o dos 4 —, e quem lê precisa saber que é
 * de 4. Sem isso, um agregado parcial se apresenta como total e a página mente
 * sem escrever nenhum número falso.
 */
/**
 * Arredonda para centavo todo valor monetário do grafo.
 *
 * Somar reais em ponto flutuante devolve `27802174.470000006`, e este é um
 * artefato **versionado**: a cauda binária vira ruído de diff entre coletas e,
 * na tela, precisão que a fonte não tem. O anexo da SECULT é impresso em
 * centavos; o grafo não pode afirmar mais casas do que ele.
 *
 * Roda depois de toda soma, num passe só, para não depender de cada caminho de
 * agregação lembrar de arredondar.
 */
function arredondarDinheiro(nodes: GraphNode[], edges: GraphEdge[]): void {
  const cents = (n: number | undefined) =>
    n === undefined ? undefined : Math.round(n * 100) / 100;
  for (const n of nodes) {
    const o = n.orcamento;
    if (!o) continue;
    o.autorizado = cents(o.autorizado);
    o.captado = cents(o.captado);
    if (o.anterior) {
      o.anterior.autorizado = cents(o.anterior.autorizado);
      o.anterior.captado = cents(o.anterior.captado);
    }
  }
  for (const e of edges) e.peso = cents(e.peso);
}

function propagarAgregados(nodes: GraphNode[], edges: GraphEdge[]): void {
  const porId = new Map(nodes.map((n) => [n.id, n]));
  // Quem ganhou acumulador zerado, e quem de fato recebeu alguma contribuição.
  //
  // O acumulador precisa existir **durante** a soma, então não dá para deixar
  // de criá-lo; o que não pode é sobreviver vazio. Guardar os dois conjuntos
  // permite arrancá-lo no fim, sem depender de adivinhar pelo conteúdo.
  const zerados = new Set<string>();
  const recebeu = new Set<string>();

  const zerar = (n: GraphNode) => {
    if (n.kind === "projeto" || n.kind === "publico") return;
    zerados.add(n.id);
    n.orcamento = {
      autorizado: 0,
      captado: 0,
      anterior: { autorizado: 0, captado: 0 },
      cobertura: { comValor: 0, total: 0 },
    };
  };
  nodes.forEach(zerar);

  const somar = (alvo: GraphNode | undefined, o: Orcamento) => {
    const a = alvo?.orcamento;
    if (!a || !alvo) return;
    recebeu.add(alvo.id);
    const temValor = o.autorizado !== undefined || o.captado !== undefined;
    if (a.cobertura) {
      a.cobertura.total += 1;
      if (temValor) a.cobertura.comValor += 1;
    }
    if (o.autorizado !== undefined) a.autorizado = (a.autorizado ?? 0) + o.autorizado;
    if (o.captado !== undefined) a.captado = (a.captado ?? 0) + o.captado;
    if (a.anterior && o.anterior) {
      if (o.anterior.autorizado !== undefined) {
        a.anterior.autorizado = (a.anterior.autorizado ?? 0) + o.anterior.autorizado;
      }
      if (o.anterior.captado !== undefined) {
        a.anterior.captado = (a.anterior.captado ?? 0) + o.anterior.captado;
      }
    }
  };

  for (const projeto of nodes) {
    if (projeto.kind !== "projeto") continue;
    // Projeto sem orçamento publicado ainda conta para a cobertura: é
    // justamente ele que o denominador precisa enxergar.
    const o = projeto.orcamento ?? {};
    somar(porId.get(String(projeto.meta?.segmentoId ?? "")), o);
    // Dinheiro só onde a fonte nomeia **um** município; presença em todos os
    // que ela nomeia. Somar o valor em cada um contaria a mesma renúncia
    // várias vezes, e o rateio entre eles não é publicado.
    somar(porId.get(String(projeto.meta?.municipioId ?? "")), o);
    for (const idMun of projeto.meta?.municipiosIds ?? []) {
      if (idMun === projeto.meta?.municipioId) continue;
      const mun = porId.get(idMun);
      if (mun?.orcamento?.cobertura) {
        mun.orcamento.cobertura.total += 1;
        recebeu.add(mun.id);
      }
    }
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
    // Patrocinador acumula por aresta e nunca passa por `somar`, então precisa
    // se registrar aqui — senão a limpeza do fim arrancaria o orçamento dele.
    recebeu.add(patr.id);
    patr.orcamento.captado = (patr.orcamento.captado ?? 0) + e.peso;
    // O aporte do patrocinador acompanha a variação do projeto que ele banca.
    const proj = porId.get(e.target)?.orcamento;
    const captadoProj = proj?.captado;
    const captadoAntes = proj?.anterior?.captado;
    if (patr.orcamento.anterior && captadoProj && captadoAntes !== undefined) {
      patr.orcamento.anterior.captado =
        (patr.orcamento.anterior.captado ?? 0) + (e.peso * captadoAntes) / captadoProj;
    }
  }

  // Cobertura só existe onde há algo a cobrir. Um município sem projeto
  // algum não tem "0 de 0 com valor" — não tem denominador, e emitir o campo
  // vazio enche o artefato de afirmação sobre nada.
  for (const n of nodes) {
    if (n.orcamento?.cobertura && n.orcamento.cobertura.total === 0) {
      delete n.orcamento.cobertura;
    }
  }

  // E orçamento só existe onde entrou alguma coisa.
  //
  // Mesmo raciocínio, um nível acima. O acumulador nasce zerado porque a soma
  // precisa dele, mas sobreviver zerado faz o artefato **afirmar** R$ 0 onde o
  // certo é não afirmar nada: norma, órgão, edital e pessoa não têm orçamento
  // por natureza, e município sem projeto não recebeu zero — a fonte não diz
  // onde os projetos aconteceram (a cobertura de município é 0%).
  //
  // Eram 101 nós assim. `Orcamento.autorizado` e `captado` são opcionais no
  // tipo exatamente para permitir esta ausência; preenchê-los com zero era
  // desfazer no construtor a garantia que o tipo dá.
  for (const n of nodes) {
    if (zerados.has(n.id) && !recebeu.has(n.id)) delete n.orcamento;
  }

  // A LICC como programa espelha o total do exercício.
  const licc = porId.get("licc-programa");
  if (licc) {
    const projetos = nodes.filter((n) => n.kind === "projeto");
    licc.orcamento = {
      autorizado: TETO_AUTORIZADO,
      captado: Math.round(projetos.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0) * 100) / 100,
      cobertura: {
        comValor: projetos.filter((p) => p.orcamento?.captado !== undefined).length,
        total: projetos.length,
      },
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
function apurarEstatisticas(nodes: GraphNode[], edges: GraphEdge[]): Estatisticas {
  const projetos = nodes.filter((n) => n.kind === "projeto");

  const centavos = (n: number) => Math.round(n * 100) / 100;
  const autorizado = centavos(projetos.reduce((s, p) => s + (p.orcamento?.autorizado ?? 0), 0));
  const captado = centavos(projetos.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0));

  const somaSe = (teste: (p: GraphNode) => boolean) =>
    centavos(projetos.filter(teste).reduce((s, p) => s + (p.orcamento?.autorizado ?? 0), 0));

  // A cota é **lida**, não deduzida.
  //
  // A lista de habilitados traz a coluna "Enquadramento para efeito de
  // captação", em que a própria SECULT classifica cada projeto numa das quatro
  // reservas do art. 18. `meta.cotaId` é essa classificação.
  //
  // A dedução anterior partia de `meta.pautado`, `meta.continuado` e da
  // pertinência à RMGV — três palpites encadeados, e o encadeamento produziu um
  // "1112% de cumprimento" numa tela de transparência: os 63 projetos do anexo
  // de captados não trazem município, e "sem município" foi lido como "fora da
  // região metropolitana". Onde a fonte classifica, não há o que deduzir.
  //
  // Continua valendo o que se aprendeu ali: projeto sem `cotaId` é `undefined`,
  // não `false`. Cota sem projeto classificável sai como `atendida: null`.
  const classificador: Record<string, (p: GraphNode) => boolean | undefined> = Object.fromEntries(
    REGRAS.filter((r) => r.cota !== undefined).map((r) => [
      r.id,
      (p: GraphNode) => (p.meta?.cotaId === undefined ? undefined : p.meta.cotaId === r.id),
    ]),
  );

  const cotas: RelatorioCotas[] = REGRAS.filter((r) => r.cota !== undefined).map(
    (r) => {
      const classifica = classificador[r.id];
      const reservado = TETO_AUTORIZADO * r.cota!;
      const comDado = classifica
        ? projetos.filter((p) => classifica(p) !== undefined).length
        : 0;
      const alocado = classifica ? somaSe((p) => classifica(p) === true) : 0;
      return {
        regraId: r.id,
        titulo: r.titulo,
        cota: r.cota!,
        reservado,
        alocado,
        cumprimento: reservado > 0 ? alocado / reservado : 0,
        // `alocado` é um **piso**, não um total: soma só os projetos que a
        // fonte classificou. Daí a lógica de três estados ser assimétrica, e
        // ela é exata, não cautelosa:
        //
        // - piso **acima** da reserva prova o cumprimento, mesmo com cobertura
        //   parcial — o que falta só pode somar;
        // - piso **abaixo** da reserva não prova nada enquanto houver projeto
        //   sem classificar, porque os que faltam podem completá-la;
        // - só com todos classificados o piso vira total, e aí `false` é
        //   afirmação sustentada.
        //
        // Sem isso o painel exibiria "✗ 46,6%" sobre 31 de 63 projetos, que se
        // lê como "a SECULT furou a cota" quando o que há é meia leitura — o
        // mesmo erro do "1112%", de cabeça para baixo.
        atendida: alocado >= reservado ? true : comDado === projetos.length ? false : null,
        classificaveis: { comDado, total: projetos.length },
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
    projetos.flatMap((p) => p.meta?.municipiosIds ?? []),
  );

  const comPatrocinio = new Set(
    edges.filter((e) => e.kind === "patrocina").map((e) => e.target),
  );
  const cobertura: Cobertura = {
    projetos: projetos.length,
    oficiais: projetos.filter((p) => p.proveniencia === "oficial").length,
    comValorAutorizado: projetos.filter((p) => p.orcamento?.autorizado !== undefined).length,
    comValorCaptado: projetos.filter((p) => p.orcamento?.captado !== undefined).length,
    comMunicipio: projetos.filter((p) => p.meta?.municipiosIds?.length).length,
    comSegmento: projetos.filter((p) => p.meta?.segmentoId).length,
    comPatrocinador: projetos.filter((p) => comPatrocinio.has(p.id)).length,
  };

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
    cobertura,
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
  } else if (lotesDoExercicio(ano).length) {
    // Degrau do meio, e ele é o que torna o repositório reprodutível.
    //
    // `data/raw/licc-{ano}.json` é ignorado pelo git, então num clone limpo ele
    // não existe. Sem este ramo, `npm run build:graph` caía direto no seed e
    // **sobrescrevia** o `data/graph.json` versionado — trocando 63 projetos
    // reais por dados de demonstração, em silêncio, num comando que a própria
    // documentação manda rodar depois de mexer em ontologia.
    //
    // Havendo transcrição oficial versionada em `data/oficial/`, ela é a fonte:
    // conjunto de demonstração é último recurso, nunca preferência.
    const lotes = lotesDoExercicio(ano);
    console.log(
      `→ usando transcrição oficial versionada: ${lotes.map((l) => basename(l)).join(", ")}`,
    );
    const habilitados = carregarHabilitados(ano);
    nodes = habilitados.nodes;
    edges = habilitados.edges;
  } else {
    console.log("→ sem coleta nem transcrição oficial; gerando conjunto de demonstração");
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
  arredondarDinheiro(nodes, edges);
  posicionarEVariar(nodes);
  const stats = apurarEstatisticas(nodes, edges);

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
  const cob = stats.cobertura;
  const daCobertura = (n: number) =>
    cob.projetos ? `${n} (${Math.round((n / cob.projetos) * 100)}%)` : "—";
  console.log(`\n  cobertura, sobre ${cob.projetos} projetos:`);
  console.log(`    de fonte oficial ........ ${daCobertura(cob.oficiais)}`);
  console.log(`    com valor autorizado .... ${daCobertura(cob.comValorAutorizado)}`);
  console.log(`    com valor captado ....... ${daCobertura(cob.comValorCaptado)}`);
  console.log(`    com município ........... ${daCobertura(cob.comMunicipio)}`);
  console.log(`    com segmento ............ ${daCobertura(cob.comSegmento)}`);
  console.log(`    com patrocinador ........ ${daCobertura(cob.comPatrocinador)}`);

  console.log("\n  cotas:");
  for (const c of stats.cotas) {
    const marca = c.atendida === null ? "–" : c.atendida ? "✓" : "✗";
    // Cota sem projeto classificável não é cota descumprida. Imprimir "✗ R$ 0"
    // ali seria acusar a SECULT de furar uma reserva que a fonte lida não
    // permite sequer avaliar.
    const parcial = `${c.classificaveis.comDado} de ${c.classificaveis.total} projetos classificados`;
    const valores =
      c.atendida === null
        ? c.classificaveis.comDado === 0
          ? `sem dado (nenhum dos ${c.classificaveis.total} projetos é classificável)`
          : `ao menos ${brl(c.alocado)} de ${brl(c.reservado)} — indeterminado, ${parcial}`
        : `${brl(c.alocado)} de ${brl(c.reservado)} (${pct(c.cumprimento)})` +
          (c.classificaveis.comDado < c.classificaveis.total ? `, ${parcial}` : "");
    console.log(`   ${marca} ${c.titulo}: ${valores}`);
  }
  console.log("\n  proveniência:", JSON.stringify(grafo.meta.contagemPorProveniencia));
}

// Só roda como script; permanece importável pelos testes e pela aplicação.
if (process.argv[1]?.includes("build-graph")) main();

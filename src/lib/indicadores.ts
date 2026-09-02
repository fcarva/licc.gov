/**
 * Os quatro indicadores da LICC.
 *
 * Funções puras sobre o grafo, fora do componente, pelo mesmo motivo de
 * `radial.ts`: dá para conferir a conta sem montar React.
 *
 * ## A regra que rege todas elas
 *
 * Todo indicador viaja com o **denominador**. `Confianca` diz sobre quantos
 * registros a conta foi feita e quantos existem — porque "as 3 maiores empresas
 * respondem por 48% da renúncia" apurado sobre 40 dos 82 projetos não é a
 * mesma afirmação que o mesmo número apurado sobre os 82, e apresentar os dois
 * do mesmo jeito é a forma silenciosa de mentir num painel.
 *
 * Quando não há **nenhum** registro com o campo exigido, a função devolve
 * `null`. Não existe indicador sobre zero observações; devolver uma estrutura
 * vazia convidaria a interface a desenhar um gráfico de nada.
 */

import type { Fonte, Graph, GraphNode } from "@/types/graph";
import { MUNICIPIOS, SEGMENTOS, REGRAS } from "@/ontology";

/** Sobre quantos registros a conta foi feita, de quantos existem. */
export interface Confianca {
  base: number;
  universo: number;
  /** `base / universo`. 1 significa que nada ficou de fora. */
  cobertura: number;
}

export interface Indicador<T> {
  dados: T;
  confianca: Confianca;
}

const confiar = (base: number, universo: number): Confianca => ({
  base,
  universo,
  cobertura: universo > 0 ? base / universo : 0,
});

const projetosDe = (grafo: Graph) => grafo.nodes.filter((n) => n.kind === "projeto");

// ---------------------------------------------------------------------------
// 1. Concentração do capital
// ---------------------------------------------------------------------------

export interface FatiaCapital {
  id: string;
  nome: string;
  slug: string;
  aportado: number;
  /** Fração do total aportado conhecido. */
  fracao: number;
  /** Fração acumulada até esta empresa, na ordem decrescente. */
  acumulado: number;
  projetos: number;
}

export interface ConcentracaoCapital {
  empresas: FatiaCapital[];
  total: number;
  /**
   * Gini sobre o aporte por empresa. 0 = todas aportam igual;
   * perto de 1 = uma empresa responde por quase tudo.
   */
  gini: number;
  /** Quantas empresas bastam para somar metade do total. */
  empresasParaMetade: number;
  /** Fração do total nas mãos das três maiores. */
  fracaoDasTresMaiores: number;
}

/**
 * Quem banca a cultura capixaba, e quão concentrado isso é.
 *
 * A base são as arestas `patrocina` **com peso**: é o que a empresa de fato
 * aportou, não o teto do projeto. Empresa cujos aportes não têm valor
 * publicado fica fora da conta e dentro do denominador — some do gráfico, não
 * da estatística.
 */
export function concentracaoDoCapital(grafo: Graph): Indicador<ConcentracaoCapital> | null {
  const porId = new Map(grafo.nodes.map((n) => [n.id, n]));
  const patrocinadores = grafo.nodes.filter((n) => n.kind === "patrocinador");

  const aportes = new Map<string, { valor: number; projetos: Set<string> }>();
  for (const e of grafo.edges) {
    if (e.kind !== "patrocina" || e.peso === undefined) continue;
    const atual = aportes.get(e.source) ?? { valor: 0, projetos: new Set<string>() };
    atual.valor += e.peso;
    atual.projetos.add(e.target);
    aportes.set(e.source, atual);
  }

  if (!aportes.size) return null;

  const total = [...aportes.values()].reduce((s, a) => s + a.valor, 0);
  if (total <= 0) return null;

  const ordenadas = [...aportes.entries()]
    .map(([id, a]) => ({
      id,
      nome: porId.get(id)?.nome ?? id,
      slug: porId.get(id)?.slug ?? id,
      aportado: a.valor,
      projetos: a.projetos.size,
    }))
    .sort((x, y) => y.aportado - x.aportado);

  let acumulado = 0;
  const empresas: FatiaCapital[] = ordenadas.map((e) => {
    const fracao = e.aportado / total;
    acumulado += fracao;
    return { ...e, fracao, acumulado };
  });

  const metade = empresas.findIndex((e) => e.acumulado >= 0.5);
  return {
    dados: {
      empresas,
      total,
      gini: gini(empresas.map((e) => e.aportado)),
      empresasParaMetade: metade >= 0 ? metade + 1 : empresas.length,
      fracaoDasTresMaiores: empresas.slice(0, 3).reduce((s, e) => s + e.fracao, 0),
    },
    confianca: confiar(aportes.size, patrocinadores.length),
  };
}

/**
 * Índice de Gini sobre uma lista de valores.
 *
 * Fórmula da diferença média relativa, sobre a lista ordenada:
 * `Σ (2i − n − 1)·xᵢ / (n · Σxᵢ)`. Com um só elemento não há desigualdade
 * a medir, e o resultado é 0 — não 1, que seria ler "concentração total"
 * onde só há falta de comparação.
 */
export function gini(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const n = v.length;
  const soma = v.reduce((s, x) => s + x, 0);
  if (n < 2 || soma <= 0) return 0;
  let acumulado = 0;
  for (let i = 0; i < n; i++) acumulado += (2 * (i + 1) - n - 1) * v[i];
  return acumulado / (n * soma);
}

// ---------------------------------------------------------------------------
// 2. Desigualdade territorial
// ---------------------------------------------------------------------------

export interface LinhaMunicipio {
  id: string;
  nome: string;
  slug: string;
  regiao: string;
  rmgv: boolean;
  projetos: number;
  /** Soma do captado conhecido nos projetos do município. */
  captado: number;
  /** Quantos desses projetos têm valor publicado. */
  projetosComValor: number;
}

export interface DesigualdadeTerritorial {
  municipios: LinhaMunicipio[];
  rmgv: { municipios: number; projetos: number; captado: number };
  interior: { municipios: number; projetos: number; captado: number };
  /** Municípios sem nenhum projeto no exercício. */
  semProjeto: number;
  /** Fração do valor conhecido que ficou na Região Metropolitana. */
  fracaoNaRmgv: number;
  /** Gini do captado entre os 78 municípios, contando os zeros. */
  gini: number;
}

/**
 * Para onde o recurso vai no território.
 *
 * Os 78 municípios entram **todos**, inclusive os que não receberam nada: o
 * zero é o dado. Listar só quem recebeu produziria um mapa onde a política
 * parece chegar a todo lugar.
 *
 * O `gini` daqui conta esses zeros, então é sistematicamente mais alto que o
 * da concentração do capital — são desigualdades de naturezas diferentes e não
 * devem ser comparadas entre si.
 */
export function desigualdadeTerritorial(grafo: Graph): Indicador<DesigualdadeTerritorial> | null {
  const projetos = projetosDe(grafo);
  if (!projetos.length) return null;

  const porMunicipio = new Map<string, { projetos: number; captado: number; comValor: number }>();
  for (const p of projetos) {
    const id = String(p.meta?.municipioId ?? "");
    if (!id) continue;
    const atual = porMunicipio.get(id) ?? { projetos: 0, captado: 0, comValor: 0 };
    atual.projetos += 1;
    if (p.orcamento?.captado !== undefined) {
      atual.captado += p.orcamento.captado;
      atual.comValor += 1;
    }
    porMunicipio.set(id, atual);
  }

  const municipios: LinhaMunicipio[] = MUNICIPIOS.map((m) => {
    const d = porMunicipio.get(m.id) ?? { projetos: 0, captado: 0, comValor: 0 };
    return {
      id: m.id,
      nome: m.nome,
      slug: m.slug,
      regiao: m.regiao,
      rmgv: m.rmgv,
      projetos: d.projetos,
      captado: d.captado,
      projetosComValor: d.comValor,
    };
  }).sort((a, b) => b.captado - a.captado || b.projetos - a.projetos);

  const somar = (teste: (l: LinhaMunicipio) => boolean) => {
    const grupo = municipios.filter(teste);
    return {
      municipios: grupo.length,
      projetos: grupo.reduce((s, l) => s + l.projetos, 0),
      captado: grupo.reduce((s, l) => s + l.captado, 0),
    };
  };
  const rmgv = somar((l) => l.rmgv);
  const interior = somar((l) => !l.rmgv);
  const total = rmgv.captado + interior.captado;

  return {
    dados: {
      municipios,
      rmgv,
      interior,
      semProjeto: municipios.filter((l) => l.projetos === 0).length,
      fracaoNaRmgv: total > 0 ? rmgv.captado / total : 0,
      gini: gini(municipios.map((l) => l.captado)),
    },
    confianca: confiar(
      projetos.filter((p) => p.meta?.municipioId).length,
      projetos.length,
    ),
  };
}

// ---------------------------------------------------------------------------
// 3. Autorizado que virou dinheiro
// ---------------------------------------------------------------------------

export interface LinhaConversao {
  id: string;
  nome: string;
  slug?: string;
  cor?: string;
  autorizado: number;
  captado: number;
  /** `captado / autorizado`. */
  taxa: number;
  projetos: number;
}

export interface ConversaoDeAutorizado {
  geral: { autorizado: number; captado: number; taxa: number };
  porSegmento: LinhaConversao[];
  /** Os proponentes com menor conversão, entre os que têm os dois valores. */
  piores: LinhaConversao[];
  /** Projetos com autorização e captação **publicada como zero**. */
  naoCaptaram: number;
  /** Projetos com autorização e captação não publicada. */
  captacaoDesconhecida: number;
}

/**
 * A distância entre autorizar e arrecadar.
 *
 * Autorização não é recurso: a LICC dá ao projeto um teto de captação, e cabe
 * ao proponente convencer uma empresa contribuinte a aportar. A diferença
 * entre os dois números é o indicador que mostra quem consegue converter.
 *
 * Só entram projetos com **os dois** valores publicados. Um projeto com teto
 * conhecido e captação não publicada não tem taxa — e assumir zero ali
 * fabricaria um fracasso que a fonte não afirma. Esses vão para
 * `captacaoDesconhecida`, separados dos que a fonte declara em zero.
 */
export function conversaoDeAutorizado(grafo: Graph): Indicador<ConversaoDeAutorizado> | null {
  const projetos = projetosDe(grafo);
  const comAutorizacao = projetos.filter((p) => (p.orcamento?.autorizado ?? 0) > 0);
  const completos = comAutorizacao.filter((p) => p.orcamento?.captado !== undefined);
  if (!completos.length) return null;

  const autorizado = completos.reduce((s, p) => s + (p.orcamento?.autorizado ?? 0), 0);
  const captado = completos.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0);

  const agrupar = (
    chave: (p: GraphNode) => string | undefined,
    rotular: (id: string) => { nome: string; slug?: string; cor?: string } | undefined,
  ): LinhaConversao[] => {
    const grupos = new Map<string, { autorizado: number; captado: number; projetos: number }>();
    for (const p of completos) {
      const id = chave(p);
      if (!id) continue;
      const g = grupos.get(id) ?? { autorizado: 0, captado: 0, projetos: 0 };
      g.autorizado += p.orcamento?.autorizado ?? 0;
      g.captado += p.orcamento?.captado ?? 0;
      g.projetos += 1;
      grupos.set(id, g);
    }
    return [...grupos.entries()]
      .map(([id, g]) => {
        const r = rotular(id);
        return {
          id,
          nome: r?.nome ?? id,
          slug: r?.slug,
          cor: r?.cor,
          autorizado: g.autorizado,
          captado: g.captado,
          taxa: g.autorizado > 0 ? g.captado / g.autorizado : 0,
          projetos: g.projetos,
        };
      })
      .sort((a, b) => b.autorizado - a.autorizado);
  };

  const porId = new Map(grafo.nodes.map((n) => [n.id, n]));
  const segmentoPorId = new Map(SEGMENTOS.map((s) => [s.id, s]));

  const porSegmento = agrupar(
    (p) => (p.meta?.segmentoId ? String(p.meta.segmentoId) : undefined),
    (id) => {
      const s = segmentoPorId.get(id);
      return s ? { nome: s.nome, slug: s.slug, cor: s.cor } : undefined;
    },
  );

  const porProponente = agrupar(
    (p) => (p.meta?.proponenteId ? String(p.meta.proponenteId) : undefined),
    (id) => {
      const n = porId.get(id);
      return n ? { nome: n.nome, slug: n.slug } : undefined;
    },
  );

  return {
    dados: {
      geral: { autorizado, captado, taxa: autorizado > 0 ? captado / autorizado : 0 },
      porSegmento,
      piores: [...porProponente].sort((a, b) => a.taxa - b.taxa).slice(0, 8),
      naoCaptaram: completos.filter((p) => p.orcamento?.captado === 0).length,
      captacaoDesconhecida: comAutorizacao.length - completos.length,
    },
    confianca: confiar(completos.length, projetos.length),
  };
}

// ---------------------------------------------------------------------------
// 4. Quem executa
// ---------------------------------------------------------------------------

export interface QuemExecuta {
  porNatureza: Array<{ id: string; nome: string; proponentes: number; projetos: number }>;
  /** Quantos proponentes têm 1, 2, 3… projetos no exercício. */
  distribuicao: Array<{ projetos: number; proponentes: number }>;
  /** Proponentes que atingiram o limite da norma. */
  noLimite: Array<{ id: string; nome: string; slug: string; projetos: number }>;
  /** Limite de projetos por proponente, e se já foi conferido na norma. */
  limite: { valor: number; verificado: boolean; fonte?: Fonte };
  /** Proponentes sem natureza jurídica conhecida. */
  semNatureza: number;
}

const ROTULO_NATUREZA: Record<string, string> = {
  pessoa_fisica: "Pessoa física",
  pessoa_juridica: "Pessoa jurídica",
  coletivo: "Coletivo",
  organizacao_sem_fins_lucrativos: "Organização sem fins lucrativos",
  prefeitura: "Prefeitura",
};

/**
 * Quem propõe, e com que reincidência.
 *
 * O limite de projetos por proponente vem de `REGRAS`, com o próprio
 * `verificado` junto: hoje ele é `false` — a regra está citada por fonte
 * secundária e não foi conferida no texto da instrução normativa. O indicador
 * carrega esse estado em vez de escondê-lo, porque apontar quem "estourou o
 * limite" com base em regra não conferida seria acusar sem fonte.
 */
export function quemExecuta(grafo: Graph): Indicador<QuemExecuta> | null {
  const proponentes = grafo.nodes.filter((n) => n.kind === "proponente");
  if (!proponentes.length) return null;

  const projetosPor = new Map<string, number>();
  for (const p of projetosDe(grafo)) {
    const id = String(p.meta?.proponenteId ?? "");
    if (id) projetosPor.set(id, (projetosPor.get(id) ?? 0) + 1);
  }

  const naturezas = new Map<string, { proponentes: number; projetos: number }>();
  for (const p of proponentes) {
    const nat = p.meta?.natureza ? String(p.meta.natureza) : undefined;
    if (!nat) continue;
    const g = naturezas.get(nat) ?? { proponentes: 0, projetos: 0 };
    g.proponentes += 1;
    g.projetos += projetosPor.get(p.id) ?? 0;
    naturezas.set(nat, g);
  }

  const contagens = new Map<number, number>();
  for (const p of proponentes) {
    const q = projetosPor.get(p.id) ?? 0;
    if (q === 0) continue;
    contagens.set(q, (contagens.get(q) ?? 0) + 1);
  }

  const regra = REGRAS.find((r) => r.id === "limite-projetos-por-proponente");
  const limite = regra?.limite ?? 3;

  return {
    dados: {
      porNatureza: [...naturezas.entries()]
        .map(([id, g]) => ({ id, nome: ROTULO_NATUREZA[id] ?? id, ...g }))
        .sort((a, b) => b.proponentes - a.proponentes),
      distribuicao: [...contagens.entries()]
        .map(([projetos, quantos]) => ({ projetos, proponentes: quantos }))
        .sort((a, b) => a.projetos - b.projetos),
      noLimite: proponentes
        .filter((p) => (projetosPor.get(p.id) ?? 0) >= limite)
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          slug: p.slug,
          projetos: projetosPor.get(p.id) ?? 0,
        }))
        .sort((a, b) => b.projetos - a.projetos),
      limite: { valor: limite, verificado: regra?.verificado ?? false, fonte: regra?.fonte },
      semNatureza: proponentes.filter((p) => !p.meta?.natureza).length,
    },
    confianca: confiar(
      proponentes.filter((p) => p.meta?.natureza).length,
      proponentes.length,
    ),
  };
}

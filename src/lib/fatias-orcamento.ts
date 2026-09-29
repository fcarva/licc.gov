/**
 * Grafo → fatias da rosca do orçamento.
 *
 * Mora aqui, e não em `src/ontology/`, pelo mesmo motivo de `radial.ts`: é
 * derivação de vista a partir do grafo, não verdade do modelo. E **sem
 * diretiva**, de propósito — valor exportado de módulo `"use client"` chega ao
 * componente de servidor como referência de cliente, que foi o que já deixou a
 * legenda de um gráfico transparente enquanto o gráfico ao lado pintava certo.
 *
 * Há duas agregações porque a rosca responde a duas perguntas com a mesma
 * geometria de grupo → detalhe: por **linguagem** e por **território**.
 */

import type { Graph, GraphNode } from "@/types/graph";
import { REGIOES, type Regiao } from "@/ontology/municipios";
import { corDaRegiao, corDoSegmento } from "@/ontology/paleta-orcamento";

export interface FatiaSunburst {
  id: string;
  rotulo: string;
  valor: number;
  cor: string;
  filhos?: Array<{ id: string; rotulo: string; valor: number }>;
}

/** Neutro do Flexoki, para o que é lacuna medida e não categoria. */
const NEUTRO = "#B7B5AC";

const captado = (n: GraphNode): number => n.orcamento?.captado ?? 0;

const porValor = (a: { valor: number }, b: { valor: number }) => b.valor - a.valor;

const comoFilho = (n: GraphNode) => ({ id: n.id, rotulo: n.nome, valor: captado(n) });

// ---------------------------------------------------------------------------
// Por linguagem cultural
// ---------------------------------------------------------------------------

/** Segmentos no anel interno, os projetos de cada um no externo. */
export function montarFatiasPorSegmento(grafo: Graph): FatiaSunburst[] {
  const projetos = grafo.nodes.filter((n) => n.kind === "projeto");
  const porSegmento = grafo.nodes
    .filter((n) => n.kind === "segmento" && captado(n) > 0)
    .map((seg) => ({
      id: seg.id,
      rotulo: seg.nome,
      valor: captado(seg),
      // A rosca usa a paleta vívida do orçamento, não a pastel do grafo:
      // fatias finas precisam continuar distinguíveis lado a lado.
      cor: corDoSegmento(seg.id),
      filhos: projetos
        .filter((p) => p.meta?.segmentoId === seg.id && captado(p) > 0)
        .sort((a, b) => captado(b) - captado(a))
        .map(comoFilho),
    }))
    .sort(porValor);

  // Projeto sem linguagem classificada é **fatia própria**, não sobra.
  //
  // O arco cinza da rosca significa "teto ainda não captado", e ele é a
  // diferença entre o teto e a soma das fatias. Enquanto os projetos sem
  // segmento ficavam de fora, essa diferença os absorvia: em 2025 o captado é
  // 100% do teto, e mesmo assim 45% do círculo aparecia cinza — o gráfico
  // dizia que o Estado não captou metade da renúncia quando captou tudo.
  //
  // Com fatia própria, o cinza volta a medir só o que não foi captado, e a
  // lacuna de classificação aparece pelo que é: uma lacuna nossa, do tamanho
  // que ela tem.
  const semLinguagem = projetos.filter((p) => !p.meta?.segmentoId && captado(p) > 0);
  if (!semLinguagem.length) return porSegmento;

  return [
    ...porSegmento,
    {
      id: "sem-linguagem",
      rotulo: "Sem linguagem classificada",
      valor: semLinguagem.reduce((s, p) => s + captado(p), 0),
      cor: NEUTRO,
      filhos: [...semLinguagem].sort((a, b) => captado(b) - captado(a)).map(comoFilho),
    },
  ];
}

// ---------------------------------------------------------------------------
// Por território
// ---------------------------------------------------------------------------

/**
 * Microrregiões no anel interno, os municípios de cada uma no externo.
 *
 * ## Por que rosca e não mapa
 *
 * Grupo → detalhe é exatamente a semântica da rosca, e microrregião → município
 * é uma hierarquia de verdade, publicada pelo Estado. Mapa exigiria geodado que
 * não temos: o IBGE está bloqueado pela política de egresso, e desenhar
 * fronteira de memória seria inventar geografia num painel de transparência.
 *
 * ## O valor é o atribuído, nunca somado aqui
 *
 * A fatia lê `municipio.orcamento.captado` — o que o construtor atribuiu, com a
 * regra de que dinheiro entra só onde a fonte nomeia **um** município. Somar por
 * conta própria a lista de projetos presentes foi o defeito que fez oito
 * municípios publicarem dois números diferentes, contando o valor dos projetos
 * multi-município uma vez em cada um deles.
 *
 * Daí decorre que a soma das fatias é R$ 14,37 mi, não R$ 25 mi: os R$ 10,63 mi
 * sem município atribuído aparecem no arco cinza, que é onde pertencem. Se esta
 * rosca fechar em R$ 18,59 mi, o duplo cômputo voltou.
 */
export function montarFatiasPorTerritorio(grafo: Graph): FatiaSunburst[] {
  const municipios = grafo.nodes.filter((n) => n.kind === "municipio");

  const porRegiao = new Map<string, GraphNode[]>();
  for (const m of municipios) {
    if (captado(m) <= 0) continue;
    const regiao = String(m.meta?.regiao ?? "Não informada");
    (porRegiao.get(regiao) ?? porRegiao.set(regiao, []).get(regiao)!).push(m);
  }

  return [...porRegiao]
    .map(([regiao, seus]) => ({
      id: `regiao-${regiao}`,
      rotulo: regiao,
      valor: seus.reduce((s, m) => s + captado(m), 0),
      // Cor ancorada na ordem da ontologia, não na de exibição: a rosca ordena
      // por valor, e amarrar a cor à identidade é o que faz a fatia e a linha da
      // tabela se reconhecerem como a mesma coisa.
      cor: corDaRegiao(regiao),
      filhos: [...seus].sort((a, b) => captado(b) - captado(a)).map(comoFilho),
    }))
    .sort(porValor);
}

/**
 * Quantas microrregiões a rosca territorial desenha, das dez que existem.
 *
 * A página precisa disto para dizer que as ausentes não receberam nada — quatro
 * das dez, hoje. Ausência que não se declara se lê como se não existisse.
 */
export function regioesSemCaptacao(grafo: Graph): Regiao[] {
  const comValor = new Set(
    grafo.nodes
      .filter((n) => n.kind === "municipio" && (n.orcamento?.captado ?? 0) > 0)
      .map((n) => String(n.meta?.regiao ?? "")),
  );
  return REGIOES.filter((r) => !comValor.has(r));
}

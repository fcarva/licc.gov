/**
 * Cores de marca dos gráficos de indicador.
 *
 * ## Por que num módulo próprio, e não junto dos gráficos
 *
 * Estas constantes moravam em `GraficosIndicadores.tsx`, que é `"use client"`.
 * A página de indicadores é componente de servidor e importava dali — e o
 * Next entrega **toda** exportação de um módulo cliente como referência de
 * cliente, não como valor. As cores chegavam `undefined`, e o efeito visível
 * era a legenda com os quadradinhos transparentes enquanto o gráfico ao lado
 * pintava certo (o gráfico roda no cliente, onde o valor existe).
 *
 * Valor compartilhado entre servidor e cliente mora em módulo sem diretiva.
 *
 * ## Por que estas cores, e não a paleta do orçamento
 *
 * Conferidas com o validador de paleta, não escolhidas no olho. Todas passam
 * a banda de luminosidade, o piso de croma e o contraste de 3:1 contra a
 * superfície **nos dois temas**; o par do território separa por ΔE 23,5 na
 * visão normal e 19,7 em deuteranopia.
 *
 * A `PALETA_ORCAMENTO` medida do CivLab **reprova** como paleta de gráfico:
 * fica acima da banda de luminosidade, abaixo do piso de croma, e `#c9b3fc`
 * com `#ffb3c9` ficam a ΔE 10,7 um do outro — indistinguíveis mesmo para quem
 * enxerga todas as cores. Ela continua certa na rosca, onde as fatias são
 * largas, separadas por traço branco e nomeadas no arco; como marca fina de
 * gráfico, não.
 *
 * `#f27836` (público) e `#f25eef` (proponente) ficaram de fora por contraste:
 * 2,72 e 2,68 contra a superfície clara, abaixo do mínimo de 3.
 */

/** Aporte das empresas — mesma família do vértice `patrocinador`. */
export const COR_CAPITAL = "#c15ef2";
/** Captação realizada — mesma família do vértice `projeto`. */
export const COR_CONVERSAO = "#826dc8";
/** Região Metropolitana da Grande Vitória. */
export const COR_RMGV = "#826dc8";
/** Interior — mesma família do vértice `municipio`. */
export const COR_INTERIOR = "#6a8f4d";
/** Perfil de quem executa. */
export const COR_EXECUCAO = "#c15ef2";

export const CORES_GRAFICO = {
  capital: COR_CAPITAL,
  conversao: COR_CONVERSAO,
  rmgv: COR_RMGV,
  interior: COR_INTERIOR,
  execucao: COR_EXECUCAO,
} as const;

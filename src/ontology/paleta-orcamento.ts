/**
 * Paleta do painel de orçamento.
 *
 * Família distinta da do grafo: enquanto os anéis usam pastéis suaves, a rosca
 * de orçamento do SF Government Graph usa cores **vívidas e saturadas**, para
 * que fatias finas continuem distinguíveis lado a lado.
 *
 * Os seis primeiros valores foram aferidos por varredura polar dos quadros da
 * gravação; os três últimos completam o conjunto para os nove segmentos da
 * LICC, mantidos na mesma luminosidade e saturação dos medidos.
 */

import { SEGMENTOS } from "./segmentos";

/** Matizes do anel interno — a área que agrupa. */
export const PALETA_ORCAMENTO = [
  "#f8da84", // âmbar      (aferido)
  "#9cc2fc", // azul-milho (aferido)
  "#d1fe89", // lima       (aferido)
  "#f48d4a", // coral      (aferido)
  "#4cffb2", // verde-primavera (aferido)
  "#8ae9f7", // ciano      (aferido)
  "#ffb3c9", // rosa
  "#c9b3fc", // lilás
  "#ffcba4", // pêssego
] as const;

/**
 * Clareia uma cor em direção ao branco.
 *
 * No original, o anel externo é o mesmo matiz do interno com cerca de 30% de
 * branco por cima — foi assim que `#f48d4a` (área) virou `#f9b387`
 * (departamento). Manter a relação, em vez de escolher duas cores soltas, é o
 * que faz o olho ler o anel externo como detalhamento do interno.
 */
export function clarear(hex: string, fracao = 0.32): string {
  const n = parseInt(hex.slice(1), 16);
  const misturar = (canal: number) =>
    Math.round(canal + (255 - canal) * fracao);
  return (
    "#" +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((c) => misturar(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Escurece para o texto sobre fundo claro manter contraste legível. */
export function escurecer(hex: string, fracao = 0.42): string {
  const n = parseInt(hex.slice(1), 16);
  const misturar = (canal: number) => Math.round(canal * (1 - fracao));
  return (
    "#" +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((c) => misturar(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Cor de orçamento estável para um índice qualquer. */
export function corOrcamento(indice: number): string {
  return PALETA_ORCAMENTO[indice % PALETA_ORCAMENTO.length];
}

/**
 * Cor de um segmento no painel de orçamento.
 *
 * Ancorada na ordem da ontologia, não na ordem de exibição: a rosca ordena por
 * valor e a lista lateral também, mas nada garante que as duas cheguem à mesma
 * sequência. Amarrar a cor à identidade do segmento é o que faz a faixa da
 * lista e a fatia da rosca serem reconhecíveis como a mesma coisa.
 */
export function corDoSegmento(idSegmento: string): string {
  const i = SEGMENTOS.findIndex((s) => s.id === idSegmento);
  return corOrcamento(i >= 0 ? i : 0);
}

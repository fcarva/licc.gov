/**
 * Paleta do painel de orçamento — **Flexoki**.
 *
 * ## De onde vem, e por que trocou
 *
 * Os valores são do Flexoki (Steph Ango, MIT), lidos de `css/flexoki.css` no
 * repositório `kepano/flexoki`, não de memória nem de amostragem de tela.
 *
 * A paleta anterior vinha por varredura polar dos quadros da gravação do SF
 * Government Graph. **Esta troca é divergência deliberada da fidelidade ao
 * CivLab**, pedida para o painel de orçamento; os anéis do grafo seguem com a
 * paleta aferida, que continua descrita no `CLAUDE.md`.
 *
 * ## A ordem não é gosto — foi buscada
 *
 * O validador de paleta confere o pior par **adjacente**, então a ordem decide
 * a aprovação. Em vez de tentar no olho, `scripts/validate_palette.js` foi
 * rodado sobre permutações das oito matizes e ficou a de melhor separação:
 *
 *     vermelho → azul → laranja → roxo → verde → ciano → amarelo → magenta
 *
 * Resultado nas duas superfícies do projeto (`#ebeae4` e `#101013`):
 * separação CVD 12,7 (piso 8), visão normal 15,5 (piso 15), banda de
 * luminosidade e contraste no escuro aprovados. **Uma paleta serve os dois
 * temas** — daí não haver variante escura a manter em sincronia.
 *
 * ## Os dois desvios, declarados
 *
 * 1. **O ciano reprova o piso de croma, e é da paleta.** O teal do Flexoki não
 *    alcança o piso em degrau nenhum — 0,075 no 700, 0,086 no 600, 0,093 no
 *    500. Ficou o 600, que é o de melhor separação. As regras duras do
 *    validador (CVD ≥ 8 e visão normal ≥ 15) passam; o piso de croma existe
 *    para marca fina não virar cinza, e aqui as marcas são arcos largos, com
 *    nome escrito no arco e traço de 2px entre fatias.
 * 2. **O contraste de laranja, verde e amarelo fica abaixo de 3:1 no claro.**
 *    O validador chama isso de "relief required (visible labels or table
 *    view)", e a rosca tem as duas coisas.
 *
 * ## Nove segmentos, oito matizes
 *
 * O Flexoki tem oito acentos e a ontologia, nove segmentos. O nono recebe o
 * neutro `#6F6E69`, que é a dobra em "outros" que o método prescreve — gerar
 * uma nona matiz seria inventar cor fora do sistema.
 */

import { REGIOES, type Regiao } from "./municipios";
import { SEGMENTOS } from "./segmentos";

/** Matizes do anel interno, na ordem que o validador aprovou. */
export const PALETA_ORCAMENTO = [
  "#D14D41", // red-400
  "#3171B2", // blue-500
  "#DA702C", // orange-400
  "#735EB5", // purple-500
  "#879A39", // green-400
  "#24837B", // cyan-600
  "#AD8301", // yellow-600
  "#C04F79", // magenta-500
  "#6F6E69", // flexoki-600 — o nono, sem matiz própria
] as const;

/** Papel do Flexoki: para onde o anel externo clareia. */
export const PAPEL_FLEXOKI = "#FFFCF0";

/**
 * Clareia uma cor em direção ao **papel do Flexoki**, não ao branco puro.
 *
 * O anel externo é o mesmo matiz do interno lavado de claro: é isso que faz o
 * olho ler o externo como detalhamento do interno, em vez de duas cores
 * soltas. Mirar `#FFFCF0` em vez de `#FFFFFF` mantém o calor do sistema — num
 * fundo creme, clarear para branco puro esfria a fatia e a destaca do papel.
 */
export function clarear(hex: string, fracao = 0.42): string {
  const n = parseInt(hex.slice(1), 16);
  const papel = [0xff, 0xfc, 0xf0];
  return (
    "#" +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((canal, i) =>
        Math.round(canal + (papel[i] - canal) * fracao)
          .toString(16)
          .padStart(2, "0"),
      )
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
 * Cor de uma microrregião na rosca territorial.
 *
 * As microrregiões são **dez** e a paleta tem nove matizes, então o décimo
 * índice cairia de volta na primeira cor se isto usasse `corOrcamento` cru —
 * ciclar matiz é o que o método proíbe, porque duas fatias vizinhas passariam a
 * ter a mesma cor sem nada indicar que são coisas diferentes. Além da paleta vai
 * o neutro, que é a dobra em "outros" que o método prescreve.
 *
 * Hoje só seis microrregiões têm captação, então o caso é latente — mas latente
 * é o que quebra quando a fonte muda, não quando o código muda.
 */
export function corDaRegiao(regiao: string): string {
  const i = REGIOES.indexOf(regiao as Regiao);
  if (i < 0 || i >= PALETA_ORCAMENTO.length - 1) return PALETA_ORCAMENTO[PALETA_ORCAMENTO.length - 1];
  return PALETA_ORCAMENTO[i];
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

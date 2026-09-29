/**
 * PRNG determinístico compartilhado.
 *
 * Morava dentro de `pipeline/seed/gerar.ts`, onde servia um consumidor só. A
 * auditoria de segmentos é o segundo: amostra sorteada tem de ser reproduzível,
 * senão duas execuções medem conjuntos diferentes e a comparação entre elas não
 * quer dizer nada.
 */

/** O mesmo `seed` sempre produz a mesma sequência. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Embaralha uma cópia com Fisher-Yates, usando o gerador dado.
 *
 * Existe para a amostra ser **sorteada**, não "os N primeiros": a ordem dos
 * anexos da SECULT é por página, que correlaciona com cota e com valor, então
 * cortar o começo da lista amostraria um estrato em vez do conjunto.
 */
export function embaralhar<T>(itens: readonly T[], rnd: () => number): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Utilitários de texto compartilhados pelo pipeline e pela busca. */

const DIACRITICOS = /[̀-ͯ]/g;

/** Minúsculas, sem acento, sem espaço nas pontas. Base de toda comparação. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(DIACRITICOS, "").toLowerCase().trim();
}

/** Gera um slug estável e legível para URLs. */
export function slugificar(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Compara ignorando acento e caixa. */
export function contem(alvo: string, termo: string): boolean {
  return normalizar(alvo).includes(normalizar(termo));
}

/**
 * Dois nomes designam a mesma coisa?
 *
 * Existe porque as fontes da LICC não coincidem na grafia: o anexo da SECULT
 * escreve "Mostra de Teatro de Colatina", o Mapa Cultural registra "MOSTRA DE
 * TEATRO DE COLATINA - 3ª edição", e casar por igualdade perderia o vínculo.
 *
 * Três critérios, do mais forte ao mais frouxo:
 *   1. igualdade após normalizar;
 *   2. um contém o outro, com pelo menos 8 caracteres — abaixo disso "Arte"
 *      casaria com "Artesanato";
 *   3. Jaccard sobre bigramas ≥ 0,4, que tolera sufixo, edição e pontuação.
 */
export function nomesCorrespondem(a: string, b: string): boolean {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (na === nb) return true;

  if (Math.min(na.length, nb.length) >= 8 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }

  const bigramas = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigramas(na);
  const bb = bigramas(nb);
  if (!ba.size || !bb.size) return false;

  let intersecao = 0;
  for (const bg of ba) if (bb.has(bg)) intersecao++;
  return intersecao / (ba.size + bb.size - intersecao) >= 0.4;
}

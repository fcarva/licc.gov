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

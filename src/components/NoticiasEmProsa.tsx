import Link from "next/link";
import type { GraphNode, Noticia } from "@/types/graph";
import { Glifo } from "./Glifo";

export interface NoticiaComEntidade extends Noticia {
  entidade: string;
  entidadeSlug: string;
  entidadeKind: GraphNode["kind"];
}

/**
 * Últimas notícias em prosa corrida, com as entidades linkadas dentro do texto
 * e uma nota de rodapé numerada apontando a fonte.
 *
 * É o formato do CivLab, e a escolha não é estética: um parágrafo em que cada
 * órgão citado é clicável e cada afirmação tem número de referência transforma
 * o feed em responsabilização. Uma lista de manchetes não faz isso.
 */
export function NoticiasEmProsa({ noticias }: { noticias: NoticiaComEntidade[] }) {
  const destaques = noticias.slice(0, 4);
  if (!destaques.length) {
    return <p className="text-sm text-tinta-fraca">Nenhuma publicação carregada.</p>;
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-tinta-suave">
        {destaques.map((n, i) => {
          const repeteEntidade =
            i > 0 && destaques[i - 1].entidadeSlug === n.entidadeSlug;
          return (
          <span key={n.id}>
            {repeteEntidade ? null : (
            <Link
              href={`/entidade/${n.entidadeSlug}`}
              className="inline-flex items-baseline gap-1 font-medium text-tinta underline decoration-borda-forte underline-offset-2 transition-colors hover:decoration-tinta"
            >
              <Glifo kind={n.entidadeKind} className="translate-y-[0.1em]" />
              {n.entidade}
            </Link>
            )}
            {repeteEntidade ? "" : " "}
            {frase(n.titulo, n.entidade, !repeteEntidade)}
            {n.url ? (
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer noopener"
                title={`${n.veiculo} — ${n.titulo}`}
                className="align-super text-[10px] text-realce hover:underline"
              >
                {i + 1}
              </a>
            ) : null}{" "}
          </span>
          );
        })}
      </p>

      <ol className="mt-3 space-y-0.5 border-t border-borda pt-2.5">
        {destaques.map((n, i) => (
          <li key={n.id} className="text-[11px] leading-relaxed text-tinta-fraca">
            <span className="tabular mr-1">{i + 1}.</span>
            {n.veiculo}
            {n.url ? (
              <>
                {" — "}
                <a
                  href={n.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-realce underline underline-offset-2 hover:opacity-80"
                >
                  ver publicação
                </a>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Reaproveita a manchete como oração após o nome da entidade linkado.
 *
 * A manchete costuma repetir o nome da entidade ("Projeto habilitado: Mostra
 * de Teatro de Colatina"); como esse nome já é o link que abre a frase,
 * repeti-lo produziria "Mostra de Teatro de Colatina projeto habilitado:
 * Mostra de Teatro de Colatina". Aqui ele sai.
 */
function frase(titulo: string, entidade: string, minuscular: boolean): string {
  let limpo = titulo.replace(/\s+/g, " ").trim();

  // Remove o nome da entidade e o que o anuncia (": ", " — ", " - ").
  const escapada = entidade.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  limpo = limpo
    .replace(new RegExp(`\\s*[:—-]?\\s*${escapada}\\s*`, "gi"), " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s:—-]+$/, "")
    .trim();

  if (!limpo) return "teve movimentação registrada.";
  const texto = minuscular ? descapitalizar(limpo) : limpo;
  return /[.!?]$/.test(texto) ? texto : `${texto}.`;
}

/**
 * Minuscula a inicial para a manchete emendar no nome da entidade, mas
 * preserva siglas: "LICC 2026…" não pode virar "lICC 2026…".
 */
function descapitalizar(texto: string): string {
  const primeiraPalavra = texto.split(/\s|:/)[0] ?? "";
  const ehSigla = primeiraPalavra.length > 1 && primeiraPalavra === primeiraPalavra.toUpperCase();
  return ehSigla ? texto : texto.charAt(0).toLowerCase() + texto.slice(1);
}

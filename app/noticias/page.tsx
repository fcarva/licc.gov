import type { Metadata } from "next";
import Link from "next/link";
import { listarNoticias } from "@/lib/dados";
import { dataLonga } from "@/lib/format";
import { Pagina } from "@/components/Pagina";
import { SeloProveniencia } from "@/components/SeloProveniencia";

export const metadata: Metadata = {
  title: "Notícias",
  description:
    "Publicações da SECULT-ES, do Governo do Espírito Santo e do Diário Oficial vinculadas às entidades da LICC.",
};

export default function PaginaNoticias() {
  const noticias = listarNoticias(200);

  return (
    <Pagina
      titulo="Notícias e transparência"
      subtitulo={
        <>
          Cada publicação fica vinculada à entidade que ela afeta — é assim que
          o feed vira responsabilização e não apenas um mural. Clique na
          entidade para ver a publicação no contexto do grafo.
        </>
      }
    >
      {noticias.length ? (
        <ol className="space-y-px overflow-hidden rounded-lg border border-borda bg-papel">
          {noticias.map((n) => (
            <li key={n.id} className="border-b border-borda p-4 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time
                  dateTime={n.data}
                  className="tabular text-xs text-tinta-fraca"
                >
                  {dataLonga(n.data)}
                </time>
                <span className="text-xs text-tinta-fraca">·</span>
                <span className="text-xs text-tinta-fraca">{n.veiculo}</span>
                {n.proveniencia !== "oficial" ? (
                  <SeloProveniencia proveniencia={n.proveniencia} />
                ) : null}
              </div>

              <h2 className="mt-1.5 text-base font-medium leading-snug text-tinta">
                {n.url ? (
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline-offset-2 hover:underline"
                  >
                    {n.titulo}
                  </a>
                ) : (
                  n.titulo
                )}
              </h2>

              {n.resumo ? (
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-tinta-suave">
                  {n.resumo}
                </p>
              ) : null}

              <p className="mt-2">
                <Link
                  href={`/entidade/${n.entidadeSlug}`}
                  className="text-xs text-realce underline underline-offset-2 hover:opacity-80"
                >
                  {n.entidade} →
                </Link>
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-tinta-fraca">Nenhuma publicação carregada.</p>
      )}
    </Pagina>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obterPanorama, listarNos } from "@/lib/dados";
import { brl, numero, percentual, dataLonga, rotuloStatus } from "@/lib/format";
import { Cartao, TituloSecao, Trilha, Metrica } from "@/components/Coluna";
import { NODE_KINDS } from "@/ontology/nodes";
import { SeloProveniencia } from "@/components/SeloProveniencia";

export async function generateStaticParams() {
  return listarNos("municipio").map((m) => ({ municipio: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ municipio: string }>;
}): Promise<Metadata> {
  const { municipio } = await params;
  const p = obterPanorama(municipio);
  if (!p) return { title: "Município não encontrado" };
  return {
    title: `${p.municipio.nome} — monitor`,
    description: `Projetos da LICC, espaços culturais e agenda em ${p.municipio.nome} (ES).`,
  };
}

export default async function PaginaMonitorMunicipio({
  params,
}: {
  params: Promise<{ municipio: string }>;
}) {
  const { municipio } = await params;
  const p = obterPanorama(municipio);
  if (!p) notFound();

  const rmgv = Boolean(p.municipio.meta?.regiaoMetropolitana);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Trilha
        itens={[
          { rotulo: "licc.gov", href: "/" },
          { rotulo: "Monitor", href: "/monitor" },
          { rotulo: p.municipio.nome },
        ]}
      />

      <div className="mt-4 flex flex-col gap-4">
        <Cartao>
          <h1 className="text-2xl font-semibold tracking-tight text-tinta">
            {p.municipio.nome}
          </h1>
          <p className="mt-1.5 text-sm text-tinta-suave">
            Microrregião {String(p.municipio.meta?.regiao ?? "—")}
            {rmgv
              ? " · integra a Região Metropolitana da Grande Vitória"
              : " · fora da Região Metropolitana, conta para a cota de 10%"}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <Metrica rotulo="Captado" valor={p.captado > 0 ? brl(p.captado) : "—"} />
            <Metrica
              rotulo="Autorizado"
              valor={p.autorizado > 0 ? brl(p.autorizado) : "—"}
              nota={p.autorizado > 0 ? `${percentual(p.captado / p.autorizado)} executado` : undefined}
            />
            <Metrica rotulo="Espaços culturais" valor={numero(p.espacos.length)} />
            <Metrica rotulo="Eventos na agenda" valor={numero(p.eventos.length)} />
          </div>

          <p className="mt-4">
            <Link
              href={`/entidade/${p.municipio.slug}`}
              className="text-xs text-realce underline underline-offset-2 hover:opacity-80"
            >
              Ver o município no grafo →
            </Link>
          </p>
        </Cartao>

        {p.projetos.length ? (
          <Cartao>
            <TituloSecao>
              Projetos incentivados{" "}
              <span className="font-normal text-tinta-fraca">{p.projetos.length}</span>
            </TituloSecao>
            <ul className="divide-y divide-borda">
              {p.projetos
                .sort((a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0))
                .map((proj) => (
                  <li key={proj.id} className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: NODE_KINDS.projeto.cor }}
                    />
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/entidade/${proj.slug}`}
                        className="text-sm text-tinta underline-offset-2 hover:underline"
                      >
                        {proj.nome}
                      </Link>
                      <span className="block text-[11px] text-tinta-fraca">
                        {rotuloStatus(String(proj.meta?.status))}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm text-tinta">
                      {brl(proj.orcamento?.captado ?? 0)}
                    </span>
                  </li>
                ))}
            </ul>
          </Cartao>
        ) : (
          <Cartao>
            <TituloSecao>Projetos incentivados</TituloSecao>
            <p className="text-sm leading-relaxed text-tinta-suave">
              Nenhum projeto da LICC tem {p.municipio.nome} como local de execução
              prioritária no exercício carregado. A ausência é o dado.
            </p>
          </Cartao>
        )}

        {p.espacos.length ? (
          <Cartao>
            <TituloSecao>
              Espaços culturais{" "}
              <span className="font-normal text-tinta-fraca">{p.espacos.length}</span>
            </TituloSecao>
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.espacos.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-borda p-3"
                >
                  <p className="flex items-center gap-1.5 text-sm text-tinta">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: NODE_KINDS.espaco.cor }}
                    />
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">
                        {e.nome}
                      </a>
                    ) : (
                      e.nome
                    )}
                  </p>
                  {e.meta?.acessivel !== undefined ? (
                    <p className="mt-1 text-[11px] text-tinta-fraca">
                      {e.meta.acessivel ? "Acessível" : "Acessibilidade não informada"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-borda pt-2.5">
              <SeloProveniencia proveniencia={p.espacos[0].proveniencia} />
            </p>
          </Cartao>
        ) : null}

        {p.eventos.length ? (
          <Cartao>
            <TituloSecao>
              Agenda cultural{" "}
              <span className="font-normal text-tinta-fraca">{p.eventos.length}</span>
            </TituloSecao>
            <ul className="divide-y divide-borda">
              {p.eventos.slice(0, 30).map((ev) => (
                <li key={ev.id} className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0">
                  <time
                    dateTime={String(ev.meta?.inicio ?? "")}
                    className="tabular shrink-0 text-[11px] text-tinta-fraca"
                  >
                    {ev.meta?.inicio ? dataLonga(String(ev.meta.inicio)) : "sem data"}
                  </time>
                  <span className="min-w-0 flex-1 text-sm text-tinta">
                    {ev.url ? (
                      <a href={ev.url} target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">
                        {ev.nome}
                      </a>
                    ) : (
                      ev.nome
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Cartao>
        ) : null}

        {p.proponentes.length ? (
          <Cartao>
            <TituloSecao>
              Agentes sediados aqui{" "}
              <span className="font-normal text-tinta-fraca">{p.proponentes.length}</span>
            </TituloSecao>
            <ul className="flex flex-wrap gap-1.5">
              {p.proponentes.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/entidade/${a.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-borda px-3 py-1.5 text-xs text-tinta-suave transition-colors hover:border-borda-forte hover:text-tinta"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: NODE_KINDS.proponente.cor }}
                    />
                    {a.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        ) : null}
      </div>
    </div>
  );
}

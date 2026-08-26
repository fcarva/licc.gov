import type { Metadata } from "next";
import Link from "next/link";
import { listarNos, obterEstatisticas } from "@/lib/dados";
import { brl, numero, percentual } from "@/lib/format";
import { Pagina } from "@/components/Pagina";
import { BarraExecucao } from "@/components/BarraExecucao";
import { SEGMENTOS } from "@/ontology";

export const metadata: Metadata = {
  title: "Segmentos culturais",
  description:
    "Distribuição dos recursos da LICC pelas áreas culturais, segundo a taxonomia da plataforma Mapas Culturais.",
};

export default function PaginaSegmentos() {
  const stats = obterEstatisticas();
  const projetos = listarNos("projeto");
  const segmentos = listarNos("segmento").sort(
    (a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0),
  );

  return (
    <Pagina
      titulo="Segmentos culturais"
      subtitulo={
        <>
          A LICC aceita projetos em qualquer linguagem cultural, de modo que a
          norma não fecha uma lista de segmentos. O agrupamento abaixo deriva da
          taxonomia de área da plataforma Mapas Culturais — a mesma que o Mapa
          Cultural do Espírito Santo usa — e serve como eixo de leitura, não
          como classificação oficial.
        </>
      }
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {segmentos.map((s) => {
          const spec = SEGMENTOS.find((x) => x.id === s.id);
          const doSegmento = projetos.filter((p) => p.meta?.segmentoId === s.id);
          const autorizado = s.orcamento?.autorizado ?? 0;
          const captado = s.orcamento?.captado ?? 0;
          const fatia = stats.captado > 0 ? captado / stats.captado : 0;

          return (
            <li key={s.id}>
              <Link
                href={`/entidade/${s.slug}`}
                className="block h-full rounded-lg border border-borda bg-papel p-4 transition-colors hover:border-borda-forte hover:bg-papel-suave"
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: spec?.cor ?? "var(--color-segmento)" }}
                  />
                  <h2 className="flex-1 text-sm font-semibold leading-snug text-tinta">
                    {s.nome}
                  </h2>
                </div>

                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-tinta-fraca">
                  {s.descricao}
                </p>

                <dl className="mt-3 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-xs text-tinta-fraca">Projetos</dt>
                    <dd className="tabular text-xs text-tinta-suave">
                      {numero(doSegmento.length)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-xs text-tinta-fraca">Autorizado</dt>
                    <dd className="tabular text-xs text-tinta-suave">{brl(autorizado)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-xs text-tinta-fraca">Captado</dt>
                    <dd className="tabular text-sm font-semibold text-tinta">{brl(captado)}</dd>
                  </div>
                </dl>

                <div className="mt-3">
                  <BarraExecucao autorizado={autorizado} captado={captado} compacta />
                  <p className="mt-1.5 text-[11px] text-tinta-fraca">
                    {percentual(fatia)} de tudo que foi captado no exercício
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Pagina>
  );
}

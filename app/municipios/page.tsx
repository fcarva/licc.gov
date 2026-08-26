import type { Metadata } from "next";
import Link from "next/link";
import { listarNos } from "@/lib/dados";
import { brl, numero, percentual } from "@/lib/format";
import { Pagina, Tabela } from "@/components/Pagina";
import { REGIOES } from "@/ontology";

export const metadata: Metadata = {
  title: "Municípios",
  description:
    "Distribuição territorial dos recursos da LICC pelos 78 municípios capixabas e a conferência da cota de 10% fora da Região Metropolitana.",
};

export default function PaginaMunicipios() {
  const municipios = listarNos("municipio");
  const projetos = listarNos("projeto");

  const contagem = new Map<string, number>();
  for (const p of projetos) {
    const id = String(p.meta?.municipioId ?? "");
    if (id) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }

  const atendidos = municipios.filter((m) => (contagem.get(m.id) ?? 0) > 0);
  const semProjeto = municipios.filter((m) => (contagem.get(m.id) ?? 0) === 0);

  const foraRmgv = municipios.filter((m) => !m.meta?.regiaoMetropolitana);
  const captadoForaRmgv = foraRmgv.reduce((s, m) => s + (m.orcamento?.captado ?? 0), 0);
  const captadoTotal = municipios.reduce((s, m) => s + (m.orcamento?.captado ?? 0), 0);

  const ordenados = [...atendidos].sort(
    (a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0),
  );

  return (
    <Pagina
      titulo="Distribuição territorial"
      subtitulo={
        <>
          A LICC reserva 10% dos recursos a projetos executados fora da Região
          Metropolitana da Grande Vitória. Esta página mostra onde o recurso
          efetivamente chega — e onde ainda não chegou.
        </>
      }
    >
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Cartao
          rotulo="Municípios atendidos"
          valor={`${numero(atendidos.length)} de 78`}
          nota={`${numero(semProjeto.length)} sem nenhum projeto no exercício`}
        />
        <Cartao
          rotulo="Captado fora da RMGV"
          valor={brl(captadoForaRmgv)}
          nota={`${percentual(captadoTotal > 0 ? captadoForaRmgv / captadoTotal : 0)} do total captado`}
        />
        <Cartao
          rotulo="Microrregiões"
          valor={numero(REGIOES.length)}
          nota="agrupamento de planejamento do Estado"
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-tinta">
          Municípios com projetos no exercício
        </h2>
        <Tabela
          colunas={[
            { rotulo: "Município" },
            { rotulo: "Microrregião" },
            { rotulo: "RMGV" },
            { rotulo: "Projetos", alinhar: "direita" },
            { rotulo: "Captado", alinhar: "direita" },
          ]}
        >
          {ordenados.map((m) => (
            <tr key={m.id} className="transition-colors hover:bg-papel-suave">
              <td className="px-3 py-2.5">
                <Link href={`/entidade/${m.slug}`} className="text-tinta underline-offset-2 hover:underline">
                  {m.nome}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-tinta-suave">{String(m.meta?.regiao ?? "—")}</td>
              <td className="px-3 py-2.5 text-tinta-fraca">
                {m.meta?.regiaoMetropolitana ? "Sim" : "—"}
              </td>
              <td className="tabular px-3 py-2.5 text-right text-tinta-suave">
                {numero(contagem.get(m.id) ?? 0)}
              </td>
              <td className="tabular px-3 py-2.5 text-right font-medium text-tinta">
                {brl(m.orcamento?.captado ?? 0)}
              </td>
            </tr>
          ))}
        </Tabela>
      </section>

      {semProjeto.length ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-tinta">
            Municípios sem projeto no exercício
          </h2>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-tinta-suave">
            Ausência aqui é informação: são {numero(semProjeto.length)} municípios
            capixabas que não aparecem como local de execução prioritária de
            nenhum projeto no recorte carregado.
          </p>
          <p className="text-sm leading-relaxed text-tinta-fraca">
            {semProjeto.map((m) => m.nome).join(" · ")}
          </p>
        </section>
      ) : null}
    </Pagina>
  );
}

function Cartao({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-lg border border-borda bg-papel p-4">
      <p className="text-[11px] uppercase tracking-wide text-tinta-fraca">{rotulo}</p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-tinta">{valor}</p>
      <p className="mt-0.5 text-xs text-tinta-fraca">{nota}</p>
    </div>
  );
}

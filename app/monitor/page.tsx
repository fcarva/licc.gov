import type { Metadata } from "next";
import Link from "next/link";
import { listarPanoramas, obterEstatisticas } from "@/lib/dados";
import { brl, numero, percentual } from "@/lib/format";
import { Cartao, TituloSecao, Trilha } from "@/components/Coluna";

export const metadata: Metadata = {
  title: "Monitor territorial",
  description:
    "O que existe e o que acontece em cada município capixaba: projetos da LICC, espaços culturais e agenda, a partir do Mapa Cultural do Espírito Santo.",
};

/**
 * Índice do monitor territorial.
 *
 * É a camada inspirada no Republic do CivLab, que acompanha a cidade e os
 * bairros. Aqui a unidade é o município, e o que se monitora é a chegada
 * efetiva da política: onde há projeto, onde há equipamento, onde há agenda —
 * e onde não há nada.
 */
export default function PaginaMonitor() {
  const itens = listarPanoramas();
  const stats = obterEstatisticas();

  const comProjeto = itens.filter((i) => i.projetos > 0);
  const semNada = itens.filter((i) => !i.projetos && !i.espacos && !i.eventos);
  const totalEspacos = itens.reduce((s, i) => s + i.espacos, 0);
  const totalEventos = itens.reduce((s, i) => s + i.eventos, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Trilha itens={[{ rotulo: "licc.gov", href: "/" }, { rotulo: "Monitor" }]} />

      <div className="mt-4 flex flex-col gap-4">
        <Cartao>
          <h1 className="text-2xl font-semibold tracking-tight text-tinta">
            Monitor territorial
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-tinta-suave">
            A LICC reserva 10% dos recursos para fora da Região Metropolitana da
            Grande Vitória. Esta página acompanha o que de fato chega a cada um
            dos 78 municípios: projetos incentivados, espaços culturais e a
            agenda que neles acontece. Onde não há linha, também é informação.
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Contagem rotulo="Com projeto" valor={`${numero(comProjeto.length)}/78`} nota={percentual(comProjeto.length / 78)} />
            <Contagem rotulo="Espaços culturais" valor={numero(totalEspacos)} />
            <Contagem rotulo="Eventos na agenda" valor={numero(totalEventos)} />
            <Contagem rotulo="Sem nenhum registro" valor={numero(semNada.length)} nota="municípios" />
          </dl>
        </Cartao>

        <Cartao padded={false}>
          <div className="p-5 pb-3">
            <TituloSecao>Municípios</TituloSecao>
            <p className="text-xs text-tinta-fraca">
              Ordenados pelo valor captado no exercício. {brl(stats.captado)} no total.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-y border-borda">
                  {["Município", "Microrregião", "RMGV", "Projetos", "Espaços", "Agenda", "Captado"].map(
                    (c, i) => (
                      <th
                        key={c}
                        scope="col"
                        className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca ${
                          i >= 3 ? "text-right" : "text-left"
                        }`}
                      >
                        {c}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {itens.map((m) => (
                  <tr key={m.slug} className="transition-colors hover:bg-papel-fundo">
                    <td className="px-3 py-2">
                      <Link
                        href={`/monitor/${m.slug}`}
                        className="text-tinta underline-offset-2 hover:underline"
                      >
                        {m.nome}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-tinta-suave">{m.regiao}</td>
                    <td className="px-3 py-2 text-tinta-fraca">{m.rmgv ? "Sim" : "—"}</td>
                    <td className="tabular px-3 py-2 text-right text-tinta-suave">{numero(m.projetos)}</td>
                    <td className="tabular px-3 py-2 text-right text-tinta-suave">{numero(m.espacos)}</td>
                    <td className="tabular px-3 py-2 text-right text-tinta-suave">{numero(m.eventos)}</td>
                    <td className="tabular px-3 py-2 text-right font-medium text-tinta">
                      {m.captado > 0 ? brl(m.captado) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      </div>
    </div>
  );
}

function Contagem({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div>
      <dt className="text-xs text-tinta-suave">{rotulo}</dt>
      <dd className="tabular mt-0.5 text-xl font-semibold tracking-tight text-tinta">{valor}</dd>
      {nota ? <dd className="text-[11px] text-tinta-fraca">{nota}</dd> : null}
    </div>
  );
}

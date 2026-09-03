import type { Metadata } from "next";
import Link from "next/link";
import { obterEstatisticas, obterGrafo, listarNos } from "@/lib/dados";
import { brl, numero, percentual } from "@/lib/format";
import { Pagina, Tabela } from "@/components/Pagina";
import { BarraExecucao } from "@/components/BarraExecucao";
import { REGRAS } from "@/ontology";

export const metadata: Metadata = {
  title: "Orçamento",
  description:
    "Execução orçamentária da Lei de Incentivo à Cultura Capixaba: teto autorizado, valor captado e conferência das cotas de 30% e 10%.",
};

export default function PaginaOrcamento() {
  const grafo = obterGrafo();
  const stats = obterEstatisticas();

  const todosSegmentos = listarNos("segmento");
  const todosProjetos = listarNos("projeto");

  const segmentosComProjetos = todosSegmentos
    .map((s) => ({
      seg: s,
      projetos: todosProjetos.filter((p) => p.meta?.segmentoId === s.id),
    }))
    .filter(({ projetos }) => projetos.length > 0)
    .sort((a, b) => b.projetos.length - a.projetos.length);

  const temDadosFinanceiros = segmentosComProjetos.some(
    ({ seg }) => (seg.orcamento?.autorizado ?? 0) > 0,
  );

  const municipiosProjetos = listarNos("municipio")
    .map((m) => ({
      mun: m,
      projetos: todosProjetos.filter((p) => p.meta?.municipioId === m.id).length,
      autorizado: m.orcamento?.autorizado ?? 0,
      captado: m.orcamento?.captado ?? 0,
      regiao: String(m.meta?.regiao ?? "Não informada"),
    }))
    .filter(({ projetos }) => projetos > 0)
    .sort((a, b) => b.projetos - a.projetos);

  // Resumo por microrregião agrupando contagem de projetos
  const regiaoMap = new Map<string, { projetos: number; autorizado: number; captado: number }>();
  for (const item of municipiosProjetos) {
    const atual = regiaoMap.get(item.regiao) ?? { projetos: 0, autorizado: 0, captado: 0 };
    atual.projetos += item.projetos;
    atual.autorizado += item.autorizado;
    atual.captado += item.captado;
    regiaoMap.set(item.regiao, atual);
  }
  const regioes = [...regiaoMap.entries()].sort((a, b) => b[1].projetos - a[1].projetos);

  return (
    <Pagina
      titulo={`Orçamento da LICC — exercício ${grafo.meta.ano}`}
      subtitulo={
        <>
          O teto de {brl(grafo.meta.tetoAutorizado)} é a renúncia de ICMS que o
          Estado autoriza para o exercício. Os projetos consomem esse teto ao
          receber autorização de captação; só vira dinheiro quando uma empresa
          contribuinte de fato aporta.
        </>
      }
    >
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Cartao rotulo="Teto autorizado" valor={brl(grafo.meta.tetoAutorizado)} nota="Portaria SEFAZ nº 01-R/2025" />
        <Cartao
          rotulo="Autorizado em projetos"
          valor={brl(stats.autorizado)}
          nota={`${percentual(stats.comprometimentoDoTeto)} do teto comprometido`}
        />
        <Cartao
          rotulo="Efetivamente captado"
          valor={brl(stats.captado)}
          nota={`${percentual(stats.execucao)} do autorizado`}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-tinta">Cotas obrigatórias</h2>
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-tinta-suave">
          A instrução normativa reserva parcelas do teto para finalidades
          específicas. A conferência abaixo compara o reservado com o que os
          projetos do exercício de fato ocupam.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.cotas.map((c) => {
            const regra = REGRAS.find((r) => r.id === c.regraId);
            return (
              <div key={c.regraId} className="rounded-lg border border-borda bg-papel p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-snug text-tinta">{c.titulo}</h3>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      c.atendida === null
                        ? "bg-cinza-medio text-tinta-fraca"
                        : c.atendida
                          ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-600/10 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {c.atendida === null ? "sem dado" : c.atendida ? "atendida" : "abaixo"}
                  </span>
                </div>
                {/*
                  Cota sem projeto classificável não mostra número. A tarja já
                  dizia "sem dado", mas logo abaixo saía "R$ 0 de R$ 12.500.000"
                  com a barra vazia — que se lê como "o Estado não destinou
                  nada", quando a verdade é que a fonte não publica o campo que
                  classifica a cota. Tarja e número têm de contar a mesma coisa.
                */}
                {c.atendida === null ? (
                  <p className="mt-2 text-xs leading-relaxed text-tinta-fraca">
                    Reserva de {brl(c.reservado)}. Nenhum dos{" "}
                    {numero(c.classificaveis.total)} projetos traz o campo que
                    classifica esta cota, então não há o que apurar — nem a favor,
                    nem contra.
                  </p>
                ) : (
                  <>
                    <p className="tabular mt-2 text-sm text-tinta">
                      {brl(c.alocado)}{" "}
                      <span className="text-tinta-fraca">de {brl(c.reservado)}</span>
                    </p>
                    <div className="mt-2">
                      <BarraExecucao autorizado={c.reservado} captado={Math.min(c.alocado, c.reservado)} compacta />
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-tinta-fraca">
                      {percentual(c.cumprimento)} da reserva ocupada.
                      {c.classificaveis.comDado < c.classificaveis.total
                        ? ` Apurado sobre ${c.classificaveis.comDado} de ${c.classificaveis.total} projetos.`
                        : ""}
                    </p>
                  </>
                )}
                {regra && !regra.verificado ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-tinta-fraca">
                    Regra ainda não conferida na fonte primária.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-tinta">Por segmento cultural</h2>
        {!temDadosFinanceiros && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            Os valores financeiros serão preenchidos quando a SECULT publicar os resultados de captação.
          </p>
        )}
        <Tabela
          colunas={[
            { rotulo: "Segmento" },
            { rotulo: "Projetos", alinhar: "direita" },
            ...(temDadosFinanceiros
              ? [
                  { rotulo: "Autorizado", alinhar: "direita" as const },
                  { rotulo: "Captado", alinhar: "direita" as const },
                  { rotulo: "Execução", alinhar: "direita" as const },
                ]
              : []),
          ]}
        >
          {segmentosComProjetos.map(({ seg: s, projetos }) => {
            const a = s.orcamento?.autorizado ?? 0;
            const c = s.orcamento?.captado ?? 0;
            return (
              <tr key={s.id} className="transition-colors hover:bg-papel-suave">
                <td className="px-3 py-2.5">
                  <Link href={`/entidade/${s.slug}`} className="text-tinta underline-offset-2 hover:underline">
                    {s.nome}
                  </Link>
                </td>
                <td className="tabular px-3 py-2.5 text-right font-medium text-tinta">{numero(projetos.length)}</td>
                {temDadosFinanceiros && (
                  <>
                    <td className="tabular px-3 py-2.5 text-right text-tinta-suave">{brl(a)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium text-tinta">{brl(c)}</td>
                    <td className="px-3 py-2.5">
                      <div className="ml-auto w-24">
                        <BarraExecucao autorizado={a} captado={c} compacta />
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </Tabela>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-tinta">Por microrregião (resumo)</h2>
        <Tabela
          colunas={[
            { rotulo: "Microrregião" },
            { rotulo: "Projetos", alinhar: "direita" },
          ]}
        >
          {regioes.map(([nome, v]) => (
            <tr key={nome} className="transition-colors hover:bg-papel-suave">
              <td className="px-3 py-2.5 text-tinta">{nome}</td>
              <td className="tabular px-3 py-2.5 text-right font-medium text-tinta">{numero(v.projetos)}</td>
            </tr>
          ))}
        </Tabela>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-tinta">Por microrregião</h2>
        <Tabela
          colunas={[
            { rotulo: "Município" },
            { rotulo: "Microrregião" },
            { rotulo: "Projetos", alinhar: "direita" },
          ]}
        >
          {municipiosProjetos.map(({ mun, projetos, regiao }) => (
            <tr key={mun.id} className="transition-colors hover:bg-papel-suave">
              <td className="px-3 py-2.5">
                <Link href={`/entidade/${mun.slug}`} className="text-tinta underline-offset-2 hover:underline">
                  {mun.nome}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-tinta-suave">{regiao}</td>
              <td className="tabular px-3 py-2.5 text-right font-medium text-tinta">{numero(projetos)}</td>
            </tr>
          ))}
        </Tabela>
      </section>
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

import Link from "next/link";
import { obterGrafo, obterEstatisticas, listarNoticias, listarNos } from "@/lib/dados";
import { HomeGrafo } from "@/components/HomeGrafo";
import { Cartao, TituloSecao, Metrica } from "@/components/Coluna";
import { NoticiasEmProsa, type NoticiaComEntidade } from "@/components/NoticiasEmProsa";
import type { NodeKind } from "@/types/graph";
import { Glifo } from "@/components/Glifo";
import { brl, numero, percentual } from "@/lib/format";

/**
 * Tela principal: coluna-documento à esquerda, grafo do ecossistema à direita.
 *
 * O grafo inteiro é serializado no HTML — são poucas centenas de vértices, o
 * que dispensa uma rodada extra de fetch e deixa a primeira pintura imediata.
 */
export default function PaginaInicial() {
  const grafo = obterGrafo();
  const stats = obterEstatisticas();

  const porId = new Map(grafo.nodes.map((n) => [n.slug, n]));
  // Publicações oficiais primeiro: numa abertura de página, o que a SECULT
  // divulgou vale mais que um marco de tramitação do conjunto de demonstração.
  const noticias: NoticiaComEntidade[] = listarNoticias(400)
    .map((n) => ({
      ...n,
      entidadeKind: porId.get(n.entidadeSlug)?.kind ?? ("governanca" as const),
    }))
    .sort((a, b) => {
      const pa = a.proveniencia === "oficial" ? 0 : 1;
      const pb = b.proveniencia === "oficial" ? 0 : 1;
      return pa - pb || b.data.localeCompare(a.data);
    })
    .slice(0, 12);

  const segmentos = listarNos("segmento")
    .filter((s) => (s.orcamento?.captado ?? 0) > 0)
    .sort((a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0));

  const emFoco = [
    grafo.nodes.find((n) => n.slug === "secult-es"),
    grafo.nodes.find((n) => n.slug === "sefaz-es"),
    grafo.nodes.find((n) => n.slug === "comissao-de-analise-de-projetos"),
    ...listarNos("patrocinador")
      .sort((a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0))
      .slice(0, 2),
  ].filter(Boolean);

  const variacaoCaptado = (() => {
    const antes = grafo.nodes
      .filter((n) => n.kind === "projeto")
      .reduce((s, p) => s + (p.orcamento?.anterior?.captado ?? 0), 0);
    return antes > 0 ? (stats.captado - antes) / antes : null;
  })();

  return (
    <HomeGrafo
      grafo={grafo}
      orcamento={{
        segmentos,
        totais: { autorizado: stats.autorizado, captado: stats.captado },
        cotas: stats.cotas,
        variacaoCaptado,
      }}
      coluna={
        <>
          <Cartao>
            <TituloSecao
              acao={
                <Link href="/noticias" className="text-xs text-realce underline-offset-2 hover:underline">
                  Ler mais
                </Link>
              }
            >
              Últimas notícias
            </TituloSecao>
            <NoticiasEmProsa noticias={noticias} />
          </Cartao>

          <Cartao>
            <TituloSecao
              acao={
                <Link href="/segmentos" className="text-xs text-realce underline-offset-2 hover:underline">
                  Ver todos
                </Link>
              }
            >
              Temas em alta
            </TituloSecao>
            <ul className="flex flex-wrap gap-1.5">
              {segmentos.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/entidade/${s.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-borda px-3 py-1.5 text-xs text-tinta-suave transition-colors hover:border-borda-forte hover:text-tinta"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: String(s.meta?.cor ?? "var(--color-segmento)") }}
                    />
                    {s.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao>
            <TituloSecao>Entidades em foco</TituloSecao>
            <ul className="grid gap-2 sm:grid-cols-2">
              {emFoco.map((e) => (
                <li key={e!.id}>
                  <Link
                    href={`/entidade/${e!.slug}`}
                    className="flex h-full flex-col rounded-xl border border-borda p-3 transition-colors hover:border-borda-forte hover:bg-papel-fundo"
                  >
                    <span className="flex items-center gap-1.5">
                      <Glifo kind={e!.kind} />
                      <span className="truncate text-xs font-medium text-tinta">
                        {e!.sigla ?? e!.nome}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-tinta-fraca">
                      {e!.descricao}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao>
            <TituloSecao>Panorama</TituloSecao>
            <p className="mb-3 text-xs leading-relaxed text-tinta-fraca">
              Quem participa do ciclo da LICC no exercício {grafo.meta.ano}.
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Contagem kind="governanca" rotulo="Órgãos" valor={listarNos("governanca").length} />
              <Contagem kind="patrocinador" rotulo="Patrocinadores" valor={stats.totalPatrocinadores} />
              <Contagem kind="proponente" rotulo="Proponentes" valor={stats.totalProponentes} />
              <Contagem kind="projeto" rotulo="Projetos" valor={stats.totalProjetos} />
              <Contagem kind="segmento" rotulo="Segmentos" valor={segmentos.length} />
              <Contagem kind="municipio" rotulo="Municípios" valor={stats.totalMunicipiosAtendidos} nota="de 78" />
            </dl>
          </Cartao>

          <Cartao>
            <TituloSecao
              acao={
                <Link href="/orcamento" className="text-xs text-realce underline-offset-2 hover:underline">
                  Explorar orçamento
                </Link>
              }
            >
              Este exercício{" "}
              <span className="font-normal text-tinta-fraca">{grafo.meta.ano}</span>
            </TituloSecao>
            <div className="grid gap-4 sm:grid-cols-2">
              <Metrica
                rotulo="Teto autorizado"
                valor={brl(grafo.meta.tetoAutorizado)}
                nota="Portaria SEFAZ nº 01-R"
              />
              <Metrica
                rotulo="Autorizado em projetos"
                valor={brl(stats.autorizado)}
                nota={`${percentual(stats.comprometimentoDoTeto)} do teto`}
              />
              <Metrica
                rotulo="Efetivamente captado"
                valor={brl(stats.captado)}
                nota={`${percentual(stats.execucao)} do autorizado`}
                variacao={variacaoCaptado}
              />
              <div>
                <p className="text-xs text-tinta-suave">Cotas obrigatórias</p>
                <ul className="mt-1 space-y-0.5">
                  {stats.cotas.map((c) => (
                    <li key={c.regraId} className="flex items-baseline gap-1.5 text-[11px]">
                      <span
                        className={
                          c.atendida === null
                            ? "text-tinta-suave"
                            : c.atendida
                              ? "text-[var(--color-patrocinador)]"
                              : "text-[var(--color-projeto)]"
                        }
                        title={c.atendida === null ? "a fonte não publica o campo que classifica esta cota" : undefined}
                      >
                        {c.atendida === null ? "–" : c.atendida ? "✓" : "✗"}
                      </span>
                      <span className="truncate text-tinta-fraca">{c.titulo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Cartao>

          <Cartao>
            <TituloSecao>Sobre</TituloSecao>
            <p className="text-sm leading-relaxed text-tinta-suave">
              Não se governa o que não se entende. Este é um catálogo relacional
              da Lei de Incentivo à Cultura Capixaba: quem aprova, quem aporta,
              quem executa, o que se produz — e sob qual norma. Use para achar
              entidades, valores, notícias e a base legal de cada uma.
            </p>
            <p className="mt-2.5 text-xs italic leading-relaxed text-tinta-fraca">
              Projeto independente. Não é um sítio oficial da SECULT-ES nem do
              Governo do Estado do Espírito Santo.
            </p>
            <p className="mt-3 border-t border-borda pt-2.5 text-xs text-tinta-fraca">
              <Link href="/sobre" className="text-realce underline underline-offset-2 hover:opacity-80">
                Metodologia e proveniência
              </Link>
              {" · "}
              <Link href="/monitor" className="text-realce underline underline-offset-2 hover:opacity-80">
                Monitor por município
              </Link>
            </p>
          </Cartao>
        </>
      }
    />
  );
}

function Contagem({
  rotulo,
  valor,
  nota,
  kind,
}: {
  rotulo: string;
  valor: number;
  nota?: string;
  kind: NodeKind;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-tinta-suave">
        <Glifo kind={kind} />
        {rotulo}
      </dt>
      <dd className="tabular mt-0.5 text-lg font-semibold tracking-tight text-tinta">
        {numero(valor)}
        {nota ? <span className="ml-1 text-xs font-normal text-tinta-fraca">{nota}</span> : null}
      </dd>
    </div>
  );
}

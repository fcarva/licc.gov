import type { Metadata } from "next";
import Link from "next/link";
import { obterGrafo, obterEstatisticas } from "@/lib/dados";
import { numero, percentual, brl } from "@/lib/format";
import { Pagina } from "@/components/Pagina";
import { SeloProveniencia } from "@/components/SeloProveniencia";
import { NODE_KIND_LIST } from "@/ontology/nodes";
import { EDGE_KIND_LIST } from "@/ontology/edges";
import { FUNDAMENTOS, REGRAS } from "@/ontology";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Metodologia, ontologia do grafo, fontes de dados e proveniência do licc.gov.",
};

export default function PaginaSobre() {
  const grafo = obterGrafo();
  const stats = obterEstatisticas();
  const c = grafo.meta.contagemPorProveniencia;
  const total = c.oficial + c.derivado + c.demonstracao;

  return (
    <Pagina
      titulo="Sobre o licc.gov"
      subtitulo={
        <>
          Um catálogo relacional da Lei de Incentivo à Cultura Capixaba, na
          linha do <em>SF Government Graph</em> do CivLab: entidades tipadas,
          ligadas por relações nomeadas, cada uma ancorada na norma que a
          institui — e não apenas um painel financeiro.
        </>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-tinta">
              Proveniência dos dados
            </h2>
            <p className="mb-4 max-w-3xl text-sm leading-relaxed text-tinta-suave">
              Um grafo bonito de dados sintéticos é indistinguível de um grafo
              bonito de dados reais. Para que essa confusão nunca aconteça, todo
              registro carrega um selo, e o selo aparece na interface.
            </p>
            <ul className="space-y-3">
              {[
                {
                  p: "oficial" as const,
                  n: c.oficial,
                  d: "Extraído de publicação da SECULT-ES, da SEFAZ-ES, do Governo do ES ou do Mapa Cultural do Espírito Santo, com link para a fonte.",
                },
                {
                  p: "derivado" as const,
                  n: c.derivado,
                  d: "Calculado ou classificado a partir de dados oficiais — agregações por segmento e município, e a taxonomia de área da plataforma Mapas Culturais.",
                },
                {
                  p: "demonstracao" as const,
                  n: c.demonstracao,
                  d: "Registro fictício, gerado localmente para exercitar a interface enquanto a coleta real não roda. Nomes usam letras gregas justamente para não serem confundidos com agentes reais.",
                },
              ].map((i) => (
                <li key={i.p} className="rounded-lg border border-borda bg-papel p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <SeloProveniencia proveniencia={i.p} />
                    <span className="tabular text-sm font-medium text-tinta">
                      {numero(i.n)} registros
                    </span>
                    <span className="text-xs text-tinta-fraca">
                      {percentual(total > 0 ? i.n / total : 0)} do grafo
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{i.d}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-tinta">
              Como a coleta real funciona
            </h2>
            <p className="mb-3 max-w-3xl text-sm leading-relaxed text-tinta-suave">
              O Mapa Cultural do Espírito Santo roda a plataforma{" "}
              <em>Mapas Culturais</em>, que expõe uma API REST pública em{" "}
              <code className="rounded bg-papel-suave px-1 py-0.5 font-mono text-xs">
                /api/&#123;entidade&#125;/find
              </code>
              . O pipeline consulta agentes, projetos, espaços e oportunidades,
              classifica cada projeto pela taxonomia de área e monta os vértices
              e arestas deste grafo.
            </p>
            <pre className="rolagem-fina overflow-x-auto rounded-lg border border-borda bg-papel-suave p-3 font-mono text-xs leading-relaxed text-tinta-suave">
{`npm run ingest      # coleta mapa.cultura.es.gov.br → data/raw/
npm run build:graph # consolida agregados → data/graph.json
npm run data        # os dois passos em sequência`}
            </pre>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-tinta-suave">
              A plataforma não expõe publicamente as inscrições de uma
              oportunidade — esse endpoint exige autenticação por JWT. Onde o
              valor financeiro de um projeto não estiver disponível na fonte, o
              campo fica ausente. Nunca estimado.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-tinta">Ontologia</h2>
            <h3 className="mb-2 text-sm font-medium text-tinta">
              Vértices <span className="font-normal text-tinta-fraca">({NODE_KIND_LIST.length} categorias)</span>
            </h3>
            <ul className="mb-6 divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-papel">
              {NODE_KIND_LIST.map((k) => (
                <li key={k.kind} className="flex gap-3 p-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: k.cor }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-tinta">
                      {k.rotuloPlural}
                      <span className="ml-2 font-mono text-[11px] font-normal text-tinta-fraca">
                        ≈ {k.analogoCivLab}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-tinta-fraca">
                      {k.descricao}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <h3 className="mb-2 text-sm font-medium text-tinta">
              Arestas <span className="font-normal text-tinta-fraca">({EDGE_KIND_LIST.length} relações)</span>
            </h3>
            <ul className="divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-papel">
              {EDGE_KIND_LIST.map((e) => (
                <li key={e.kind} className="p-3">
                  <p className="text-sm text-tinta">
                    <span className="font-medium">{e.rotulo}</span>
                    {e.financeira ? (
                      <span className="ml-2 rounded bg-papel-suave px-1.5 py-0.5 text-[11px] text-tinta-fraca">
                        peso em R$
                      </span>
                    ) : null}
                    <span className="ml-2 font-mono text-[11px] text-tinta-fraca">
                      ≈ {e.analogoCivLab}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-tinta-fraca">
                    {e.descricao}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-tinta">
              Normas e regras auditadas
            </h2>
            <ul className="mb-4 divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-papel">
              {FUNDAMENTOS.map((f) => (
                <li key={f.id} className="p-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link
                      href={`/entidade/${f.slug}`}
                      className="text-sm font-medium text-tinta underline-offset-2 hover:underline"
                    >
                      {f.norma}
                    </Link>
                    {!f.verificado ? (
                      <span className="rounded bg-amber-600/10 px-1.5 py-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                        não conferida
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-tinta-fraca">
                    {f.nome} — {f.descricao}
                  </p>
                </li>
              ))}
            </ul>
            <ul className="divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-papel">
              {REGRAS.map((r) => (
                <li key={r.id} className="p-3">
                  <p className="text-sm font-medium text-tinta">
                    {r.titulo}
                    {/*
                      Duas tarjas, porque são dois estados independentes: uma
                      regra pode estar conferida no texto e ainda assim ser
                      inapurável com o que o grafo tem, e a recíproca também
                      vale. Fundi-las esconderia justamente o caso que importa.
                    */}
                    {!r.verificado ? (
                      <span className="ml-2 rounded bg-amber-600/10 px-1.5 py-0.5 text-[11px] font-normal text-amber-800 dark:text-amber-300">
                        não conferida
                      </span>
                    ) : null}
                    {r.naoApuravel ? (
                      <span className="ml-2 rounded bg-cinza-medio px-1.5 py-0.5 text-[11px] font-normal text-tinta-fraca">
                        não apurável aqui
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-tinta-fraca">
                    {r.descricao}
                  </p>
                  {r.naoApuravel ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-tinta-fraca">
                      <span className="text-tinta-suave">
                        Este painel não apura o cumprimento:
                      </span>{" "}
                      {r.naoApuravel}.
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-tinta-fraca">
                    Fonte:{" "}
                    {r.fonte.url ? (
                      <a
                        href={r.fonte.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-realce underline underline-offset-2"
                      >
                        {r.fonte.rotulo}
                      </a>
                    ) : (
                      r.fonte.rotulo
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-tinta">Referências de projeto</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-tinta-suave">
              O arranjo de tela — grafo de força ocupando o centro, camadas à
              esquerda, painel de contexto com abas de visão geral, orçamento e
              notícias à direita, busca global com atalho de teclado — segue o{" "}
              <em>SF Government Graph</em> do CivLab. A ideia de ancorar cada
              entidade na norma que a institui, e de manter um vértice raiz
              representando a população, também vem de lá. Os dados são todos
              capixabas.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-borda bg-papel p-4">
            <h2 className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
              O grafo em números
            </h2>
            <dl className="space-y-2">
              {[
                ["Vértices", numero(grafo.nodes.length)],
                ["Arestas", numero(grafo.edges.length)],
                ["Projetos", numero(stats.totalProjetos)],
                ["Proponentes", numero(stats.totalProponentes)],
                ["Patrocinadores", numero(stats.totalPatrocinadores)],
                ["Teto do exercício", brl(grafo.meta.tetoAutorizado)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-tinta-fraca">{k}</dt>
                  <dd className="tabular text-xs text-tinta-suave">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-borda pt-2.5 text-[11px] text-tinta-fraca">
              Gerado em{" "}
              {new Date(grafo.meta.geradoEm).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </section>

          <section className="rounded-lg border border-borda bg-papel p-4">
            <h2 className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
              Fontes
            </h2>
            <ul className="space-y-1.5">
              {grafo.meta.fontes.map((f, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-realce underline underline-offset-2 hover:opacity-80"
                    >
                      {f.rotulo}
                    </a>
                  ) : (
                    <span className="text-tinta-fraca">{f.rotulo}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-borda bg-papel p-4">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
              Independência
            </h2>
            <p className="text-xs leading-relaxed text-tinta-fraca">
              Projeto independente. Não é um sítio oficial da SECULT-ES nem do
              Governo do Estado do Espírito Santo.
            </p>
          </section>
        </aside>
      </div>
    </Pagina>
  );
}

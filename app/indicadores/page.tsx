import type { Metadata } from "next";
import Link from "next/link";
import { obterGrafo, obterEstatisticas } from "@/lib/dados";
import { brl, brlCurto, numero, percentual } from "@/lib/format";
import { Pagina } from "@/components/Pagina";
import { Cartao, TituloSecao } from "@/components/Coluna";
import { Grafico, Destaque, TabelaGrafico } from "@/components/Grafico";
import {
  CurvaDeConcentracao,
  TiraMunicipios,
  LinhasDeConversao,
  BarrasSimples,
} from "@/components/GraficosIndicadores";
import { CORES_GRAFICO } from "@/ontology/paleta-grafico";
import {
  concentracaoDoCapital,
  desigualdadeTerritorial,
  conversaoDeAutorizado,
  quemExecuta,
} from "@/lib/indicadores";

export const metadata: Metadata = {
  title: "Indicadores",
  description:
    "Concentração do capital, desigualdade territorial, conversão de autorizado em captado e perfil de quem executa na Lei de Incentivo à Cultura Capixaba.",
};

export default function PaginaIndicadores() {
  const grafo = obterGrafo();
  const stats = obterEstatisticas();
  const ano = grafo.meta.ano;

  const capital = concentracaoDoCapital(grafo);
  const territorio = desigualdadeTerritorial(grafo);
  const conversao = conversaoDeAutorizado(grafo);
  const execucao = quemExecuta(grafo);

  return (
    <Pagina
      titulo="Indicadores"
      subtitulo={
        <>
          Quatro perguntas sobre a LICC {ano} que só um número responde: quem
          banca, para onde vai, quanto da autorização vira dinheiro e quem
          executa. Cada gráfico declara sobre quantos registros foi apurado.
        </>
      }
    >
      <div className="space-y-5">
        <CoberturaDosDados stats={stats} ano={ano} />

        {capital ? (
          <Cartao>
            <Grafico
              titulo="1. Quem banca a cultura capixaba"
              descricao="O aporte de cada empresa contribuinte, acumulado da maior para a menor. Quanto mais a curva se afasta da diagonal, mais concentrado está o financiamento da política."
              confianca={{ ...capital.confianca, unidade: "empresas patrocinadoras" }}
              series={[
                { rotulo: "aporte acumulado", cor: CORES_GRAFICO.capital },
                { rotulo: "igualdade perfeita", cor: "var(--color-tinta-fraca)", tracejada: true },
              ]}
              nota={
                <>
                  A base são os aportes com valor publicado, não o teto dos
                  projetos: é o que a empresa de fato pôs, e não o que ela
                  poderia ter posto.
                </>
              }
              tabela={
                <TabelaGrafico
                  legenda="Aporte por empresa patrocinadora, em ordem decrescente"
                  colunas={["Empresa", "Aportado", "Do total", "Acumulado", "Projetos"]}
                  linhas={capital.dados.empresas.map((e) => ({
                    chave: e.id,
                    celulas: [
                      <Link key="n" href={`/entidade/${e.slug}`} className="underline-offset-2 hover:underline">
                        {e.nome}
                      </Link>,
                      brl(e.aportado),
                      percentual(e.fracao, 1),
                      percentual(e.acumulado, 1),
                      numero(e.projetos),
                    ],
                  }))}
                />
              }
            >
              <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:items-center">
                <CurvaDeConcentracao
                  empresas={capital.dados.empresas}
                  total={capital.dados.total}
                  empresasParaMetade={capital.dados.empresasParaMetade}
                />
                <div className="space-y-5">
                  <Destaque
                    valor={numero(capital.dados.empresasParaMetade)}
                    rotulo={`empresas, de ${numero(capital.dados.empresas.length)}, respondem por metade de tudo que foi aportado`}
                    cor={CORES_GRAFICO.capital}
                  />
                  <Destaque
                    valor={percentual(capital.dados.fracaoDasTresMaiores, 1)}
                    rotulo="do total está nas três maiores"
                    nota={`Gini ${capital.dados.gini.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} sobre o aporte por empresa`}
                  />
                </div>
              </div>
            </Grafico>
          </Cartao>
        ) : null}

        {territorio ? (
          <Cartao>
            <Grafico
              titulo="2. Para onde o recurso chega"
              descricao="Os 78 municípios capixabas em ordem decrescente de captação. Todos aparecem, inclusive os que não receberam nada — a cauda vazia à direita é o dado, não uma falha do gráfico."
              confianca={{ ...territorio.confianca, unidade: "projetos com município identificado" }}
              series={[
                { rotulo: "Região Metropolitana da Grande Vitória", cor: CORES_GRAFICO.rmgv },
                { rotulo: "interior", cor: CORES_GRAFICO.interior },
              ]}
              nota={
                <>
                  A cota legal reserva 10% do teto para fora da Região
                  Metropolitana. Ela é o piso, não o retrato:{" "}
                  <Link href="/orcamento" className="text-realce underline underline-offset-2">
                    veja o cumprimento das cotas
                  </Link>
                  .
                </>
              }
              tabela={
                <TabelaGrafico
                  legenda="Captação por município"
                  colunas={["Município", "Região", "Projetos", "Captado"]}
                  linhas={territorio.dados.municipios.map((m) => ({
                    chave: m.id,
                    celulas: [
                      <Link key="n" href={`/monitor/${m.slug}`} className="underline-offset-2 hover:underline">
                        {m.nome}
                      </Link>,
                      m.rmgv ? "RMGV" : m.regiao,
                      numero(m.projetos),
                      m.captado > 0 ? brl(m.captado) : "—",
                    ],
                  }))}
                />
              }
            >
              <TiraMunicipios municipios={territorio.dados.municipios} />
              <div className="mt-5 grid gap-6 sm:grid-cols-3">
                <Destaque
                  valor={numero(territorio.dados.semProjeto)}
                  rotulo={`dos ${numero(territorio.dados.municipios.length)} municípios não receberam nenhum projeto no exercício`}
                  cor={CORES_GRAFICO.interior}
                />
                <Destaque
                  valor={percentual(territorio.dados.fracaoNaRmgv, 1)}
                  rotulo={`do valor ficou nos ${numero(territorio.dados.rmgv.municipios)} municípios da Região Metropolitana`}
                  nota={`${numero(territorio.dados.rmgv.projetos)} projetos · ${brlCurto(territorio.dados.rmgv.captado)}`}
                  cor={CORES_GRAFICO.rmgv}
                />
                <Destaque
                  valor={territorio.dados.gini.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  rotulo="Gini da captação entre os municípios, contando os que ficaram em zero"
                  nota="Não é comparável ao Gini do capital: são desigualdades de naturezas diferentes."
                />
              </div>
            </Grafico>
          </Cartao>
        ) : null}

        {conversao ? (
          <Cartao>
            <Grafico
              titulo="3. Quanto da autorização virou dinheiro"
              descricao="Autorização não é recurso. A LICC dá ao projeto um teto de captação; cabe ao proponente convencer uma empresa contribuinte a aportar. O trilho é o teto autorizado, o preenchimento é o que chegou."
              confianca={{ ...conversao.confianca, unidade: "projetos com os dois valores publicados" }}
              series={[
                { rotulo: "autorizado", cor: "var(--color-papel-fundo)" },
                { rotulo: "captado", cor: CORES_GRAFICO.conversao },
              ]}
              nota={
                conversao.dados.captacaoDesconhecida > 0 ? (
                  <>
                    {numero(conversao.dados.captacaoDesconhecida)} projetos têm teto
                    autorizado mas captação não publicada, e ficaram de fora: assumir
                    zero ali fabricaria um fracasso que a fonte não afirma.
                  </>
                ) : (
                  <>
                    {numero(conversao.dados.naoCaptaram)} projetos têm captação
                    publicada como zero — não captaram nada, e isso é diferente de
                    não se saber.
                  </>
                )
              }
              tabela={
                <TabelaGrafico
                  legenda="Autorizado e captado por linguagem cultural"
                  colunas={["Linguagem", "Autorizado", "Captado", "Conversão", "Projetos"]}
                  linhas={conversao.dados.porSegmento.map((s) => ({
                    chave: s.id,
                    celulas: [
                      s.slug ? (
                        <Link key="n" href={`/segmentos/${s.slug}`} className="underline-offset-2 hover:underline">
                          {s.nome}
                        </Link>
                      ) : (
                        s.nome
                      ),
                      brl(s.autorizado),
                      brl(s.captado),
                      percentual(s.taxa, 1),
                      numero(s.projetos),
                    ],
                  }))}
                />
              }
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]">
                <LinhasDeConversao linhas={conversao.dados.porSegmento} />
                <div className="space-y-5">
                  <Destaque
                    valor={percentual(conversao.dados.geral.taxa, 1)}
                    rotulo="do valor autorizado no exercício chegou a virar dinheiro"
                    nota={`${brlCurto(conversao.dados.geral.captado)} de ${brlCurto(conversao.dados.geral.autorizado)}`}
                    cor={CORES_GRAFICO.conversao}
                  />
                  {conversao.dados.piores.length ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
                        Menor conversão
                      </p>
                      <ul className="space-y-1">
                        {conversao.dados.piores.slice(0, 5).map((p) => (
                          <li key={p.id} className="flex items-baseline justify-between gap-2 text-xs">
                            <Link
                              href={p.slug ? `/entidade/${p.slug}` : "#"}
                              className="min-w-0 flex-1 truncate text-tinta-suave underline-offset-2 hover:text-tinta hover:underline"
                            >
                              {p.nome}
                            </Link>
                            <span className="tabular shrink-0 text-tinta">{percentual(p.taxa, 0)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </Grafico>
          </Cartao>
        ) : null}

        {execucao ? (
          <Cartao>
            <Grafico
              titulo="4. Quem executa"
              descricao="O perfil de quem propõe projeto à LICC, e com que reincidência dentro do exercício."
              confianca={{ ...execucao.confianca, unidade: "proponentes com natureza jurídica conhecida" }}
              nota={
                <>
                  A norma limita cada proponente a {execucao.dados.limite.valor}{" "}
                  projetos por exercício.{" "}
                  {execucao.dados.limite.verificado ? (
                    <>Regra conferida no texto oficial.</>
                  ) : (
                    <strong className="font-medium text-tinta-suave">
                      Regra ainda não conferida na fonte primária — está citada por
                      fonte secundária, e por isso a lista abaixo descreve quem
                      alcançou o número, não quem descumpriu a norma.
                    </strong>
                  )}
                </>
              }
              tabela={
                <TabelaGrafico
                  legenda="Proponentes por natureza jurídica e por quantidade de projetos"
                  colunas={["Natureza", "Proponentes", "Projetos"]}
                  linhas={execucao.dados.porNatureza.map((n) => ({
                    chave: n.id,
                    celulas: [n.nome, numero(n.proponentes), numero(n.projetos)],
                  }))}
                />
              }
            >
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
                    Por natureza jurídica
                  </p>
                  <BarrasSimples
                    linhas={execucao.dados.porNatureza.map((n) => ({
                      id: n.id,
                      rotulo: n.nome,
                      valor: n.proponentes,
                      nota: `${numero(n.projetos)} projetos`,
                    }))}
                  />
                </div>
                <div>
                  <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
                    Proponentes, por quantos projetos têm
                  </p>
                  <BarrasSimples
                    linhas={execucao.dados.distribuicao.map((d) => ({
                      id: String(d.projetos),
                      rotulo: `${d.projetos} projeto${d.projetos > 1 ? "s" : ""}`,
                      valor: d.proponentes,
                    }))}
                  />
                  {execucao.dados.noLimite.length ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-tinta-fraca">
                      {numero(execucao.dados.noLimite.length)} proponentes alcançaram o
                      limite de {execucao.dados.limite.valor} projetos.
                    </p>
                  ) : null}
                </div>
              </div>
            </Grafico>
          </Cartao>
        ) : null}
      </div>
    </Pagina>
  );
}

/**
 * O que se sabe, antes de qualquer indicador.
 *
 * Abre a página de propósito: é este bloco que diz o que os números abaixo
 * valem. Num projeto de transparência a lacuna medida é conteúdo — e a única
 * linha realmente grave aqui é a primeira, porque um campo 100% preenchido
 * sobre registros de demonstração continua sendo 0% de informação real.
 */
function CoberturaDosDados({
  stats,
  ano,
}: {
  stats: ReturnType<typeof obterEstatisticas>;
  ano: number;
}) {
  const c = stats.cobertura;
  // A ressalva tem de acompanhar o dado. Enquanto esta frase foi fixa, ela
  // seguiu dizendo que os gráficos liam o conjunto de demonstração depois que
  // os 63 projetos de 2025 passaram a vir do anexo da SECULT — um aviso que
  // não acompanha a fonte deixa de ser cautela e vira desinformação ao avesso.
  const todosOficiais = c.projetos > 0 && c.oficiais === c.projetos;
  const linhas = [
    { rotulo: "de fonte oficial, com endereço para conferir", valor: c.oficiais, grave: true },
    { rotulo: "com valor autorizado publicado", valor: c.comValorAutorizado },
    { rotulo: "com valor captado publicado", valor: c.comValorCaptado },
    { rotulo: "com município identificado", valor: c.comMunicipio },
    { rotulo: "com linguagem cultural identificada", valor: c.comSegmento },
    { rotulo: "com patrocinador conhecido", valor: c.comPatrocinador },
  ];

  return (
    <Cartao>
      <TituloSecao
        acao={
          <Link href="/sobre" className="text-xs text-realce underline-offset-2 hover:underline">
            Metodologia
          </Link>
        }
      >
        O que se sabe sobre os {numero(c.projetos)} projetos de {ano}
      </TituloSecao>
      <p className="mb-4 max-w-3xl text-xs leading-relaxed text-tinta-suave">
        Todo indicador desta página é tão bom quanto a linha correspondente
        aqui.{" "}
        {todosOficiais ? (
          <>
            A primeira está cheia: os gráficos abaixo leem a LICC {ano} pelos
            anexos publicados pela SECULT, com endereço de origem em cada
            registro. As linhas que não fecham dizem quais perguntas esses
            anexos ainda não respondem — e nenhum indicador que dependa delas é
            estimado para preencher a lacuna.
          </>
        ) : (
          <>
            A primeira é a que mais pesa: enquanto ela não subir, os gráficos
            abaixo exercitam a leitura sobre o conjunto de demonstração, não
            sobre a LICC.
          </>
        )}
      </p>
      <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {linhas.map((l) => {
          const fracao = c.projetos > 0 ? l.valor / c.projetos : 0;
          return (
            <li key={l.rotulo}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-tinta-suave">{l.rotulo}</span>
                <span className="tabular shrink-0 text-xs text-tinta">
                  {numero(l.valor)}
                  <span className="text-tinta-fraca"> / {numero(c.projetos)}</span>
                </span>
              </div>
              <div
                className="mt-1 h-1.5 rounded-full bg-papel-fundo"
                role="meter"
                aria-valuenow={Math.round(fracao * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${l.rotulo}: ${percentual(fracao, 0)}`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${fracao * 100}%`,
                    background: l.grave && fracao < 1 ? "var(--color-projeto)" : "var(--color-borda-forte)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}

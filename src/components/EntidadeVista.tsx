"use client";

import { useState } from "react";
import Link from "next/link";
import type { EntityDetail, Graph, GraphNode } from "@/types/graph";
import { NODE_KINDS } from "@/ontology/nodes";
import { EDGE_KINDS } from "@/ontology/edges";
import { brl, brlCurto, numero, percentual, dataLonga, rotuloStatus } from "@/lib/format";
import { Cartao, TituloSecao, Trilha, Metrica } from "./Coluna";
import { Segmentado, PainelAba } from "./Abas";
import { CanvasVisualizacao } from "./CanvasVisualizacao";
import { AlocacaoProporcional, type LinhaAlocacao } from "./AlocacaoProporcional";
import { SeloProveniencia } from "./SeloProveniencia";
import { Glifo } from "./Glifo";

type Aba = "noticias" | "conexoes" | "orcamento";

/**
 * Página completa de uma entidade: coluna-documento à esquerda, visualização à
 * direita, no mesmo arranjo da home.
 *
 * As abas são condicionais — uma norma não tem orçamento, um município não tem
 * notícias próprias. Mostrar uma aba vazia é pior que não mostrá-la.
 */
export function EntidadeVista({
  grafo,
  detalhe,
  trilha,
  metricaChave,
  alocacao,
}: {
  grafo: Graph;
  detalhe: EntityDetail;
  trilha: Array<{ rotulo: string; href?: string }>;
  metricaChave?: { rotulo: string; valor: string };
  alocacao: LinhaAlocacao[];
}) {
  const { node, agregado, noticias, vizinhos } = detalhe;
  const spec = NODE_KINDS[node.kind];
  const temOrcamento = (agregado.autorizado ?? 0) > 0 || (agregado.captado ?? 0) > 0;

  const abasDisponiveis: Array<{ id: Aba; rotulo: string; contagem?: number }> = [
    ...(noticias.length ? [{ id: "noticias" as const, rotulo: "Notícias", contagem: noticias.length }] : []),
    ...(vizinhos.length ? [{ id: "conexoes" as const, rotulo: "Quem se conecta?" }] : []),
    ...(temOrcamento ? [{ id: "orcamento" as const, rotulo: "Orçamento" }] : []),
  ];

  const [aba, setAba] = useState<Aba>(abasDisponiveis[0]?.id ?? "conexoes");
  const [selecionado, setSelecionado] = useState<GraphNode | null>(null);
  const idAbas = `entidade-${node.slug}`;
  const comAbas = abasDisponiveis.length > 1;

  return (
    <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-5 lg:grid-cols-[minmax(400px,40%)_minmax(0,1fr)] lg:items-start">
      <div className="rolagem-fina order-2 flex flex-col gap-4 lg:order-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
        <Trilha itens={trilha} />

        <Cartao>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-tinta">
            {node.nome}
          </h1>
          {node.descricao ? (
            <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{node.descricao}</p>
          ) : null}

          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {detalhe.fundamentos[0] ? (
              <Link
                href={`/entidade/${detalhe.fundamentos[0].slug}`}
                className="text-tinta-suave underline decoration-borda-forte underline-offset-4 transition-colors hover:text-tinta"
              >
                Fundamento legal
              </Link>
            ) : null}
            {node.url ? (
              <a
                href={node.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-tinta-suave underline decoration-borda-forte underline-offset-4 transition-colors hover:text-tinta"
              >
                Sítio oficial
              </a>
            ) : null}
          </p>

          {metricaChave ? (
            <p className="tabular mt-3 text-sm text-tinta">
              {metricaChave.valor}{" "}
              <span className="text-tinta-suave">{metricaChave.rotulo}</span>
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-papel-fundo px-2 py-0.5 text-[11px] text-tinta-suave"
            >
              <Glifo kind={node.kind} />
              {spec.rotulo}
            </span>
            <SeloProveniencia proveniencia={node.proveniencia} />
            {node.meta?.status ? (
              <span className="rounded-md bg-papel-fundo px-2 py-0.5 text-[11px] text-tinta-suave">
                {rotuloStatus(String(node.meta.status))}
              </span>
            ) : null}
            {node.meta?.numeroProcesso ? (
              <span className="rounded-md bg-papel-fundo px-2 py-0.5 font-mono text-[11px] text-tinta-suave">
                {String(node.meta.numeroProcesso)}
              </span>
            ) : null}
          </div>

          {/* Vínculo principal, no lugar em que a referência traz o titular. */}
          <VinculoPrincipal detalhe={detalhe} />
        </Cartao>

        {comAbas ? (
          <Segmentado
            opcoes={abasDisponiveis}
            valor={aba}
            onMudar={setAba}
            idBase={idAbas}
            rotulo="Vistas desta entidade"
            className="self-start"
          />
        ) : null}

        <PainelAba idBase={idAbas} id={aba} rotulado={comAbas} className="flex flex-col gap-4">
        {aba === "orcamento" && temOrcamento ? (
          <Cartao>
            <TituloSecao>Orçamento</TituloSecao>
            <p className="mb-4 text-xs leading-relaxed text-tinta-fraca">
              Valor autorizado é o teto de captação via renúncia de ICMS. Só vira
              recurso quando uma empresa contribuinte de fato aporta.
            </p>

            <p className="mb-2 text-xs font-medium text-tinta">
              Este exercício <span className="font-normal text-tinta-fraca">{grafo.meta.ano}</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Metrica
                rotulo="Captado"
                valor={brl(agregado.captado)}
                posicao={node.posicao}
                variacao={node.variacaoAnual}
              />
              <Metrica
                rotulo="Autorizado para captação"
                valor={brl(agregado.autorizado)}
                nota={`${percentual(agregado.execucao)} executado`}
              />
            </div>

            {alocacao.length ? (
              <div className="mt-6">
                <AlocacaoProporcional
                  titulo="Alocação"
                  total={alocacao.reduce((s, l) => s + l.valor, 0)}
                  linhas={alocacao}
                  alturaTotal={Math.min(340, 60 + alocacao.length * 26)}
                />
              </div>
            ) : null}
          </Cartao>
        ) : null}

        {aba === "conexoes" ? <CartaoConexoes vizinhos={vizinhos} /> : null}

        {aba === "noticias" && noticias.length ? (
          <Cartao>
            <TituloSecao>Notícias</TituloSecao>
            <ul className="divide-y divide-borda">
              {noticias.map((n) => (
                <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <time dateTime={n.data} className="tabular text-[11px] text-tinta-fraca">
                      {dataLonga(n.data)}
                    </time>
                    <span className="text-[11px] text-tinta-fraca">· {n.veiculo}</span>
                    {n.proveniencia !== "oficial" ? (
                      <SeloProveniencia proveniencia={n.proveniencia} />
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-sm font-medium leading-snug text-tinta">
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">
                        {n.titulo}
                      </a>
                    ) : (
                      n.titulo
                    )}
                  </h3>
                  {n.resumo ? (
                    <p className="mt-1 text-xs leading-relaxed text-tinta-fraca">{n.resumo}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Cartao>
        ) : null}
        </PainelAba>

        {node.fontes?.length ? (
          <Cartao>
            <TituloSecao>Fontes</TituloSecao>
            <ul className="space-y-1.5">
              {node.fontes.map((f, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer noopener" className="text-realce underline underline-offset-2 hover:opacity-80">
                      {f.rotulo}
                    </a>
                  ) : (
                    <span className="text-tinta-fraca">{f.rotulo}</span>
                  )}
                </li>
              ))}
            </ul>
          </Cartao>
        ) : null}
      </div>

      <div className="order-1 h-[62vh] min-h-[26rem] lg:order-2 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-6rem)]">
        <CanvasVisualizacao
          grafo={grafo}
          selecionado={selecionado ?? node}
          onSelecionar={setSelecionado}
          destaqueOrcamento={node.kind === "segmento" || node.kind === "projeto" ? node.id : undefined}
          abaInicial={aba === "orcamento" ? "orcamento" : "grafo"}
        />
      </div>
    </div>
  );
}

/** O elo que melhor identifica a entidade — proponente, órgão ou município. */
function VinculoPrincipal({ detalhe }: { detalhe: EntityDetail }) {
  const prioridade: Record<string, string[]> = {
    projeto: ["propoe"],
    proponente: ["ocorre_em"],
    patrocinador: ["fiscaliza"],
    governanca: ["nomeia"],
  };
  const kinds = prioridade[detalhe.node.kind] ?? [];
  const vinculo = detalhe.vizinhos.find((v) => kinds.includes(v.edge.kind));
  if (!vinculo) return null;

  const spec = EDGE_KINDS[vinculo.edge.kind];
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs text-tinta-suave">
        {vinculo.direcao === "saida" ? spec.rotulo : spec.rotuloInverso}
      </p>
      <Link
        href={`/entidade/${vinculo.node.slug}`}
        className="flex items-center gap-2.5 rounded-xl border border-borda p-3 transition-colors hover:bg-papel-fundo"
      >
        <Glifo kind={vinculo.node.kind} className="text-base" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-tinta">{vinculo.node.nome}</span>
          <span className="block text-[11px] text-tinta-fraca">
            {NODE_KINDS[vinculo.node.kind].rotulo}
          </span>
        </span>
      </Link>
    </div>
  );
}

function CartaoConexoes({ vizinhos }: { vizinhos: EntityDetail["vizinhos"] }) {
  const grupos = new Map<string, EntityDetail["vizinhos"]>();
  for (const v of vizinhos) {
    const chave = `${v.edge.kind}:${v.direcao}`;
    (grupos.get(chave) ?? grupos.set(chave, []).get(chave)!).push(v);
  }

  return (
    <Cartao>
      <TituloSecao>Quem se conecta?</TituloSecao>
      <div className="space-y-5">
        {[...grupos.entries()].map(([chave, lista]) => {
          const [kind, direcao] = chave.split(":") as [keyof typeof EDGE_KINDS, string];
          const spec = EDGE_KINDS[kind];
          return (
            <div key={chave}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium capitalize text-tinta">
                  {direcao === "saida" ? spec.rotulo : spec.rotuloInverso}
                </h3>
                <span className="tabular text-xs text-tinta-fraca">{numero(lista.length)}</span>
              </div>
              <p className="mb-2 text-[11px] leading-relaxed text-tinta-fraca">{spec.descricao}</p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {lista.slice(0, LIMITE).map((v) => (
                  <li key={v.edge.id}>
                    <Link
                      href={`/entidade/${v.node.slug}`}
                      className="flex h-full items-start gap-2 rounded-xl border border-borda px-2.5 py-2 transition-colors hover:bg-papel-fundo"
                    >
                      <Glifo kind={v.node.kind} className="mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-tinta">{v.node.nome}</span>
                        <span className="tabular block text-[11px] text-tinta-fraca">
                          {v.edge.peso ? brlCurto(v.edge.peso) : NODE_KINDS[v.node.kind].rotulo}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {lista.length > LIMITE ? (
                <p className="mt-1.5 text-[11px] text-tinta-fraca">
                  e mais {numero(lista.length - LIMITE)}…
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Cartao>
  );
}

const LIMITE = 24;

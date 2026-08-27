"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EntityDetail, GraphNode } from "@/types/graph";
import { NODE_KINDS } from "@/ontology/nodes";
import { EDGE_KINDS } from "@/ontology/edges";
import { brl, brlCurto, percentual, dataCurta, rotuloStatus } from "@/lib/format";
import { Cartao, Metrica, Segmentado } from "./Coluna";
import { SeloProveniencia } from "./SeloProveniencia";

type Aba = "noticias" | "conexoes" | "orcamento";

/**
 * Cartão de contexto do vértice selecionado no grafo da home.
 *
 * É a versão compacta da página de entidade: mesma informação, sem sair do
 * grafo. O rodapé leva à página completa, que é o endereço citável.
 */
export function PainelSelecao({
  no,
  onFechar,
  abaInicial = "noticias",
}: {
  no: GraphNode;
  onFechar: () => void;
  /** Clique vindo da rosca abre direto no orçamento. */
  abaInicial?: Aba;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [detalhe, setDetalhe] = useState<EntityDetail | null>(null);

  useEffect(() => {
    setAba(abaInicial);
    setDetalhe(null);
    const controle = new AbortController();
    fetch(`/api/entities/${no.slug}`, { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDetalhe)
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setDetalhe(null);
      });
    return () => controle.abort();
  }, [no.slug, abaInicial]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const spec = NODE_KINDS[no.kind];
  const temOrcamento =
    (detalhe?.agregado.autorizado ?? 0) > 0 || (detalhe?.agregado.captado ?? 0) > 0;

  // Espelha o painel de entidade do CivLab: News | Who's connected? | Budget.
  // Abas vazias não aparecem — mostrar aba sem conteúdo é pior que omiti-la.
  const abas: Array<{ id: Aba; rotulo: string; contagem?: number }> = [
    ...(detalhe?.noticias.length
      ? [{ id: "noticias" as const, rotulo: "Notícias", contagem: detalhe.noticias.length }]
      : []),
    { id: "conexoes", rotulo: "Quem se conecta?", contagem: detalhe?.vizinhos.length },
    ...(temOrcamento ? [{ id: "orcamento" as const, rotulo: "Orçamento" }] : []),
  ];
  const abaAtiva = abas.some((a) => a.id === aba) ? aba : abas[0].id;

  return (
    <>
      <Cartao>
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: spec.cor }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-tinta-fraca">
              {spec.rotulo}
              {spec.papel ? <span className="normal-case"> · {spec.papel}</span> : null}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold leading-snug tracking-tight text-tinta">
              {no.nome}
            </h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar e voltar ao panorama"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-tinta-fraca transition-colors hover:bg-papel-fundo hover:text-tinta"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {no.descricao ? (
          <p className="mt-2.5 text-sm leading-relaxed text-tinta-suave">{no.descricao}</p>
        ) : null}

        {detalhe?.fundamentos.length ? (
          <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link
              href={`/entidade/${detalhe.fundamentos[0].slug}`}
              className="text-tinta-suave underline decoration-borda-forte underline-offset-4 transition-colors hover:text-tinta"
            >
              Fundamento legal
            </Link>
            {no.url ? (
              <a
                href={no.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-tinta-suave underline decoration-borda-forte underline-offset-4 transition-colors hover:text-tinta"
              >
                Sítio oficial
              </a>
            ) : null}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <SeloProveniencia proveniencia={no.proveniencia} />
          {no.meta?.status ? (
            <span className="rounded-md bg-papel-fundo px-2 py-0.5 text-[11px] text-tinta-suave">
              {rotuloStatus(String(no.meta.status))}
            </span>
          ) : null}
          {no.url ? (
            <a
              href={no.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11px] text-realce underline underline-offset-2 hover:opacity-80"
            >
              sítio oficial ↗
            </a>
          ) : null}
        </div>
      </Cartao>

      <Segmentado opcoes={abas} valor={abaAtiva} onMudar={setAba} className="self-start" />

      <Cartao>
        {!detalhe ? (
          <p className="py-6 text-center text-sm text-tinta-fraca">Carregando…</p>
        ) : abaAtiva === "noticias" ? (
          <Noticias detalhe={detalhe} />
        ) : abaAtiva === "conexoes" ? (
          <Conexoes detalhe={detalhe} />
        ) : (
          <Orcamento no={no} detalhe={detalhe} />
        )}

        <p className="mt-4 border-t border-borda pt-3">
          <Link
            href={`/entidade/${no.slug}`}
            className="text-xs text-realce underline underline-offset-2 hover:opacity-80"
          >
            Abrir página completa →
          </Link>
        </p>
      </Cartao>
    </>
  );
}

/** Feed da entidade, no lugar da aba News do original. */
function Noticias({ detalhe }: { detalhe: EntityDetail }) {
  if (!detalhe.noticias.length) {
    return <p className="text-sm text-tinta-fraca">Nenhuma publicação vinculada.</p>;
  }
  return (
    <ul className="divide-y divide-borda">
      {detalhe.noticias.slice(0, 12).map((n) => (
        <li key={n.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <time dateTime={n.data} className="tabular text-[11px] text-tinta-fraca">
              {dataCurta(n.data)}
            </time>
            <span className="text-[11px] text-tinta-fraca">· {n.veiculo}</span>
          </div>
          <h3 className="mt-1 text-sm font-medium leading-snug text-tinta">
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
          </h3>
          {n.resumo ? (
            <p className="mt-1 text-xs leading-relaxed text-tinta-fraca">{n.resumo}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Conexoes({ detalhe }: { detalhe: EntityDetail }) {
  const grupos = new Map<string, EntityDetail["vizinhos"]>();
  for (const v of detalhe.vizinhos) {
    const chave = `${v.edge.kind}:${v.direcao}`;
    (grupos.get(chave) ?? grupos.set(chave, []).get(chave)!).push(v);
  }

  if (!grupos.size) {
    return <p className="text-sm text-tinta-fraca">Sem conexões registradas.</p>;
  }

  return (
    <div className="space-y-4">
      {[...grupos.entries()].map(([chave, lista]) => {
        const [kind, direcao] = chave.split(":") as [keyof typeof EDGE_KINDS, string];
        const spec = EDGE_KINDS[kind];
        return (
          <div key={chave}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
                {direcao === "saida" ? spec.rotulo : spec.rotuloInverso}
              </h3>
              <span className="tabular text-[11px] text-tinta-fraca">{lista.length}</span>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {lista.slice(0, 12).map((v) => (
                <li key={v.edge.id}>
                  <Link
                    href={`/entidade/${v.node.slug}`}
                    className="flex h-full items-start gap-2 rounded-lg border border-borda px-2.5 py-2 transition-colors hover:bg-papel-fundo"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: NODE_KINDS[v.node.kind].cor }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-tinta">{v.node.nome}</span>
                      {v.edge.peso ? (
                        <span className="tabular block text-[11px] text-tinta-fraca">
                          {brlCurto(v.edge.peso)}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {lista.length > 12 ? (
              <p className="mt-1.5 text-[11px] text-tinta-fraca">e mais {lista.length - 12}…</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Orcamento({ no, detalhe }: { no: GraphNode; detalhe: EntityDetail }) {
  const ag = detalhe.agregado;
  const aportes = detalhe.vizinhos.filter((v) => v.edge.peso);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Metrica rotulo="Captado" valor={brl(ag.captado)} posicao={no.posicao} variacao={no.variacaoAnual} />
        <Metrica rotulo="Autorizado" valor={brl(ag.autorizado)} nota={`${percentual(ag.execucao)} executado`} />
      </div>
      {aportes.length ? (
        <div>
          <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca">
            Aportes
          </h3>
          <ul className="space-y-1">
            {aportes.slice(0, 10).map((v) => (
              <li key={v.edge.id} className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/entidade/${v.node.slug}`}
                  className="min-w-0 flex-1 truncate text-sm text-tinta-suave underline-offset-2 hover:text-tinta hover:underline"
                >
                  {v.node.nome}
                </Link>
                <span className="tabular shrink-0 text-sm text-tinta">{brl(v.edge.peso)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

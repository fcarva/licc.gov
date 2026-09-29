"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Graph, GraphNode, NodeKind } from "@/types/graph";
import { NODE_KINDS } from "@/ontology/nodes";
import { brl, numero, percentual } from "@/lib/format";
import { CanvasVisualizacao } from "./CanvasVisualizacao";
import { PaginaComCanvas } from "./PaginaComCanvas";
import { Glifo } from "./Glifo";

/**
 * Índice de uma categoria do grafo — a divisão que o SF Government Graph faz.
 *
 * Lá as seções de topo são uma por categoria de vértice (`/sf/elected/`,
 * `/sf/commissions/`, `/sf/advisories/`, `/sf/departments/`), e a
 * correspondência com a LICC é **por posição no anel**, não por semelhança de
 * nome — é o que `analogoCivLab` registra em cada categoria. Órgão,
 * patrocinador, proponente e projeto: o fluxo do valor virando navegação.
 *
 * ## A seleção não troca a coluna, aqui
 *
 * Na home, escolher um vértice substitui a coluna-documento pelo painel da
 * entidade. Num índice isso perderia o lugar de quem percorre a lista, então a
 * linha escolhida se destaca e **a lista fica** — o que a seleção move é o grafo
 * ao lado, acendendo a cadeia de responsabilização daquele vértice. Quem quer a
 * entidade inteira clica no nome.
 */
export function IndiceCategoria({
  grafo,
  kind,
  titulo,
  subtitulo,
}: {
  grafo: Graph;
  kind: NodeKind;
  /** Plural de página. `rotuloPlural` da ontologia é rótulo de anel ("O capital"). */
  titulo: string;
  subtitulo?: React.ReactNode;
}) {
  const [selecionado, setSelecionado] = useState<GraphNode | null>(null);
  const spec = NODE_KINDS[kind];

  const porId = useMemo(() => new Map(grafo.nodes.map((n) => [n.id, n])), [grafo.nodes]);

  // Quantos projetos cada patrocinador banca: conta-se pela aresta, que é onde o
  // vínculo mora, e não por um campo que teria de ser mantido em sincronia.
  const projetosPorPatrocinador = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of grafo.edges) {
      if (e.kind !== "patrocina") continue;
      m.set(e.source, (m.get(e.source) ?? 0) + 1);
    }
    return m;
  }, [grafo.edges]);

  const nos = useMemo(
    () =>
      grafo.nodes
        .filter((n) => n.kind === kind)
        .sort(
          (a, b) =>
            (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0) ||
            a.nome.localeCompare(b.nome, "pt-BR"),
        ),
    [grafo.nodes, kind],
  );

  const nomeDe = (id: unknown) =>
    typeof id === "string" ? porId.get(id)?.nome : undefined;

  const colunas = COLUNAS[kind] ?? COLUNAS.padrao!;

  // Ausência continua sendo ausência na tabela: "—", nunca "R$ 0".
  const ausente = <span className="text-tinta-fraca">—</span>;
  const dinheiro = (v: number | undefined) => (v === undefined ? ausente : brl(v));

  const celulas = (n: GraphNode): React.ReactNode[] => {
    const captado = n.orcamento?.captado;
    const autorizado = n.orcamento?.autorizado;

    switch (kind) {
      case "patrocinador":
        return [
          String(n.meta?.cnpj ?? "—"),
          numero(projetosPorPatrocinador.get(n.id) ?? 0),
          dinheiro(captado),
        ];
      case "proponente":
        return [
          nomeDe(n.meta?.municipioId) ?? (
            <span className="text-tinta-fraca">não publicado</span>
          ),
          numero(Number(n.meta?.projetosNoAno ?? 0)),
          dinheiro(autorizado),
          dinheiro(captado),
        ];
      case "projeto":
        return [
          nomeDe(n.meta?.proponenteId) ?? ausente,
          dinheiro(autorizado),
          dinheiro(captado),
          autorizado && captado !== undefined ? percentual(captado / autorizado, 0) : ausente,
        ];
      default:
        return [n.sigla ?? ausente, n.descricao ?? spec.papel ?? ausente];
    }
  };

  // Soma só onde somar significa alguma coisa.
  //
  // Nos três anéis do dinheiro o total é real e é o **mesmo** R$ 25 mi visto em
  // três estágios: o que as empresas aportaram, o que os proponentes captaram, o
  // que os projetos receberam. Em `governanca` não é: cinco dos seis não têm
  // orçamento, e o sexto é o `licc-programa`, que espelha o total do exercício.
  // Somar um espelho com cinco ausências e rotular "Captado" afirmaria que os
  // órgãos captaram o teto — eles autorizam a renúncia, não a recebem.
  const rotuloTotal = ROTULO_DO_TOTAL[kind];
  const total = rotuloTotal ? nos.reduce((s, n) => s + (n.orcamento?.captado ?? 0), 0) : 0;

  return (
    <PaginaComCanvas
      coluna={
        <>
          <div className="rounded-xl bg-papel p-5">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-tinta">
              <Glifo kind={kind} className="text-[1.1em]" />
              {titulo}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-tinta-suave">
              {subtitulo ?? spec.descricao}
            </p>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
              <Numero rotulo="No exercício" valor={numero(nos.length)} />
              {rotuloTotal && total > 0 ? (
                <Numero
                  rotulo={rotuloTotal}
                  valor={brl(total)}
                  nota="o mesmo teto, visto neste anel"
                />
              ) : null}
              <Numero
                rotulo="Anel no fluxo"
                valor={spec.anel === null ? "—" : String(spec.anel)}
                nota={`análogo a ${spec.analogoCivLab}`}
              />
            </dl>
          </div>

          {/*
            Lista, não tabela — e não é economia de esforço.
            `Tabela` carrega `min-w-[40rem]`, e a coluna-documento tem ~576px a
            1440px de viewport: cinco colunas ali rolariam na horizontal em toda
            categoria. A coluna do original **é** lista de alocação, com borda
            inferior na cor da categoria e o valor num tom escuro da mesma
            família — medido em `docs/referencia-civlab.md`. Aqui cada linha leva
            o nome e, embaixo, os números que aquele anel responde.
          */}
          <ul className="rounded-xl bg-papel p-1.5">
            {nos.map((n) => {
              const marcada = selecionado?.id === n.id;
              return (
                <li
                  key={n.id}
                  onMouseEnter={() => setSelecionado(n)}
                  className={`border-b px-3 py-2.5 transition-colors last:border-b-0 ${
                    marcada ? "bg-papel-suave" : "hover:bg-papel-suave"
                  }`}
                  style={{ borderBottomColor: spec.cor }}
                >
                  <Link
                    href={`/entidade/${n.slug}`}
                    onFocus={() => setSelecionado(n)}
                    className="text-sm font-medium text-tinta underline-offset-2 hover:underline"
                  >
                    {n.nome}
                  </Link>
                  <dl className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                    {celulas(n).map((c, i) => (
                      <div key={colunas[i]?.rotulo ?? i} className="flex items-baseline gap-1.5">
                        <dt className="text-[10px] uppercase tracking-wide text-tinta-fraca">
                          {colunas[i]?.rotulo}
                        </dt>
                        <dd
                          className={`text-xs ${
                            colunas[i]?.alinhar === "direita"
                              ? "tabular font-medium text-tinta"
                              : "text-tinta-suave"
                          }`}
                        >
                          {c}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      }
      canvas={
        <CanvasVisualizacao
          grafo={grafo}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
          destaqueOrcamento={selecionado?.id}
        />
      }
    />
  );
}

function Numero({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-tinta-fraca">{rotulo}</dt>
      <dd className="tabular text-xl font-semibold text-tinta">{valor}</dd>
      {nota ? <dd className="text-[11px] text-tinta-fraca">{nota}</dd> : null}
    </div>
  );
}

/**
 * O que o total da categoria mede — e ausência significa "não se soma".
 *
 * Os três anéis do dinheiro medem o mesmo R$ 25 mi em estágios diferentes, e
 * dizer isso é informação. `governanca` fica de fora de propósito: ali a soma
 * não é uma grandeza.
 */
const ROTULO_DO_TOTAL: Partial<Record<NodeKind, string>> = {
  patrocinador: "Aportado",
  proponente: "Captado",
  projeto: "Captado",
  segmento: "Captado",
  municipio: "Captado atribuído",
};

/**
 * Colunas por categoria.
 *
 * Cada anel do fluxo responde uma pergunta diferente, então a tabela muda: do
 * patrocinador interessa quanto ele pôs e em quantos projetos; do proponente,
 * onde ele está e quanto converteu; do projeto, a execução. Uma tabela só,
 * genérica, diria menos sobre todos.
 */
const COLUNAS: Partial<
  Record<NodeKind | "padrao", Array<{ rotulo: string; alinhar?: "direita" }>>
> = {
  patrocinador: [
    { rotulo: "CNPJ" },
    { rotulo: "Projetos", alinhar: "direita" },
    { rotulo: "Aportado", alinhar: "direita" },
  ],
  proponente: [
    { rotulo: "Município" },
    { rotulo: "Projetos", alinhar: "direita" },
    { rotulo: "Autorizado", alinhar: "direita" },
    { rotulo: "Captado", alinhar: "direita" },
  ],
  projeto: [
    { rotulo: "Proponente" },
    { rotulo: "Autorizado", alinhar: "direita" },
    { rotulo: "Captado", alinhar: "direita" },
    { rotulo: "Execução", alinhar: "direita" },
  ],
  padrao: [{ rotulo: "Sigla" }, { rotulo: "Papel no fluxo" }],
};

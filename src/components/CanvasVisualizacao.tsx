"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Graph, GraphNode } from "@/types/graph";
import { GrafoRadial } from "./GrafoRadial";
import { Sunburst, type FatiaSunburst } from "./Sunburst";
import { Segmentado } from "./Coluna";

type Aba = "grafo" | "orcamento";

/**
 * A metade direita da tela: o grafo do ecossistema ou a rosca do orçamento,
 * alternados pelo controle segmentado no rodapé — o arranjo do SF Gov Graph.
 */
export function CanvasVisualizacao({
  grafo,
  selecionado,
  onSelecionar,
  destaqueOrcamento,
  abaInicial = "grafo",
}: {
  grafo: Graph;
  selecionado?: GraphNode | null;
  onSelecionar?: (no: GraphNode | null) => void;
  /** `id` da fatia acesa na rosca, quando a página tem uma entidade em foco. */
  destaqueOrcamento?: string;
  abaInicial?: Aba;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const router = useRouter();

  const fatias = useMemo(() => montarFatias(grafo), [grafo]);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        {aba === "grafo" ? (
          <GrafoRadial
            grafo={grafo}
            selecionado={selecionado ?? null}
            onSelecionar={(n) => onSelecionar?.(n)}
          />
        ) : (
          <Sunburst
            titulo={`Teto da LICC ${grafo.meta.ano}`}
            total={grafo.meta.tetoAutorizado}
            fatias={fatias}
            destaqueId={destaqueOrcamento}
            onSelecionar={(id) => {
              const no = grafo.nodes.find((n) => n.id === id);
              if (no) router.push(`/entidade/${no.slug}`);
            }}
          />
        )}
      </div>

      <div className="flex shrink-0 justify-center pb-4 pt-2">
        <Segmentado
          opcoes={[
            { id: "grafo", rotulo: "Grafo" },
            { id: "orcamento", rotulo: "Orçamento" },
          ]}
          valor={aba}
          onMudar={setAba}
        />
      </div>
    </div>
  );
}

/** Segmentos no anel interno, os projetos de cada um no externo. */
function montarFatias(grafo: Graph): FatiaSunburst[] {
  const projetos = grafo.nodes.filter((n) => n.kind === "projeto");
  return grafo.nodes
    .filter((n) => n.kind === "segmento" && (n.orcamento?.captado ?? 0) > 0)
    .map((seg) => ({
      id: seg.id,
      rotulo: seg.nome,
      valor: seg.orcamento?.captado ?? 0,
      cor: (seg.meta?.cor as string) ?? "var(--color-segmento)",
      filhos: projetos
        .filter((p) => p.meta?.segmentoId === seg.id && (p.orcamento?.captado ?? 0) > 0)
        .sort((a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0))
        .map((p) => ({
          id: p.id,
          rotulo: p.nome,
          valor: p.orcamento?.captado ?? 0,
        })),
    }))
    .sort((a, b) => b.valor - a.valor);
}

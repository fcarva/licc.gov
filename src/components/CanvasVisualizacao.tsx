"use client";

import { useState, useMemo } from "react";
import type { Graph, GraphNode } from "@/types/graph";
import { GrafoRadial } from "./GrafoRadial";
import { Sunburst, type FatiaSunburst } from "./Sunburst";
import { Segmentado } from "./Abas";
import { corDoSegmento } from "@/ontology/paleta-orcamento";

export type Aba = "grafo" | "orcamento";

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
  aba: abaControlada,
  onMudarAba,
}: {
  grafo: Graph;
  selecionado?: GraphNode | null;
  onSelecionar?: (no: GraphNode | null) => void;
  /** `id` da fatia acesa na rosca, quando a página tem uma entidade em foco. */
  destaqueOrcamento?: string;
  abaInicial?: Aba;
  /** Quando fornecida, a aba é controlada pela página. */
  aba?: Aba;
  onMudarAba?: (aba: Aba) => void;
}) {
  const [abaInterna, setAbaInterna] = useState<Aba>(abaInicial);
  const aba = abaControlada ?? abaInterna;
  const setAba = (proxima: Aba) => {
    setAbaInterna(proxima);
    onMudarAba?.(proxima);
  };

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
              if (no) onSelecionar?.(no);
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
  const porSegmento = grafo.nodes
    .filter((n) => n.kind === "segmento" && (n.orcamento?.captado ?? 0) > 0)
    .map((seg) => ({
      id: seg.id,
      rotulo: seg.nome,
      valor: seg.orcamento?.captado ?? 0,
      // A rosca usa a paleta vívida do orçamento, não a pastel do grafo:
      // fatias finas precisam continuar distinguíveis lado a lado.
      cor: corDoSegmento(seg.id),
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

  // Projeto sem linguagem classificada é **fatia própria**, não sobra.
  //
  // O arco cinza da rosca significa "teto ainda não captado", e ele é a
  // diferença entre o teto e a soma das fatias. Enquanto os projetos sem
  // segmento ficavam de fora, essa diferença os absorvia: em 2025 o captado é
  // 100% do teto, e mesmo assim 45% do círculo aparecia cinza — o gráfico
  // dizia que o Estado não captou metade da renúncia quando captou tudo.
  //
  // Com fatia própria, o cinza volta a medir só o que não foi captado, e a
  // lacuna de classificação aparece pelo que é: uma lacuna nossa, do tamanho
  // que ela tem.
  const semLinguagem = projetos.filter(
    (p) => !p.meta?.segmentoId && (p.orcamento?.captado ?? 0) > 0,
  );
  if (!semLinguagem.length) return porSegmento;

  return [
    ...porSegmento,
    {
      id: "sem-linguagem",
      rotulo: "Sem linguagem classificada",
      valor: semLinguagem.reduce((s, p) => s + (p.orcamento?.captado ?? 0), 0),
      // Neutro do Flexoki: não é acento porque não é categoria cultural — é o
      // que a classificação por título não alcançou.
      cor: "#B7B5AC",
      filhos: semLinguagem
        .sort((a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0))
        .map((p) => ({
          id: p.id,
          rotulo: p.nome,
          valor: p.orcamento?.captado ?? 0,
        })),
    },
  ];
}

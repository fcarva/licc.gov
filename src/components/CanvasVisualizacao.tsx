"use client";

import { useState, useMemo } from "react";
import type { Graph, GraphNode } from "@/types/graph";
import { GrafoRadial } from "./GrafoRadial";
import { Sunburst } from "./Sunburst";
import { Segmentado } from "./Abas";
import {
  montarFatiasPorSegmento,
  montarFatiasPorTerritorio,
  type FatiaSunburst,
} from "@/lib/fatias-orcamento";

export type Aba = "grafo" | "orcamento";

/**
 * Como a rosca agrupa: por linguagem cultural ou por território.
 *
 * A mesma geometria de grupo → detalhe responde às duas perguntas, então a
 * escolha é da página. `/orcamento` e `/segmentos` agrupam por linguagem;
 * `/municipios` e `/monitor`, por microrregião.
 */
export type Agregacao = "segmento" | "territorio";

const AGREGADORES = {
  segmento: montarFatiasPorSegmento,
  territorio: montarFatiasPorTerritorio,
} as const;

const TITULO_ROSCA: Record<Agregacao, string> = {
  segmento: "Teto da LICC",
  territorio: "Captado com município",
};

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
  agregacao = "segmento",
  abasVisiveis = true,
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
  /** Como a rosca agrupa. */
  agregacao?: Agregacao;
  /**
   * Falso quando a página fixa uma vista só.
   *
   * Mostrar um segmentado de duas opções onde só uma serve é ruído — a mesma
   * razão por que `PainelAba` derruba a semântica de aba quando há uma vista só.
   */
  abasVisiveis?: boolean;
}) {
  const [abaInterna, setAbaInterna] = useState<Aba>(abaInicial);
  const aba = abaControlada ?? abaInterna;
  const setAba = (proxima: Aba) => {
    setAbaInterna(proxima);
    onMudarAba?.(proxima);
  };

  const fatias = useMemo(() => AGREGADORES[agregacao](grafo), [grafo, agregacao]);
  // A rosca por território soma só o que tem município atribuído, então o total
  // dela é a soma das fatias, não o teto: usar o teto ali faria o arco cinza
  // medir "não captado" quando o que falta é "sem município".
  const totalRosca =
    agregacao === "territorio"
      ? fatias.reduce((s, f) => s + f.valor, 0)
      : grafo.meta.tetoAutorizado;

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
            titulo={`${TITULO_ROSCA[agregacao]} ${grafo.meta.ano}`}
            total={totalRosca}
            fatias={fatias}
            destaqueId={destaqueOrcamento}
            onSelecionar={(id) => {
              const no = grafo.nodes.find((n) => n.id === id);
              if (no) onSelecionar?.(no);
            }}
          />
        )}
      </div>

      {/* Embaixo à direita, como no original — não centralizado. */}
      <div className={`shrink-0 justify-end pb-4 pr-2 pt-2 ${abasVisiveis ? "flex" : "hidden"}`}>
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

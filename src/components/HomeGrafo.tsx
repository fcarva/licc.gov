"use client";

import { useState } from "react";
import type { Graph, GraphNode } from "@/types/graph";
import { CanvasVisualizacao } from "./CanvasVisualizacao";
import { PainelSelecao } from "./PainelSelecao";

/**
 * Amarra a coluna-documento ao canvas: selecionar um vértice no grafo troca o
 * conteúdo do cartão de contexto sem sair da página.
 */
export function HomeGrafo({
  grafo,
  coluna,
}: {
  grafo: Graph;
  coluna: React.ReactNode;
}) {
  const [selecionado, setSelecionado] = useState<GraphNode | null>(null);

  return (
    <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
      <div className="rolagem-fina flex flex-col gap-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
        {selecionado ? (
          <PainelSelecao
            no={selecionado}
            onFechar={() => setSelecionado(null)}
          />
        ) : (
          coluna
        )}
      </div>

      <div className="h-[62vh] min-h-[26rem] lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-6rem)]">
        <CanvasVisualizacao
          grafo={grafo}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
          destaqueOrcamento={selecionado?.id}
        />
      </div>
    </div>
  );
}

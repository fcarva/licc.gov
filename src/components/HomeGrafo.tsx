"use client";

import { useState } from "react";
import type { Graph, GraphNode } from "@/types/graph";
import { CanvasVisualizacao, type Aba } from "./CanvasVisualizacao";
import { PainelSelecao } from "./PainelSelecao";
import { PainelOrcamento, type CotaResumo } from "./PainelOrcamento";

/**
 * Amarra a coluna-documento ao canvas.
 *
 * A coluna esquerda responde ao que está em foco à direita, como no SF
 * Government Graph: sem seleção ela mostra o panorama; com a rosca aberta,
 * mostra o orçamento; ao clicar num vértice ou numa fatia, troca para a
 * entidade — e um clique vindo da rosca já abre na aba de orçamento.
 */
export function HomeGrafo({
  grafo,
  coluna,
  orcamento,
}: {
  grafo: Graph;
  coluna: React.ReactNode;
  orcamento: {
    segmentos: GraphNode[];
    totais: { autorizado: number; captado: number };
    cotas: CotaResumo[];
    variacaoCaptado: number | null;
  };
}) {
  const [selecionado, setSelecionado] = useState<GraphNode | null>(null);
  const [aba, setAba] = useState<Aba>("grafo");
  const [destacado, setDestacado] = useState<string | undefined>();

  const selecionar = (no: GraphNode | null) => {
    setSelecionado(no);
    setDestacado(undefined);
  };

  return (
    <div className="mx-auto grid max-w-[1700px] gap-5 px-4 py-5 lg:grid-cols-[minmax(400px,40%)_minmax(0,1fr)] lg:items-start">
      <div className="rolagem-fina order-2 flex flex-col gap-4 lg:order-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
        {selecionado ? (
          <PainelSelecao
            no={selecionado}
            onFechar={() => selecionar(null)}
            abaInicial={aba === "orcamento" ? "orcamento" : "noticias"}
          />
        ) : aba === "orcamento" ? (
          <PainelOrcamento
            grafo={grafo}
            segmentos={orcamento.segmentos}
            totais={orcamento.totais}
            cotas={orcamento.cotas}
            variacaoCaptado={orcamento.variacaoCaptado}
            onDestacar={setDestacado}
          />
        ) : (
          coluna
        )}
      </div>

      <div className="order-1 h-[62vh] min-h-[26rem] lg:order-2 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-6rem)]">
        <CanvasVisualizacao
          grafo={grafo}
          selecionado={selecionado}
          onSelecionar={selecionar}
          destaqueOrcamento={destacado ?? selecionado?.id}
          aba={aba}
          onMudarAba={setAba}
        />
      </div>
    </div>
  );
}

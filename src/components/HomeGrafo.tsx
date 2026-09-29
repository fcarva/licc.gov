"use client";

import { useState } from "react";
import type { Graph, GraphNode } from "@/types/graph";
import { CanvasVisualizacao, type Aba } from "./CanvasVisualizacao";
import { PainelSelecao } from "./PainelSelecao";
import { PainelOrcamento, type CotaResumo } from "./PainelOrcamento";
import { PaginaComCanvas } from "./PaginaComCanvas";
import { CanvasContexto } from "./CanvasContexto";

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
    // O contexto é o que deixa a coluna — montada no servidor — virar a aba do
    // canvas, como o "Explore budget" do original faz.
    <CanvasContexto.Provider value={{ abrir: setAba }}>
    <PaginaComCanvas
      coluna={
        selecionado ? (
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
        )
      }
      canvas={
        <CanvasVisualizacao
          grafo={grafo}
          selecionado={selecionado}
          onSelecionar={selecionar}
          destaqueOrcamento={destacado ?? selecionado?.id}
          aba={aba}
          onMudarAba={setAba}
        />
      }
    />
    </CanvasContexto.Provider>
  );
}

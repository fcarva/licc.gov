"use client";

import { useRouter } from "next/navigation";
import type { Graph } from "@/types/graph";
import { CanvasVisualizacao, type Agregacao } from "./CanvasVisualizacao";
import { PaginaComCanvas } from "./PaginaComCanvas";

/**
 * Página de leitura com a rosca do orçamento ao lado, em vez de só tabela.
 *
 * Existe porque `/orcamento` — a página que leva o nome do orçamento — mostrava
 * tabela enquanto a rosca vivia na home e nas páginas de entidade. No original a
 * repartição do orçamento **é** a rosca; a tabela é a leitura alternativa que
 * acompanha o gráfico, não a substitui.
 *
 * A coluna-documento entra como `children` renderizado no servidor, então os
 * agregados continuam calculados lá. O que este invólucro adiciona é o canvas e
 * a navegação por clique.
 *
 * ## O que não está aqui
 *
 * No original, clicar numa fatia sincroniza a página inteira — métricas,
 * alocação e trilha. Aqui a coluna vem pronta do servidor, então clique na fatia
 * **navega** para a entidade em vez de re-renderizar a coluna. É menos do que o
 * original faz, e é o que o arranjo servidor/cliente sustenta sem mover a
 * apuração para o navegador.
 */
export function PaginaComRosca({
  grafo,
  agregacao = "segmento",
  titulo,
  subtitulo,
  acima,
  coluna,
  abaixo,
}: {
  grafo: Graph;
  agregacao?: Agregacao;
  titulo?: string;
  subtitulo?: React.ReactNode;
  acima?: React.ReactNode;
  coluna: React.ReactNode;
  abaixo?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <PaginaComCanvas
      titulo={titulo}
      subtitulo={subtitulo}
      acima={acima}
      coluna={coluna}
      abaixo={abaixo}
      canvas={
        <CanvasVisualizacao
          grafo={grafo}
          abaInicial="orcamento"
          agregacao={agregacao}
          // Uma vista só: segmentado de duas opções com uma útil é ruído, a mesma
          // razão por que `PainelAba` derruba a semântica de aba quando há uma.
          abasVisiveis={false}
          onSelecionar={(no) => {
            if (no?.slug) router.push(`/entidade/${no.slug}`);
          }}
        />
      }
    />
  );
}

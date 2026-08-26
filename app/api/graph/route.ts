import { NextResponse } from "next/server";
import { obterGrafo } from "@/lib/dados";
import type { NodeKind } from "@/types/graph";

/**
 * GET /api/graph
 *   ?kinds=projeto,segmento   filtra vértices por categoria
 *   ?segmento=musica          recorta o subgrafo de um segmento
 *   ?municipio=vitoria        recorta o subgrafo de um município
 *
 * Devolve sempre um grafo consistente: arestas cujas pontas foram filtradas
 * são descartadas.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grafo = obterGrafo();

  const kinds = searchParams.get("kinds")?.split(",").filter(Boolean) as
    | NodeKind[]
    | undefined;
  const segmento = searchParams.get("segmento");
  const municipio = searchParams.get("municipio");

  let nodes = grafo.nodes;

  if (segmento || municipio) {
    const alvo = grafo.nodes.find(
      (n) =>
        (segmento && n.kind === "segmento" && n.slug === segmento) ||
        (municipio && n.kind === "municipio" && n.slug === municipio),
    );
    if (!alvo) {
      return NextResponse.json({ erro: "recorte não encontrado" }, { status: 404 });
    }
    const vizinhanca = new Set<string>([alvo.id]);
    for (const e of grafo.edges) {
      if (e.source === alvo.id) vizinhanca.add(e.target);
      if (e.target === alvo.id) vizinhanca.add(e.source);
    }
    // Segundo salto: traz proponentes e patrocinadores dos projetos do recorte.
    for (const e of grafo.edges) {
      if (vizinhanca.has(e.source)) vizinhanca.add(e.target);
      if (vizinhanca.has(e.target)) vizinhanca.add(e.source);
    }
    nodes = nodes.filter((n) => vizinhanca.has(n.id));
  }

  if (kinds?.length) nodes = nodes.filter((n) => kinds.includes(n.kind));

  const ids = new Set(nodes.map((n) => n.id));
  const edges = grafo.edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  return NextResponse.json({ meta: grafo.meta, nodes, edges });
}

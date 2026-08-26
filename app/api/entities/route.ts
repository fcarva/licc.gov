import { NextResponse } from "next/server";
import { listarNos } from "@/lib/dados";
import type { NodeKind } from "@/types/graph";

/** GET /api/entities?kind=projeto&limit=50&offset=0&ordem=captado */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as NodeKind | null;
  const limite = Math.min(Number(searchParams.get("limit") ?? 100), 1000);
  const deslocamento = Number(searchParams.get("offset") ?? 0);
  const ordem = searchParams.get("ordem") ?? "nome";

  const todos = [...listarNos(kind ?? undefined)];
  todos.sort((a, b) => {
    if (ordem === "captado")
      return (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0);
    if (ordem === "autorizado")
      return (b.orcamento?.autorizado ?? 0) - (a.orcamento?.autorizado ?? 0);
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  return NextResponse.json({
    total: todos.length,
    itens: todos.slice(deslocamento, deslocamento + limite),
  });
}

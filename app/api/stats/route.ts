import { NextResponse } from "next/server";
import { obterEstatisticas, obterGrafo } from "@/lib/dados";

/** GET /api/stats — totais do exercício, cotas e proveniência dos dados. */
export async function GET() {
  const grafo = obterGrafo();
  return NextResponse.json({ meta: grafo.meta, ...obterEstatisticas() });
}

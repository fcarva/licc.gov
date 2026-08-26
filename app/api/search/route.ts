import { NextResponse } from "next/server";
import { buscar } from "@/lib/dados";

/** GET /api/search?q=termo&limit=20 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limite = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  return NextResponse.json({ q, resultados: buscar(q, limite) });
}

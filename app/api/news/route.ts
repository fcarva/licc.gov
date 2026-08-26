import { NextResponse } from "next/server";
import { listarNoticias } from "@/lib/dados";

/** GET /api/news?limit=100 — feed agregado, mais recentes primeiro. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limite = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  return NextResponse.json({ itens: listarNoticias(limite) });
}

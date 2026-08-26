import { NextResponse } from "next/server";
import { listarPanoramas, obterPanorama } from "@/lib/dados";

/**
 * GET /api/monitor            índice de todos os municípios
 * GET /api/monitor?municipio=vitoria   panorama de um município
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("municipio");

  if (!slug) return NextResponse.json({ itens: listarPanoramas() });

  const panorama = obterPanorama(slug);
  if (!panorama) {
    return NextResponse.json({ erro: "município não encontrado" }, { status: 404 });
  }
  return NextResponse.json(panorama);
}

import { NextResponse } from "next/server";
import { obterDetalhe } from "@/lib/dados";

/** GET /api/entities/[slug] — nó, vizinhança, agregados e notícias. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const detalhe = obterDetalhe(slug);
  if (!detalhe) {
    return NextResponse.json({ erro: "entidade não encontrada" }, { status: 404 });
  }
  return NextResponse.json(detalhe);
}

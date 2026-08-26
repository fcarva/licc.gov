import { NextResponse } from "next/server";
import { listarNos, obterEstatisticas, obterGrafo } from "@/lib/dados";

/**
 * GET /api/budget?por=segmento|municipio|regiao|status|patrocinador
 *
 * Devolve a execução orçamentária agregada pelo eixo pedido, já ordenada por
 * valor captado.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const por = searchParams.get("por") ?? "segmento";
  const grafo = obterGrafo();
  const stats = obterEstatisticas();

  const linhas =
    por === "regiao"
      ? agruparPorRegiao()
      : por === "status"
        ? agruparPorStatus()
        : listarNos(
              por === "municipio"
                ? "municipio"
                : por === "patrocinador"
                  ? "patrocinador"
                  : "segmento",
            )
            .filter((n) => (n.orcamento?.autorizado ?? 0) > 0 || (n.orcamento?.captado ?? 0) > 0)
            .map((n) => ({
              chave: n.slug,
              rotulo: n.nome,
              autorizado: n.orcamento?.autorizado ?? 0,
              captado: n.orcamento?.captado ?? 0,
            }));

  linhas.sort((a, b) => b.captado - a.captado || b.autorizado - a.autorizado);

  return NextResponse.json({
    por,
    tetoAutorizado: grafo.meta.tetoAutorizado,
    totais: { autorizado: stats.autorizado, captado: stats.captado },
    cotas: stats.cotas,
    linhas,
  });

  function agruparPorRegiao() {
    const mapa = new Map<string, { autorizado: number; captado: number }>();
    for (const m of listarNos("municipio")) {
      const regiao = String(m.meta?.regiao ?? "Não informada");
      const atual = mapa.get(regiao) ?? { autorizado: 0, captado: 0 };
      atual.autorizado += m.orcamento?.autorizado ?? 0;
      atual.captado += m.orcamento?.captado ?? 0;
      mapa.set(regiao, atual);
    }
    return [...mapa].map(([rotulo, v]) => ({ chave: rotulo, rotulo, ...v }));
  }

  function agruparPorStatus() {
    const mapa = new Map<string, { autorizado: number; captado: number }>();
    for (const p of listarNos("projeto")) {
      const status = String(p.meta?.status ?? "não informado");
      const atual = mapa.get(status) ?? { autorizado: 0, captado: 0 };
      atual.autorizado += p.orcamento?.autorizado ?? 0;
      atual.captado += p.orcamento?.captado ?? 0;
      mapa.set(status, atual);
    }
    return [...mapa].map(([rotulo, v]) => ({ chave: rotulo, rotulo, ...v }));
  }
}

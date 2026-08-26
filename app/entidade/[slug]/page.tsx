import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obterDetalhe, listarNos, obterGrafo } from "@/lib/dados";
import { NODE_KINDS } from "@/ontology/nodes";
import { numero } from "@/lib/format";
import { EntidadeVista } from "@/components/EntidadeVista";
import type { LinhaAlocacao } from "@/components/AlocacaoProporcional";
import type { EntityDetail } from "@/types/graph";

/**
 * Endereço estável de cada vértice do grafo.
 *
 * Renderizada no servidor: o painel do grafo serve para navegar, esta página
 * serve para citar, indexar e compartilhar.
 */

export async function generateStaticParams() {
  return listarNos().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detalhe = obterDetalhe(slug);
  if (!detalhe) return { title: "Entidade não encontrada" };
  const spec = NODE_KINDS[detalhe.node.kind];
  return {
    title: detalhe.node.nome,
    description:
      detalhe.node.descricao ?? `${spec.rotulo} no catálogo relacional da LICC.`,
  };
}

export default async function PaginaEntidade({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detalhe = obterDetalhe(slug);
  if (!detalhe) notFound();

  return (
    <EntidadeVista
      grafo={obterGrafo()}
      detalhe={detalhe}
      trilha={montarTrilha(detalhe)}
      metricaChave={montarMetricaChave(detalhe)}
      alocacao={montarAlocacao(detalhe)}
    />
  );
}

/** `licc.gov / LICC / Projetos`, no molde da trilha da referência. */
function montarTrilha(detalhe: EntityDetail) {
  const spec = NODE_KINDS[detalhe.node.kind];
  const secao: Partial<Record<string, { rotulo: string; href: string }>> = {
    segmento: { rotulo: "Segmentos", href: "/segmentos" },
    municipio: { rotulo: "Municípios", href: "/municipios" },
  };
  return [
    { rotulo: "licc.gov", href: "/" },
    { rotulo: "LICC", href: "/" },
    secao[detalhe.node.kind] ?? { rotulo: spec.rotuloPlural },
  ];
}

/** O número que resume a entidade — o lugar de "189 Budgeted Employees". */
function montarMetricaChave(detalhe: EntityDetail) {
  const { node, vizinhos, agregado } = detalhe;
  const contar = (kind: string) =>
    vizinhos.filter((v) => v.node.kind === kind).length;

  switch (node.kind) {
    case "projeto": {
      const n = contar("patrocinador");
      return n
        ? { valor: numero(n), rotulo: n === 1 ? "patrocinador" : "patrocinadores" }
        : { valor: "Sem", rotulo: "patrocínio registrado" };
    }
    case "patrocinador": {
      const n = contar("projeto");
      return { valor: numero(n), rotulo: n === 1 ? "projeto financiado" : "projetos financiados" };
    }
    case "proponente": {
      const n = Number(node.meta?.projetosNoAno ?? contar("projeto"));
      return { valor: `${numero(n)} de 3`, rotulo: "projetos permitidos no exercício" };
    }
    case "governanca": {
      const n = contar("projeto");
      return n
        ? { valor: numero(n), rotulo: "projetos sob acompanhamento" }
        : undefined;
    }
    case "segmento":
    case "municipio":
      return { valor: numero(agregado.projetos), rotulo: agregado.projetos === 1 ? "projeto" : "projetos" };
    default:
      return undefined;
  }
}

/**
 * Composição do valor, para a lista de altura proporcional.
 *
 * A categoria muda com o tipo: um projeto se decompõe nos seus patrocinadores,
 * um patrocinador nos projetos que banca, um segmento nos seus projetos.
 */
function montarAlocacao(detalhe: EntityDetail): LinhaAlocacao[] {
  const { node, vizinhos } = detalhe;

  const porAresta = vizinhos
    .filter((v) => v.edge.peso && v.edge.peso > 0)
    .map((v) => ({
      id: v.edge.id,
      rotulo: v.node.nome,
      valor: v.edge.peso!,
      cor: NODE_KINDS[v.node.kind].cor,
    }));
  if (porAresta.length) return ordenar(porAresta);

  const porProjeto = vizinhos
    .filter((v) => v.node.kind === "projeto" && (v.node.orcamento?.captado ?? 0) > 0)
    .map((v) => ({
      id: v.node.id,
      rotulo: v.node.nome,
      valor: v.node.orcamento!.captado,
      cor: NODE_KINDS.projeto.cor,
    }));
  if (porProjeto.length) return ordenar(porProjeto);

  // Para segmentos e municípios os projetos não são vizinhos diretos: a
  // ligação existe no sentido inverso, então busca-se pelo campo do projeto.
  if (node.kind === "segmento" || node.kind === "municipio") {
    const campo = node.kind === "segmento" ? "segmentoId" : "municipioId";
    return ordenar(
      listarNos("projeto")
        .filter((p) => p.meta?.[campo] === node.id && (p.orcamento?.captado ?? 0) > 0)
        .map((p) => ({
          id: p.id,
          rotulo: p.nome,
          valor: p.orcamento!.captado,
          cor: NODE_KINDS.projeto.cor,
        })),
    );
  }

  return [];
}

/** Maiores primeiro, e agrupa a cauda para a lista não virar um rolo. */
function ordenar(linhas: LinhaAlocacao[]): LinhaAlocacao[] {
  const ordenadas = [...linhas].sort((a, b) => b.valor - a.valor);
  const TETO = 10;
  if (ordenadas.length <= TETO) return ordenadas;
  const cabeca = ordenadas.slice(0, TETO);
  const cauda = ordenadas.slice(TETO);
  return [
    ...cabeca,
    {
      id: "outros",
      rotulo: `Outros ${cauda.length}`,
      valor: cauda.reduce((s, l) => s + l.valor, 0),
      cor: "var(--color-tinta-fraca)",
    },
  ];
}

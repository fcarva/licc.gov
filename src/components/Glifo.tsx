import type { NodeKind } from "@/types/graph";
import { NODE_KINDS } from "@/ontology/nodes";
import { caminhoDaForma } from "@/lib/radial";

/**
 * Glifo da categoria, no corpo do texto.
 *
 * No CivLab, uma entidade citada na prosa e um rótulo de métrica não levam um
 * ponto colorido genérico: levam **a forma que aquela categoria tem no grafo**,
 * dimensionada em `1em`. É o que amarra o texto ao desenho — quem leu que a
 * SECULT é um círculo no anel de aprovação reencontra o círculo no parágrafo.
 *
 * Reaproveita `caminhoDaForma()` do layout radial, então forma no texto e
 * forma no grafo não podem divergir: é o mesmo código.
 */
export function Glifo({
  kind,
  className = "",
}: {
  kind: NodeKind;
  className?: string;
}) {
  const spec = NODE_KINDS[kind];
  // As categorias sem anel não têm forma no desenho. No texto viram círculo,
  // que é o marcador neutro: dar-lhes uma forma própria sugeriria um lugar no
  // fluxo do valor que elas justamente não ocupam.
  const d = caminhoDaForma(spec.forma === "oculto" ? "circulo" : spec.forma, 7.4);
  return (
    <svg
      viewBox="-10 -10 20 20"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 ${className}`}
    >
      {/* A mesma regra de três camadas do grafo, sem a base branca: aqui o
          fundo é o do texto, e pintá-lo de branco abriria um furo no papel. */}
      <path d={d} fill={spec.cor} fillOpacity={0.5} />
      <path d={d} fill="none" stroke={spec.cor} strokeWidth={1.7} />
    </svg>
  );
}

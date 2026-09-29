import type { Metadata } from "next";
import { obterGrafo } from "@/lib/dados";
import { IndiceCategoria } from "@/components/IndiceCategoria";

export const metadata: Metadata = {
  title: "Proponentes",
  description:
    "Quem executa os projetos da Lei de Incentivo à Cultura Capixaba: produtoras, coletivos, associações, ONGs e prefeituras, com município, valor autorizado e captado.",
};

export default function PaginaProponentes() {
  return (
    <IndiceCategoria
      grafo={obterGrafo()}
      kind="proponente"
      titulo="Proponentes"
      subtitulo={
        <>
          O anel da execução: produtoras, coletivos, associações e prefeituras que
          inscrevem projeto e, habilitados, saem à procura de patrocinador. A
          diferença entre autorizado e captado é o que cada um conseguiu convencer
          uma empresa a aportar.
        </>
      }
    />
  );
}

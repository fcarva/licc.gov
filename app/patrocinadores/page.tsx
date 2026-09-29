import type { Metadata } from "next";
import { obterGrafo } from "@/lib/dados";
import { IndiceCategoria } from "@/components/IndiceCategoria";

export const metadata: Metadata = {
  title: "Patrocinadores",
  description:
    "As empresas contribuintes de ICMS que aportaram recursos na Lei de Incentivo à Cultura Capixaba, com CNPJ, número de projetos e valor aportado.",
};

export default function PaginaPatrocinadores() {
  return (
    <IndiceCategoria
      grafo={obterGrafo()}
      kind="patrocinador"
      titulo="Patrocinadores"
      subtitulo={
        <>
          O anel do capital. São empresas contribuintes que escolhem onde alocar a
          renúncia de ICMS — é aqui que se decide, na prática, qual cultura recebe
          dinheiro. O valor é o <strong className="font-medium text-tinta">aportado</strong>,
          somado pelo peso das arestas de patrocínio, não o teto dos projetos que
          bancam.
        </>
      }
    />
  );
}

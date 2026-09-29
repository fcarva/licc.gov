import type { Metadata } from "next";
import { obterGrafo } from "@/lib/dados";
import { IndiceCategoria } from "@/components/IndiceCategoria";

export const metadata: Metadata = {
  title: "Projetos",
  description:
    "Os projetos culturais habilitados na Lei de Incentivo à Cultura Capixaba, com proponente, teto autorizado, valor captado e execução.",
};

export default function PaginaProjetos() {
  return (
    <IndiceCategoria
      grafo={obterGrafo()}
      kind="projeto"
      titulo="Projetos"
      subtitulo={
        <>
          O anel do bem público — o que a política existe para produzir. O teto
          autorizado é permissão de captar, não recurso recebido: a coluna de
          execução mostra quanto de cada permissão virou dinheiro.
        </>
      }
    />
  );
}

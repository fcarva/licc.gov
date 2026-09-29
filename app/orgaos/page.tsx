import type { Metadata } from "next";
import { obterGrafo } from "@/lib/dados";
import { IndiceCategoria } from "@/components/IndiceCategoria";

export const metadata: Metadata = {
  title: "Órgãos",
  description:
    "Os órgãos que aprovam, fiscalizam e operam a Lei de Incentivo à Cultura Capixaba: SECULT, SEFAZ, CEC, CAP e o Governo do Estado.",
};

export default function PaginaOrgaos() {
  return (
    <IndiceCategoria
      grafo={obterGrafo()}
      kind="governanca"
      titulo="Órgãos"
      subtitulo={
        <>
          O primeiro anel do fluxo: quem decide que um projeto pode captar e quem
          abre mão do imposto para que ele capte. Não movem dinheiro próprio — a
          renúncia de ICMS que autorizam aparece nos anéis de fora.
        </>
      }
    />
  );
}

import type { Proveniencia } from "@/types/graph";

const ESTILOS: Record<Proveniencia, { rotulo: string; classe: string; titulo: string }> = {
  oficial: {
    rotulo: "Fonte oficial",
    classe: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
    titulo: "Extraído de publicação oficial da SECULT-ES, da SEFAZ-ES ou do Mapa Cultural do ES.",
  },
  derivado: {
    rotulo: "Derivado",
    classe: "border-sky-600/30 bg-sky-600/10 text-sky-800 dark:text-sky-300",
    titulo: "Calculado ou classificado a partir de dados oficiais.",
  },
  demonstracao: {
    rotulo: "Demonstração",
    classe: "border-amber-600/40 bg-amber-600/10 text-amber-800 dark:text-amber-300",
    titulo: "Registro fictício, gerado localmente para exercitar a interface. Não é dado real.",
  },
};

/**
 * Selo de proveniência.
 *
 * Aparece em toda entidade. Sem ele, um grafo bonito de dados sintéticos é
 * indistinguível de um grafo bonito de dados reais — que é exatamente o erro
 * que um painel de transparência não pode cometer.
 */
export function SeloProveniencia({ proveniencia }: { proveniencia: Proveniencia }) {
  const e = ESTILOS[proveniencia];
  return (
    <span
      title={e.titulo}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${e.classe}`}
    >
      {e.rotulo}
    </span>
  );
}

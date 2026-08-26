import { percentual } from "@/lib/format";

/**
 * Execução da captação: quanto do teto autorizado já virou dinheiro no caixa
 * do projeto. A barra é sempre relativa ao autorizado, nunca ao teto estadual,
 * para não sugerir comparações que a norma não faz.
 */
export function BarraExecucao({
  autorizado,
  captado,
  compacta,
}: {
  autorizado: number;
  captado: number;
  compacta?: boolean;
}) {
  const fracao = autorizado > 0 ? Math.min(1, captado / autorizado) : 0;
  const pct = percentual(autorizado > 0 ? captado / autorizado : null);

  return (
    <div>
      <div
        role="meter"
        aria-valuenow={Math.round(fracao * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Captação: ${pct} do autorizado`}
        className={`w-full overflow-hidden rounded-full bg-papel-fundo ${
          compacta ? "h-1.5" : "h-2"
        }`}
      >
        <div
          className="h-full rounded-full bg-[var(--color-patrocinador)] transition-[width] duration-500"
          style={{ width: `${fracao * 100}%` }}
        />
      </div>
      {!compacta ? (
        <p className="mt-1.5 text-xs text-tinta-fraca">
          <span className="tabular font-medium text-tinta">{pct}</span> do valor
          autorizado já captado
        </p>
      ) : null}
    </div>
  );
}

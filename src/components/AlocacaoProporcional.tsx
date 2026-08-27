import { brl, percentual } from "@/lib/format";

export interface LinhaAlocacao {
  id: string;
  rotulo: string;
  valor: number;
  cor?: string;
}

/**
 * Alocação como lista de altura proporcional.
 *
 * O CivLab não usa barras aqui: cada categoria é uma faixa cuja **altura**
 * corresponde à sua fatia. Lê-se a composição inteira de uma vez, sem
 * comparar comprimentos, e as fatias mínimas continuam legíveis porque
 * recebem uma altura de piso.
 *
 * A cor de fundo estratifica por intensidade — quanto mais forte, mais recurso
 * ali. A referência é o **maior valor da lista**, não o total: com nove
 * segmentos nenhum passa de ~17% do todo, e uma escala sobre o total deixaria
 * todas as faixas igualmente pálidas, apagando justamente a comparação que a
 * lista existe para mostrar.
 */
export function AlocacaoProporcional({
  titulo,
  total,
  linhas,
  alturaTotal = 300,
  onPairar,
}: {
  titulo?: string;
  total: number;
  linhas: LinhaAlocacao[];
  alturaTotal?: number;
  /** Avisa qual linha está sob o ponteiro, para acender a fatia na rosca. */
  onPairar?: (id: string | undefined) => void;
}) {
  const soma = linhas.reduce((s, l) => s + l.valor, 0) || 1;
  const maior = Math.max(...linhas.map((l) => l.valor), 1);
  const ALTURA_MINIMA = 26;

  // Distribui a altura proporcionalmente, mas garante o piso de leitura e
  // devolve o excedente descontando de quem tem folga.
  const brutas = linhas.map((l) => (l.valor / soma) * alturaTotal);
  const deficit = brutas.reduce((s, h) => s + Math.max(0, ALTURA_MINIMA - h), 0);
  const folgaTotal = brutas.reduce((s, h) => s + Math.max(0, h - ALTURA_MINIMA), 0);
  const alturas = brutas.map((h) =>
    h < ALTURA_MINIMA
      ? ALTURA_MINIMA
      : h - (folgaTotal > 0 ? ((h - ALTURA_MINIMA) / folgaTotal) * deficit : 0),
  );

  return (
    <div>
      {titulo ? (
        <>
          <h3 className="text-sm font-semibold text-tinta">{titulo}</h3>
          <p className="mb-3 mt-0.5 text-xs text-tinta-fraca">
            {brl(total)} dividido em {linhas.length}{" "}
            {linhas.length === 1 ? "categoria" : "categorias"}
          </p>
        </>
      ) : null}

      <ul className="overflow-hidden rounded-xl border border-borda">
        {linhas.map((l, i) => (
          <li
            key={l.id}
            onMouseEnter={() => onPairar?.(l.id)}
            className="flex items-start justify-between gap-3 border-b border-borda px-3 py-2 transition-[filter] last:border-b-0 hover:brightness-95"
            style={{
              height: `${alturas[i]}px`,
              background: l.cor
                ? `color-mix(in srgb, ${l.cor} ${(8 + (l.valor / maior) * 62).toFixed(1)}%, transparent)`
                : undefined,
            }}
          >
            <span className="truncate text-xs text-tinta">{l.rotulo}</span>
            <span className="tabular shrink-0 text-xs text-tinta-suave">
              {brl(l.valor)}{" "}
              <span className="text-tinta-fraca">({percentual(l.valor / soma, 2)})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

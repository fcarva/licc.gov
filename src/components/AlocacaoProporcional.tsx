import { brl, percentual } from "@/lib/format";
import { escurecer } from "@/ontology/paleta-orcamento";

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
 * A cor entra como **filete inferior** na cor da categoria, com o rótulo num
 * tom escuro da mesma família — foi assim que o HTML do original apareceu
 * (`border-b-[#29D8CB]` com `text-[#127B74]`). Houve aqui uma versão com fundo
 * tingido por intensidade; era invenção minha. Quem diz onde o recurso se
 * concentra é a altura da faixa, que é justamente o que a lista existe para
 * mostrar — tingir o fundo por cima disso duplicava a codificação e sujava a
 * leitura da cor, que serve para casar a faixa com a fatia da rosca.
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
  /** Avisa qual linha está sob o ponteiro, para marcar a fatia na rosca. */
  onPairar?: (id: string | undefined) => void;
}) {
  const soma = linhas.reduce((s, l) => s + l.valor, 0) || 1;
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

      <ul>
        {linhas.map((l, i) => (
          <li
            key={l.id}
            onMouseEnter={() => onPairar?.(l.id)}
            className="flex items-start justify-between gap-3 px-1 py-1.5 transition-colors hover:bg-papel-fundo"
            style={{
              height: `${alturas[i]}px`,
              borderBottom: `2px solid ${l.cor ?? "var(--color-borda-forte)"}`,
            }}
          >
            <span
              className="truncate text-xs font-medium"
              style={{ color: l.cor ? escurecer(l.cor, 0.55) : "var(--color-tinta)" }}
            >
              {l.rotulo}
            </span>
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

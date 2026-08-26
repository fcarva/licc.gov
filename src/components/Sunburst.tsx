"use client";

import { useMemo, useState, useId } from "react";
import { brl, brlCurto } from "@/lib/format";

export interface FatiaSunburst {
  id: string;
  rotulo: string;
  valor: number;
  cor: string;
  filhos?: Array<{ id: string; rotulo: string; valor: number }>;
}

/**
 * Rosca de dois anéis com o aninhamento do orçamento.
 *
 * Centro traz o teto do exercício; o anel interno agrupa por segmento e o
 * externo detalha os projetos. A fatia da entidade em foco fica acesa e as
 * demais recuam — é a mesma leitura do painel de orçamento do SF Gov Graph,
 * que mostra o departamento dentro da sua área de serviço dentro da cidade.
 */
export function Sunburst({
  titulo,
  total,
  fatias,
  destaqueId,
  onSelecionar,
}: {
  titulo: string;
  total: number;
  fatias: FatiaSunburst[];
  /** `id` de uma fatia ou de um filho a manter aceso. */
  destaqueId?: string;
  onSelecionar?: (id: string) => void;
}) {
  const [pairada, setPairada] = useState<{ rotulo: string; valor: number } | null>(null);
  const idGradiente = useId();

  const RAIO_EXTERNO = 100;
  const RAIO_MEIO = 74;
  const RAIO_INTERNO = 52;
  const VAO = 0.004; // radianos de respiro entre fatias

  const arcos = useMemo(() => {
    const somaFatias = fatias.reduce((s, f) => s + f.valor, 0);
    // O ângulo é proporcional ao total do exercício, não à soma das fatias:
    // assim o vão que sobra mostra, honestamente, o teto não comprometido.
    const base = Math.max(somaFatias, total) || 1;
    let angulo = -Math.PI / 2;

    return fatias.map((f) => {
      const varredura = (f.valor / base) * Math.PI * 2;
      const inicio = angulo;
      const fim = angulo + varredura;
      angulo = fim;

      let anguloFilho = inicio;
      const filhos = (f.filhos ?? []).map((c) => {
        const v = f.valor > 0 ? (c.valor / f.valor) * varredura : 0;
        const ci = anguloFilho;
        anguloFilho += v;
        return { ...c, inicio: ci, fim: anguloFilho };
      });

      return { ...f, inicio, fim, filhos };
    });
  }, [fatias, total]);

  const aceso = (id: string) => !destaqueId || id === destaqueId;

  // O que sobra do teto: desenhado como arco vazado para que o anel feche.
  // Sem ele, o vão parece defeito de renderização em vez de teto não captado.
  const somaFatias = fatias.reduce((s, f) => s + f.valor, 0);
  const restante = Math.max(0, total - somaFatias);
  const inicioRestante = arcos.length ? arcos[arcos.length - 1].fim : -Math.PI / 2;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="-120 -120 240 240" className="h-full max-h-[520px] w-full" role="img"
           aria-label={`${titulo}: ${brl(total)}`}>
        <defs>
          <radialGradient id={idGradiente}>
            <stop offset="0%" stopColor="var(--color-papel)" />
            <stop offset="100%" stopColor="var(--color-papel)" />
          </radialGradient>
        </defs>

        {/* Teto ainda não captado. */}
        {restante > 0 ? (
          <path
            d={setor(inicioRestante + VAO, Math.PI * 1.5 - VAO, RAIO_INTERNO, RAIO_EXTERNO)}
            fill="var(--color-tinta-fraca)"
            fillOpacity={0.09}
            stroke="var(--color-borda)"
            strokeWidth={0.5}
            className="cursor-help"
            onMouseEnter={() =>
              setPairada({ rotulo: "Teto ainda não captado", valor: restante })
            }
            onMouseLeave={() => setPairada(null)}
          />
        ) : null}

        {/* Anel externo: projetos. */}
        <g>
          {arcos.flatMap((f) =>
            f.filhos.map((c) => (
              <path
                key={c.id}
                d={setor(c.inicio + VAO, c.fim - VAO, RAIO_MEIO, RAIO_EXTERNO)}
                fill={f.cor}
                fillOpacity={aceso(c.id) || aceso(f.id) ? 0.55 : 0.13}
                stroke="var(--color-papel)"
                strokeWidth={0.4}
                className="cursor-pointer transition-[fill-opacity] duration-200"
                onMouseEnter={() => setPairada({ rotulo: c.rotulo, valor: c.valor })}
                onMouseLeave={() => setPairada(null)}
                onClick={() => onSelecionar?.(c.id)}
              />
            )),
          )}
        </g>

        {/* Anel interno: segmentos. */}
        <g>
          {arcos.map((f) => (
            <path
              key={f.id}
              d={setor(f.inicio + VAO, f.fim - VAO, RAIO_INTERNO, RAIO_MEIO)}
              fill={f.cor}
              fillOpacity={aceso(f.id) ? 0.92 : 0.2}
              stroke="var(--color-papel)"
              strokeWidth={0.5}
              className="cursor-pointer transition-[fill-opacity] duration-200"
              onMouseEnter={() => setPairada({ rotulo: f.rotulo, valor: f.valor })}
              onMouseLeave={() => setPairada(null)}
              onClick={() => onSelecionar?.(f.id)}
            />
          ))}
        </g>

        {/* Rótulos curvos das fatias mais largas. */}
        <g className="pointer-events-none">
          {arcos
            .filter((f) => f.fim - f.inicio > 0.34)
            .map((f) => {
              const meio = (f.inicio + f.fim) / 2;
              const raio = (RAIO_INTERNO + RAIO_MEIO) / 2;
              const x = Math.cos(meio) * raio;
              const y = Math.sin(meio) * raio;
              const graus = (meio * 180) / Math.PI;
              // Mantém o texto legível na metade esquerda da rosca.
              const girar = graus > 90 || graus < -90 ? graus + 180 : graus;
              return (
                <text
                  key={`r-${f.id}`}
                  x={x}
                  y={y}
                  transform={`rotate(${girar} ${x} ${y})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--color-papel)"
                  style={{ fontSize: 5.4, fontWeight: 600 }}
                >
                  {recortar(f.rotulo, 22)}
                </text>
              );
            })}
        </g>

        {/* Miolo com o total. */}
        <circle r={RAIO_INTERNO - 2} fill={`url(#${idGradiente})`} />
        <text textAnchor="middle" className="pointer-events-none">
          <tspan x="0" y="-6" fill="var(--color-tinta-fraca)" style={{ fontSize: 6.5 }}>
            {titulo}
          </tspan>
          <tspan x="0" y="7" fill="var(--color-tinta)" style={{ fontSize: 13, fontWeight: 600 }}>
            {brlCurto(total)}
          </tspan>
        </text>
      </svg>

      {pairada ? (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-borda bg-papel px-2.5 py-1.5 text-center shadow-sm">
          <p className="text-xs font-medium text-tinta">{pairada.rotulo}</p>
          <p className="tabular text-[11px] text-tinta-fraca">{brl(pairada.valor)}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Caminho de um setor anelar entre dois raios. */
function setor(inicio: number, fim: number, rInterno: number, rExterno: number): string {
  if (fim <= inicio) return "";
  const grande = fim - inicio > Math.PI ? 1 : 0;
  const p = (a: number, r: number) => `${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`;
  return [
    `M ${p(inicio, rInterno)}`,
    `L ${p(inicio, rExterno)}`,
    `A ${rExterno} ${rExterno} 0 ${grande} 1 ${p(fim, rExterno)}`,
    `L ${p(fim, rInterno)}`,
    `A ${rInterno} ${rInterno} 0 ${grande} 0 ${p(inicio, rInterno)}`,
    "Z",
  ].join(" ");
}

const recortar = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

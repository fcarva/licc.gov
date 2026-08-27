"use client";

import { useMemo, useState } from "react";
import { brl, brlCurto } from "@/lib/format";
import { clarear, escurecer } from "@/ontology/paleta-orcamento";

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
 * Reproduz a leitura do painel de orçamento do SF Government Graph: o miolo
 * traz o total do exercício, o anel interno agrupa (lá são as áreas de
 * serviço, aqui os segmentos culturais) e o externo detalha (lá os
 * departamentos, aqui os projetos).
 *
 * O anel externo usa **o mesmo matiz do interno, clareado** — é o que faz o
 * olho ler o detalhe como parte do agrupamento, em vez de duas categorias
 * soltas. Geometria e proporção de cor foram aferidas dos quadros da gravação.
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
  const [pairada, setPairada] = useState<{
    rotulo: string;
    valor: number;
    cor: string;
  } | null>(null);

  const RAIO_EXTERNO = 100;
  const RAIO_MEIO = 77;
  const RAIO_INTERNO = 55;
  const VAO = 0.003;

  const arcos = useMemo(() => {
    const somaFatias = fatias.reduce((s, f) => s + f.valor, 0);
    // O ângulo é proporcional ao total do exercício, não à soma das fatias:
    // assim o vão que sobra mostra, honestamente, o teto não comprometido.
    const base = Math.max(somaFatias, total) || 1;
    let angulo = -Math.PI / 2;

    return fatias.map((f) => {
      const varredura = (f.valor / base) * Math.PI * 2;
      const inicio = angulo;
      angulo += varredura;

      let anguloFilho = inicio;
      const filhos = (f.filhos ?? []).map((c) => {
        const v = f.valor > 0 ? (c.valor / f.valor) * varredura : 0;
        const ci = anguloFilho;
        anguloFilho += v;
        return { ...c, inicio: ci, fim: anguloFilho, cor: clarear(f.cor) };
      });

      return { ...f, inicio, fim: angulo, filhos };
    });
  }, [fatias, total]);

  const somaFatias = fatias.reduce((s, f) => s + f.valor, 0);
  const restante = Math.max(0, total - somaFatias);
  const inicioRestante = arcos.length ? arcos[arcos.length - 1].fim : -Math.PI / 2;

  const aceso = (id: string, paiId?: string) =>
    !destaqueId || id === destaqueId || paiId === destaqueId;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="-118 -118 236 236"
        className="h-full max-h-[540px] w-full"
        role="img"
        aria-label={`${titulo}: ${brl(total)}`}
      >
        {/* Teto ainda não captado: fecha o anel para que o vão se leia como
            dado, e não como defeito de renderização. */}
        {restante > 0 ? (
          <path
            d={setor(inicioRestante + VAO, Math.PI * 1.5 - VAO, RAIO_INTERNO, RAIO_EXTERNO)}
            fill="var(--color-tinta-fraca)"
            fillOpacity={0.1}
            stroke="var(--color-papel)"
            strokeWidth={0.6}
            className="cursor-help"
            onMouseEnter={() =>
              setPairada({
                rotulo: "Teto ainda não captado",
                valor: restante,
                cor: "#8a8a92",
              })
            }
            onMouseLeave={() => setPairada(null)}
          />
        ) : null}

        {/* Anel externo: os projetos, no matiz clareado do seu segmento. */}
        <g>
          {arcos.flatMap((f) =>
            f.filhos.map((c) => (
              <path
                key={c.id}
                d={setor(c.inicio + VAO, c.fim - VAO, RAIO_MEIO, RAIO_EXTERNO)}
                fill={c.cor}
                fillOpacity={aceso(c.id, f.id) ? 1 : 0.25}
                stroke="var(--color-papel)"
                strokeWidth={0.5}
                className="cursor-pointer transition-[fill-opacity] duration-150"
                onMouseEnter={() =>
                  setPairada({ rotulo: c.rotulo, valor: c.valor, cor: f.cor })
                }
                onMouseLeave={() => setPairada(null)}
                onClick={() => onSelecionar?.(c.id)}
              />
            )),
          )}
        </g>

        {/* Anel interno: os segmentos, na cor cheia. */}
        <g>
          {arcos.map((f) => (
            <path
              key={f.id}
              d={setor(f.inicio + VAO, f.fim - VAO, RAIO_INTERNO, RAIO_MEIO)}
              fill={f.cor}
              fillOpacity={aceso(f.id) ? 1 : 0.25}
              stroke="var(--color-papel)"
              strokeWidth={0.6}
              className="cursor-pointer transition-[fill-opacity] duration-150"
              onMouseEnter={() =>
                setPairada({ rotulo: f.rotulo, valor: f.valor, cor: f.cor })
              }
              onMouseLeave={() => setPairada(null)}
              onClick={() => onSelecionar?.(f.id)}
            />
          ))}
        </g>

        {/* Nome e valor da fatia mais larga de cada lado, fora do anel. */}
        <g className="pointer-events-none">
          {arcos
            .filter((f) => f.fim - f.inicio > 0.22)
            .map((f) => {
              const meio = (f.inicio + f.fim) / 2;
              const raio = RAIO_EXTERNO + 9;
              const x = Math.cos(meio) * raio;
              const y = Math.sin(meio) * raio;
              const cor = escurecer(f.cor);
              const acima = Math.sin(meio) < 0;
              return (
                <text
                  key={`r-${f.id}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fill={cor}
                  style={{ fontSize: 5.6, fontWeight: 600 }}
                >
                  <tspan x={x} dy={acima ? -3 : 3}>
                    {recortar(f.rotulo, 28)}
                  </tspan>
                  <tspan x={x} dy={7} style={{ fontWeight: 500 }}>
                    {brlCurto(f.valor)}
                  </tspan>
                </text>
              );
            })}
        </g>

        {/* Miolo com o total do exercício. */}
        <circle r={RAIO_INTERNO - 1.5} fill="var(--color-papel)" />
        <text textAnchor="middle" className="pointer-events-none">
          <tspan x="0" y="-6" fill="var(--color-tinta-fraca)" style={{ fontSize: 6.5 }}>
            {titulo}
          </tspan>
          <tspan x="0" y="8" fill="var(--color-tinta)" style={{ fontSize: 15, fontWeight: 600 }}>
            {brlCurto(total)}
          </tspan>
        </text>
      </svg>

      {/* Cartão de leitura: borda e nome na cor da fatia, como no original. */}
      {pairada ? (
        <div
          className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg border-2 bg-papel px-3 py-1.5 text-center shadow-sm"
          style={{ borderColor: pairada.cor }}
        >
          <p
            className="text-xs font-semibold"
            style={{ color: escurecer(pairada.cor) }}
          >
            {pairada.rotulo}
          </p>
          <p
            className="tabular text-[11px]"
            style={{ color: escurecer(pairada.cor, 0.2) }}
          >
            {brl(pairada.valor)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Caminho de um setor anelar entre dois raios. */
function setor(inicio: number, fim: number, rInterno: number, rExterno: number): string {
  if (fim <= inicio) return "";
  const grande = fim - inicio > Math.PI ? 1 : 0;
  const p = (a: number, r: number) =>
    `${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`;
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

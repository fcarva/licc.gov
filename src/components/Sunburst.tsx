"use client";

import { useMemo, useRef, useState } from "react";
import { brl, brlCurto, percentual } from "@/lib/format";
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
 * soltas.
 *
 * Geometria, traço e tipografia vêm do HTML do original, medido em
 * `docs/referencia-civlab.md` — não de amostragem de pixels. Por isso as
 * constantes abaixo são os números do original, e o `viewBox` é o dele: assim
 * qualquer divergência se confere lendo a tabela, sem regra de três.
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
  /** `id` de uma fatia ou de um filho a marcar como selecionado. */
  destaqueId?: string;
  onSelecionar?: (id: string) => void;
}) {
  const [pairada, setPairada] = useState<{
    rotulo: string;
    valor: number;
    cor: string;
  } | null>(null);
  const [ponteiro, setPonteiro] = useState({ x: 0, y: 0 });
  const caixa = useRef<HTMLDivElement>(null);

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

  // Seleção é aditiva: engrossa e escurece o traço da fatia escolhida e não
  // toca em nenhuma outra. O original apaga o resto? Não — todas as fatias
  // ficam em opacidade cheia, porque a rosca existe para dar o contexto que o
  // escurecimento justamente destruiria.
  const selecionada = (id: string, paiId?: string) =>
    Boolean(destaqueId) && (id === destaqueId || paiId === destaqueId);

  const mover = (e: React.MouseEvent) => {
    const r = caixa.current?.getBoundingClientRect();
    if (r) setPonteiro({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div
      ref={caixa}
      className="relative flex h-full w-full items-center justify-center"
      onMouseLeave={() => setPairada(null)}
    >
      <svg
        viewBox="0 0 800 750"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label={`Rosca do orçamento — ${titulo}, ${brl(total)}, repartido entre ${fatias.length} linguagens culturais e o teto ainda não captado`}
      >
        <defs>
          {arcos.map((f) => {
            const meio = (f.inicio + f.fim) / 2;
            // Na metade de baixo o texto inverte, para nunca correr de cabeça
            // para baixo ao acompanhar a curva.
            const inverter = Math.sin(meio) > 0;
            const [de, para] = inverter ? [f.fim, f.inicio] : [f.inicio, f.fim];
            return (
              <path
                key={f.id}
                id={`arco-fatia-${f.id}`}
                d={arcoTexto(de, para, inverter ? RAIO_ROTULO + 12 : RAIO_ROTULO)}
                fill="none"
              />
            );
          })}
        </defs>

        <g transform={`translate(${CENTRO.x},${CENTRO.y})`}>
          {/* Teto ainda não captado: fecha o anel para que o vão se leia como
              dado, e não como defeito de renderização. */}
          {restante > 0 ? (
            <path
              d={setor(inicioRestante + VAO, Math.PI * 1.5 - VAO, RAIO_INTERNO, RAIO_EXTERNO)}
              fill="var(--color-tinta-fraca)"
              fillOpacity={0.1}
              stroke="var(--color-papel)"
              strokeWidth={TRACO}
              className="cursor-help"
              onMouseEnter={() =>
                setPairada({
                  rotulo: "Teto ainda não captado",
                  valor: restante,
                  cor: "#8a8a92",
                })
              }
              onMouseMove={mover}
            />
          ) : null}

          {/* Anel externo: os projetos, no matiz clareado do seu segmento. */}
          <g>
            {arcos.flatMap((f) =>
              f.filhos.map((c) => {
                const marcada = selecionada(c.id, f.id);
                return (
                  <path
                    key={c.id}
                    d={setor(c.inicio + VAO, c.fim - VAO, RAIO_MEIO, RAIO_EXTERNO)}
                    fill={c.cor}
                    stroke={marcada ? escurecer(f.cor, 0.35) : "var(--color-papel)"}
                    strokeWidth={marcada ? TRACO_SELECIONADO : TRACO}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setPairada({ rotulo: c.rotulo, valor: c.valor, cor: f.cor })
                    }
                    onMouseMove={mover}
                    onClick={() => onSelecionar?.(c.id)}
                  />
                );
              }),
            )}
          </g>

          {/* Anel interno: os segmentos, na cor cheia. */}
          <g>
            {arcos.map((f) => {
              const marcada = selecionada(f.id);
              return (
                <path
                  key={f.id}
                  d={setor(f.inicio + VAO, f.fim - VAO, RAIO_INTERNO, RAIO_MEIO)}
                  fill={f.cor}
                  stroke={marcada ? escurecer(f.cor, 0.35) : "var(--color-papel)"}
                  strokeWidth={marcada ? TRACO_SELECIONADO : TRACO}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setPairada({ rotulo: f.rotulo, valor: f.valor, cor: f.cor })
                  }
                  onMouseMove={mover}
                  onClick={() => onSelecionar?.(f.id)}
                />
              );
            })}
          </g>

          {/* Nome da linguagem correndo pelo próprio arco, como no original.
              Onde o nome não cabe em corpo cheio ele encolhe até um piso de
              leitura; abaixo disso some, e a fatia segue identificável pela cor
              e pela lista ao lado. Encolher é melhor que truncar: "Audiov…" não
              nomeia nada. */}
          <g className="pointer-events-none">
            {arcos.map((f) => {
              const arco = (f.fim - f.inicio) * RAIO_ROTULO;
              const corpo = Math.min(
                ROTULO_ARCO,
                (arco - 12) / (f.rotulo.length * PROPORCAO_GLIFO),
              );
              if (corpo < ROTULO_ARCO_MINIMO) return null;
              return (
                <text
                  key={`t-${f.id}`}
                  fill={escurecer(f.cor, 0.55)}
                  style={{ fontSize: Number(corpo.toFixed(1)), fontWeight: 500 }}
                  dominantBaseline="middle"
                >
                  <textPath href={`#arco-fatia-${f.id}`} startOffset="50%" textAnchor="middle">
                    {f.rotulo}
                  </textPath>
                </text>
              );
            })}
          </g>

          {/* Miolo com o total do exercício. */}
          <circle r={RAIO_INTERNO - TRACO} fill="var(--color-papel)" />
          <text textAnchor="middle" className="pointer-events-none">
            <tspan
              x="0"
              y="-14"
              fill="var(--color-tinta-fraca)"
              style={{ fontSize: MIOLO_ROTULO, fontWeight: 500 }}
            >
              {titulo}
            </tspan>
            <tspan
              x="0"
              y="22"
              fill="var(--color-tinta)"
              style={{ fontSize: MIOLO_VALOR, fontWeight: 600 }}
            >
              {brlCurto(total)}
            </tspan>
          </text>
        </g>
      </svg>

      {/* Tooltip do original: bordado, não sombreado, e acompanha o ponteiro. */}
      {pairada ? (
        <div
          className="pointer-events-none absolute z-[1000] max-w-[240px] rounded-[4px] border border-[#ccc] bg-white px-2 py-1 text-[12px] leading-snug text-neutral-800"
          style={{
            left: ponteiro.x,
            top: ponteiro.y,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <span className="font-semibold">{pairada.rotulo}</span>
          <span className="tabular block text-neutral-600">
            {brl(pairada.valor)}
            {total > 0 ? ` · ${percentual(pairada.valor / total, 1)} do teto` : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* Medidas do original (docs/referencia-civlab.md). Absolutas, não em fração,
   porque o viewBox aqui é o mesmo `0 0 800 750` de lá. */
const CENTRO = { x: 400, y: 355 };
const RAIO_EXTERNO = 320;
const RAIO_MEIO = 250.667;
const RAIO_INTERNO = 181.333;
/** Meio do anel interno, onde o nome da linguagem corre pelo arco. */
const RAIO_ROTULO = (RAIO_INTERNO + RAIO_MEIO) / 2;
const TRACO = 1.5;
const TRACO_SELECIONADO = 2;
const ROTULO_ARCO = 16;
/** Abaixo disso o nome não se lê no arco e é melhor não desenhá-lo. */
const ROTULO_ARCO_MINIMO = 9.5;
const MIOLO_ROTULO = 14;
const MIOLO_VALOR = 34;
/** Largura média de um glifo por px de corpo, para caber o nome no arco. */
const PROPORCAO_GLIFO = 0.525;
const VAO = 0.002;

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

/** Arco simples entre dois ângulos, para o rótulo correr por cima. */
function arcoTexto(de: number, para: number, raio: number): string {
  const p = (a: number) =>
    `${(Math.cos(a) * raio).toFixed(2)} ${(Math.sin(a) * raio).toFixed(2)}`;
  const varredura = para > de ? 1 : 0;
  const grande = Math.abs(para - de) > Math.PI ? 1 : 0;
  return `M ${p(de)} A ${raio} ${raio} 0 ${grande} ${varredura} ${p(para)}`;
}

"use client";

import { useMemo, useState, useId } from "react";
import type { Graph, GraphNode } from "@/types/graph";
import { NODE_KINDS } from "@/ontology/nodes";
import {
  calcularLayout,
  calcularCadeia,
  caminhoDaForma,
  type NoPosicionado,
  type ArcoSegmento,
} from "@/lib/radial";
import { brlCurto } from "@/lib/format";

/**
 * Grafo radial concêntrico do ecossistema da LICC.
 *
 * Os anéis seguem o fluxo do valor — população ao centro, depois aprovação e
 * fomento, o capital, a execução e o bem público. Selecionar um vértice acende
 * a cadeia de responsabilização e apaga o resto para contorno, que é como o
 * SF Government Graph responde "quem responde por quê".
 *
 * É SVG, não canvas: posições calculadas em vez de simuladas tornam o desenho
 * determinístico, e cada vértice vira um alvo focável por teclado.
 */
export function GrafoRadial({
  grafo,
  selecionado,
  onSelecionar,
}: {
  grafo: Graph;
  selecionado: GraphNode | null;
  onSelecionar: (no: GraphNode | null) => void;
}) {
  const [pairado, setPairado] = useState<NoPosicionado | null>(null);
  const idSeta = useId();

  const layout = useMemo(() => calcularLayout(grafo, 400), [grafo]);

  const foco = selecionado?.id ?? pairado?.no.id ?? null;
  const cadeia = useMemo(
    () => (foco ? calcularCadeia(grafo, foco) : null),
    [grafo, foco],
  );

  const porId = useMemo(
    () => new Map(layout.nos.map((n) => [n.no.id, n])),
    [layout.nos],
  );

  const margem = 56; // espaço para os rótulos de anel e a pílula do selecionado
  const lado = (layout.extensao + margem) * 2;

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`${-lado / 2} ${-lado / 2} ${lado} ${lado}`}
        className="h-full w-full"
        role="group"
        aria-label="Grafo radial do ecossistema da LICC"
      >
        <defs>
          <marker
            id={idSeta}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Órbitas tracejadas e o nome de cada anel. */}
        <g aria-hidden="true">
          {layout.aneis.map((a) => (
            <g key={a.kind}>
              <circle
                r={a.raio}
                fill="none"
                stroke={a.cor}
                strokeOpacity={0.28}
                strokeWidth={0.75}
                strokeDasharray="4 2"
              />
              {/* Traço grosso na cor do fundo abre um vão no anel para o
                  rótulo respirar por cima dos vértices. */}
              <text
                x={0}
                y={a.raio + 13}
                textAnchor="middle"
                stroke="var(--color-papel-fundo)"
                strokeWidth={4}
                strokeLinejoin="round"
                fill="none"
                style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em" }}
              >
                {a.rotulo}
              </text>
              <text
                x={0}
                y={a.raio + 13}
                textAnchor="middle"
                fill={a.cor}
                fillOpacity={0.72}
                style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em" }}
              >
                {a.rotulo}
              </text>
            </g>
          ))}
        </g>

        {/* Arcos de bem público: segmentos → população (sempre visíveis). */}
        {layout.arcosSegmento.length > 0 ? (
          <ArcosSegmento
            arcos={layout.arcosSegmento}
            idSeta={idSeta}
            apagado={cadeia !== null}
          />
        ) : null}

        {/* Cadeia de responsabilização. */}
        {cadeia ? (
          <g fill="none">
            {cadeia.ligacoes.map((l, i) => {
              const de = porId.get(l.de);
              const para = porId.get(l.para);
              if (!de || !para) return null;
              const cor = NODE_KINDS[para.no.kind].cor;
              const forte = l.enfase === "forte";
              return (
                <path
                  key={`${l.de}-${l.para}-${i}`}
                  d={forte ? arco(de, para, para.r + 6) : arco(de, para, 0)}
                  stroke={cor}
                  strokeOpacity={forte ? 0.75 : 0.35}
                  strokeWidth={forte ? 1.5 : 0.9}
                  markerEnd={forte ? `url(#${idSeta})` : undefined}
                  color={cor}
                />
              );
            })}
          </g>
        ) : null}

        {/* Vértices. */}
        <g>
          {layout.nos.map((p) => {
            const aceso = !cadeia || cadeia.nos.has(p.no.id);
            const eSelecionado = p.no.id === selecionado?.id;
            const demonstracao = p.no.proveniencia === "demonstracao";

            return (
              <g
                key={p.no.id}
                transform={`translate(${p.x} ${p.y})`}
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-label={`${NODE_KINDS[p.no.kind].rotulo}: ${p.no.nome}`}
                aria-pressed={eSelecionado}
                onClick={() => onSelecionar(eSelecionado ? null : p.no)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelecionar(eSelecionado ? null : p.no);
                  }
                }}
                onMouseEnter={() => setPairado(p)}
                onMouseLeave={() => setPairado(null)}
                onFocus={() => setPairado(p)}
                onBlur={() => setPairado(null)}
              >
                {/* Alvo generoso para o ponteiro, invisível. */}
                <circle r={Math.max(p.r + 5, 9)} fill="transparent" />

                {eSelecionado ? (
                  <path
                    d={caminhoDaForma(p.forma, p.r + 4)}
                    fill="none"
                    stroke={p.cor}
                    strokeWidth={1.2}
                    strokeOpacity={0.5}
                  />
                ) : null}

                <path
                  d={caminhoDaForma(p.forma, p.r)}
                  fill={cadeia && aceso ? p.cor : "var(--color-papel)"}
                  fillOpacity={1}
                  stroke={p.cor}
                  strokeOpacity={!cadeia ? 1 : aceso ? 0.9 : 0.22}
                  strokeWidth={1}
                  strokeDasharray={demonstracao && (!cadeia || !aceso) ? "2 2" : undefined}
                  className="transition-[fill,stroke-opacity] duration-200"
                />

                {/* Rótulo abreviado para nós de governança e segmento. */}
                {(p.no.kind === "governanca" || p.no.kind === "segmento") && aceso ? (() => {
                  const sigla = recortar(p.no.sigla ?? p.no.nome, 14);
                  const ty = p.r + 9;
                  return (
                    <>
                      {/* Halo branco — renderizado primeiro (painter's algorithm). */}
                      <text
                        x={0}
                        y={ty}
                        textAnchor="middle"
                        stroke="white"
                        strokeWidth={3}
                        strokeLinejoin="round"
                        fill="none"
                        pointerEvents="none"
                        style={{ fontSize: 7, fontWeight: 500 }}
                        aria-hidden="true"
                      >
                        {sigla}
                      </text>
                      {/* Texto colorido. */}
                      <text
                        x={0}
                        y={ty}
                        textAnchor="middle"
                        fill={p.cor}
                        fillOpacity={0.85}
                        pointerEvents="none"
                        style={{ fontSize: 7, fontWeight: 500 }}
                      >
                        {sigla}
                      </text>
                    </>
                  );
                })() : null}
              </g>
            );
          })}
        </g>

        {/* Nome do vértice selecionado, logo abaixo do símbolo. */}
        {selecionado && porId.get(selecionado.id) ? (
          <Etiqueta
            posicao={porId.get(selecionado.id)!}
            texto={selecionado.sigla ?? selecionado.nome}
            variante="selecionado"
          />
        ) : null}

        {/* Rótulo do centro, sempre visível. */}
        {porId.get("publico-es") ? (
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="pointer-events-none"
            fill="var(--color-papel)"
            style={{ fontSize: 9, fontWeight: 700 }}
          >
            <tspan x="0" dy="-4">População</tspan>
            <tspan x="0" dy="10">Capixaba</tspan>
          </text>
        ) : null}
      </svg>

      {pairado && pairado.no.id !== selecionado?.id ? (
        <Tooltip posicao={pairado} lado={lado} />
      ) : null}
    </div>
  );
}

/**
 * Curva suave entre dois pontos, abaulada para fora do centro.
 *
 * @param parar - quantos px recuar a partir do centro do ponto alvo,
 *   ao longo da tangente do bezier no endpoint. Passar `para.r + 6`
 *   faz a ponta da seta assentar na borda do nó, não no centro.
 */
function arco(de: { x: number; y: number }, para: { x: number; y: number }, parar = 0): string {
  const mx = (de.x + para.x) / 2;
  const my = (de.y + para.y) / 2;
  const distancia = Math.hypot(para.x - de.x, para.y - de.y);
  // Empurra o ponto de controle para longe da origem: as linhas acompanham a
  // curvatura dos anéis em vez de cortarem o miolo em linha reta.
  const norma = Math.hypot(mx, my) || 1;
  const desvio = Math.min(distancia * 0.12, 26);
  const cx = mx + (mx / norma) * desvio;
  const cy = my + (my / norma) * desvio;

  // A tangente no final de uma curva Q cx cy ex ey é (ex−cx, ey−cy).
  // Recuamos o endpoint ao longo dessa direção para que a seta pare na borda.
  let ex = para.x;
  let ey = para.y;
  if (parar > 0) {
    const tx = ex - cx;
    const ty = ey - cy;
    const tn = Math.hypot(tx, ty) || 1;
    ex -= (tx / tn) * parar;
    ey -= (ty / tn) * parar;
  }

  return `M ${de.x} ${de.y} Q ${cx} ${cy} ${ex} ${ey}`;
}

/** Setas finas dos segmentos culturais em direção à população (centro). */
function ArcosSegmento({
  arcos,
  idSeta,
  apagado,
}: {
  arcos: ArcoSegmento[];
  idSeta: string;
  apagado: boolean;
}) {
  const maxProjetos = Math.max(1, ...arcos.map((a) => a.totalProjetos));
  return (
    <g fill="none">
      {arcos.map((a) => {
        const peso = a.totalProjetos / maxProjetos;
        return (
          <path
            key={a.segId}
            d={arco(a.pos, { x: 0, y: 0 }, 38)}
            stroke={a.cor}
            strokeOpacity={apagado ? 0.06 : 0.1 + peso * 0.22}
            strokeWidth={apagado ? 0.5 : 1 + peso * 3.5}
            markerEnd={apagado ? undefined : `url(#${idSeta})`}
            color={a.cor}
            className="transition-[stroke-opacity,stroke-width] duration-300"
          />
        );
      })}
    </g>
  );
}

function Etiqueta({
  posicao,
  texto,
  variante,
}: {
  posicao: NoPosicionado;
  texto: string;
  variante: "selecionado";
}) {
  const largura = Math.min(texto.length * 5.2 + 14, 190);
  const y = posicao.y + posicao.r + 8;
  const cor = posicao.cor;
  return (
    <g className="pointer-events-none" transform={`translate(${posicao.x} ${y})`}>
      <rect
        x={-largura / 2}
        y={0}
        width={largura}
        height={15}
        rx={7.5}
        fill="var(--color-papel)"
        stroke={cor}
        strokeOpacity={variante === "selecionado" ? 0.55 : 0.3}
        strokeWidth={0.8}
      />
      <text
        x={0}
        y={10.5}
        textAnchor="middle"
        fill={cor}
        style={{ fontSize: 8.5, fontWeight: 500 }}
      >
        {recortar(texto, 34)}
      </text>
    </g>
  );
}

/** Pílula preenchida com a cor do tipo, como no CivLab. */
function Tooltip({ posicao, lado }: { posicao: NoPosicionado; lado: number }) {
  // Do sistema do SVG para percentuais da caixa, para posicionar em HTML.
  const esquerda = ((posicao.x + lado / 2) / lado) * 100;
  const topo = ((posicao.y + lado / 2) / lado) * 100;
  const captado = posicao.no.orcamento?.captado;

  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium text-white shadow-sm"
      style={{ left: `${esquerda}%`, top: `${topo}%`, background: posicao.cor }}
    >
      {recortar(posicao.no.nome, 46)}
      {captado ? (
        <span className="ml-1.5 opacity-80">{brlCurto(captado)}</span>
      ) : null}
    </div>
  );
}

const recortar = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

"use client";

import { useMemo, useState, useId } from "react";
import type { Graph, GraphNode } from "@/types/graph";
import { NODE_KINDS } from "@/ontology/nodes";
import {
  calcularLayout,
  calcularCadeia,
  caminhoDaForma,
  type NoPosicionado,
} from "@/lib/radial";
import type { Forma } from "@/ontology/nodes";
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

  // 330,75 é o raio do anel externo do original numa meia-largura de 400 —
  // 0,827 dela. Passar 400 aqui encostaria os projetos na borda do viewBox.
  const layout = useMemo(() => calcularLayout(grafo, RAIO_UTIL), [grafo]);

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
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Órbitas tracejadas e o nome de cada anel. */}
        <g aria-hidden="true">
          {layout.aneis.map((a) => {
            // O anel setorizado não repete o rótulo genérico: os nomes das
            // linguagens já o identificam, e os dois colidiriam no rodapé.
            const setorizado = layout.setores.some((st) => st.kind === a.kind);
            return (
            <g key={a.kind}>
              <circle
                r={a.raio}
                fill="none"
                stroke={a.cor}
                strokeOpacity={0.22}
                strokeWidth={0.75}
                strokeDasharray="3 4"
              />
              {/* Traço grosso na cor do fundo abre um vão no anel para o
                  rótulo respirar por cima dos vértices. */}
              {setorizado ? null : (
                <>
                  {/* Traço grosso na cor do fundo abre um vão no anel para o
                      rótulo respirar por cima dos vértices. */}
                  <text
                    x={0}
                    y={a.raio - RECUO_ROTULO_ANEL}
                    textAnchor="middle"
                    stroke="var(--color-papel-fundo)"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    fill="none"
                    style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em" }}
                  >
                    {a.rotulo}
                  </text>
                  <text
                    x={0}
                    y={a.raio - RECUO_ROTULO_ANEL}
                    textAnchor="middle"
                    fill={a.cor}
                    fillOpacity={0.78}
                    style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em" }}
                  >
                    {a.rotulo}
                  </text>
                </>
              )}
            </g>
            );
          })}
        </g>

        {/* Setores por linguagem cultural, no anel dos projetos. */}
        {layout.setores.length ? (
          <g aria-hidden="true">
            {layout.setores.map((st) => {
              const meio = (st.anguloInicio + st.anguloFim) / 2;
              const raioTexto = st.raio + 20;
              const largura = st.anguloFim - st.anguloInicio;
              // Só nomeia a fatia que tem arco para caber o nome; as estreitas
              // continuam identificáveis pela cor e pelo painel lateral.
              if (largura < 0.3) return null;
              const idArco = `setor-${st.id}`;
              // Na metade de baixo o texto inverte, para nunca sair de cabeça
              // para baixo ao acompanhar a curva.
              const inverter = Math.sin(meio) > 0;
              const [de, para] = inverter
                ? [st.anguloFim, st.anguloInicio]
                : [st.anguloInicio, st.anguloFim];
              return (
                <g key={st.id}>
                  <path
                    id={idArco}
                    d={arcoTexto(de, para, inverter ? raioTexto + 8 : raioTexto)}
                    fill="none"
                  />
                  <text
                    fill={st.cor}
                    fillOpacity={0.85}
                    style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}
                  >
                    <textPath href={`#${idArco}`} startOffset="50%" textAnchor="middle">
                      {st.rotulo.toUpperCase()}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}

        {/* Cadeia de responsabilização. */}
        {cadeia ? (
          <g fill="none">
            {cadeia.ligacoes.map((l, i) => {
              const de = porId.get(l.de);
              const para = porId.get(l.para);
              if (!de || !para) return null;
              const cor = para.cor;
              return (
                <path
                  key={`${l.de}-${l.para}-${i}`}
                  d={arco(de, para)}
                  stroke={cor}
                  strokeOpacity={l.enfase === "forte" ? 0.7 : 0.3}
                  strokeWidth={l.enfase === "forte" ? 1.4 : 0.8}
                  markerEnd={de.orbita === 0 ? `url(#${idSeta})` : undefined}
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
            const forma = caminhoDaForma(p.forma, p.r);
            // No original os retângulos de comissão e departamento giram
            // acompanhando o ângulo, o que produz o losango em inclinações
            // variadas em vez de uma fileira de quadrados idênticos.
            const giro = GIRA_COM_ANGULO.has(p.forma)
              ? ` rotate(${((p.angulo * 180) / Math.PI).toFixed(1)})`
              : "";

            return (
              <g
                key={p.no.id}
                transform={`translate(${p.x} ${p.y})${giro}`}
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

                {/* A regra do HTML do CivLab, nas três camadas dele: base
                    branca, a cor da categoria a 50% por cima quando o vértice
                    acende, e o traço na cor cheia. Não existe segunda cor
                    guardada em lugar nenhum — o pastel é sempre derivado. */}
                <path d={forma} fill="var(--color-papel)" />
                <path
                  d={forma}
                  fill={p.cor}
                  fillOpacity={aceso ? 0.5 : 0}
                  className="transition-[fill-opacity] duration-200"
                />
                <path
                  d={forma}
                  fill="none"
                  stroke={p.cor}
                  strokeOpacity={aceso ? 1 : 0.55}
                  strokeWidth={aceso ? 1.2 : 0.9}
                  strokeDasharray={demonstracao && !aceso ? "2 2" : undefined}
                  className="transition-[stroke-opacity] duration-200"
                />
              </g>
            );
          })}
        </g>

        {/* Verbo da relação escrito sobre a linha — o "appoints" do CivLab. */}
        {cadeia ? (
          <g className="pointer-events-none">
            {cadeia.ligacoes
              .filter((l) => l.rotulo && l.enfase === "forte")
              .map((l, i) => {
                const de = porId.get(l.de);
                const para = porId.get(l.para);
                if (!de || !para) return null;
                const mx = (de.x + para.x) / 2;
                const my = (de.y + para.y) / 2;
                const largura = l.rotulo!.length * 4.2 + 8;
                return (
                  <g key={`v-${l.de}-${l.para}-${i}`} transform={`translate(${mx} ${my})`}>
                    <rect
                      x={-largura / 2}
                      y={-6}
                      width={largura}
                      height={12}
                      rx={6}
                      fill="var(--color-papel-fundo)"
                      fillOpacity={0.92}
                    />
                    <text
                      textAnchor="middle"
                      y={3.2}
                      fill={para.cor}
                      style={{ fontSize: 7.5, fontWeight: 600 }}
                    >
                      {l.rotulo}
                    </text>
                  </g>
                );
              })}
          </g>
        ) : null}

        {/* Rótulo do centro, sempre visível. */}
        {porId.get("publico-es") ? (
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="pointer-events-none"
            fill="var(--color-papel)"
            style={{ fontSize: 8.5, fontWeight: 600 }}
          >
            <tspan x="0" dy="-4">População</tspan>
            <tspan x="0" dy="10">Capixaba</tspan>
          </text>
        ) : null}
      </svg>

      {pairado && pairado.no.id !== selecionado?.id ? (
        <Tooltip posicao={pairado} lado={lado} />
      ) : null}

      {/* Nome do selecionado ancorado no rodapé do canvas, como no CivLab —
          fica legível mesmo quando o vértice está na borda do desenho. */}
      {selecionado ? (
        <p
          className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto w-fit max-w-[85%] truncate rounded-md border bg-papel px-2.5 py-1 text-center text-xs font-medium shadow-sm"
          style={{
            borderColor: porId.get(selecionado.id)?.cor ?? "var(--color-borda)",
            color: porId.get(selecionado.id)?.cor ?? "var(--color-tinta)",
          }}
        >
          {selecionado.nome}
        </p>
      ) : null}
    </div>
  );
}

/* Medidas do original (docs/referencia-civlab.md). */
/** Raio do anel externo: 0,827 da meia-largura de 400. */
const RAIO_UTIL = 330.75;
/** O rótulo do anel fica 25px para dentro da órbita. */
const RECUO_ROTULO_ANEL = 25;
/** Formas derivadas de `rect`, que no original giram com a posição angular. */
const GIRA_COM_ANGULO = new Set<Forma>(["losango", "quadrado"]);

/** Arco simples entre dois ângulos, para o texto de setor correr por cima. */
function arcoTexto(de: number, para: number, raio: number): string {
  const p = (a: number) =>
    `${(Math.cos(a) * raio).toFixed(2)} ${(Math.sin(a) * raio).toFixed(2)}`;
  const varredura = para > de ? 1 : 0;
  const grande = Math.abs(para - de) > Math.PI ? 1 : 0;
  return `M ${p(de)} A ${raio} ${raio} 0 ${grande} ${varredura} ${p(para)}`;
}

/** Curva suave entre dois vértices, abaulada para fora do centro. */
function arco(de: NoPosicionado, para: NoPosicionado): string {
  const mx = (de.x + para.x) / 2;
  const my = (de.y + para.y) / 2;
  const distancia = Math.hypot(para.x - de.x, para.y - de.y);
  // Empurra o ponto de controle para longe da origem: as linhas acompanham a
  // curvatura dos anéis em vez de cortarem o miolo em linha reta.
  const norma = Math.hypot(mx, my) || 1;
  const desvio = Math.min(distancia * 0.12, 26);
  const cx = mx + (mx / norma) * desvio;
  const cy = my + (my / norma) * desvio;
  return `M ${de.x} ${de.y} Q ${cx} ${cy} ${para.x} ${para.y}`;
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

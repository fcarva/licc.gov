"use client";

import { useMemo, useState } from "react";
import { brl, brlCurto, numero, percentual } from "@/lib/format";
import { Balao, usarPonteiro } from "./Grafico";
import type { FatiaCapital, LinhaConversao, LinhaMunicipio } from "@/lib/indicadores";
import {
  COR_CAPITAL,
  COR_CONVERSAO,
  COR_RMGV,
  COR_INTERIOR,
  COR_EXECUCAO,
} from "@/ontology/paleta-grafico";

// ---------------------------------------------------------------------------
// 1. Curva de concentração
// ---------------------------------------------------------------------------

/**
 * Curva de concentração do aporte, ordenada da maior empresa para a menor.
 *
 * É uma curva de Lorenz invertida: a Lorenz clássica ordena do menor para o
 * maior e a curva afunda sob a diagonal. Aqui a ordem é decrescente e a curva
 * sobe acima dela, porque a pergunta civil é "quanto as maiores respondem",
 * não "quanto as menores deixam de responder". A diagonal continua sendo a
 * igualdade perfeita: quanto mais a curva se afasta dela, mais concentrado.
 */
export function CurvaDeConcentracao({
  empresas,
  total,
  empresasParaMetade,
}: {
  empresas: FatiaCapital[];
  total: number;
  empresasParaMetade: number;
}) {
  const { ponto, mover, limpar } = usarPonteiro();
  const [indice, setIndice] = useState<number | null>(null);

  const L = 38, R = 10, T = 10, B = 26;
  const LARG = 340, ALT = 240;
  const pw = LARG - L - R;
  const ph = ALT - T - B;
  const n = empresas.length;

  const px = (fracaoEmpresas: number) => L + fracaoEmpresas * pw;
  const py = (fracaoValor: number) => T + (1 - fracaoValor) * ph;

  const pontos = useMemo(
    () => [{ x: 0, y: 0 }, ...empresas.map((e, i) => ({ x: (i + 1) / n, y: e.acumulado }))],
    [empresas, n],
  );
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"} ${px(p.x).toFixed(2)} ${py(p.y).toFixed(2)}`).join(" ");
  const area = `${caminho} L ${px(1)} ${py(1)} L ${px(0)} ${py(0)} Z`;

  const marcada = indice !== null ? empresas[indice] : null;
  const fracaoMetade = empresasParaMetade / n;

  return (
    <div
      className="relative w-full max-w-[440px]"
      onMouseLeave={() => { limpar(); setIndice(null); }}
    >
      <svg
        viewBox={`0 0 ${LARG} ${ALT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Curva de concentração: ${empresasParaMetade} de ${n} empresas respondem por metade dos ${brl(total)} aportados.`}
        onMouseMove={(e) => {
          mover(e as unknown as React.MouseEvent<HTMLElement>);
          const caixa = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - caixa.left) / caixa.width) * LARG;
          const fracao = Math.max(0, Math.min(1, (rel - L) / pw));
          setIndice(Math.max(0, Math.min(n - 1, Math.round(fracao * n) - 1)));
        }}
      >
        {/* Grade fina e recuada: referência, não decoração. */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={L} x2={LARG - R} y1={py(t)} y2={py(t)}
              stroke="var(--color-borda)" strokeWidth={1}
            />
            <text
              x={L - 6} y={py(t) + 3} textAnchor="end"
              className="tabular" style={{ fontSize: 9, fill: "var(--color-tinta-fraca)" }}
            >
              {t * 100}%
            </text>
          </g>
        ))}

        {/* Igualdade perfeita. Tracejada porque é referência, não observação. */}
        <line
          x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)}
          stroke="var(--color-tinta-fraca)" strokeWidth={1.5} strokeDasharray="4 3"
        />

        <path d={area} fill={COR_CAPITAL} fillOpacity={0.12} />
        <path d={caminho} fill="none" stroke={COR_CAPITAL} strokeWidth={2} strokeLinejoin="round" />

        {/* Onde a metade do dinheiro se completa — o número que a manchete cita. */}
        <line
          x1={px(fracaoMetade)} y1={py(0)} x2={px(fracaoMetade)} y2={py(0.5)}
          stroke={COR_CAPITAL} strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.6}
        />
        <circle cx={px(fracaoMetade)} cy={py(0.5)} r={3.5} fill={COR_CAPITAL} stroke="var(--color-papel)" strokeWidth={2} />

        {marcada && indice !== null ? (
          <circle
            cx={px((indice + 1) / n)} cy={py(marcada.acumulado)} r={3.5}
            fill="var(--color-papel)" stroke={COR_CAPITAL} strokeWidth={2}
          />
        ) : null}

        <text x={L} y={ALT - 8} style={{ fontSize: 9, fill: "var(--color-tinta-fraca)" }}>
          maior empresa
        </text>
        <text x={LARG - R} y={ALT - 8} textAnchor="end" style={{ fontSize: 9, fill: "var(--color-tinta-fraca)" }}>
          {numero(n)}ª
        </text>
      </svg>

      {ponto && marcada && indice !== null ? (
        <Balao x={ponto.x} y={ponto.y}>
          <span className="font-semibold">
            {indice + 1} {indice === 0 ? "maior empresa" : "maiores empresas"}
          </span>
          <span className="tabular block text-neutral-600">
            {percentual(marcada.acumulado, 1)} do aportado · {brlCurto(marcada.acumulado * total)}
          </span>
        </Balao>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Tira dos municípios
// ---------------------------------------------------------------------------

/**
 * Os 78 municípios do Espírito Santo, em ordem decrescente de captação.
 *
 * Todos entram, inclusive quem não recebeu nada: o zero é o dado, e a cauda
 * vazia à direita é o achado principal. Listar só quem recebeu produziria um
 * gráfico em que a política parece chegar a todo lugar.
 *
 * Município sem captação **não recebe barra alguma** — nem um traço mínimo de
 * cortesia, que desenharia valor onde não há.
 */
export function TiraMunicipios({ municipios }: { municipios: LinhaMunicipio[] }) {
  const { ponto, mover, limpar } = usarPonteiro();
  const [indice, setIndice] = useState<number | null>(null);

  const L = 4, R = 4, T = 22, B = 22;
  const LARG = 680, ALT = 182;
  const pw = LARG - L - R;
  const ph = ALT - T - B;
  const n = municipios.length;
  const maior = Math.max(1, ...municipios.map((m) => m.captado));
  const passo = pw / n;
  const largura = Math.max(1.5, passo - 2); // 2px de vão entre marcas

  const primeiroZero = municipios.findIndex((m) => m.captado === 0);
  const zerados = primeiroZero >= 0 ? n - primeiroZero : 0;
  const marcado = indice !== null ? municipios[indice] : null;

  return (
    <div className="relative" onMouseLeave={() => { limpar(); setIndice(null); }}>
      <svg
        viewBox={`0 0 ${LARG} ${ALT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Captação por município: ${n} municípios em ordem decrescente, dos quais ${zerados} sem nenhum recurso.`}
        onMouseMove={(e) => {
          mover(e as unknown as React.MouseEvent<HTMLElement>);
          const caixa = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - caixa.left) / caixa.width) * LARG - L;
          setIndice(Math.max(0, Math.min(n - 1, Math.floor(rel / passo))));
        }}
      >
        {municipios.map((m, i) => {
          if (m.captado <= 0) return null;
          const h = (m.captado / maior) * ph;
          return (
            <rect
              key={m.id}
              x={L + i * passo}
              y={T + ph - h}
              width={largura}
              height={h}
              rx={Math.min(2, largura / 2)}
              fill={m.rmgv ? COR_RMGV : COR_INTERIOR}
              fillOpacity={indice === null || indice === i ? 1 : 0.55}
            />
          );
        })}

        {/* Linha de base: é ela que torna a cauda de zeros visível. */}
        <line x1={L} x2={LARG - R} y1={T + ph} y2={T + ph} stroke="var(--color-borda-forte)" strokeWidth={1} />

        {/* Sem eixo vertical, o rótulo do topo é o que dá a escala. Um só:
            número em cada barra viraria ruído e ninguém leria. */}
        {municipios[0] && municipios[0].captado > 0 ? (
          <text
            x={L + 2 * passo}
            y={T + ph - (municipios[0].captado / maior) * ph - 4}
            style={{ fontSize: 10, fill: "var(--color-tinta-suave)" }}
          >
            {municipios[0].nome} · {brlCurto(municipios[0].captado)}
          </text>
        ) : null}

        {zerados > 0 && primeiroZero >= 0 ? (
          <>
            <line
              x1={L + primeiroZero * passo} x2={LARG - R}
              y1={T + ph + 5} y2={T + ph + 5}
              stroke="var(--color-tinta-fraca)" strokeWidth={1}
            />
            <text
              x={(L + primeiroZero * passo + LARG - R) / 2}
              y={ALT - 6}
              textAnchor="middle"
              style={{ fontSize: 10, fill: "var(--color-tinta-fraca)" }}
            >
              {zerados} municípios sem nenhum recurso
            </text>
          </>
        ) : null}
      </svg>

      {ponto && marcado ? (
        <Balao x={ponto.x} y={ponto.y}>
          <span className="font-semibold">{marcado.nome}</span>
          <span className="tabular block text-neutral-600">
            {marcado.captado > 0 ? brl(marcado.captado) : "sem recurso no exercício"}
            {marcado.projetos > 0 ? ` · ${marcado.projetos} projeto${marcado.projetos > 1 ? "s" : ""}` : ""}
          </span>
          <span className="block text-neutral-600">
            {marcado.rmgv ? "Região Metropolitana" : marcado.regiao}
          </span>
        </Balao>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Conversão de autorizado em captado
// ---------------------------------------------------------------------------

/**
 * Autorizado e captado lado a lado, por linguagem.
 *
 * Trilho e preenchimento na mesma escala, num eixo só: o trilho é o teto que a
 * LICC autorizou, o preenchimento é o que virou dinheiro. Duas medidas de
 * mesma unidade num eixo comum — jamais dois eixos, que inventariam uma
 * correlação entre escalas escolhidas a dedo.
 */
export function LinhasDeConversao({ linhas }: { linhas: LinhaConversao[] }) {
  const maior = Math.max(1, ...linhas.map((l) => l.autorizado));
  return (
    <ul className="space-y-3">
      {linhas.map((l) => (
        <li key={l.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-tinta">{l.nome}</span>
            <span className="tabular shrink-0 text-xs text-tinta-suave">
              {percentual(l.taxa, 1)}
              <span className="text-tinta-fraca"> de {brlCurto(l.autorizado)}</span>
            </span>
          </div>
          <div
            className="mt-1 h-2 rounded-full bg-papel-fundo"
            style={{ width: `${(l.autorizado / maior) * 100}%` }}
            role="meter"
            aria-valuenow={Math.round(l.taxa * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${l.nome}: ${percentual(l.taxa, 1)} do autorizado foi captado`}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(1, l.taxa) * 100}%`, background: COR_CONVERSAO }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// 4. Barras simples
// ---------------------------------------------------------------------------

/**
 * Barras horizontais de uma série só.
 *
 * Uma cor para todas as barras: as categorias aqui são nominais — natureza
 * jurídica, quantidade de projetos —, e tingir cada uma de um tom diferente
 * gastaria o único canal livre repetindo o que o comprimento já diz.
 */
export function BarrasSimples({
  linhas,
  formatar = numero,
}: {
  linhas: Array<{ id: string; rotulo: string; valor: number; nota?: string }>;
  formatar?: (n: number) => string;
}) {
  const maior = Math.max(1, ...linhas.map((l) => l.valor));
  return (
    <ul className="space-y-2.5">
      {linhas.map((l) => (
        <li key={l.id} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-3">
          <span className="truncate text-xs text-tinta">{l.rotulo}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 rounded-[3px]"
              style={{ width: `${(l.valor / maior) * 100}%`, background: COR_EXECUCAO, minWidth: 2 }}
            />
            <span className="tabular shrink-0 text-xs text-tinta-suave">
              {formatar(l.valor)}
              {l.nota ? <span className="text-tinta-fraca"> · {l.nota}</span> : null}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

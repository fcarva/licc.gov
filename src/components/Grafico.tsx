"use client";

import { useId, useState } from "react";
import { percentual } from "@/lib/format";

/**
 * Moldura comum dos gráficos de indicador.
 *
 * Três coisas que todo gráfico daqui carrega, e que existem por regra e não
 * por gosto:
 *
 * 1. **A confiança.** Sobre quantos registros a conta foi feita, de quantos
 *    existem. "As 3 maiores empresas respondem por 20%" apurado sobre 40 dos
 *    82 projetos não é a mesma afirmação que sobre os 82.
 * 2. **A tabela.** Todo gráfico tem uma gêmea em texto. Valor que só existe
 *    dentro de um `<svg>` é valor inacessível a leitor de tela, a busca da
 *    página e a quem quer copiar o número.
 * 3. **A legenda**, sempre que houver mais de uma série — identidade nunca
 *    fica só na cor.
 */
export function Grafico({
  titulo,
  descricao,
  confianca,
  series,
  tabela,
  nota,
  children,
}: {
  titulo: string;
  descricao?: string;
  confianca?: { base: number; universo: number; cobertura: number; unidade: string };
  /** Duas ou mais séries obrigam legenda; uma só dispensa (o título nomeia). */
  series?: Array<{ rotulo: string; cor: string; tracejada?: boolean }>;
  tabela: React.ReactNode;
  nota?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mostrarTabela, setMostrarTabela] = useState(false);
  const idTabela = useId();

  return (
    <figure className="m-0">
      <figcaption>
        <h3 className="text-[15px] font-semibold tracking-tight text-tinta">{titulo}</h3>
        {descricao ? (
          <p className="mt-1 text-xs leading-relaxed text-tinta-suave">{descricao}</p>
        ) : null}
        {confianca ? <SeloConfianca {...confianca} /> : null}
      </figcaption>

      <div className="mt-3">{children}</div>

      {series && series.length > 1 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.rotulo} className="flex items-center gap-1.5 text-[11px] text-tinta-suave">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={
                  s.tracejada
                    ? { border: `1.5px dashed ${s.cor}` }
                    : { background: s.cor }
                }
              />
              {s.rotulo}
            </li>
          ))}
        </ul>
      ) : null}

      {nota ? <p className="mt-2.5 text-[11px] leading-relaxed text-tinta-fraca">{nota}</p> : null}

      <button
        type="button"
        onClick={() => setMostrarTabela((v) => !v)}
        aria-expanded={mostrarTabela}
        aria-controls={idTabela}
        className="mt-3 rounded-lg px-2 py-1 text-[11px] text-realce underline underline-offset-2 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-borda-forte"
      >
        {mostrarTabela ? "Ocultar tabela" : "Ver tabela"}
      </button>
      <div id={idTabela} hidden={!mostrarTabela} className="mt-2 overflow-x-auto">
        {tabela}
      </div>
    </figure>
  );
}

/**
 * Denominador visível.
 *
 * Fica ao lado do título, e não numa nota de rodapé, porque cobertura parcial
 * muda o que o número quer dizer — e nota de rodapé não é lida junto do
 * gráfico.
 */
function SeloConfianca({
  base,
  universo,
  cobertura,
  unidade,
}: {
  base: number;
  universo: number;
  cobertura: number;
  unidade: string;
}) {
  const completo = base >= universo;
  return (
    <p
      className={`tabular mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] ${
        completo ? "bg-papel-fundo text-tinta-fraca" : "bg-amber-600/10 text-amber-800 dark:text-amber-300"
      }`}
    >
      apurado sobre {base} de {universo} {unidade}
      {completo ? "" : ` · ${percentual(cobertura, 0)} de cobertura`}
    </p>
  );
}

/**
 * Número-manchete.
 *
 * Sem `.tabular`: dígitos de largura fixa afrouxam um número grande. A classe
 * serve para alinhar coluna de tabela, que é o oposto deste caso.
 */
export function Destaque({
  valor,
  rotulo,
  nota,
  cor,
}: {
  valor: string;
  rotulo: string;
  nota?: string;
  cor?: string;
}) {
  return (
    <div>
      <p
        className="text-3xl font-semibold leading-none tracking-tight"
        style={{ color: cor ?? "var(--color-tinta)" }}
      >
        {valor}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-tinta-suave">{rotulo}</p>
      {nota ? <p className="mt-0.5 text-[11px] text-tinta-fraca">{nota}</p> : null}
    </div>
  );
}

/** Tabela gêmea de um gráfico: mesma informação, sem depender de cor nem de SVG. */
export function TabelaGrafico({
  colunas,
  linhas,
  legenda,
}: {
  colunas: string[];
  /** Cada linha já formatada; a primeira coluna é o rótulo. */
  linhas: Array<{ chave: string; celulas: React.ReactNode[] }>;
  legenda: string;
}) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <caption className="sr-only">{legenda}</caption>
      <thead>
        <tr className="border-b border-borda text-left text-tinta-fraca">
          {colunas.map((c, i) => (
            <th
              key={c}
              scope="col"
              className={`py-1.5 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.chave} className="border-b border-borda last:border-b-0">
            {l.celulas.map((celula, i) => (
              <td
                key={i}
                className={`py-1.5 pr-3 ${i > 0 ? "tabular text-right text-tinta-suave" : "text-tinta"}`}
              >
                {celula}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Balão de leitura, no molde do original: bordado, não sombreado.
 *
 * Mesmas medidas do tooltip da rosca de orçamento — `1px solid #ccc`, raio 4,
 * 12px, `z-index` 1000 —, para que os dois se leiam como o mesmo objeto.
 */
export function Balao({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[1000] max-w-[240px] rounded-[4px] border border-[#ccc] bg-white px-2 py-1 text-[12px] leading-snug text-neutral-800"
      style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 10px))" }}
    >
      {children}
    </div>
  );
}

/** Acompanha o ponteiro dentro de um container posicionado. */
export function usarPonteiro() {
  const [ponto, setPonto] = useState<{ x: number; y: number } | null>(null);
  const mover = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPonto({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  return { ponto, mover, limpar: () => setPonto(null) };
}

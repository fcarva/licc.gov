import Link from "next/link";

/**
 * Card branco flutuante — o átomo visual da coluna-documento.
 *
 * O CivLab não usa caixas de borda plana: usa cartões arredondados com sombra
 * discreta sobre um fundo cinza. A diferença parece cosmética, mas é ela que
 * faz a coluna ler como documento e não como formulário.
 */
export function Cartao({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl bg-papel shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_16px_-6px_rgba(15,23,42,0.10)] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

/** Título de seção dentro de um cartão. */
export function TituloSecao({
  children,
  acao,
}: {
  children: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight text-tinta">{children}</h2>
      {acao}
    </div>
  );
}

/** Pílula de trilha: `licc.gov / LICC / Projetos`. */
export function Trilha({
  itens,
}: {
  itens: Array<{ rotulo: string; href?: string }>;
}) {
  return (
    <nav
      aria-label="Trilha de navegação"
      className="flex items-center gap-1.5 rounded-full bg-papel px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_16px_-6px_rgba(15,23,42,0.10)]"
    >
      <span aria-hidden="true" className="mr-0.5 text-[var(--color-publico)]">✳</span>
      {itens.map((item, i) => (
        <span key={`${item.rotulo}-${i}`} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-tinta-fraca">/</span> : null}
          {item.href ? (
            <Link
              href={item.href}
              className={`transition-colors hover:text-tinta ${
                i === 0 ? "font-semibold text-tinta" : "text-tinta-suave"
              }`}
            >
              {item.rotulo}
            </Link>
          ) : (
            <span className={i === itens.length - 1 ? "text-tinta" : "text-tinta-suave"}>
              {item.rotulo}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Controle segmentado — `Grafo | Orçamento`, `Notícias | Quem se conecta?`. */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onMudar,
  className = "",
}: {
  opcoes: Array<{ id: T; rotulo: string; contagem?: number }>;
  valor: T;
  onMudar: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`inline-flex rounded-xl bg-papel-fundo p-1 ${className}`}
    >
      {opcoes.map((o) => {
        const ativo = o.id === valor;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={ativo}
            onClick={() => onMudar(o.id)}
            className={`rounded-lg px-4 py-1.5 text-sm transition-all ${
              ativo
                ? "bg-papel font-medium text-tinta shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "text-tinta-fraca hover:text-tinta-suave"
            }`}
          >
            {o.rotulo}
            {o.contagem !== undefined && o.contagem > 0 ? (
              <span className="ml-1.5 text-[11px] opacity-70">{o.contagem}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Métrica com variação anual, no molde do painel de referência. */
export function Metrica({
  rotulo,
  valor,
  nota,
  posicao,
  variacao,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  posicao?: { lugar: number; total: number };
  variacao?: number | null;
}) {
  return (
    <div>
      <p className="text-xs text-tinta-suave">{rotulo}</p>
      <p className="tabular mt-0.5 text-xl font-semibold tracking-tight text-tinta">
        {valor}
      </p>
      {posicao ? (
        <p className="tabular mt-0.5 text-[11px] text-tinta-fraca">
          Posição {posicao.lugar} de {posicao.total}
        </p>
      ) : null}
      {variacao !== undefined && variacao !== null ? (
        <Variacao valor={variacao} />
      ) : null}
      {nota ? <p className="mt-0.5 text-[11px] text-tinta-fraca">{nota}</p> : null}
    </div>
  );
}

export function Variacao({ valor }: { valor: number }) {
  const subiu = valor >= 0;
  return (
    <p
      className={`tabular mt-0.5 text-[11px] ${
        subiu ? "text-[var(--color-proponente)]" : "text-[var(--color-projeto)]"
      }`}
    >
      {subiu ? "↑" : "↓"}
      {Math.abs(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%{" "}
      <span className="text-tinta-fraca">sobre o exercício anterior</span>
    </p>
  );
}

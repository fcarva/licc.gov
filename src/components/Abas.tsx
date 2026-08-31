"use client";

import { useRef } from "react";

/**
 * Controle segmentado com a semântica de aba do original.
 *
 * O CivLab usa o padrão Radix, e o estado vive **nos atributos** — `data-state`,
 * `aria-selected`, `tabindex` — não em classes ad hoc. O painel se casa com a
 * aba por `aria-controls` / `aria-labelledby`, e as setas movem o foco.
 *
 * Copiar só a aparência deixaria o controle mudo para leitor de tela. Num
 * projeto de transparência isso não é detalhe: quem navega por teclado precisa
 * chegar aos mesmos números que quem navega pelo ponteiro.
 *
 * Passe `idBase` para emitir o par de ids; o painel correspondente sai de
 * `PainelAba` com o mesmo `idBase`.
 */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onMudar,
  idBase,
  rotulo,
  className = "",
}: {
  opcoes: Array<{ id: T; rotulo: string; contagem?: number }>;
  valor: T;
  onMudar: (id: T) => void;
  /** Prefixo dos ids que casam aba e painel. */
  idBase?: string;
  /** Nome do conjunto para leitor de tela. */
  rotulo?: string;
  className?: string;
}) {
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});

  // Numa tablist só a aba ativa recebe foco por Tab; entre as abas anda-se
  // pelas setas. É o que justifica o `tabindex="-1"` das inativas.
  const aoTeclar = (e: React.KeyboardEvent) => {
    const atual = opcoes.findIndex((o) => o.id === valor);
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const alvo = passo
      ? (atual + passo + opcoes.length) % opcoes.length
      : e.key === "Home"
        ? 0
        : e.key === "End"
          ? opcoes.length - 1
          : -1;
    if (alvo < 0) return;
    e.preventDefault();
    onMudar(opcoes[alvo].id);
    botoes.current[opcoes[alvo].id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={rotulo}
      onKeyDown={aoTeclar}
      // `shrink-0`: a coluna-documento é um flex column rolável, e sem isto o
      // controle é esmagado a zero de altura pelos cartões vizinhos.
      className={`inline-flex shrink-0 overflow-hidden rounded-xl ${className}`}
    >
      {opcoes.map((o) => {
        const ativo = o.id === valor;
        return (
          <button
            key={o.id}
            ref={(el) => {
              botoes.current[o.id] = el;
            }}
            role="tab"
            type="button"
            id={idBase ? `${idBase}-tab-${o.id}` : undefined}
            aria-controls={idBase ? `${idBase}-content-${o.id}` : undefined}
            aria-selected={ativo}
            data-state={ativo ? "active" : "inactive"}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onMudar(o.id)}
            className="px-4 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-borda-forte data-[state=active]:bg-papel data-[state=active]:font-medium data-[state=active]:text-tinta data-[state=inactive]:bg-cinza-medio data-[state=inactive]:text-tinta-suave data-[state=inactive]:hover:text-tinta"
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

/**
 * Painel de aba, casado com o botão de mesmo `idBase` e `id`.
 *
 * Quando só há uma vista, a `Segmentado` não é desenhada — mostrar uma aba
 * sozinha é ruído. Aí `rotulado={false}` derruba a semântica de aba junto,
 * porque um `aria-labelledby` apontando para um botão que não existe é pior
 * que nenhum.
 */
export function PainelAba({
  idBase,
  id,
  rotulado = true,
  className = "",
  children,
}: {
  idBase: string;
  id: string;
  rotulado?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (!rotulado) return <div className={className}>{children}</div>;
  return (
    <div
      role="tabpanel"
      id={`${idBase}-content-${id}`}
      aria-labelledby={`${idBase}-tab-${id}`}
      tabIndex={0}
      className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-borda-forte ${className}`}
    >
      {children}
    </div>
  );
}

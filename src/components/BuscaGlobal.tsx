"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NODE_KINDS } from "@/ontology/nodes";
import type { NodeKind } from "@/types/graph";

interface Resultado {
  slug: string;
  nome: string;
  kind: NodeKind;
  descricao?: string;
  casouEm?: string;
}

/**
 * Busca global sobre todo o grafo.
 *
 * Atalhos, como no CivLab: `/` ou `Ctrl/⌘+K` focam o campo, setas navegam,
 * Enter abre, Esc fecha. O escopo cobre nome, sigla, nomes alternativos e
 * descrição.
 */
export function BuscaGlobal() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const campoRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Atalhos globais.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === "INPUT" ||
        alvo?.tagName === "TEXTAREA" ||
        alvo?.isContentEditable;

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !digitando)) {
        e.preventDefault();
        campoRef.current?.focus();
        campoRef.current?.select();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  // Fecha ao clicar fora.
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  // Consulta com debounce e cancelamento da requisição anterior.
  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const controle = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(termo)}`, {
          signal: controle.signal,
        });
        const dados = (await r.json()) as { resultados: Resultado[] };
        setResultados(dados.resultados);
        setAtivo(0);
        setAberto(true);
      } catch (erro) {
        if ((erro as Error).name !== "AbortError") setResultados([]);
      } finally {
        if (!controle.signal.aborted) setCarregando(false);
      }
    }, 160);

    return () => {
      clearTimeout(timer);
      controle.abort();
    };
  }, [termo]);

  const abrir = useCallback(
    (r: Resultado) => {
      setAberto(false);
      setTermo("");
      campoRef.current?.blur();
      router.push(`/entidade/${r.slug}`);
    },
    [router],
  );

  const aoTeclarNoCampo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setAberto(false);
      campoRef.current?.blur();
      return;
    }
    if (!resultados.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => (i + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      abrir(resultados[ativo]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-fraca"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="M13.5 13.5L17 17" strokeLinecap="round" />
        </svg>
        <input
          ref={campoRef}
          type="search"
          role="combobox"
          aria-expanded={aberto}
          aria-controls="resultados-busca"
          aria-autocomplete="list"
          value={termo}
          placeholder="Buscar entidade, projeto, segmento…"
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => resultados.length && setAberto(true)}
          onKeyDown={aoTeclarNoCampo}
          className="w-full rounded-md border border-borda bg-papel-suave py-1.5 pl-8 pr-12 text-sm text-tinta outline-none transition-colors placeholder:text-tinta-fraca focus:border-borda-forte focus:bg-papel focus:ring-2 focus:ring-realce/25 [&::-webkit-search-cancel-button]:appearance-none"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-borda bg-papel px-1.5 py-0.5 font-mono text-[10px] text-tinta-fraca sm:block">
          /
        </kbd>
      </div>

      {aberto && (
        <div
          id="resultados-busca"
          role="listbox"
          className="rolagem-fina absolute right-0 top-full z-50 mt-1.5 max-h-[70vh] w-full min-w-[22rem] overflow-y-auto rounded-lg border border-borda bg-papel shadow-lg"
        >
          {carregando && !resultados.length ? (
            <p className="px-3 py-6 text-center text-sm text-tinta-fraca">Buscando…</p>
          ) : resultados.length ? (
            <ul className="py-1">
              {resultados.map((r, i) => {
                const spec = NODE_KINDS[r.kind];
                return (
                  <li key={r.slug}>
                    <button
                      role="option"
                      aria-selected={i === ativo}
                      onMouseEnter={() => setAtivo(i)}
                      onClick={() => abrir(r)}
                      className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                        i === ativo ? "bg-papel-suave" : ""
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: spec.cor }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-tinta">{r.nome}</span>
                        <span className="block truncate text-xs text-tinta-fraca">
                          {spec.rotulo}
                          {r.casouEm ? ` · ${r.casouEm}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-tinta-fraca">
              Nada encontrado para “{termo}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

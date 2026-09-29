"use client";

import { createContext, useContext } from "react";
import type { Aba } from "./CanvasVisualizacao";

/**
 * Liga a coluna-documento ao canvas ao lado.
 *
 * No SF Government Graph o "Explore budget" fica na coluna da esquerda e **vira
 * a aba do canvas da direita** — não navega para outro lugar. A leitura
 * continua: os números do exercício estão à esquerda e a rosca que os reparte
 * aparece ao lado, na mesma tela.
 *
 * Existe porque a coluna é renderizada no servidor e passada como `children`,
 * então não alcança o `useState` do invólucro. Um contexto resolve sem mover a
 * apuração para o navegador: o servidor monta o conteúdo, e só o botão — que é
 * cliente — consome o seletor de aba.
 */
export const CanvasContexto = createContext<{ abrir: (aba: Aba) => void } | null>(null);

/**
 * Botão que troca a vista do canvas.
 *
 * Fora de um canvas com abas ele não tem o que fazer, então não se desenha —
 * botão que não faz nada é pior que botão ausente.
 */
export function BotaoCanvas({
  aba,
  children,
  className = "",
}: {
  aba: Aba;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(CanvasContexto);
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={() => ctx.abrir(aba)}
      className={`text-xs text-realce underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-borda-forte ${className}`}
    >
      {children}
    </button>
  );
}

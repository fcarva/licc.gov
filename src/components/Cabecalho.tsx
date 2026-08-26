import Link from "next/link";
import { BuscaGlobal } from "./BuscaGlobal";

const NAV = [
  { href: "/orcamento", rotulo: "Orçamento" },
  { href: "/segmentos", rotulo: "Segmentos" },
  { href: "/municipios", rotulo: "Municípios" },
  { href: "/monitor", rotulo: "Monitor" },
  { href: "/noticias", rotulo: "Notícias" },
  { href: "/sobre", rotulo: "Sobre" },
];

export function Cabecalho({ ano }: { ano: number }) {
  return (
    <header className="sticky top-0 z-40 bg-papel-fundo/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2 rounded-full bg-papel px-4 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_16px_-6px_rgba(15,23,42,0.10)]"
        >
          <span aria-hidden="true" className="text-[var(--color-publico)]">✳</span>
          <span className="font-mono text-sm font-semibold tracking-tight text-tinta">
            licc<span className="text-tinta-fraca">.gov</span>
          </span>
          <span className="hidden text-xs text-tinta-fraca sm:inline">{ano}</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Seções">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm text-tinta-suave transition-colors hover:bg-papel hover:text-tinta"
            >
              {item.rotulo}
            </Link>
          ))}
        </nav>

        <div className="ml-auto w-full max-w-sm">
          <BuscaGlobal />
        </div>
      </div>
    </header>
  );
}

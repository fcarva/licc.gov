import Link from "next/link";
import { BuscaGlobal } from "./BuscaGlobal";
import { Glifo } from "./Glifo";
import type { NodeKind } from "@/types/graph";

/**
 * O fluxo do valor, em ordem de anel — a divisão que o SF Government Graph faz.
 *
 * Lá as seções de topo são uma por categoria de vértice (`/sf/elected/`,
 * `/sf/commissions/`, `/sf/advisories/`, `/sf/departments/`). Aqui são as quatro
 * etapas pelas quais a renúncia de ICMS passa, e a ordem é a do dinheiro: quem
 * autoriza, quem põe, quem executa, o que se produz. Cada item leva o glifo da
 * sua categoria, como no original, então o grupo se lê como o grafo.
 */
const FLUXO: Array<{ href: string; rotulo: string; kind: NodeKind }> = [
  { href: "/orgaos", rotulo: "Órgãos", kind: "governanca" },
  { href: "/patrocinadores", rotulo: "Patrocinadores", kind: "patrocinador" },
  { href: "/proponentes", rotulo: "Proponentes", kind: "proponente" },
  { href: "/projetos", rotulo: "Projetos", kind: "projeto" },
];

const PILULA =
  "shrink-0 rounded-full px-3 py-1.5 text-sm text-tinta-suave transition-colors hover:bg-papel hover:text-tinta";

export function Cabecalho({ ano }: { ano: number }) {
  return (
    <header className="sticky top-0 z-40 bg-papel-fundo/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2 rounded-full bg-papel px-4 py-2"
        >
          <span aria-hidden="true" className="text-[var(--color-publico)]">✳</span>
          <span className="font-mono text-sm font-semibold tracking-tight text-tinta">
            licc<span className="text-tinta-fraca">.gov</span>
          </span>
          <span className="hidden text-xs text-tinta-fraca sm:inline">{ano}</span>
        </Link>

        {/*
          Só o fluxo do valor — os quatro anéis.
          O original não tem barra nenhuma: navega-se pelo grafo, pela busca e
          pela coluna-documento, e o Overview agrega sem navegar (as contagens
          dele são texto puro, medido no HTML). Aqui os quatro anéis ficam porque
          são o equivalente a clicar num anel do grafo, e porque atrás deles há
          índice — 28 empresas, 52 proponentes — que lá não existe.
          As demais vistas desceram para o rodapé: alcançáveis de toda página,
          sem disputar o topo com a identidade e a busca.
        */}
        <nav
          className="rolagem-fina hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:flex"
          aria-label="Fluxo do valor"
        >
          {FLUXO.map((item) => (
            <Link key={item.href} href={item.href} className={`${PILULA} flex items-center gap-1.5`}>
              <Glifo kind={item.kind} className="text-[0.9em]" />
              {item.rotulo}
            </Link>
          ))}
        </nav>

        {/*
          A busca fecha em 36px e expande ao foco, como a do original — e é o
          que dá à navegação de onze seções a largura de que ela precisa.
        */}
        <div className="ml-auto shrink-0">
          <BuscaGlobal />
        </div>
      </div>
    </header>
  );
}

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

/**
 * `min-h-11` são 44px: o piso de alvo de toque.
 *
 * A passada de usabilidade mediu 16px no menor alvo do cabeçalho — menos de um
 * terço do mínimo, e o original usa `h-[44px]` em tudo que é tocável. Acima de
 * `md` o ponteiro não precisa disso, e a pílula volta ao corpo compacto.
 */
const PILULA =
  "flex shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-tinta-suave transition-colors hover:bg-papel hover:text-tinta min-h-11 md:min-h-0 md:py-1.5";

export function Cabecalho({ ano }: { ano: number }) {
  return (
    <header className="sticky top-0 z-40 bg-papel-fundo/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-3 px-4">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-papel px-4 md:min-h-0 md:py-2"
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
        {/*
          Visível desde o celular, rolando na horizontal.
          Estava `hidden md:flex`, e a passada de usabilidade mostrou o custo:
          abaixo de 768px o cabeçalho tinha **um** link — o logotipo — e os
          quatro anéis do fluxo ficavam inalcançáveis. Esconder navegação no
          celular é onde ela mais falta.
        */}
        <nav
          className="rolagem-fina flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
          aria-label="Fluxo do valor"
        >
          {FLUXO.map((item) => (
            <Link key={item.href} href={item.href} className={PILULA}>
              <Glifo kind={item.kind} className="text-[0.9em]" />
              <span className="hidden sm:inline">{item.rotulo}</span>
              <span className="sr-only sm:hidden">{item.rotulo}</span>
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

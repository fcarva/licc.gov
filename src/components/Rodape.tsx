import Link from "next/link";

/**
 * Rodapé — onde vão as seções que saíram da barra de navegação.
 *
 * ## Por que elas saíram
 *
 * O SF Government Graph **não tem barra de navegação**. O topo carrega só a
 * trilha com o seletor de governo, a busca de 36px e os botões de histórico; a
 * navegação acontece pelo grafo, pela busca e pela própria coluna-documento. E
 * o bloco Overview, medido no HTML, é **agregação e não navegação**: as
 * contagens são texto puro, sem âncora, porque atrás de "Departments 54" não
 * existe página — `/sf/departments` redireciona para a home.
 *
 * Aqui existem páginas atrás dos números, então a adaptação foi manter o bloco e
 * tornar a contagem clicável. Com isso a barra pôde ficar só com o fluxo do
 * valor — os quatro anéis —, que é o equivalente a clicar num anel do grafo.
 *
 * O que sobrou são vistas que o original resolve de outro jeito: orçamento é aba
 * lá e página aqui, notícias são coluna lá, "sobre" é seção lá. Ficam no rodapé,
 * alcançáveis de qualquer página, sem competir por espaço no topo.
 */

const VISTAS = [
  { href: "/orcamento", rotulo: "Orçamento" },
  { href: "/indicadores", rotulo: "Indicadores" },
  { href: "/segmentos", rotulo: "Segmentos" },
  { href: "/municipios", rotulo: "Municípios" },
  { href: "/monitor", rotulo: "Monitor" },
  { href: "/noticias", rotulo: "Notícias" },
];

export function Rodape({ ano }: { ano: number }) {
  return (
    <footer className="mx-auto max-w-[1700px] px-4 pb-8 pt-4">
      <div className="rounded-xl bg-papel px-5 py-5">
        <nav aria-label="Vistas do catálogo">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {VISTAS.map((v) => (
              <li key={v.href}>
                <Link
                  href={v.href}
                  className="text-sm text-tinta-suave underline-offset-2 transition-colors hover:text-tinta hover:underline"
                >
                  {v.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-borda pt-4">
          <p className="text-xs leading-relaxed text-tinta-fraca">
            Catálogo relacional da Lei de Incentivo à Cultura Capixaba, exercício{" "}
            <span className="tabular">{ano}</span>.{" "}
            <strong className="font-normal italic">
              Projeto independente: não é sítio oficial da SECULT-ES nem do Governo
              do Espírito Santo.
            </strong>
          </p>
          <Link
            href="/sobre"
            className="text-xs text-tinta-suave underline underline-offset-2 hover:text-tinta"
          >
            Metodologia e proveniência
          </Link>
        </div>
      </div>
    </footer>
  );
}

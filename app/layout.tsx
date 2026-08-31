import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Cabecalho } from "@/components/Cabecalho";
import { obterGrafo } from "@/lib/dados";

/**
 * Inter é a fonte do SF Government Graph — `type-header-1` 30/33 600,
 * `type-paragraph-2` 16/22,4. Servida pelo próprio Next, sem requisição ao
 * Google no cliente, o que também evita expor quem lê o sítio.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--fonte-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "licc.gov — Catálogo relacional da Lei de Incentivo à Cultura Capixaba",
    template: "%s · licc.gov",
  },
  description:
    "Grafo aberto da Lei de Incentivo à Cultura Capixaba: quem propõe, quem patrocina, para onde vai o recurso e sob qual norma. Dados do Mapa Cultural do Espírito Santo e da SECULT-ES.",
  keywords: [
    "LICC", "Lei de Incentivo à Cultura Capixaba", "SECULT-ES",
    "Espírito Santo", "transparência", "cultura", "ICMS", "Mapa Cultural",
  ],
  openGraph: {
    title: "licc.gov — LICC Gov Graph",
    description:
      "Catálogo relacional em grafo da Lei de Incentivo à Cultura Capixaba.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { meta } = obterGrafo();
  const temDemo = meta.contagemPorProveniencia.demonstracao > 0;

  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-full">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-papel focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-realce"
        >
          Pular para o conteúdo
        </a>
        <Cabecalho ano={meta.ano} />
        {temDemo ? <FaixaDemonstracao /> : null}
        <main id="conteudo">{children}</main>
      </body>
    </html>
  );
}

/**
 * Aviso persistente. Enquanto o grafo contiver registros gerados localmente,
 * o usuário precisa saber disso em toda página — não só na que ele abriu.
 */
function FaixaDemonstracao() {
  return (
    <div className="faixa-demo border-b border-borda bg-papel-suave px-4 py-2 text-center text-xs text-tinta-suave">
      <strong className="font-semibold text-tinta">Conjunto de demonstração.</strong>{" "}
      Projetos, proponentes e patrocinadores exibidos são fictícios e servem para
      exercitar a interface. Órgãos, normas, cotas e o teto de R$ 25 milhões são
      reais e trazem a fonte.{" "}
      <a href="/sobre" className="underline underline-offset-2 hover:text-tinta">
        Entenda a proveniência
      </a>
      .
    </div>
  );
}

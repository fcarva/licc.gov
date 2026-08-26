/**
 * Converte a saída de `tools/scrape-civlab/` em `docs/referencia-civlab.md`.
 *
 * O documento gerado é a régua usada para calibrar `GrafoRadial.tsx` e
 * `globals.css`: raio de cada anel em fração do raio máximo, contagem, forma
 * dominante e paleta. Sem a coleta, imprime o que falta e sai sem erro — o
 * projeto não depende dele para compilar.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();
const ENTRADA = join(RAIZ, "tools", "scrape-civlab", "saida");
const DESTINO = join(RAIZ, "docs", "referencia-civlab.md");

interface Anel {
  raio: number;
  quantidade: number;
  formas: string[];
  preenchimentos: string[];
  tracos: string[];
  tamanhoMedio: number;
}

interface Rotulo {
  texto: string;
  raio: number;
  tamanhoFonte: string;
  pesoFonte: string;
  espacamento: string;
  transformacao: string;
  cor: string;
}

interface PaginaGeometria {
  url: string;
  centro: { largura: number; altura: number } | null;
  aneis: Anel[];
  rotulos: Rotulo[];
  nos: Array<{ forma: string; raio: number }>;
  aviso?: string;
}

function lerJson<T>(nome: string): T | null {
  const caminho = join(ENTRADA, nome);
  if (!existsSync(caminho)) return null;
  try {
    return JSON.parse(readFileSync(caminho, "utf-8")) as T;
  } catch (e) {
    console.warn(`  ${nome} ilegível: ${(e as Error).message}`);
    return null;
  }
}

function main(): void {
  const geometria = lerJson<{ paginas: PaginaGeometria[] }>("geometria.json");
  const estilos = lerJson<{
    medido?: {
      tokensRaiz: Record<string, string>;
      componentes: Record<string, Record<string, unknown> | null>;
      paletaGrafo: Array<{ combinacao: string; quantidade: number }>;
    };
  }>("estilos.json");
  const rede = lerJson<{ respostas: Array<{ url: string; tipo: string; corpo: string }> }>("rede.json");

  if (!geometria && !estilos && !rede) {
    console.log("Nenhuma coleta encontrada em tools/scrape-civlab/saida/.");
    console.log("Rode o toolkit na sua máquina (veja tools/scrape-civlab/README.md)");
    console.log("e copie a pasta saida/ para cá.");
    return;
  }

  const linhas: string[] = [
    "# Referência aferida do CivLab",
    "",
    "> Gerado por `pipeline/importar-referencia.ts` a partir de",
    "> `tools/scrape-civlab/saida/`. Não editar à mão — rode o importador de novo.",
    "",
    `Importado em ${new Date().toISOString()}.`,
    "",
  ];

  /* --------------------------- geometria --------------------------- */
  if (geometria?.paginas?.length) {
    linhas.push("## Geometria do grafo radial", "");
    for (const p of geometria.paginas) {
      if (!p.aneis?.length) continue;
      const maior = Math.max(...p.aneis.map((a) => a.raio), 1);
      linhas.push(`### \`${p.url}\``, "");
      if (p.centro) {
        linhas.push(`Área do SVG: ${p.centro.largura}×${p.centro.altura} px.`, "");
      }
      linhas.push(
        "| Raio (px) | Fração do maior | Nós | Forma dominante | Tamanho médio |",
        "| --- | --- | --- | --- | --- |",
      );
      for (const a of p.aneis) {
        linhas.push(
          `| ${a.raio} | ${(a.raio / maior).toFixed(3)} | ${a.quantidade} | ${a.formas.join(", ")} | ${a.tamanhoMedio}px |`,
        );
      }
      linhas.push("");

      const rotulosAnel = (p.rotulos ?? []).filter(
        (r) => r.texto && r.texto === r.texto.toUpperCase() && r.texto.length < 40,
      );
      if (rotulosAnel.length) {
        linhas.push("**Rótulos de anel**", "");
        linhas.push("| Texto | Raio | Fonte | Peso | Espaçamento | Cor |", "| --- | --- | --- | --- | --- | --- |");
        for (const r of rotulosAnel) {
          linhas.push(
            `| ${r.texto} | ${r.raio} | ${r.tamanhoFonte} | ${r.pesoFonte} | ${r.espacamento} | ${r.cor} |`,
          );
        }
        linhas.push("");
      }
    }
  }

  /* ---------------------------- estilos ---------------------------- */
  if (estilos?.medido) {
    const m = estilos.medido;
    const tokens = Object.entries(m.tokensRaiz ?? {});
    if (tokens.length) {
      linhas.push("## Tokens `:root`", "", "| Token | Valor |", "| --- | --- |");
      for (const [k, v] of tokens) linhas.push(`| \`${k}\` | \`${v}\` |`);
      linhas.push("");
    }

    const componentes = Object.entries(m.componentes ?? {}).filter(([, v]) => v);
    if (componentes.length) {
      linhas.push("## Componentes-chave", "");
      for (const [nome, estilo] of componentes) {
        linhas.push(`### ${nome}`, "");
        for (const [k, v] of Object.entries(estilo ?? {})) {
          linhas.push(`- **${k}**: \`${typeof v === "object" ? JSON.stringify(v) : String(v)}\``);
        }
        linhas.push("");
      }
    }

    if (m.paletaGrafo?.length) {
      linhas.push(
        "## Paleta efetiva do SVG",
        "",
        "| Elemento \\| preenchimento \\| traço | Ocorrências |",
        "| --- | --- |",
      );
      for (const c of m.paletaGrafo) {
        linhas.push(`| \`${c.combinacao}\` | ${c.quantidade} |`);
      }
      linhas.push("");
    }
  }

  /* ------------------------- respostas de rede ---------------------- */
  if (rede?.respostas?.length) {
    linhas.push("## Respostas de rede capturadas", "");
    const porOrigem = new Map<string, number>();
    for (const r of rede.respostas) {
      const origem = safeOrigin(r.url);
      porOrigem.set(origem, (porOrigem.get(origem) ?? 0) + 1);
    }
    linhas.push("| Origem | Respostas |", "| --- | --- |");
    for (const [o, n] of [...porOrigem].sort((a, b) => b[1] - a[1])) {
      linhas.push(`| \`${o}\` | ${n} |`);
    }
    linhas.push("");
    linhas.push("As dez maiores, que costumam carregar a topologia:", "");
    for (const r of [...rede.respostas].sort((a, b) => b.corpo.length - a.corpo.length).slice(0, 10)) {
      linhas.push(`- \`${r.url}\` — ${(r.corpo.length / 1024).toFixed(1)} KB (${r.tipo})`);
    }
    linhas.push("");
  }

  mkdirSync(join(RAIZ, "docs"), { recursive: true });
  writeFileSync(DESTINO, linhas.join("\n"));
  console.log(`✓ ${DESTINO}`);
  console.log(`  ${linhas.length} linhas`);
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.slice(0, 60);
  }
}

if (process.argv[1]?.includes("importar-referencia")) main();

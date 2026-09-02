#!/usr/bin/env node
/**
 * Converte os anexos "LISTA DE PROJETOS HABILITADOS" da SECULT em CSV do
 * licc.gov.
 *
 * RODE ESTE SCRIPT NA SUA MÁQUINA. O ambiente onde o licc.gov foi desenvolvido
 * tem `secult.es.gov.br` bloqueado pela política de egresso da organização.
 *
 *   cd tools/anexos-secult && npm init -y && npm i pdfjs-dist
 *   node baixar.mjs                       # busca os PDFs
 *   node extrair.mjs                      # PDF → CSV
 *
 * ## Por que posicional, e não um modelo de linguagem
 *
 * A tentação é jogar o PDF num modelo e pedir a tabela. Para uma lista
 * financeira isso é inaceitável: um modelo que arredonda um valor ou pula uma
 * linha produz exatamente o erro que este projeto existe para não cometer, e
 * produz **em silêncio**. Aqui a leitura é geométrica — cada fragmento de
 * texto tem coordenada, as colunas saem da posição do cabeçalho, e nada é
 * inferido.
 *
 * ## O conferidor embutido
 *
 * Todo anexo declara a própria contagem ("Quantidade: 74"). Se a extração
 * render outro número, o script **falha em vez de entregar**. Uma transcrição
 * incompleta que se apresenta como completa é pior que nenhuma.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ENTRADA = join(AQUI, "saida");
const SAIDA = join(AQUI, "csv");

/** Tolerância vertical para dois fragmentos contarem como a mesma linha, em pt. */
const TOLERANCIA_LINHA = 3;

/**
 * Cabeçalhos que identificam cada coluna do nosso esquema.
 *
 * A SECULT não usa o mesmo cabeçalho em todos os anexos, então cada campo
 * aceita variações. A ordem importa: o primeiro que casar vence.
 */
const COLUNAS = [
  { campo: "numero_processo", casa: [/processo/i, /protocolo/i, /^n[º°.]/i] },
  { campo: "projeto", casa: [/projeto/i, /t[ií]tulo/i] },
  { campo: "proponente", casa: [/proponente/i, /agente/i, /raz[ãa]o/i] },
  { campo: "municipio", casa: [/munic[ií]pio/i, /cidade/i] },
  { campo: "segmento", casa: [/segmento/i, /linguagem/i, /[áa]rea/i] },
  { campo: "valor_autorizado", casa: [/valor/i, /autorizado/i, /aprovado/i] },
];

async function textoPosicionado(caminho) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(caminho)),
    useSystemFonts: true,
  }).promise;

  const paginas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const conteudo = await pagina.getTextContent();
    const itens = conteudo.items
      .filter((i) => typeof i.str === "string" && i.str.trim() !== "")
      .map((i) => ({
        texto: i.str,
        x: i.transform[4],
        // O eixo y do PDF cresce para cima; invertido, a ordem de leitura
        // vira a ordem numérica, que é o que o agrupamento por linha espera.
        y: pagina.view[3] - i.transform[5],
      }));
    paginas.push(itens);
  }
  return paginas;
}

/** Agrupa fragmentos em linhas pelo y, e ordena cada linha pelo x. */
function emLinhas(itens) {
  const linhas = [];
  for (const item of [...itens].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const ultima = linhas.at(-1);
    if (ultima && Math.abs(ultima.y - item.y) <= TOLERANCIA_LINHA) {
      ultima.itens.push(item);
      continue;
    }
    linhas.push({ y: item.y, itens: [item] });
  }
  for (const l of linhas) l.itens.sort((a, b) => a.x - b.x);
  return linhas;
}

/**
 * Encontra o cabeçalho e devolve a fronteira x de cada coluna.
 *
 * O cabeçalho é a linha que casa mais campos do nosso esquema. Procurar por
 * uma linha específica seria frágil; contar acertos sobrevive a anexo que
 * troca "MUNICÍPIO" por "CIDADE".
 */
function inferirColunas(linhas) {
  let melhor = null;
  for (const linha of linhas) {
    const achados = [];
    for (const item of linha.itens) {
      const coluna = COLUNAS.find((c) => c.casa.some((r) => r.test(item.texto)));
      if (coluna && !achados.some((a) => a.campo === coluna.campo)) {
        achados.push({ campo: coluna.campo, x: item.x });
      }
    }
    if (achados.length >= 2 && (!melhor || achados.length > melhor.achados.length)) {
      melhor = { linha, achados };
    }
  }
  if (!melhor) return null;

  const ordenadas = [...melhor.achados].sort((a, b) => a.x - b.x);
  return {
    y: melhor.linha.y,
    colunas: ordenadas.map((c, i) => ({
      campo: c.campo,
      // A coluna vai do seu x até o começo da próxima; a última vai ao infinito.
      de: i === 0 ? -Infinity : (ordenadas[i - 1].x + c.x) / 2,
      ate: i === ordenadas.length - 1 ? Infinity : (c.x + ordenadas[i + 1].x) / 2,
    })),
  };
}

/** Distribui os fragmentos de uma linha pelas colunas inferidas. */
function comoRegistro(linha, colunas) {
  const registro = Object.fromEntries(colunas.map((c) => [c.campo, []]));
  for (const item of linha.itens) {
    const coluna = colunas.find((c) => item.x >= c.de && item.x < c.ate);
    if (coluna) registro[coluna.campo].push(item.texto.trim());
  }
  return Object.fromEntries(
    Object.entries(registro).map(([k, v]) => [k, v.join(" ").replace(/\s+/g, " ").trim()]),
  );
}

/** A contagem que o próprio documento declara, quando declara. */
function quantidadeDeclarada(paginas) {
  const texto = paginas.flat().map((i) => i.texto).join(" ");
  const m = texto.match(/quantidade\s*:?\s*(\d+)/i);
  return m ? Number(m[1]) : undefined;
}

/**
 * Junta uma linha de continuação ao registro anterior.
 *
 * Célula que não cabe na largura da coluna quebra em duas linhas físicas, e
 * cada pedaço fica num `y` diferente. Sem isto, "Mostra Alfa de Cinema
 * Capixaba" viraria dois registros: um com metade do nome e outro sem
 * proponente, que seria descartado em silêncio — perdendo metade do dado e
 * **sem quebrar a contagem**, que é o pior modo de falhar.
 */
function juntar(registro, continuacao) {
  for (const [campo, valor] of Object.entries(continuacao)) {
    if (!valor) continue;
    registro[campo] = registro[campo] ? `${registro[campo]} ${valor}` : valor;
  }
}

export async function extrair(caminho) {
  const paginas = await textoPosicionado(caminho);
  const declarada = quantidadeDeclarada(paginas);

  const registros = [];
  let cabecalho = null;

  for (const itens of paginas) {
    const linhas = emLinhas(itens);
    // Cada página pode repetir o cabeçalho; o da primeira define as colunas.
    const daPagina = inferirColunas(linhas);
    if (daPagina) cabecalho ??= daPagina;
    if (!cabecalho) continue;

    // A coluna mais à esquerda é a âncora: linha com conteúdo nela abre um
    // registro novo; sem conteúdo nela, é continuação da anterior.
    const ancora = cabecalho.colunas[0].campo;
    const limite = daPagina ? daPagina.y : -Infinity;

    for (const linha of linhas) {
      if (linha.y <= limite + TOLERANCIA_LINHA) continue;
      const r = comoRegistro(linha, cabecalho.colunas);
      if (!Object.values(r).some(Boolean)) continue;

      if (r[ancora] || !registros.length) {
        registros.push(r);
      } else {
        juntar(registros.at(-1), r);
      }
    }
  }

  // Rodapé, número de página e nota de rodapé entram como linha sem
  // proponente; um registro de projeto tem os dois campos.
  const validos = registros.filter((r) => r.projeto && r.proponente);

  return {
    registros: validos,
    declarada,
    colunas: cabecalho?.colunas.map((c) => c.campo) ?? [],
    descartados: registros.length - validos.length,
    suspeitos: validos.filter((r) => r.valor_autorizado && !pareceDinheiro(r.valor_autorizado)),
  };
}

/**
 * O segundo conferidor.
 *
 * A contagem de linhas sozinha não basta: no primeiro teste desta ferramenta
 * ela bateu (5 de 5) enquanto todos os valores estavam truncados. Um campo de
 * valor que não se parece com dinheiro é sinal de que a coluna foi cortada no
 * lugar errado, e vale abortar em vez de gravar número corrompido.
 */
function pareceDinheiro(texto) {
  return /^\s*(r\$)?\s*\d{1,3}(\.\d{3})*(,\d{2})?\s*$|^\s*(r\$)?\s*\d+([.,]\d+)?\s*$/i.test(texto);
}

const csv = (v) => {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  if (!existsSync(ENTRADA)) {
    console.error(`✗ ${ENTRADA} não existe. Rode primeiro: node baixar.mjs`);
    process.exit(1);
  }
  const pdfs = readdirSync(ENTRADA).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (!pdfs.length) {
    console.error(`✗ nenhum PDF em ${ENTRADA}. Rode primeiro: node baixar.mjs`);
    process.exit(1);
  }
  mkdirSync(SAIDA, { recursive: true });

  const fontes = existsSync(join(ENTRADA, "fontes.json"))
    ? JSON.parse(readFileSync(join(ENTRADA, "fontes.json"), "utf8"))
    : {};

  let falhas = 0;
  for (const [n, pdf] of pdfs.entries()) {
    const caminho = join(ENTRADA, pdf);
    const { registros, declarada, colunas, descartados, suspeitos } = await extrair(caminho);

    const contagemBate = declarada === undefined || declarada === registros.length;
    const valoresIntegros = suspeitos.length === 0;
    const conferido = contagemBate && valoresIntegros && registros.length > 0;

    console.log(
      `${conferido ? "✓" : "✗"} ${pdf}\n    colunas: ${colunas.join(", ") || "(nenhuma reconhecida)"}` +
        `\n    extraídos: ${registros.length}` +
        (declarada !== undefined ? ` · declarados: ${declarada}` : " · sem contagem declarada") +
        (descartados ? ` · ${descartados} linha(s) sem projeto/proponente, ignoradas` : ""),
    );

    if (!registros.length) {
      console.error("    ! nenhuma linha reconhecida; nada a gravar.");
      console.error("      O cabeçalho pode usar termos fora de COLUNAS neste arquivo.");
      falhas++;
      continue;
    }
    if (!contagemBate) {
      console.error(
        `    ! a contagem não bate com a declarada — não vou gravar.\n` +
          `      Faltou linha, ou sobrou linha que não é projeto.`,
      );
      falhas++;
      continue;
    }
    if (!valoresIntegros) {
      console.error(`    ! ${suspeitos.length} valor(es) não se parecem com dinheiro — não vou gravar.`);
      for (const s of suspeitos.slice(0, 3)) {
        console.error(`      "${s.projeto.slice(0, 40)}" → ${JSON.stringify(s.valor_autorizado)}`);
      }
      console.error(
        "      Sinal de coluna cortada no lugar errado. A contagem de linhas\n" +
          "      sozinha não pega isso: ela bate enquanto os números se corrompem.",
      );
      falhas++;
      continue;
    }

    const ano = (pdf.match(/20\d{2}/) ?? ["2025"])[0];
    const campos = [
      "numero_processo", "projeto", "proponente", "municipio",
      "segmento", "valor_autorizado", "valor_captado", "patrocinador",
      "fonte_url", "fonte_pagina",
    ];
    const linhas = [
      campos.join(","),
      ...registros.map((r) =>
        campos
          .map((c) => csv(c === "fonte_url" ? (fontes[pdf] ?? "") : c === "fonte_pagina" ? "" : r[c] ?? ""))
          .join(","),
      ),
    ];
    const destino = join(SAIDA, `habilitados-${ano}-lote${n + 1}.csv`);
    writeFileSync(destino, linhas.join("\n") + "\n");
    console.log(`    → ${basename(destino)}`);
  }

  console.log(
    falhas
      ? `\n✗ ${falhas} anexo(s) não conferiram. Nada deles foi gravado.`
      : `\n✓ copie os CSV para data/raw/ e rode: npm run importar:habilitados`,
  );
  if (falhas) process.exitCode = 1;
}

if (process.argv[1]?.includes("extrair")) main().catch((e) => {
  console.error("✗ falhou:", e);
  process.exit(1);
});

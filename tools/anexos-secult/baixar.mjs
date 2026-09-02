#!/usr/bin/env node
/**
 * Descobre e baixa os anexos "LISTA DE PROJETOS HABILITADOS" da SECULT-ES.
 *
 * RODE ESTE SCRIPT NA SUA MÁQUINA. O ambiente onde o licc.gov foi desenvolvido
 * tem `secult.es.gov.br` bloqueado pela política de egresso da organização.
 *
 *   node baixar.mjs
 *   node baixar.mjs --pagina https://secult.es.gov.br/alguma-outra-pagina
 *   node baixar.mjs --pdf https://secult.es.gov.br/Media/.../LISTA....pdf
 *
 * Descobre em vez de usar lista fixa: a SECULT publica em lotes ao longo do
 * ano, e uma lista de URLs no código envelhece no dia seguinte. O que não
 * envelhece é a página que aponta para eles.
 *
 * Grava em `saida/`, junto com `fontes.json` — o mapa de arquivo para a URL de
 * onde veio, que `extrair.mjs` usa para preencher `fonte_url` em cada linha do
 * CSV. Sem esse endereço a linha entra no grafo como demonstração, não como
 * oficial.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, "saida");

const args = process.argv.slice(2);
const multi = (nome) =>
  args.flatMap((a, i) => (a === `--${nome}` && args[i + 1] ? [args[i + 1]] : []));

/** Páginas que costumam apontar para os anexos. */
const PAGINAS = [
  "https://secult.es.gov.br/sobre-a-licc",
  "https://secult.es.gov.br/licc",
  ...multi("pagina"),
];

const CABECALHOS = {
  // Alguns servidores públicos recusam requisição sem User-Agent.
  "User-Agent": "licc.gov/1.0 (catálogo aberto da LICC; contato via repositório)",
  Accept: "*/*",
};

/** Todo href .pdf de uma página, resolvido para URL absoluta. */
async function pdfsDaPagina(url) {
  try {
    const r = await fetch(url, { headers: CABECALHOS, redirect: "follow" });
    if (!r.ok) {
      console.warn(`  ! ${url} → HTTP ${r.status}`);
      return [];
    }
    const html = await r.text();
    const achados = new Set();
    for (const m of html.matchAll(/href\s*=\s*["']([^"']+\.pdf)["']/gi)) {
      achados.add(new URL(m[1], url).href);
    }
    return [...achados];
  } catch (e) {
    console.warn(`  ! ${url} não respondeu: ${e.message}`);
    return [];
  }
}

/** Só os anexos de habilitados interessam; a página tem muito outro PDF. */
const ehListaDeHabilitados = (url) =>
  /habilitad/i.test(decodeURIComponent(url));

async function baixar(url, destino) {
  const r = await fetch(url, { headers: CABECALHOS, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  // Um "PDF" que não começa com %PDF é página de erro travestida.
  if (buf.subarray(0, 4).toString() !== "%PDF") {
    throw new Error(`resposta não é PDF (${buf.length} bytes, começa com ${JSON.stringify(buf.subarray(0, 12).toString())})`);
  }
  writeFileSync(destino, buf);
  return buf.length;
}

async function main() {
  mkdirSync(SAIDA, { recursive: true });

  const diretos = multi("pdf");
  const encontrados = new Set(diretos);

  if (!diretos.length) {
    for (const pagina of PAGINAS) {
      console.log(`→ varrendo ${pagina}`);
      const pdfs = await pdfsDaPagina(pagina);
      const listas = pdfs.filter(ehListaDeHabilitados);
      console.log(`  ${pdfs.length} PDF(s), ${listas.length} de habilitados`);
      for (const p of listas) encontrados.add(p);
    }
  }

  if (!encontrados.size) {
    console.error("\n✗ nenhum anexo de habilitados encontrado.");
    console.error("  A página pode ter mudado de endereço ou de estrutura.");
    console.error("  Passe a URL direto:  node baixar.mjs --pdf https://…/LISTA….pdf");
    process.exitCode = 1;
    return;
  }

  const fontes = {};
  let falhas = 0;
  console.log(`\n→ baixando ${encontrados.size} anexo(s)`);
  for (const [n, url] of [...encontrados].entries()) {
    const nome = `anexo-${String(n + 1).padStart(2, "0")}.pdf`;
    try {
      const bytes = await baixar(url, join(SAIDA, nome));
      fontes[nome] = url;
      console.log(`  ✓ ${nome}  ${(bytes / 1024).toFixed(0)} KB  ← ${decodeURIComponent(url).slice(-58)}`);
    } catch (e) {
      console.warn(`  ✗ ${decodeURIComponent(url).slice(-58)}: ${e.message}`);
      falhas++;
    }
  }

  writeFileSync(join(SAIDA, "fontes.json"), JSON.stringify(fontes, null, 2));
  console.log(`\n✓ ${Object.keys(fontes).length} anexo(s) em ${SAIDA}`);
  if (falhas) console.log(`  ${falhas} falha(s)`);
  console.log("  agora: node extrair.mjs");
}

main().catch((e) => {
  console.error("✗ falhou:", e);
  process.exit(1);
});

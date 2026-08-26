#!/usr/bin/env node
/**
 * Extrai a linguagem visual do CivLab: tokens de cor, raio, sombra e
 * tipografia dos componentes que importam — a coluna-documento flutuante, os
 * controles segmentados, as pílulas e o sunburst.
 *
 * RODE ESTE SCRIPT NA SUA MÁQUINA.
 *
 *   FIRECRAWL_API_KEY=fc-... node extrair-estilos.mjs
 *   node extrair-estilos.mjs            # sem chave: mede direto no navegador
 *
 * Com `FIRECRAWL_API_KEY` no ambiente, chama o endpoint /scrape do Firecrawl
 * pedindo rawHtml e screenshot. Sem chave, cai para medição direta via
 * `getComputedStyle`, que na prática entrega tokens mais precisos: valores já
 * resolvidos, sem precisar interpretar cascata de Tailwind.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, "saida");

const args = process.argv.slice(2);
const opcao = (n, p) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : p;
};

const URL_ALVO = opcao("url", "https://sfgov.civlab.org/sf");
const CHAVE = process.env.FIRECRAWL_API_KEY;

async function viaFirecrawl(url) {
  console.log("→ Firecrawl /scrape");
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHAVE}`,
    },
    body: JSON.stringify({
      url,
      formats: ["rawHtml", "screenshot"],
      waitFor: 8000,
      onlyMainContent: false,
    }),
  });
  if (!r.ok) throw new Error(`Firecrawl HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

/**
 * Mede os tokens resolvidos dos componentes-chave.
 * Roda dentro da página.
 */
function medirEstilos() {
  const alvos = {
    corpo: "body",
    // A coluna-documento: o card branco flutuante mais alto da esquerda.
    cardDocumento: null,
    controleSegmentado: null,
    pilulaBreadcrumb: null,
  };

  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // Card flutuante: fundo claro, canto arredondado, sombra, na metade esquerda.
  const candidatosCard = [...document.querySelectorAll("div, section, article")]
    .filter(visivel)
    .filter((el) => {
      const e = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (
        parseFloat(e.borderRadius) >= 8 &&
        e.boxShadow !== "none" &&
        r.width > 250 &&
        r.left < window.innerWidth * 0.5
      );
    })
    .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height);
  alvos.cardDocumento = candidatosCard[0] ?? null;

  // Controle segmentado: contém os rótulos Graph/Budget ou News/Budget.
  alvos.controleSegmentado =
    [...document.querySelectorAll("div, nav, ul")]
      .filter(visivel)
      .find((el) => {
        const t = (el.textContent ?? "").trim();
        return (
          t.length < 60 &&
          /graph/i.test(t) &&
          /budget/i.test(t) &&
          el.children.length >= 2
        );
      }) ?? null;

  alvos.pilulaBreadcrumb =
    [...document.querySelectorAll("nav, div")]
      .filter(visivel)
      .find((el) => /civlab/i.test((el.textContent ?? "").slice(0, 40))) ?? null;

  const ler = (el) => {
    if (!el) return null;
    const e = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      seletor: el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(/\s+/).slice(0, 6).join(".")}` : ""),
      caixa: { largura: Math.round(r.width), altura: Math.round(r.height) },
      fundo: e.backgroundColor,
      cor: e.color,
      raio: e.borderRadius,
      sombra: e.boxShadow,
      borda: `${e.borderWidth} ${e.borderStyle} ${e.borderColor}`,
      preenchimentoInterno: e.padding,
      fonte: e.fontFamily,
      tamanhoFonte: e.fontSize,
      pesoFonte: e.fontWeight,
      alturaLinha: e.lineHeight,
      espacamentoLetras: e.letterSpacing,
    };
  };

  // Variáveis CSS declaradas na raiz — os tokens de design, quando existirem.
  const tokens = {};
  for (const folha of document.styleSheets) {
    let regras;
    try {
      regras = folha.cssRules;
    } catch {
      continue; // folha de outra origem
    }
    for (const regra of regras ?? []) {
      if (regra.selectorText === ":root" && regra.style) {
        for (const prop of regra.style) {
          if (prop.startsWith("--")) tokens[prop] = regra.style.getPropertyValue(prop).trim();
        }
      }
    }
  }

  // Paleta efetivamente pintada no SVG do grafo.
  const paletaGrafo = {};
  const svg = [...document.querySelectorAll("svg")]
    .filter((s) => s.getBoundingClientRect().width > 300)
    .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
  if (svg) {
    for (const el of svg.querySelectorAll("circle, rect, polygon, path, text")) {
      const e = getComputedStyle(el);
      const chave = `${el.tagName.toLowerCase()}|${e.fill}|${e.stroke}`;
      paletaGrafo[chave] = (paletaGrafo[chave] ?? 0) + 1;
    }
  }

  return {
    tokensRaiz: tokens,
    componentes: Object.fromEntries(
      Object.entries(alvos).map(([k, v]) => [k, typeof v === "string" ? ler(document.querySelector(v)) : ler(v)]),
    ),
    paletaGrafo: Object.entries(paletaGrafo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([combinacao, quantidade]) => ({ combinacao, quantidade })),
  };
}

async function main() {
  mkdirSync(SAIDA, { recursive: true });
  const resultado = { url: URL_ALVO, coletadoEm: new Date().toISOString() };

  if (CHAVE) {
    try {
      const fc = await viaFirecrawl(URL_ALVO);
      resultado.firecrawl = {
        temRawHtml: Boolean(fc?.data?.rawHtml),
        tamanhoRawHtml: fc?.data?.rawHtml?.length ?? 0,
        screenshot: fc?.data?.screenshot ?? null,
      };
      if (fc?.data?.rawHtml) {
        writeFileSync(join(SAIDA, "bruto.html"), fc.data.rawHtml);
        console.log(`  rawHtml salvo (${fc.data.rawHtml.length} bytes)`);
      }
    } catch (e) {
      console.warn(`  Firecrawl falhou (${e.message}); seguindo só com o navegador`);
      resultado.firecrawlErro = e.message;
    }
  } else {
    console.log("→ sem FIRECRAWL_API_KEY; medindo direto no navegador");
  }

  console.log("→ medindo estilos computados");
  const navegador = await chromium.launch({ headless: true });
  const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1000 } });
  await pagina.goto(URL_ALVO, { waitUntil: "networkidle", timeout: 60000 });
  await pagina.waitForTimeout(8000);
  resultado.medido = await pagina.evaluate(medirEstilos);
  await navegador.close();

  writeFileSync(join(SAIDA, "estilos.json"), JSON.stringify(resultado, null, 2));
  console.log(`\n✓ ${join(SAIDA, "estilos.json")}`);
  console.log(`  ${Object.keys(resultado.medido.tokensRaiz).length} tokens :root`);
  console.log(`  ${resultado.medido.paletaGrafo.length} combinações de cor no SVG`);
}

main().catch((e) => {
  console.error("✗ falhou:", e);
  process.exit(1);
});

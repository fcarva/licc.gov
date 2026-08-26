#!/usr/bin/env node
/**
 * Extrai a topologia e a geometria do grafo do CivLab.
 *
 * RODE ESTE SCRIPT NA SUA MÁQUINA. O ambiente remoto onde o licc.gov foi
 * desenvolvido tem egresso bloqueado para civlab.org.
 *
 *   npm i playwright && npx playwright install chromium
 *   node extrair-topologia.mjs
 *   node extrair-topologia.mjs --url https://sfgov.civlab.org/sf --headed
 *
 * Três estratégias, em ordem de qualidade da saída:
 *
 *   1. Captura de rede — grava toda resposta JSON. Num app de grafo é onde a
 *      topologia costuma vir limpa e já normalizada.
 *   2. RSC flight chunks — o CivLab é Next.js App Router, que hidrata por
 *      `self.__next_f.push([1,"..."])`, e NÃO por `__NEXT_DATA__`. Os chunks
 *      são concatenados, desescapados e varridos atrás de objetos JSON.
 *   3. `__NEXT_DATA__` — mantido como retaguarda caso alguma rota ainda use
 *      o Pages Router.
 *
 * Além dos dados, mede a geometria desenhada: raio de cada anel, contagem por
 * anel, forma e paleta por tipo. São esses números que permitem reproduzir o
 * layout radial com fidelidade em vez de no olho.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, "saida");

const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : padrao;
};
const temFlag = (nome) => args.includes(`--${nome}`);

const URL_ALVO = opcao("url", "https://sfgov.civlab.org/sf");
const ESPERA_MS = Number(opcao("espera", 12000));

/** Rotas extras visitadas para cobrir os moldes de página. */
const ROTAS_EXTRA = [
  "/sf/departments/ccsf-office-of-the-treasurer-tax-collector",
  "/sf/elected-officials",
  "/sf/departments",
];

async function main() {
  mkdirSync(SAIDA, { recursive: true });
  const navegador = await chromium.launch({ headless: !temFlag("headed") });
  const contexto = await navegador.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const pagina = await contexto.newPage();

  /* ---------------- 1. captura de rede ---------------- */
  const respostas = [];
  pagina.on("response", async (r) => {
    const tipo = r.headers()["content-type"] ?? "";
    if (!tipo.includes("json") && !tipo.includes("text/x-component")) return;
    if (r.status() >= 400) return;
    try {
      const corpo = await r.text();
      if (corpo.length > 200) {
        respostas.push({ url: r.url(), status: r.status(), tipo, corpo });
      }
    } catch {
      /* corpos já consumidos ou streams não relidos: ignorar */
    }
  });

  const paginas = [URL_ALVO, ...ROTAS_EXTRA.map((r) => new URL(r, URL_ALVO).href)];
  const geometrias = [];

  for (const url of paginas) {
    console.log(`→ ${url}`);
    try {
      await pagina.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    } catch (e) {
      console.warn(`  navegação incompleta: ${e.message}`);
    }
    await pagina.waitForTimeout(ESPERA_MS);

    const geo = await pagina.evaluate(medirGeometria);
    geometrias.push({ url, ...geo });
    console.log(
      `  ${geo.nos.length} nós desenhados, ${geo.aneis.length} anéis, ${geo.rotulos.length} rótulos de anel`,
    );

    await pagina.screenshot({
      path: join(SAIDA, `tela-${slug(url)}.png`),
      fullPage: false,
    });
  }

  /* ------------- 2 e 3. estado embutido no HTML ------------- */
  const estado = await pagina.evaluate(extrairEstadoEmbutido);

  writeFileSync(
    join(SAIDA, "rede.json"),
    JSON.stringify({ coletadoEm: new Date().toISOString(), respostas }, null, 2),
  );
  writeFileSync(
    join(SAIDA, "estado-embutido.json"),
    JSON.stringify(estado, null, 2),
  );
  writeFileSync(
    join(SAIDA, "geometria.json"),
    JSON.stringify({ coletadoEm: new Date().toISOString(), paginas: geometrias }, null, 2),
  );

  console.log(`\n✓ saída em ${SAIDA}`);
  console.log(`  rede.json ............. ${respostas.length} respostas JSON`);
  console.log(`  estado-embutido.json .. ${estado.flight.length} chunks RSC, ${estado.objetos.length} objetos`);
  console.log(`  geometria.json ........ ${geometrias.length} páginas medidas`);
  console.log("\nMande a pasta saida/ de volta para o licc.gov e rode:");
  console.log("  npx tsx pipeline/importar-referencia.ts");

  await navegador.close();
}

/* ------------------------------------------------------------------ *
 * Executadas dentro da página.
 * ------------------------------------------------------------------ */

/** Mede o que está de fato desenhado: raios, formas, cores, rótulos. */
function medirGeometria() {
  const svgs = [...document.querySelectorAll("svg")];
  // O SVG do grafo é o de maior área com muitos filhos posicionados.
  const alvo = svgs
    .map((s) => ({ s, r: s.getBoundingClientRect() }))
    .filter((x) => x.r.width > 300 && x.r.height > 300)
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0];

  if (!alvo) return { nos: [], aneis: [], rotulos: [], centro: null, aviso: "nenhum SVG grande encontrado" };

  const caixa = alvo.r;
  const cx = caixa.left + caixa.width / 2;
  const cy = caixa.top + caixa.height / 2;

  const formaDe = (el) => {
    const t = el.tagName.toLowerCase();
    if (t === "circle") return "circulo";
    if (t === "rect") return Number(el.getAttribute("rx") ?? 0) > 2 ? "quadrado-arredondado" : "quadrado";
    if (t === "polygon") {
      const n = (el.getAttribute("points") ?? "").trim().split(/\s+/).length;
      return n <= 5 ? "losango" : "estrela";
    }
    if (t === "path") return "caminho";
    return t;
  };

  const nos = [];
  for (const el of alvo.s.querySelectorAll("circle, rect, polygon, path")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const raio = Math.hypot(ex - cx, ey - cy);
    // Descarta molduras e o próprio anel de fundo (muito maiores que um nó).
    if (r.width > caixa.width * 0.5) continue;
    const estilo = getComputedStyle(el);
    nos.push({
      forma: formaDe(el),
      raio: Math.round(raio),
      angulo: Math.round((Math.atan2(ey - cy, ex - cx) * 180) / Math.PI),
      largura: Math.round(r.width * 10) / 10,
      altura: Math.round(r.height * 10) / 10,
      preenchimento: estilo.fill,
      traco: estilo.stroke,
      espessura: estilo.strokeWidth,
      tracejado: estilo.strokeDasharray,
      opacidade: estilo.opacity,
    });
  }

  // Agrupa por raio arredondado a 6px para revelar os anéis.
  const balde = new Map();
  for (const n of nos) {
    const chave = Math.round(n.raio / 6) * 6;
    if (!balde.has(chave)) balde.set(chave, []);
    balde.get(chave).push(n);
  }
  const aneis = [...balde.entries()]
    .filter(([, v]) => v.length >= 3)
    .sort((a, b) => a[0] - b[0])
    .map(([raio, v]) => ({
      raio,
      quantidade: v.length,
      formas: [...new Set(v.map((x) => x.forma))],
      preenchimentos: [...new Set(v.map((x) => x.preenchimento))].slice(0, 4),
      tracos: [...new Set(v.map((x) => x.traco))].slice(0, 4),
      tamanhoMedio: Math.round((v.reduce((s, x) => s + x.largura, 0) / v.length) * 10) / 10,
    }));

  const rotulos = [...alvo.s.querySelectorAll("text")].map((t) => {
    const r = t.getBoundingClientRect();
    const e = getComputedStyle(t);
    return {
      texto: (t.textContent ?? "").trim(),
      raio: Math.round(Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy)),
      tamanhoFonte: e.fontSize,
      pesoFonte: e.fontWeight,
      espacamento: e.letterSpacing,
      transformacao: e.textTransform,
      cor: e.fill !== "none" ? e.fill : e.color,
    };
  });

  return {
    centro: { largura: Math.round(caixa.width), altura: Math.round(caixa.height) },
    nos: nos.length > 800 ? nos.slice(0, 800) : nos,
    aneis,
    rotulos,
  };
}

/** Recupera o estado hidratado: flight chunks do App Router e __NEXT_DATA__. */
function extrairEstadoEmbutido() {
  const flight = [];
  // O runtime do App Router acumula os chunks em self.__next_f.
  const f = /** @type {any} */ (self).__next_f;
  if (Array.isArray(f)) {
    for (const entrada of f) {
      if (Array.isArray(entrada) && typeof entrada[1] === "string") flight.push(entrada[1]);
    }
  }
  // Retaguarda: varrer os <script> em busca dos mesmos chunks.
  if (!flight.length) {
    for (const s of document.querySelectorAll("script")) {
      const t = s.textContent ?? "";
      if (t.includes("__next_f.push")) flight.push(t);
    }
  }

  const bruto = flight.join("");
  // Os chunks vêm com aspas escapadas; desescapar antes de varrer.
  const texto = bruto.replace(/\\"/g, '"').replace(/\\n/g, "\n");

  /** Extrai objetos JSON balanceados que aparentem ser nós do grafo. */
  const objetos = [];
  const dicas = ['"nodes"', '"edges"', '"entities"', '"relationships"', '"budget"', '"slug"'];
  for (const dica of dicas) {
    let de = 0;
    for (;;) {
      const i = texto.indexOf(dica, de);
      if (i < 0) break;
      de = i + dica.length;
      // Recua até a abertura do objeto que contém a dica.
      let ini = texto.lastIndexOf("{", i);
      if (ini < 0) continue;
      let prof = 0;
      let fim = -1;
      for (let j = ini; j < Math.min(texto.length, ini + 2_000_000); j++) {
        const c = texto[j];
        if (c === "{") prof++;
        else if (c === "}") {
          prof--;
          if (prof === 0) {
            fim = j + 1;
            break;
          }
        }
      }
      if (fim < 0) continue;
      const fatia = texto.slice(ini, fim);
      try {
        const o = JSON.parse(fatia);
        objetos.push({ dica, chaves: Object.keys(o).slice(0, 30), dados: o });
      } catch {
        /* fatia não era JSON válido isoladamente */
      }
      if (objetos.length > 60) break;
    }
  }

  const nextData = document.getElementById("__NEXT_DATA__");
  return {
    flight: flight.map((c) => (c.length > 400_000 ? `${c.slice(0, 400_000)}…[truncado]` : c)),
    objetos,
    nextData: nextData ? JSON.parse(nextData.textContent ?? "null") : null,
  };
}

const slug = (u) =>
  u.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);

main().catch((e) => {
  console.error("✗ falhou:", e);
  process.exit(1);
});

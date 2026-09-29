/**
 * A passada de usabilidade: coleta, não julga.
 *
 *     npm run start            # noutro terminal
 *     node tools/usabilidade/passada.mjs
 *
 * Grava capturas em `tools/usabilidade/saida/` e imprime o relatório. A leitura
 * é humana — o que este arquivo faz é tornar a passada **repetível**, para que
 * "melhorou" seja uma comparação e não uma impressão.
 */

import { abrirNavegador } from "./conduzir.mjs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, "saida");
const BASE = process.env.BASE ?? "http://localhost:3000";

const LARGURAS = [
  { nome: "celular", largura: 390, altura: 844 },
  { nome: "tablet", largura: 768, altura: 1024 },
  { nome: "desktop", largura: 1440, altura: 1000 },
];

const PAGINAS = [
  { rota: "/", nome: "home" },
  { rota: "/orcamento", nome: "orcamento" },
  { rota: "/projetos", nome: "projetos" },
  { rota: "/municipios", nome: "municipios" },
  { rota: "/entidade/serra", nome: "entidade-serra" },
  { rota: "/monitor/agua-doce-do-norte", nome: "municipio-vazio" },
];

const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(0)}%` : "—");

async function main() {
  mkdirSync(SAIDA, { recursive: true });
  const nav = await abrirNavegador();
  const achados = [];

  try {
    // ── 1. Percurso de teclado e console, por página, em desktop ──
    console.log("\n  Percurso de teclado — desktop 1440\n  " + "─".repeat(64));
    await nav.redimensionar(1440, 1000);
    for (const p of PAGINAS) {
      await nav.ir(BASE + p.rota);
      const paradas = await nav.percursoTeclado();
      const semAnel = paradas.filter((x) => !x.anel && x.visivel);
      // Só conta alvo que o dedo precisa acertar — link de texto corrido é
      // isento na WCAG 2.2, e contá-lo afoga o número que importa.
      const pequenos = paradas.filter(
        (x) => x.visivel && !x.emLinha && x.alturaPx > 0 && x.alturaPx < 24,
      );
      // Quantas paradas até sair do grafo: conta a corrida de vértices.
      const vertices = paradas.filter((x) => x.papel === "button" && x.tag === "g").length;

      console.log(
        `  ${p.nome.padEnd(18)} ${String(paradas.length).padStart(4)} paradas` +
          `   ${String(vertices).padStart(4)} no grafo` +
          `   ${String(semAnel.length).padStart(3)} sem anel` +
          `   ${String(pequenos.length).padStart(3)} < 24px`,
      );
      if (nav.console.length) {
        console.log(`    console: ${nav.console.length} — ${nav.console[0].texto.slice(0, 70)}`);
      }
      achados.push({ pagina: p.nome, paradas: paradas.length, vertices, semAnel: semAnel.length, pequenos: pequenos.length, console: nav.console.length });
    }

    // ── 2. Três larguras × dois temas, capturando ──
    console.log("\n  Capturas\n  " + "─".repeat(64));
    for (const l of LARGURAS) {
      await nav.redimensionar(l.largura, l.altura);
      for (const tema of ["claro", "escuro"]) {
        await nav.tema(tema);
        for (const p of [PAGINAS[0], PAGINAS[2]]) {
          await nav.ir(BASE + p.rota, { esperarMs: 2600 });
          await nav.tema(tema);
          const arq = join(SAIDA, `${p.nome}-${l.nome}-${tema}.png`);
          await nav.capturar(arq);
        }
      }
      console.log(`  ${l.nome.padEnd(10)} ${l.largura}px — 4 capturas`);
    }

    // ── 3. A navegação sobrevive à largura de celular? ──
    console.log("\n  Navegação por largura\n  " + "─".repeat(64));
    for (const l of LARGURAS) {
      await nav.redimensionar(l.largura, l.altura);
      await nav.ir(BASE + "/", { esperarMs: 2200 });
      const n = await nav.avaliar(`(() => {
        const visivel = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const cab = [...document.querySelectorAll('header a')].filter(visivel);
        const rod = [...document.querySelectorAll('footer a')].filter(visivel);
        return { cabecalho: cab.length, rodape: rod.length,
                 menorAlvo: Math.min(...[...cab, ...rod].map(e => Math.round(e.getBoundingClientRect().height))) };
      })()`);
      console.log(
        `  ${l.nome.padEnd(10)} cabeçalho ${String(n.cabecalho).padStart(2)} links` +
          `   rodapé ${String(n.rodape).padStart(2)}` +
          `   menor alvo ${n.menorAlvo}px${n.menorAlvo < 44 ? "  ← abaixo de 44" : ""}`,
      );
    }

    // ── 4. O grafo, para quem não enxerga ──
    console.log("\n  Árvore de acessibilidade do canvas\n  " + "─".repeat(64));
    await nav.redimensionar(1440, 1000);
    await nav.ir(BASE + "/");
    const aria = await nav.avaliar(`(() => {
      const svg = document.querySelector('svg[role="group"], svg[role="img"]');
      if (!svg) return null;
      return { papel: svg.getAttribute('role'), rotulo: svg.getAttribute('aria-label') };
    })()`);
    console.log(`  ${aria ? `${aria.papel}: "${aria.rotulo}"` : "(sem svg rotulado)"}`);

    console.log(`\n  Capturas em tools/usabilidade/saida/\n`);
  } finally {
    nav.fechar();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Condutor de navegador sobre o protocolo DevTools do Chromium.
 *
 * ## Por que existe
 *
 * A passada de usabilidade precisa de coisas que captura de tela não dá:
 * percorrer o foco com Tab, ler a árvore de acessibilidade, colher erro de
 * console, redimensionar para largura de celular. Sem um MCP de navegador nesta
 * sessão, o caminho é o protocolo — e o Chromium já vem instalado
 * (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
 *
 * Mora em `tools/` pela mesma razão que `tools/anexos-secult/`: é instrumento de
 * aferição, não código do sítio. Não entra no pacote e não sobe para a Vercel.
 *
 * ## O que ele não faz
 *
 * Não julga. Ele coleta — ordem de foco, contagem de paradas, erro de console,
 * rótulo acessível — e grava. A leitura é humana, como a folha de conferência
 * dos segmentos: instrumento que também conclui é instrumento que esconde.
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Abre um Chromium sem cabeça e devolve um punhado de comandos.
 *
 * A porta é sorteada porque mais de uma passada pode rodar ao mesmo tempo, e
 * duas instâncias na mesma porta falham de um jeito que parece defeito do sítio.
 */
export async function abrirNavegador({ largura = 1440, altura = 1000 } = {}) {
  const porta = 9300 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    CHROMIUM,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${porta}`,
      `--window-size=${largura},${altura}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let alvos = null;
  for (let i = 0; i < 80 && !alvos; i++) {
    try {
      alvos = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
    } catch {
      await esperar(250);
    }
  }
  if (!alvos) {
    chrome.kill();
    throw new Error("Chromium não respondeu na porta " + porta);
  }

  const ws = new WebSocket(alvos.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let seq = 0;
  const pendentes = new Map();
  /** Erros e avisos do console, colhidos desde a abertura. */
  const console_ = [];

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      pendentes.get(m.id)(m.result);
      pendentes.delete(m.id);
      return;
    }
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) {
      console_.push({
        tipo: m.params.type,
        texto: m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300),
      });
    }
    if (m.method === "Runtime.exceptionThrown") {
      console_.push({
        tipo: "exception",
        texto: (m.params.exceptionDetails.exception?.description ?? "").slice(0, 300),
      });
    }
  };

  const cmd = (method, params = {}) =>
    new Promise((r) => {
      const id = ++seq;
      pendentes.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("Accessibility.enable");

  /** Avalia uma expressão na página e devolve o valor. */
  const avaliar = async (expressao) => {
    const r = await cmd("Runtime.evaluate", { expression: expressao, returnByValue: true });
    return r.result?.value;
  };

  return {
    console: console_,

    async ir(url, { esperarMs = 3500 } = {}) {
      console_.length = 0;
      await cmd("Page.navigate", { url });
      await esperar(esperarMs);
    },

    async redimensionar(largura, altura) {
      await cmd("Emulation.setDeviceMetricsOverride", {
        width: largura,
        height: altura,
        deviceScaleFactor: 1,
        mobile: largura < 768,
      });
      await esperar(600);
    },

    async tema(qual) {
      // O sítio respeita `data-tema`, e a mídia `prefers-color-scheme` serve o
      // resto. Fixar os dois evita depender de qual caminho o CSS tomou.
      await cmd("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: qual === "escuro" ? "dark" : "light" }],
      });
      await avaliar(`document.documentElement.setAttribute('data-tema', '${qual}')`);
      await esperar(400);
    },

    avaliar,

    /** Clica no primeiro elemento cujo texto contém o trecho dado. */
    async clicarTexto(trecho, seletor = "button, a, [role=tab]") {
      return avaliar(`(() => {
        const alvo = [...document.querySelectorAll(${JSON.stringify(seletor)})]
          .find((e) => e.textContent.includes(${JSON.stringify(trecho)}));
        if (!alvo) return null;
        alvo.click();
        return alvo.textContent.trim().slice(0, 60);
      })()`);
    },

    async teclar(tecla) {
      const mapa = { Tab: 9, Escape: 27, Enter: 13, ArrowRight: 39, ArrowDown: 40 };
      for (const tipo of ["rawKeyDown", "keyUp"]) {
        await cmd("Input.dispatchKeyEvent", {
          type: tipo,
          key: tecla,
          code: tecla,
          windowsVirtualKeyCode: mapa[tecla] ?? 0,
          nativeVirtualKeyCode: mapa[tecla] ?? 0,
        });
      }
      await esperar(45);
    },

    /**
     * Percorre o foco com Tab e devolve a ordem.
     *
     * Registra também se o elemento em foco desenha **algum** anel — `outline`
     * ou `box-shadow`. Foco invisível é o defeito de acessibilidade que mais
     * passa despercebido, porque quem testa com o ponteiro nunca o encontra.
     */
    async percursoTeclado(maximo = 400) {
      await avaliar("document.body.focus(); document.activeElement.blur();");
      const paradas = [];
      for (let i = 0; i < maximo; i++) {
        await this.teclar("Tab");
        const p = await avaliar(`(() => {
          const e = document.activeElement;
          if (!e || e === document.body) return null;
          const s = getComputedStyle(e);
          // Três formas de indicar foco, e é preciso conhecer as três: outline
          // e box-shadow cobrem o caso comum, e um anel desenhado em SVG não
          // aparece em nenhum dos dois — um auditor que só olhe CSS conclui
          // "sem indicação" e erra. Quem desenha o anel se declara com o
          // atributo data-anel-foco.
          const proprio = e.querySelector('[data-anel-foco]');
          const anel = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)
            || (s.boxShadow && s.boxShadow !== 'none')
            || Boolean(proprio);
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName.toLowerCase(),
            papel: e.getAttribute('role') || '',
            rotulo: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 48),
            anel,
            alturaPx: Math.round(r.height),
            visivel: r.width > 0 && r.height > 0,
            // Link de texto corrido não é alvo de toque: a WCAG 2.2 o isenta do
            // tamanho mínimo justamente porque aumentá-lo quebraria o parágrafo.
            emLinha: e.tagName.toLowerCase() === 'a' && Boolean(e.closest('p, dd, li, td')),
          };
        })()`);
        if (!p) break;
        paradas.push(p);
      }
      return paradas;
    },

    async capturar(caminho) {
      const r = await cmd("Page.captureScreenshot", { format: "png" });
      mkdirSync(join(caminho, ".."), { recursive: true });
      writeFileSync(caminho, Buffer.from(r.data, "base64"));
    },

    fechar() {
      ws.close();
      chrome.kill();
    },
  };
}

#!/usr/bin/env node
/**
 * Lê os anexos "RECURSO FINANCEIRO CAPTADO" da SECULT-ES.
 *
 * RODE NA SUA MÁQUINA — `secult.es.gov.br` é bloqueado no ambiente de
 * desenvolvimento do licc.gov.
 *
 *   node extrair-captados.mjs caminho/para/RECURSO_FINANCEIRO_CAPTADO_2025.pdf
 *
 * ## Este anexo tem uma linha por TERMO, não por projeto
 *
 * Um projeto com três patrocinadores ocupa três linhas, e o VALOR HABILITADO
 * só é impresso na primeira — as seguintes trazem apenas empresa, CNPJ, valor
 * captado e data. Foi assim que se mediu: 95 linhas com CNPJ para 67 valores
 * habilitados no anexo de 2025.
 *
 * Isso é uma sorte para o grafo: cada linha é literalmente uma aresta
 * `patrocina` com peso real, que é o que o indicador de concentração do
 * capital precisa e que a lista de habilitados sozinha não dá.
 *
 * ## Como a leitura funciona
 *
 * Posicional, nunca por modelo de linguagem — ver `README.md`. As colunas vêm
 * de bandas de `x` aferidas do próprio documento, e cada registro é ancorado
 * na linha que contém o CNPJ. As células de texto quebram em várias linhas
 * físicas acima e abaixo dessa âncora, e cada fragmento é atribuído à âncora
 * mais próxima em `y`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

/**
 * Bandas de coluna, em pontos do PDF.
 *
 * Aferidas por histograma de `x` sobre o documento inteiro, não estimadas: os
 * fragmentos se agrupam em 20–59, 100–139, 190–199, 250–289, 330–349, 410–439
 * e 480–519. As fronteiras ficam nos vales entre esses picos.
 */
const COLUNAS = [
  { campo: "proponente", de: 0, ate: 90 },
  { campo: "projeto", de: 90, ate: 170 },
  { campo: "valor_autorizado", de: 170, ate: 230 },
  { campo: "patrocinador", de: 230, ate: 320 },
  { campo: "cnpj_patrocinador", de: 320, ate: 390 },
  { campo: "valor_captado", de: 390, ate: 460 },
  { campo: "data_termo", de: 460, ate: Infinity },
];

const CNPJ = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
const DINHEIRO = /R\$\s?([\d.]+,\d{2})/;
const TOLERANCIA_LINHA = 3;
/** Distância vertical máxima entre a espinha do termo e uma linha sua, em pt. */
const ALCANCE_DA_ANCORA = 32;

/**
 * Moldura do documento: título, texto das cotas, cabeçalho de coluna, totais.
 *
 * Precisa ser **cirúrgico**. A primeira versão testava a linha inteira contra
 * uma lista de palavras, e derrubava dado junto: uma linha de termo carrega
 * fragmentos de várias colunas, e razão social como "GRÊMIO RECREATIVO
 * CULTURAL ESPORTIVO" casava com `CULTURAL`, levando o dinheiro embora. A soma
 * caiu de R$ 25.000.000,00 para R$ 22.760.248,92 sem nenhum aviso além do
 * conferidor final.
 *
 * Agora nada que carregue CNPJ ou valor monetário é moldura, e o resto só cai
 * quando a linha **inteira** é texto de moldura.
 */
function ehMoldura(texto) {
  const t = texto.trim();
  // Linha com CNPJ é espinha de termo; linha com dinheiro carrega valor. Nem
  // uma nem outra é moldura, por mais que o texto ao lado se pareça.
  if (CNPJ.test(t)) return false;
  if (/R\$\s?[\d.]+,\d{2}/.test(t) && !/Total Captado|^Valor:|Montante/i.test(t)) return false;

  return (
    /^[IVX]+\s*-\s*\d+%/.test(t) ||
    /^(PROPONENTE|RAZÃO SOCIAL|TÍTULO DO PROJETO|CULTURAL|VALOR|HABILITADO|EMPRESA|PATROCINADORA|CNPJ|VALOR CAPTADO|Termo|Data do Recebimento( do)?)$/i.test(t) ||
    /^(PROPONENTE \/ RAZÃO|Data do Recebimento do)$/i.test(t) ||
    /^(Montante|TERMOS DE COMPROMISSO|Total Captado|Valor:)/i.test(t)
  );
}

export async function lerCaptados(caminho) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(caminho)),
    useSystemFonts: true,
  }).promise;

  const termos = [];
  const textoTodo = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const conteudo = await pagina.getTextContent();
    const itens = conteudo.items
      .filter((i) => typeof i.str === "string" && i.str.trim() !== "")
      .map((i) => ({
        texto: i.str.trim(),
        x: i.transform[4],
        y: pagina.view[3] - i.transform[5],
      }));
    textoTodo.push(...itens.map((i) => i.texto));

    // Agrupa em linhas por y.
    const linhas = [];
    for (const item of [...itens].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const ultima = linhas.at(-1);
      if (ultima && Math.abs(ultima.y - item.y) <= TOLERANCIA_LINHA) ultima.itens.push(item);
      else linhas.push({ y: item.y, itens: [item] });
    }

    // Descarta cabeçalho e preâmbulo **por conteúdo**, não por altura.
    //
    // A primeira tentativa cortou tudo acima da última linha de cabeçalho, e
    // isso derrubou 95 termos para 51: o cabeçalho de coluna se repete a cada
    // seção de cota, então o corte por `y` apagava os dados das seções
    // anteriores. Excluir linha a linha preserva o corpo entre as seções.
    const corpo = linhas.filter((l) => !ehMoldura(l.itens.map((i) => i.texto).join(" ")));

    // Âncoras: a linha que carrega o CNPJ é a espinha de um termo.
    const ancoras = corpo.filter((l) => CNPJ.test(l.itens.map((i) => i.texto).join(" ")));
    if (!ancoras.length) continue;

    // Cada linha vai para a âncora mais próxima. Célula de texto que quebra
    // acima ou abaixo da espinha é reencontrada assim, sem heurística de
    // "linha seguinte" que erraria na virada de página.
    const porAncora = new Map(ancoras.map((a) => [a.y, []]));
    for (const linha of corpo) {
      let melhor = ancoras[0];
      for (const a of ancoras) {
        if (Math.abs(a.y - linha.y) < Math.abs(melhor.y - linha.y)) melhor = a;
      }
      // Um registro ocupa umas cinco linhas físicas de ~9pt. Além disso, a
      // linha pertence a outra coisa — texto de seção, rodapé — e anexá-la ao
      // termo mais próximo só contamina o registro.
      if (Math.abs(melhor.y - linha.y) > ALCANCE_DA_ANCORA) continue;
      porAncora.get(melhor.y).push(linha);
    }

    for (const ancora of ancoras) {
      const registro = Object.fromEntries(COLUNAS.map((c) => [c.campo, []]));
      for (const linha of porAncora.get(ancora.y).sort((a, b) => a.y - b.y)) {
        for (const item of linha.itens) {
          const coluna = COLUNAS.find((c) => item.x >= c.de && item.x < c.ate);
          if (coluna) registro[coluna.campo].push(item.texto);
        }
      }
      const limpo = Object.fromEntries(
        Object.entries(registro).map(([k, v]) => [k, v.join(" ").replace(/\s+/g, " ").trim()]),
      );
      // Cabeçalho repetido em cada página cai fora: não tem CNPJ válido.
      if (!CNPJ.test(limpo.cnpj_patrocinador)) continue;
      termos.push({ ...limpo, pagina: p });
    }
  }

  return { termos, texto: textoTodo.join(" ") };
}

/** `R$ 1.234.567,89` → 1234567.89 */
export function valor(texto) {
  const m = (texto ?? "").match(DINHEIRO);
  if (!m) return undefined;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Agrupa termos em projetos.
 *
 * Termo sem título é um patrocinador a mais do projeto anterior — é assim que
 * o anexo representa aporte múltiplo. O valor habilitado do projeto vem da
 * linha que o imprime; os captados de todos os termos se somam.
 */
export function agruparEmProjetos(termos) {
  const projetos = [];
  for (const t of termos) {
    const captado = valor(t.valor_captado);
    const aporte = {
      patrocinador: t.patrocinador,
      cnpj: (t.cnpj_patrocinador.match(CNPJ) ?? [])[0],
      valor: captado,
      data: t.data_termo,
    };

    const continuacao = !t.projeto && !t.proponente;
    if (continuacao && projetos.length) {
      projetos.at(-1).aportes.push(aporte);
      continue;
    }
    projetos.push({
      projeto: t.projeto,
      proponente: t.proponente,
      valorAutorizado: valor(t.valor_autorizado),
      aportes: [aporte],
    });
  }
  return projetos;
}

const csv = (v) => {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("uso: node extrair-captados.mjs <arquivo.pdf> [--csv saida.csv] [--fonte URL]");
    process.exit(1);
  }
  const fonte = process.argv.includes("--fonte")
    ? process.argv[process.argv.indexOf("--fonte") + 1]
    : "";
  const destino = process.argv.includes("--csv")
    ? process.argv[process.argv.indexOf("--csv") + 1]
    : caminho.replace(/\.pdf$/i, ".csv");

  const { termos, texto } = await lerCaptados(caminho);
  const projetos = agruparEmProjetos(termos);

  const somaCaptado = termos.reduce((s, t) => s + (valor(t.valor_captado) ?? 0), 0);

  // Terceiro conferidor: a LICC autoriza um teto por projeto, então captar
  // acima do autorizado é impossível. Quando aparece, é aporte atribuído ao
  // projeto errado pela regra de continuação — defeito meu, não achado.
  const excedidos = projetos.filter((p) => {
    const captado = p.aportes.reduce((s, a) => s + (a.valor ?? 0), 0);
    return p.valorAutorizado !== undefined && captado > p.valorAutorizado + 0.01;
  });
  const semTitulo = projetos.filter((p) => !p.projeto);
  const semProponente = projetos.filter((p) => !p.proponente);
  const declarados = [...texto.matchAll(/Total Captado:\s*R\$\s?([\d.]+,\d{2})/gi)]
    .map((m) => Number(m[1].replace(/\./g, "").replace(",", ".")));

  console.log(`\n  ${basename(caminho)}`);
  console.log(`    termos de patrocínio ... ${termos.length}`);
  console.log(`    projetos distintos ..... ${projetos.length}`);
  console.log(`    empresas distintas ..... ${new Set(termos.map((t) => (t.cnpj_patrocinador.match(CNPJ) ?? [])[0])).size}`);
  console.log(`    soma dos captados ...... ${somaCaptado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
  if (semTitulo.length) console.log(`    ! ${semTitulo.length} projeto(s) sem título`);
  if (semProponente.length) console.log(`    ! ${semProponente.length} projeto(s) sem proponente`);
  if (excedidos.length) {
    console.log(`    ! ${excedidos.length} projeto(s) com captado acima do autorizado:`);
    for (const p of excedidos.slice(0, 5)) {
      const c = p.aportes.reduce((s, a) => s + (a.valor ?? 0), 0);
      console.log(`      ${(p.projeto || "(sem título)").slice(0, 44)}: ${c.toLocaleString("pt-BR")} > ${p.valorAutorizado.toLocaleString("pt-BR")}`);
    }
  }

  if (declarados.length) {
    // O documento imprime um "Total Captado" por cota e um geral. O maior
    // costuma ser o geral; comparar com ele é o conferidor de ponta a ponta.
    const maior = Math.max(...declarados);
    const soma = declarados.reduce((s, d) => s + d, 0);
    console.log(`    totais impressos ....... ${declarados.map((d) => d.toLocaleString("pt-BR")).join(" · ")}`);
    const bate = Math.abs(somaCaptado - maior) < 0.01 || Math.abs(somaCaptado - soma) < 0.01;
    console.log(`    conferência ............ ${bate ? "✓ a soma extraída bate com o impresso" : "✗ NÃO BATE"}`);
    if (!bate) {
      console.error(
        `\n✗ a soma do que extraí (${somaCaptado.toFixed(2)}) não bate com nenhum total impresso.\n` +
          `  Não vou gravar: transcrição financeira incompleta que se apresenta como\n` +
          `  completa é pior que nenhuma.`,
      );
      process.exit(1);
    }
  } else {
    console.log("    ! o documento não imprime total; sem conferência de ponta a ponta");
  }

  const campos = [
    "projeto", "proponente", "valor_autorizado", "valor_captado",
    "patrocinador", "aportes", "fonte_url", "fonte_pagina",
  ];
  const linhas = [campos.join(",")];
  for (const p of projetos) {
    const captado = p.aportes.reduce((s, a) => s + (a.valor ?? 0), 0);
    linhas.push(
      [
        p.projeto,
        p.proponente,
        p.valorAutorizado ?? "",
        captado || "",
        p.aportes.map((a) => a.patrocinador).join("; "),
        // Um aporte por patrocinador, com CNPJ e valor: é o peso real da
        // aresta `patrocina`, que a lista de habilitados não traz.
        p.aportes.map((a) => `${a.cnpj ?? ""}|${a.patrocinador}|${a.valor ?? ""}`).join("; "),
        fonte,
        "",
      ].map(csv).join(","),
    );
  }
  writeFileSync(destino, linhas.join("\n") + "\n");
  console.log(`\n✓ ${destino}`);
  if (!fonte) {
    console.log("  ! sem --fonte, as linhas entram no grafo como demonstração, não como oficial");
  }
}

if (process.argv[1]?.includes("extrair-captados")) {
  main().catch((e) => { console.error("✗ falhou:", e); process.exit(1); });
}

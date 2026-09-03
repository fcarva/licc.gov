#!/usr/bin/env node
/**
 * Lê a "Lista de Projetos Habilitados" da SECULT-ES.
 *
 * RODE NA SUA MÁQUINA — `secult.es.gov.br` é bloqueado no ambiente de
 * desenvolvimento do licc.gov.
 *
 *   node extrair.mjs caminho/para/listadeprojetoshabilitados.pdf
 *
 * ## O que este anexo tem que o de captados não tem
 *
 * Local de execução, região econômica, situação e — o que mais importa — o
 * **enquadramento para efeito de captação**, que é a cota do art. 18
 * classificada pela própria SECULT. Com ele, a cota do projeto deixa de ser
 * dedução nossa e passa a ser leitura.
 *
 * Não tem segmento cultural. A linguagem do projeto continua desconhecida
 * depois deste anexo, e derivá-la do texto do "objeto" seria inferência
 * apresentada como dado.
 *
 * ## Um documento, cinco exercícios
 *
 * A lista é contínua e cobre de 2022 a 2026, com um cabeçalho de seção nas
 * viradas. O cabeçalho do topo de página repete o do primeiro exercício em
 * todas as 26 páginas — por isso só conta como abertura de seção o que aparece
 * **fora do topo** (`y > TOPO_DA_PAGINA`), ou o da primeira página.
 *
 * ## A âncora, e a coluna que escapa dela
 *
 * Cada projeto é ancorado no **código de processo** (`2025-V9F70`), que é a
 * única coluna com exatamente uma ocorrência por registro e fica na margem
 * esquerda. Um registro é um cacho apertado em torno dessa âncora: medido, os
 * campos curtos ficam a ±5pt dela, e âncoras vizinhas chegam a 8pt de distância
 * nas seções compactas.
 *
 * A exceção é o **objeto**, prosa que derrama por seis linhas e atravessa a
 * fronteira entre registros — a última linha do objeto de um projeto pode ficar
 * mais perto da âncora do projeto seguinte do que da sua. Por isso esta coluna
 * é **descartada inteira**: ela não é necessária para nada que o grafo apura, e
 * tentar reparti-la por proximidade produziria descrição trocada entre
 * projetos, que é pior do que descrição nenhuma.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * Bandas de coluna, em pontos do PDF.
 *
 * Aferidas por histograma de `x` sobre o documento inteiro: os fragmentos se
 * agrupam em 51–58, 80–113, 151–185, 225–287, 359–371, 394–413, 441–448,
 * 474–481, 504–518, 540–565, 615–618, 641–650, 666–669, 691–700 e 726–752. As
 * fronteiras ficam nos vales entre esses picos.
 */
const COLUNAS = [
  { campo: "numero_processo", de: 40, ate: 70 },
  { campo: "projeto", de: 70, ate: 130 },
  { campo: "proponente", de: 130, ate: 200 },
  { campo: "objeto", de: 200, ate: 330 },
  { campo: "municipio", de: 330, ate: 385 },
  { campo: "regiao", de: 385, ate: 425 },
  { campo: "valor_total", de: 425, ate: 460 },
  { campo: "valor_autorizado", de: 460, ate: 495 },
  { campo: "representante", de: 495, ate: 530 },
  { campo: "contato", de: 530, ate: 600 },
  { campo: "inicio_captacao", de: 600, ate: 630 },
  { campo: "fim_captacao", de: 630, ate: 658 },
  { campo: "data_habilitacao", de: 658, ate: 680 },
  { campo: "status", de: 680, ate: 715 },
  // Fechada em 790 de propósito: o número da página fica em x≈810 e, com a
  // banda aberta, entrava na coluna. O efeito era enquadramento "18", "24",
  // "26" nos exercícios antigos — que o conferidor acusou como classe
  // desconhecida, quando era paginação.
  { campo: "enquadramento", de: 715, ate: 790 },
];

/** Prosa longa, descartada — ver o cabeçalho deste arquivo. */
const DESCARTADAS = new Set(["objeto"]);

/**
 * Fragmentos do cabeçalho de coluna, que se repete no topo de cada página em
 * três sublinhas de `y`.
 *
 * Precisam sair **no nível da linha**, senão grudam no primeiro registro da
 * página: o cabeçalho fica a ~20pt da primeira âncora, e a proximidade o
 * entrega a ela. Foi o que aconteceu, e o efeito era um projeto chamado
 * "88 Título do Projeto Projeto Cultural Tecer Folias - Ano II", com o
 * proponente carregando "PROJETOS HABILITADOS - ANO 2026" pela frente.
 *
 * Exigir **dois** fragmentos exatos na mesma linha é o que torna a regra
 * segura: "Execução" e "captação" aparecem dentro de valor real ("Execução
 * finalizada", "Prazo de captação"), mas nunca sozinhos e nunca dois juntos.
 */
const CABECALHO = new Set([
  "Processo", "Título do Projeto", "Proponente", "Objeto", "Local de", "Execução",
  "Região Economica - ES", "Valor total", "Valor financiado", "via LICC",
  "Representante", "legal", "Contato do proponente", "Data do início", "da captação",
  "Data final da", "captação", "Data da", "habilitação", "Situação",
  "Enquadramento para efeito de", "Quantidade:",
]);

const ehCabecalho = (linha) =>
  linha.itens.filter((i) => CABECALHO.has(i.texto)).length >= 2;

const PROCESSO = /\b(20\d{2})-[A-Z0-9]{5}\b/;
const DINHEIRO = /R\$\s?([\d.]+,\d{2})/;
const TOLERANCIA_LINHA = 3;
/** Acima disto, o cabeçalho é título repetido de página, não abertura de seção. */
const TOPO_DA_PAGINA = 70;

/**
 * Enquadramentos publicados, e a regra do art. 18 que cada um nomeia.
 *
 * O casamento é por trecho inicial porque o texto quebra em várias linhas e a
 * junção pode variar no espaçamento.
 */
const ENQUADRAMENTOS = [
  { casa: /capta[çc][ãa]o geral/i, regra: "cota-demais" },
  { casa: /eventos calendarizados/i, regra: "cota-pautados" },
  { casa: /projetos do interior/i, regra: "cota-fora-rmgv" },
  { casa: /projetos plurianuais/i, regra: "cota-continuados" },
];

/** Situações publicadas, e o estado correspondente na ontologia. */
const SITUACOES = [
  { casa: /em capta[çc][ãa]o/i, status: "captando" },
  { casa: /em execu[çc][ãa]o/i, status: "em_execucao" },
  { casa: /execu[çc][ãa]o finalizada/i, status: "concluido" },
  { casa: /prazo de capta[çc][ãa]o expirado/i, status: "captacao_expirada" },
];

const colunaDe = (x) => COLUNAS.find((c) => x >= c.de && x < c.ate)?.campo;

export async function lerHabilitadosPdf(caminho) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const pdfjs = await import(require.resolve("pdfjs-dist/legacy/build/pdf.mjs"));

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(caminho)),
    useSystemFonts: true,
  }).promise;

  /** @type {Map<string, { ano: string, declarado?: number, registros: object[] }>} */
  const secoes = new Map();
  let anoAtual = null;

  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const itens = (await pagina.getTextContent()).items
      .filter((i) => typeof i.str === "string" && i.str.trim() !== "")
      .map((i) => ({
        texto: i.str.trim(),
        x: i.transform[4],
        y: pagina.view[3] - i.transform[5],
      }));

    const linhas = [];
    for (const item of [...itens].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const ultima = linhas.at(-1);
      if (ultima && Math.abs(ultima.y - item.y) <= TOLERANCIA_LINHA) ultima.itens.push(item);
      else linhas.push({ y: item.y, itens: [item] });
    }

    // Uma única passada em ordem de `y`, e é isto que torna a leitura correta.
    //
    // A virada de exercício acontece **no meio da página**: em p6 o cabeçalho
    // de 2025 aparece em y=504, então os registros acima dele são de 2026 e os
    // abaixo, de 2025. Enquanto os cabeçalhos eram lidos numa passada e as
    // âncoras noutra, a página inteira caía na seção que fechasse por último —
    // 2026 saía com 75 de 88 e 2024 com 136 de 123. A contagem total batia
    // (469), o que torna o defeito invisível para quem só soma.
    const ancoras = [];
    for (const linha of linhas) {
      const texto = linha.itens.map((i) => i.texto).join(" ");
      const cab = texto.match(/PROJETOS HABILITADOS\s*-\s*ANO\s*(\d{4})/i);
      // Só abre seção o cabeçalho fora do topo — o do topo repete o primeiro
      // exercício em toda página. A exceção é a página 1, onde ele é a
      // abertura de verdade.
      if (cab) {
        // Abre seção só fora do topo; no topo é título repetido. Mas em ambos
        // os casos a linha é moldura e **nunca** entra no saco de fragmentos.
        if (!(linha.y <= TOPO_DA_PAGINA && p > 1)) {
          anoAtual = cab[1];
          if (!secoes.has(anoAtual)) {
            const qtd = texto.match(/Quantidade:\s*(\d+)/i) ?? texto.match(/(\d+)\s+PROJETOS/i);
            secoes.set(anoAtual, {
              ano: anoAtual,
              declarado: qtd ? Number(qtd[1]) : undefined,
              registros: [],
            });
          }
        }
        continue;
      }
      if (ehCabecalho(linha)) continue;
      if (linha.itens.some((i) => colunaDe(i.x) === "numero_processo" && PROCESSO.test(i.texto))) {
        ancoras.push({ ...linha, ano: anoAtual });
      }
    }
    if (!ancoras.length) continue;

    // Cada fragmento vai para a âncora mais próxima. Campos curtos ficam a
    // ±5pt da sua, e âncoras vizinhas a 8pt ou mais, então a proximidade
    // resolve — desde que o objeto, que atravessa registros, fique de fora.
    const saco = new Map(ancoras.map((a) => [a.y, {}]));
    for (const linha of linhas) {
      const texto = linha.itens.map((i) => i.texto).join(" ");
      if (ehCabecalho(linha) || /PROJETOS HABILITADOS\s*-\s*ANO/i.test(texto)) continue;
      let melhor = ancoras[0];
      for (const a of ancoras) {
        if (Math.abs(a.y - linha.y) < Math.abs(melhor.y - linha.y)) melhor = a;
      }
      for (const item of linha.itens) {
        const campo = colunaDe(item.x);
        if (!campo || DESCARTADAS.has(campo)) continue;
        (saco.get(melhor.y)[campo] ??= []).push(item.texto);
      }
    }

    for (const ancora of ancoras) {
      const bruto = saco.get(ancora.y);
      const r = Object.fromEntries(
        Object.entries(bruto).map(([k, v]) => [k, v.join(" ").replace(/\s+/g, " ").trim()]),
      );
      const proc = (r.numero_processo ?? "").match(PROCESSO);
      if (!proc) continue;
      // O ano da seção em que a âncora caiu, não o do fim da página. E não o
      // prefixo do processo: ele é o ano de inscrição, e difere do exercício
      // com frequência — um processo `2024-` aparece habilitado em 2025.
      const secao = secoes.get(ancora.ano);
      if (!secao) continue;
      // Uma linha repetida na fonte é o mesmo projeto, não dois. Em 2024 o
      // processo 2023-DDSJJ sai duas vezes — "Festa Do Imigrante De Santa
      // Teresa" e "FESTA DO IMIGRANTE DE SANTA TERESA" —, e era só isso que
      // separava a extração (124) da quantidade declarada (123).
      if (secao.registros.some((x) => x.numero_processo === proc[0])) continue;
      secao.registros.push({ ...r, numero_processo: proc[0], pagina: p });
    }
  }

  return [...secoes.values()];
}

/** `R$ 1.234.567,89` → 1234567.89 */
export function valor(texto) {
  const m = (texto ?? "").match(DINHEIRO);
  if (!m) return undefined;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * `Cariacica, Viana, Serra, Vila Velha e Vitória` → lista de nomes.
 *
 * "Várias Regiões" não nomeia município nenhum: devolve lista vazia, e o campo
 * fica ausente em vez de virar um município inventado.
 */
export function municipios(texto) {
  const t = (texto ?? "").trim();
  if (!t || /v[áa]rias regi[õo]es/i.test(t)) return [];
  return t
    .split(/,| e /i)
    .map((m) => m.trim())
    .filter((m) => m && !/^regi[õo]es?$/i.test(m));
}

const csv = (v) => {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("uso: node extrair.mjs <arquivo.pdf> [--dir saida/] [--fonte URL]");
    process.exit(1);
  }
  const fonte = process.argv.includes("--fonte")
    ? process.argv[process.argv.indexOf("--fonte") + 1]
    : "";
  const dir = process.argv.includes("--dir")
    ? process.argv[process.argv.indexOf("--dir") + 1]
    : dirname(caminho);

  const secoes = await lerHabilitadosPdf(caminho);
  console.log(`\n  ${basename(caminho)} — ${secoes.length} exercício(s)\n`);

  let algumGravado = false;
  for (const s of secoes.sort((a, b) => Number(b.ano) - Number(a.ano))) {
    const n = s.registros.length;
    const problemas = [];

    // 1. contagem declarada
    if (s.declarado === undefined) problemas.push("a seção não declara quantidade");
    else if (s.declarado !== n) problemas.push(`declarado ${s.declarado}, extraído ${n}`);

    // 2. formato de valor — proporcional, e a proporção é o argumento.
    //
    // Banda de coluna torta falha **em bloco**: se o recorte de `x` estiver
    // errado, nenhum valor sai legível. Uma linha ilegível em 113 não é banda
    // torta, é a fonte. Em 2023 o projeto "Origraffes" traz `500.000.00` —
    // sem `R$` e com ponto no lugar da vírgula decimal, conferido na geometria
    // crua. Descartar 113 registros bons por causa dele seria deixar de
    // publicar o que a SECULT publicou; o certo é o valor daquele projeto
    // ficar **ausente**, que é o que o modelo já sabe representar.
    const semValor = s.registros.filter((r) => valor(r.valor_autorizado) === undefined);
    if (semValor.length > n * 0.1) {
      problemas.push(`${semValor.length} de ${n} sem valor LICC legível — banda de coluna suspeita`);
    }

    // 3. enquadramento dentro do conjunto conhecido
    const enqDesconhecido = s.registros.filter(
      (r) => r.enquadramento && !ENQUADRAMENTOS.some((e) => e.casa.test(r.enquadramento)),
    );
    if (enqDesconhecido.length) {
      problemas.push(`${enqDesconhecido.length} com enquadramento fora das 4 cotas conhecidas`);
    }

    // Divergência da FONTE, não da leitura — e por isso não bloqueia.
    //
    // A distinção importa. Os três conferidores acima provam que **eu li
    // certo**: contagem contra a declarada, valor legível, enquadramento
    // dentro das quatro classes. Falha neles significa banda de coluna torta, e
    // gravar seria publicar leitura quebrada.
    //
    // Este aqui descreve o documento. Em 2025 a "Biblioteca Itinerante Vila
    // Quilombo" traz total R$ 479.832,00 e LICC R$ 479.932,00 — cem reais a
    // mais, um dígito trocado, impresso assim no anexo e conferido na geometria
    // crua. Descartar 74 registros bons por um erro de digitação da SECULT
    // seria deixar de publicar o que ela publicou; engolir em silêncio seria
    // pior. Então relata-se, e o valor vai para o CSV como está na fonte.
    const divergencias = s.registros
      .filter((r) => {
        const licc = valor(r.valor_autorizado);
        const total = valor(r.valor_total);
        return licc !== undefined && total !== undefined && licc > total + 0.01;
      })
      .map((r) => {
        const d = valor(r.valor_autorizado) - valor(r.valor_total);
        return `${(r.projeto || r.numero_processo).slice(0, 44)}: LICC excede o total em ${d.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
      });

    const soma = s.registros.reduce((acc, r) => acc + (valor(r.valor_autorizado) ?? 0), 0);
    const comMunicipio = s.registros.filter((r) => municipios(r.municipio).length).length;
    const comEnq = s.registros.filter((r) => r.enquadramento).length;

    console.log(`  ANO ${s.ano}`);
    console.log(`    projetos ............... ${n}${s.declarado !== undefined ? ` (declarado ${s.declarado})` : ""}`);
    console.log(`    soma do valor LICC ..... ${soma.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
    console.log(`    com município .......... ${comMunicipio} (${Math.round((comMunicipio / n) * 100)}%)`);
    console.log(`    com enquadramento ...... ${comEnq} (${Math.round((comEnq / n) * 100)}%)`);

    for (const d of divergencias) console.log(`    ! a fonte diverge de si mesma — ${d}`);
    for (const r of semValor.slice(0, 5)) {
      console.log(
        `    ! valor ilegível na fonte, fica ausente — ${(r.projeto || r.numero_processo).slice(0, 40)}: "${r.valor_autorizado ?? ""}"`,
      );
    }

    if (problemas.length) {
      for (const p of problemas) console.log(`    ✗ ${p}`);
      console.log(`    → não vou gravar esta seção.\n`);
      continue;
    }

    const campos = [
      "numero_processo", "projeto", "proponente", "municipio", "valor_autorizado",
      "valor_total", "status", "enquadramento", "fonte_url", "fonte_pagina",
    ];
    const linhas = [campos.join(",")];
    for (const r of s.registros) {
      const enq = ENQUADRAMENTOS.find((e) => e.casa.test(r.enquadramento ?? ""));
      const sit = SITUACOES.find((x) => x.casa.test(r.status ?? ""));
      linhas.push(
        [
          r.numero_processo,
          r.projeto,
          r.proponente,
          municipios(r.municipio).join("; "),
          valor(r.valor_autorizado) ?? "",
          valor(r.valor_total) ?? "",
          sit?.status ?? "",
          enq?.regra ?? "",
          fonte,
          r.pagina,
        ].map(csv).join(","),
      );
    }
    const destino = join(dir, `habilitados-${s.ano}.csv`);
    writeFileSync(destino, linhas.join("\n") + "\n");
    console.log(`    ✓ ${destino}\n`);
    algumGravado = true;
  }

  if (!algumGravado) process.exit(1);
  if (!fonte) {
    console.log("  ! sem --fonte, as linhas entram no grafo como demonstração, não como oficial");
  }
}

if (process.argv[1]?.includes("extrair.mjs")) main();

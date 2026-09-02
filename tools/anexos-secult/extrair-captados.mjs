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
 * Um projeto com três patrocinadores ocupa três linhas. Isso é uma sorte para
 * o grafo: cada linha é literalmente uma aresta `patrocina` com peso real, que
 * é o que o indicador de concentração do capital precisa e que a lista de
 * habilitados sozinha não dá.
 *
 * ## O bloco de identidade é CENTRALIZADO sobre o grupo de termos
 *
 * Esta é a regra que custou caro. Proponente, título e valor habilitado são
 * impressos uma vez por projeto, **verticalmente centrados no intervalo das
 * linhas de termo daquele projeto** — não na primeira delas.
 *
 * Num grupo de três termos o rótulo cai sobre o do meio, e o primeiro termo
 * fica ACIMA do próprio rótulo:
 *
 *     y=235  GRÊMIO…BOA VISTA │ CARNAVAL CAPIXABA │ R$ 492.000,00 │ Realmar
 *     y=270                                                      │ Perfil Alumínio
 *     y=298  LEONARDO CAETANO │ 207ª FESTA DIVINO │ R$ 358.109,86 │ Dist. Pomar
 *     y=325                                                      │ L&A Alimentos
 *
 * Num grupo par o rótulo cai no vão entre as duas linhas centrais — medido no
 * 24º Festival de Teatro de Guaçuí, termos em y=490 e y=532, centro 511,
 * rótulo impresso em 508.
 *
 * Duas leituras ingênuas erram aqui, e as duas foram tentadas:
 *
 * - **"âncora mais próxima acima"** dava o termo da Perfil Alumínio à escola de
 *   samba, publicando que ela captou R$ 611 mil contra R$ 492 mil habilitados.
 * - **"linha sem título é continuação da anterior"** erra igual, pela mesma
 *   razão: a linha sem título tanto pode continuar o projeto acima quanto
 *   abrir o de baixo.
 *
 * A leitura correta é uma **partição contígua** dos termos entre os rótulos
 * que minimiza a distância de cada rótulo ao centro do seu grupo. Sobre o
 * anexo de 2025 o resíduo médio fica em ~1pt para 64 projetos: um modelo
 * errado não acerta o centro por acaso 64 vezes.
 *
 * ## Como a leitura funciona
 *
 * Posicional, nunca por modelo de linguagem — ver `README.md`. As colunas vêm
 * de bandas de `x` aferidas do próprio documento. Há duas famílias de espinha,
 * e cada uma recolhe só as suas colunas:
 *
 * - **espinha de termo** — a linha que carrega o CNPJ;
 * - **espinha de projeto** — a linha que carrega o valor habilitado.
 *
 * Separá-las importa: as de projeto ficam ~60pt umas das outras e as de termo
 * ~27pt, então recolher o título pela espinha de termo mais próxima despedaça
 * o nome entre projetos vizinhos.
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

/** Colunas que descrevem o projeto, recolhidas pela espinha de projeto. */
const COLUNAS_PROJETO = ["proponente", "projeto", "valor_autorizado"];
/** Colunas que descrevem o termo, recolhidas pela espinha de termo. */
const COLUNAS_TERMO = ["patrocinador", "cnpj_patrocinador", "valor_captado", "data_termo"];

const CNPJ = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
const DINHEIRO = /R\$\s?([\d.]+,\d{2})/;
const TOLERANCIA_LINHA = 3;
/** Distância vertical máxima entre a espinha e uma linha sua, em pt. */
const ALCANCE_DA_ANCORA = 32;
/**
 * Resíduo de centralização que ainda se aceita, em pt.
 *
 * Uma linha do anexo tem ~27pt. Medido em 2025: média 1,2pt e pior caso 5,8pt.
 * Acima de meia linha o desenho da página deixou de ser o que este leitor
 * supõe, e a atribuição de termo a projeto vira palpite.
 */
const RESIDUO_MAXIMO = 14;

/**
 * Cabeçalho da tabela, aferido: repete-se a cada seção de cota, em três
 * sublinhas de `y` com fragmentos em `x` fixos.
 *
 * Precisa sair **no nível do fragmento**, porque a regra de moldura opera na
 * linha inteira e o cabeçalho sobrevivia a ela: nenhuma das sublinhas casa
 * inteira com um nome de coluna. O efeito era um projeto intitulado "TÍTULO DO
 * PROJETO" e outro chamado "CULTURAL Oficinas de Formação…" — o cabeçalho
 * grudado no rótulo do projeto vizinho, a 10pt de distância.
 */
const CABECALHO = [
  ["PROPONENTE / RAZÃO", "proponente"],
  ["SOCIAL", "proponente"],
  ["TÍTULO DO PROJETO", "projeto"],
  ["CULTURAL", "projeto"],
  ["VALOR", "valor_autorizado"],
  ["HABILITADO", "valor_autorizado"],
  ["EMPRESA", "patrocinador"],
  ["PATROCINADORA", "patrocinador"],
  ["CNPJ", "cnpj_patrocinador"],
  ["VALOR CAPTADO", "valor_captado"],
  ["Data do Recebimento do", "data_termo"],
  ["Termo", "data_termo"],
];

const colunaDe = (x) => COLUNAS.find((c) => x >= c.de && x < c.ate)?.campo;

/**
 * Linha de cabeçalho: dois ou mais fragmentos que casam **exatamente** com um
 * nome de coluna **na coluna certa**.
 *
 * Exigir dois é o que torna a regra segura. "SOCIAL" e "CULTURAL" aparecem
 * dentro de razão social real ("SOCIAL ESCOLA DE", "GRÊMIO RECREATIVO CULTURAL
 * ESPORTIVO"), mas nunca sozinhos e nunca dois na mesma linha.
 */
function ehCabecalho(linha) {
  let casados = 0;
  for (const item of linha.itens) {
    const coluna = colunaDe(item.x);
    if (CABECALHO.some(([texto, col]) => col === coluna && item.texto === texto)) casados++;
    if (casados >= 2) return true;
  }
  return false;
}

/**
 * Moldura do documento: título, texto das cotas, totais, saldo.
 */
function ehMoldura(texto) {
  const t = texto.trim();

  // A ORDEM aqui é o conserto de um defeito, não estilo.
  //
  // O cabeçalho de cota carrega o teto da própria cota, e o carrega na banda
  // do valor habilitado:
  //
  //   x=21 "IV - 50% serão destinados aos demais projetos."  x=175 "Valor: R$ 12.500.000,00"
  //
  // Enquanto o guarda "linha com dinheiro nunca é moldura" vinha primeiro, ele
  // devolvia `false` antes de a regra de seção ser testada, e a linha virava
  // espinha de projeto: um projeto fantasma com R$ 12.500.000,00 de teto e sem
  // título, que roubava um termo do projeto vizinho e descentrava a partição.
  //
  // Estas duas formas são inequívocas — nenhum proponente se chama
  // "IV - 50%" nem "Total Captado" — então decidem antes de qualquer outra
  // coisa, dinheiro na linha ou não.
  if (/^[IVX]+\s*-\s*\d+%/.test(t)) return true;
  if (/^(Montante|TERMOS DE COMPROMISSO|Total (Captado|Geral)|Saldo dispon|Valor:)/i.test(t)) {
    return true;
  }

  // Passada essa porta, o resto precisa ser **cirúrgico**. A primeira versão
  // testava a linha inteira contra uma lista de palavras, e derrubava dado
  // junto: uma linha de termo carrega fragmentos de várias colunas, e razão
  // social como "GRÊMIO RECREATIVO CULTURAL ESPORTIVO" casava com `CULTURAL`,
  // levando o dinheiro embora. A soma caiu de R$ 25.000.000,00 para
  // R$ 22.760.248,92 sem nenhum aviso além do conferidor final.
  if (CNPJ.test(t)) return false;
  if (/R\$\s?[\d.]+,\d{2}/.test(t)) return false;

  return /^(PROPONENTE|RAZÃO SOCIAL|TÍTULO DO PROJETO|CULTURAL|VALOR|HABILITADO|EMPRESA|PATROCINADORA|CNPJ|VALOR CAPTADO|Termo|Data do Recebimento( do)?|PROPONENTE \/ RAZÃO|Data do Recebimento do)$/i.test(t);
}

/**
 * Arredonda para centavo.
 *
 * Somar reais em ponto flutuante produz `249369.97999999998`, e gravar isso
 * num artefato de transparência é publicar uma precisão que o documento não
 * tem. O anexo é impresso em centavos; a soma volta a centavos.
 */
const centavos = (n) => Math.round(n * 100) / 100;

/** `R$ 1.234.567,89` → 1234567.89 */
export function valor(texto) {
  const m = (texto ?? "").match(DINHEIRO);
  if (!m) return undefined;
  const n = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Recolhe fragmentos das colunas pedidas para a espinha mais próxima em `y`.
 *
 * Célula de texto que quebra acima ou abaixo da espinha é reencontrada assim,
 * sem heurística de "linha seguinte" que erraria na virada de página.
 */
function recolher(corpo, espinhas, campos) {
  const saco = new Map(espinhas.map((e) => [e.y, Object.fromEntries(campos.map((c) => [c, []]))]));
  for (const linha of corpo) {
    let melhor = null;
    for (const e of espinhas) {
      if (!melhor || Math.abs(e.y - linha.y) < Math.abs(melhor.y - linha.y)) melhor = e;
    }
    // Além do alcance, a linha pertence a outra coisa — texto de seção,
    // rodapé — e anexá-la à espinha mais próxima só contamina o registro.
    if (!melhor || Math.abs(melhor.y - linha.y) > ALCANCE_DA_ANCORA) continue;
    for (const item of linha.itens) {
      const campo = colunaDe(item.x);
      if (campo && campos.includes(campo)) saco.get(melhor.y)[campo].push(item.texto);
    }
  }
  const texto = (v) => v.join(" ").replace(/\s+/g, " ").trim();
  return espinhas.map((e) =>
    Object.fromEntries(Object.entries(saco.get(e.y)).map(([k, v]) => [k, texto(v)])),
  );
}

export async function lerCaptados(caminho) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const pdfjs = await import(require.resolve("pdfjs-dist/legacy/build/pdf.mjs"));

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(caminho)),
    useSystemFonts: true,
  }).promise;

  const termos = [];
  const projetos = [];
  const textoTodo = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const itens = (await pagina.getTextContent()).items
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
    const corpo = linhas.filter(
      (l) => !ehCabecalho(l) && !ehMoldura(l.itens.map((i) => i.texto).join(" ")),
    );

    const naColuna = (l, campo) =>
      l.itens.filter((i) => colunaDe(i.x) === campo).map((i) => i.texto).join(" ");

    const espinhasTermo = corpo.filter((l) => CNPJ.test(naColuna(l, "cnpj_patrocinador")));
    const espinhasProjeto = corpo.filter((l) => DINHEIRO.test(naColuna(l, "valor_autorizado")));

    for (const [i, r] of recolher(corpo, espinhasTermo, COLUNAS_TERMO).entries()) {
      if (!CNPJ.test(r.cnpj_patrocinador)) continue;
      termos.push({
        ...r,
        cnpj: r.cnpj_patrocinador.match(CNPJ)[0],
        captado: valor(r.valor_captado),
        pagina: p,
        y: espinhasTermo[i].y,
      });
    }
    for (const [i, r] of recolher(corpo, espinhasProjeto, COLUNAS_PROJETO).entries()) {
      projetos.push({
        projeto: r.projeto,
        proponente: r.proponente,
        valorAutorizado: valor(r.valor_autorizado),
        pagina: p,
        y: espinhasProjeto[i].y,
      });
    }
  }

  return { termos, projetos, texto: textoTodo.join(" ") };
}

/**
 * Distribui os termos entre os projetos por partição contígua.
 *
 * O objetivo é geométrico e vem direto do desenho da página: o rótulo do
 * projeto é impresso no centro vertical do seu grupo de termos. A partição
 * escolhida é a que minimiza a soma das distâncias |y_rótulo − centro(grupo)|.
 *
 * Programação dinâmica sobre a fronteira entre grupos consecutivos:
 * `dp[j][e]` é o menor custo de cobrir os termos `0..e` com os projetos
 * `0..j`. Com ~64 projetos e ~95 termos por documento, o custo é irrisório.
 *
 * Grupo que cruzasse a virada de página seria uma leitura impossível — o
 * rótulo não centraliza através do corte —, então cruzar página é penalizado
 * em vez de proibido: proibir tornaria o problema insolúvel e esconderia o
 * diagnóstico, enquanto penalizar deixa o resíduo denunciar.
 */
export function agruparEmProjetos(termos, projetos) {
  const N = projetos.length;
  const M = termos.length;
  if (!N || !M) return [];

  const PENA_DE_PAGINA = 1e4;
  const centro = (s, e) => (termos[s].y + termos[e].y) / 2;
  const residuo = (j, s, e) => Math.abs(projetos[j].y - centro(s, e));
  const custo = (j, s, e) =>
    residuo(j, s, e) +
    (termos[s].pagina === projetos[j].pagina && termos[e].pagina === projetos[j].pagina
      ? 0
      : PENA_DE_PAGINA);

  const dp = Array.from({ length: N }, () => new Array(M).fill(Infinity));
  const veioDe = Array.from({ length: N }, () => new Array(M).fill(-1));
  for (let e = 0; e < M; e++) dp[0][e] = custo(0, 0, e);
  for (let j = 1; j < N; j++) {
    for (let e = j; e < M; e++) {
      for (let s = j; s <= e; s++) {
        if (dp[j - 1][s - 1] === Infinity) continue;
        const c = dp[j - 1][s - 1] + custo(j, s, e);
        if (c < dp[j][e]) {
          dp[j][e] = c;
          veioDe[j][e] = s - 1;
        }
      }
    }
  }

  const grupos = new Array(N);
  let e = M - 1;
  for (let j = N - 1; j >= 0; j--) {
    const s = j === 0 ? 0 : veioDe[j][e] + 1;
    grupos[j] = { s, e };
    e = s - 1;
  }

  return projetos.map((pr, j) => {
    const { s, e } = grupos[j];
    return {
      projeto: pr.projeto,
      proponente: pr.proponente,
      valorAutorizado: pr.valorAutorizado,
      pagina: pr.pagina,
      residuo: residuo(j, s, e),
      cruzaPagina: termos[s].pagina !== pr.pagina || termos[e].pagina !== pr.pagina,
      aportes: termos.slice(s, e + 1).map((t) => ({
        patrocinador: t.patrocinador,
        cnpj: t.cnpj,
        valor: t.captado,
        data: t.data_termo,
      })),
    };
  });
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

  const { termos, projetos: rotulos, texto } = await lerCaptados(caminho);
  const projetos = agruparEmProjetos(termos, rotulos);

  const somaCaptado = centavos(termos.reduce((s, t) => s + (t.captado ?? 0), 0));
  const captadoDe = (p) => centavos(p.aportes.reduce((s, a) => s + (a.valor ?? 0), 0));

  // Conferidor: a LICC autoriza um teto por projeto, então captar acima do
  // autorizado é impossível. Quando aparece, é aporte atribuído ao projeto
  // errado — defeito meu, não achado sobre o proponente.
  const excedidos = projetos.filter(
    (p) => p.valorAutorizado !== undefined && captadoDe(p) > p.valorAutorizado + 0.01,
  );
  // Conferidor: o rótulo tem de cair perto do centro do grupo que lhe coube.
  const descentrados = projetos.filter((p) => p.residuo > RESIDUO_MAXIMO);
  const semTitulo = projetos.filter((p) => !p.projeto);
  const semProponente = projetos.filter((p) => !p.proponente);
  const declarados = [...texto.matchAll(/Total Captado:\s*R\$\s?([\d.]+,\d{2})/gi)]
    .map((m) => Number(m[1].replace(/\./g, "").replace(",", ".")));

  const residuoMedio = projetos.reduce((s, p) => s + p.residuo, 0) / projetos.length;
  const piorResiduo = Math.max(...projetos.map((p) => p.residuo));

  console.log(`\n  ${basename(caminho)}`);
  console.log(`    termos de patrocínio ... ${termos.length}`);
  console.log(`    projetos distintos ..... ${projetos.length}`);
  console.log(`    empresas distintas ..... ${new Set(termos.map((t) => t.cnpj)).size}`);
  console.log(`    soma dos captados ...... ${somaCaptado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
  console.log(`    soma dos autorizados ... ${centavos(projetos.reduce((s, p) => s + (p.valorAutorizado ?? 0), 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
  console.log(`    centralização .......... resíduo médio ${residuoMedio.toFixed(1)}pt, pior ${piorResiduo.toFixed(1)}pt`);
  if (semTitulo.length) console.log(`    ! ${semTitulo.length} projeto(s) sem título`);
  if (semProponente.length) console.log(`    ! ${semProponente.length} projeto(s) sem proponente`);
  for (const p of descentrados.slice(0, 5)) {
    console.log(`    ! rótulo a ${p.residuo.toFixed(0)}pt do centro do grupo: ${(p.projeto || "(sem título)").slice(0, 44)}`);
  }
  if (excedidos.length) {
    console.log(`    ! ${excedidos.length} projeto(s) com captado acima do autorizado:`);
    for (const p of excedidos.slice(0, 5)) {
      console.log(`      ${(p.projeto || "(sem título)").slice(0, 44)}: ${captadoDe(p).toLocaleString("pt-BR")} > ${p.valorAutorizado.toLocaleString("pt-BR")}`);
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

  if (excedidos.length || descentrados.length) {
    console.error(
      `\n✗ não vou gravar: a atribuição de termo a projeto não fecha.\n` +
        `  Afirmar que uma entidade nomeada captou acima do teto, ou pendurar\n` +
        `  nela o aporte de outra, é exatamente o dano que este projeto existe\n` +
        `  para não causar.`,
    );
    process.exit(1);
  }

  const campos = [
    "projeto", "proponente", "valor_autorizado", "valor_captado",
    "patrocinador", "aportes", "fonte_url", "fonte_pagina",
  ];
  const linhas = [campos.join(",")];
  for (const p of projetos) {
    linhas.push(
      [
        p.projeto,
        p.proponente,
        p.valorAutorizado ?? "",
        captadoDe(p) || "",
        p.aportes.map((a) => a.patrocinador).join("; "),
        // Um aporte por patrocinador, com CNPJ e valor: é o peso real da
        // aresta `patrocina`, que a lista de habilitados não traz.
        p.aportes.map((a) => `${a.cnpj ?? ""}|${a.patrocinador}|${a.valor ?? ""}`).join("; "),
        fonte,
        p.pagina,
      ].map(csv).join(","),
    );
  }
  writeFileSync(destino, linhas.join("\n") + "\n");
  console.log(`\n✓ ${destino}`);
  if (!fonte) {
    console.log("  ! sem --fonte, as linhas entram no grafo como demonstração, não como oficial");
  }
}

if (process.argv[1]?.includes("extrair-captados")) main();

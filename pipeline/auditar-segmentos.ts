/**
 * Auditoria da classificação por linguagem cultural.
 *
 * ## O que esta auditoria pode e o que não pode dizer
 *
 * A linguagem é o único campo do grafo **inteiramente derivado**: nenhum anexo
 * da SECULT a publica, então `classificarTitulo()` a infere do título por regex
 * ordenadas. E a única evidência é o título — projeto não tem `objeto` nem
 * `descricao`, porque a extração dos habilitados descarta a coluna de objeto de
 * propósito (a prosa atravessa fronteira de registro). Não há segundo campo para
 * cruzar, logo **não há gabarito automático**.
 *
 * Daí a auditoria se partir em duas, e a distinção não é formalidade:
 *
 * 1. **Estrutural** — propriedades das *regras*, prováveis sem ninguém julgar
 *    nada: conflito de ordem, regra morta, casamento frágil, dependência de
 *    acento, determinismo. Roda sobre todo o corpus de títulos disponível.
 * 2. **Concordância** — duas derivações independentes classificando os mesmos
 *    títulos. Mede desacordo, **não acerto**.
 *
 * ## Por que o número se chama `concordancia`
 *
 * Porque é o que ele é. O conferente aqui é outra inferência, não a verdade:
 * onde as duas discordam uma está errada, e isso é uma lista de triagem útil;
 * onde concordam **podem estar erradas juntas**, porque duas inferências que
 * partilham o mesmo ponto cego concordam com entusiasmo. Batizar isso de
 * "acurácia" seria a inferência vestida de dado que este projeto já corrigiu
 * meia dúzia de vezes — e faria a interface trocar "derivado" por "conferido"
 * sem que nada tivesse sido conferido.
 *
 * ## O que este pipeline não faz
 *
 * Não propõe regex e não conserta regra. Ajustar uma regra para casar com a
 * classificação do conferente é fitar o classificador a outra inferência — a
 * armadilha de "ajustar ao gabarito" numa forma pior, porque o gabarito não é
 * verdade. Divergência é relatada; mexer em regra é decisão humana, tomada
 * depois, com a folha preenchida como registro do que se corrigiu contra o quê.
 *
 * ## Uso
 *
 *     npm run auditar:segmentos                  # relatório estrutural + evidência
 *     npm run auditar:segmentos -- --folha       # emite a folha cega
 *     npm run auditar:segmentos -- --conferir    # lê a folha preenchida
 *     npm run auditar:segmentos -- --folha --amostra 60
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MUNICIPIOS,
  REGRAS_DE_TITULO,
  SEGMENTOS,
  classificarTitulo,
  segmentoPorId,
  segmentoPorSlug,
  type ClassificacaoTitulo,
} from "@/ontology";
import { normalizar } from "@/lib/text";
import { lerCsv } from "./habilitados";
import { embaralhar, mulberry32 } from "./aleatorio";
import type { Graph } from "@/types/graph";

const RAIZ = process.cwd();
const DIR_DADOS = join(RAIZ, "data");
const DIR_AUDITORIA = join(DIR_DADOS, "auditoria");
const ARQ_EVIDENCIA = join(DIR_AUDITORIA, "segmentos-evidencia.csv");
const ARQ_FOLHA = join(DIR_AUDITORIA, "segmentos-folha.csv");

/** Semente da amostra: fixa, para duas execuções sortearem o mesmo conjunto. */
const SEMENTE_AMOSTRA = 20260929;

/**
 * Valor que o conferente escreve para "li o título e não dá para dizer".
 *
 * Tem de ser explícito, e diferente de célula vazia: vazia é "ainda não julguei".
 * Sem essa distinção não se mede se os projetos que as regras deixaram sem classe
 * estão certos — e é justamente ali que o classificador mais erra sem aparecer.
 */
const SEM_LINGUAGEM = "nenhuma";

interface Titulo {
  chave: string;
  titulo: string;
  corpus: "grafo" | "habilitados";
  /** O que está gravado no artefato, quando há — para conferir o classificador. */
  segmentoGravado?: string;
}

// ---------------------------------------------------------------------------
// Corpus
// ---------------------------------------------------------------------------

/**
 * Os 63 projetos do grafo: o censo de conferência.
 *
 * É este o conjunto que o site publica, então é sobre ele que a concordância
 * precisa ser medida. A N=63 não se sorteia amostra — sortear adiciona erro sem
 * poupar trabalho.
 */
function corpusDoGrafo(): Titulo[] {
  const arquivo = join(DIR_DADOS, "graph.json");
  if (!existsSync(arquivo)) return [];
  const grafo = JSON.parse(readFileSync(arquivo, "utf-8")) as Graph;
  return grafo.nodes
    .filter((n) => n.kind === "projeto")
    .map((n) => ({
      chave: n.id,
      titulo: n.nome,
      corpus: "grafo" as const,
      segmentoGravado: n.meta?.segmentoId ? String(n.meta.segmentoId) : undefined,
    }));
}

/**
 * Os 467 títulos da lista de habilitados, 2022 a 2026.
 *
 * Não entram no grafo — a lista é dicionário, não lote —, mas o artefato sob
 * teste aqui é **a lista de regras**, e ela merece ser exercitada contra todos os
 * títulos que existem. São oito vezes mais casos do que os 63, e é neles que
 * regra morta e conflito de ordem aparecem.
 */
function corpusDosHabilitados(): Titulo[] {
  const dir = join(DIR_DADOS, "oficial", "habilitados");
  if (!existsSync(dir)) return [];
  const saida: Titulo[] = [];
  for (const nome of readdirSync(dir).filter((f) => f.endsWith(".csv")).sort()) {
    const linhas = lerCsv(readFileSync(join(dir, nome), "utf-8"));
    if (!linhas.length) continue;
    const cab = linhas[0].map((c) => normalizar(c));
    const iProc = cab.indexOf("numero_processo");
    const iProj = cab.indexOf("projeto");
    if (iProj < 0) continue;
    for (const l of linhas.slice(1)) {
      const titulo = (l[iProj] ?? "").trim();
      if (!titulo) continue;
      saida.push({
        chave: (l[iProc] ?? titulo).trim(),
        titulo,
        corpus: "habilitados",
      });
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Verificações estruturais
// ---------------------------------------------------------------------------

interface Estrutural {
  porCorpus: Map<string, { total: number; comClasse: number }>;
  /** Títulos em que mais de uma regra casa: a ordem decide sozinha. */
  conflitos: Array<{ titulo: string; vencedora: string; preteridas: string[] }>;
  /** Regras que nunca dispararam — regex quebrada ou vocabulário que não se aplica. */
  mortas: string[];
  /** Quantas vezes cada regra venceu. */
  vitorias: Map<string, number>;
  /** Casamentos em três letras ou menos, ou que não são palavra inteira. */
  frageis: Array<{ titulo: string; regraId: string; trecho: string }>;
  /** Casamentos que dependem da forma do título — frágeis a acento. */
  porAcento: Array<{ titulo: string; regraId: string; caminho: string }>;
  /** Casamentos que caem dentro de nome de município, não de linguagem. */
  emToponimo: Array<{ titulo: string; regraId: string; trecho: string; municipio: string }>;
  /** Casamentos encontrados no meio de outra palavra. */
  dentroDePalavra: Array<{ titulo: string; regraId: string; trecho: string; palavra: string }>;
  /** Classificação gravada no artefato que o classificador não reproduz. */
  divergenciasDoArtefato: Array<{ chave: string; gravado: string; agora: string }>;
  distribuicao: Map<string, number>;
}

function verificarEstrutura(titulos: Titulo[]): Estrutural {
  const r: Estrutural = {
    porCorpus: new Map(),
    conflitos: [],
    mortas: [],
    vitorias: new Map(),
    frageis: [],
    porAcento: [],
    emToponimo: [],
    dentroDePalavra: [],
    divergenciasDoArtefato: [],
    distribuicao: new Map(),
  };

  const disparou = new Set<string>();

  for (const t of titulos) {
    const c = classificarTitulo(t.titulo);

    const corpus = r.porCorpus.get(t.corpus) ?? { total: 0, comClasse: 0 };
    corpus.total += 1;
    if (c.segmento) corpus.comClasse += 1;
    r.porCorpus.set(t.corpus, corpus);

    const classe = c.segmento?.id ?? SEM_LINGUAGEM;
    r.distribuicao.set(classe, (r.distribuicao.get(classe) ?? 0) + 1);

    for (const m of c.casamentos) disparou.add(m.regraId);
    if (c.casamentos.length) {
      r.vitorias.set(c.casamentos[0].regraId, (r.vitorias.get(c.casamentos[0].regraId) ?? 0) + 1);
    }

    if (c.casamentos.length > 1) {
      r.conflitos.push({
        titulo: t.titulo,
        vencedora: `${c.casamentos[0].regraId} ("${c.casamentos[0].trecho}")`,
        preteridas: c.casamentos.slice(1).map((m) => `${m.regraId} ("${m.trecho}")`),
      });
    }

    for (const m of c.casamentos) {
      // Palavra inteira curta carrega classificação inteira em três letras:
      // `\bboi\b`, `\breis\b`, `\bcoro\b`. Vale um olhar humano.
      if (m.trecho.length <= 3) {
        r.frageis.push({ titulo: t.titulo, regraId: m.regraId, trecho: m.trecho });
      }
      if (m.caminho !== "ambos") {
        r.porAcento.push({ titulo: t.titulo, regraId: m.regraId, caminho: m.caminho });
      }
      // Topônimo não é linguagem cultural.
      //
      // "Divino de São Lourenço" é município capixaba, e a regra de culturas
      // populares — que existe para a Festa do Divino — casava nele. O nome do
      // lugar onde o projeto acontece não diz nada sobre a linguagem dele, e a
      // ontologia tem os 78 municípios para provar o caso sem ninguém julgar.
      const tn = normalizar(t.titulo);
      const mun = MUNICIPIOS.find((x) => {
        const nome = normalizar(x.nome);
        return nome.includes(m.trecho) && tn.includes(nome);
      });
      if (mun) {
        r.emToponimo.push({ titulo: t.titulo, regraId: m.regraId, trecho: m.trecho, municipio: mun.nome });
      }

      // Letra **antes** do casamento significa que o termo foi achado dentro de
      // outra palavra: `graff` casou em "ORIGRAFFES" e classificou um festival
      // de nome inventado como artes visuais.
      //
      // O teste é só à esquerda de propósito. As regras são radicais por
      // desenho — `teatr` tem de pegar "teatro", `music` tem de pegar "música" —,
      // então letra depois é o comportamento esperado e sinalizá-la afogaria o
      // relatório. Letra antes quase nunca é intenção.
      const pos = tn.indexOf(m.trecho);
      if (pos > 0 && /[a-z]/.test(tn[pos - 1])) {
        const palavra = tn.slice(pos).match(/^[a-z]+/)?.[0] ?? m.trecho;
        const inicio = tn.slice(0, pos).match(/[a-z]+$/)?.[0] ?? "";
        r.dentroDePalavra.push({
          titulo: t.titulo,
          regraId: m.regraId,
          trecho: m.trecho,
          palavra: inicio + palavra,
        });
      }
    }

    // O artefato versionado e o classificador têm de dizer a mesma coisa. Se
    // divergem, ou `data/graph.json` está velho, ou a auditoria não está no
    // caminho de produção — e as duas hipóteses invalidam o resto do relatório.
    if (t.corpus === "grafo") {
      const agora = c.segmento?.id;
      if ((t.segmentoGravado ?? undefined) !== agora) {
        r.divergenciasDoArtefato.push({
          chave: t.chave,
          gravado: t.segmentoGravado ?? "(sem classe)",
          agora: agora ?? "(sem classe)",
        });
      }
    }
  }

  r.mortas = REGRAS_DE_TITULO.filter((g) => !disparou.has(g.id)).map((g) => g.id);
  return r;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function celula(v: string | number | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function gravarCsv(caminho: string, cabecalho: string[], linhas: Array<Array<string | number | undefined>>): void {
  mkdirSync(DIR_AUDITORIA, { recursive: true });
  const texto = [cabecalho.join(","), ...linhas.map((l) => l.map(celula).join(","))].join("\n") + "\n";
  writeFileSync(caminho, texto, "utf-8");
}

function gravarEvidencia(titulos: Titulo[]): void {
  const linhas = titulos.map((t) => {
    const c = classificarTitulo(t.titulo);
    const venceu = c.casamentos[0];
    return [
      t.chave,
      t.corpus,
      t.titulo,
      c.segmento?.id ?? "",
      venceu?.regraId ?? "",
      venceu?.trecho ?? "",
      venceu?.caminho ?? "",
      c.casamentos.length,
      c.casamentos.slice(1).map((m) => m.regraId).join("|"),
    ];
  });
  gravarCsv(
    ARQ_EVIDENCIA,
    ["chave", "corpus", "titulo", "segmento", "regra", "trecho", "caminho", "n_casamentos", "preteridas"],
    linhas,
  );
}

// ---------------------------------------------------------------------------
// Folha cega
// ---------------------------------------------------------------------------

interface LinhaFolha {
  chave: string;
  titulo: string;
  conferida: string;
  conferente: string;
}

function lerFolha(): LinhaFolha[] {
  if (!existsSync(ARQ_FOLHA)) return [];
  const linhas = lerCsv(readFileSync(ARQ_FOLHA, "utf-8"));
  if (linhas.length < 2) return [];
  const cab = linhas[0].map((c) => normalizar(c));
  const i = (nome: string) => cab.indexOf(nome);
  return linhas.slice(1).map((l) => ({
    chave: (l[i("chave")] ?? "").trim(),
    titulo: (l[i("titulo")] ?? "").trim(),
    conferida: (l[i("linguagem_conferida")] ?? "").trim(),
    conferente: (l[i("conferente")] ?? "").trim(),
  }));
}

/**
 * Emite a folha **sem o veredito da máquina**.
 *
 * A cegueira é o ponto. Folha que mostra o que as regras decidiram mede
 * assentimento, não juízo independente: quem preenche ancora na resposta à
 * vista, e a concordância sai inflada sem que ninguém tenha mentido. O veredito
 * mora em `segmentos-evidencia.csv` e só encontra a folha na leitura de volta.
 */
function emitirFolha(titulos: Titulo[], amostra?: number): void {
  const existente = lerFolha();
  const preenchidas = existente.filter((l) => l.conferida).length;
  if (preenchidas > 0) {
    console.error(
      `\n  ✗ ${ARQ_FOLHA} já tem ${preenchidas} linha(s) preenchida(s).\n` +
        `    Reemitir apagaria conferência feita. Mova o arquivo antes, se for o caso.\n`,
    );
    process.exit(1);
  }

  const doGrafo = titulos.filter((t) => t.corpus === "grafo");
  const escolhidos = amostra
    ? embaralhar(doGrafo, mulberry32(SEMENTE_AMOSTRA)).slice(0, amostra)
    : doGrafo;

  gravarCsv(
    ARQ_FOLHA,
    ["chave", "titulo", "linguagem_conferida", "conferente"],
    escolhidos.map((t) => [t.chave, t.titulo, "", ""]),
  );

  console.log(`\n  folha cega: ${escolhidos.length} títulos em data/auditoria/segmentos-folha.csv`);
  console.log(`  preencha 'linguagem_conferida' com o slug do segmento, ou '${SEM_LINGUAGEM}'.`);
  console.log(`  slugs: ${SEGMENTOS.map((s) => s.slug).join(", ")}`);
  console.log(`  'conferente' registra quem julgou: humano, ou o identificador do modelo.\n`);
}

// ---------------------------------------------------------------------------
// Concordância
// ---------------------------------------------------------------------------

/** Aceita slug, id ou nome do segmento — e `nenhuma` para "sem linguagem". */
function resolverConferida(bruto: string): string | undefined {
  const v = normalizar(bruto);
  if (!v) return undefined;
  if (v === SEM_LINGUAGEM || v === "-" || v === "—" || v === "sem" || v === "nenhum") {
    return SEM_LINGUAGEM;
  }
  const porSlug = segmentoPorSlug(v);
  if (porSlug) return porSlug.id;
  const porIdDireto = segmentoPorId(bruto.trim());
  if (porIdDireto) return porIdDireto.id;
  const porNome = SEGMENTOS.find((s) => normalizar(s.nome) === v);
  return porNome?.id;
}

/**
 * κ de Cohen: concordância descontado o acordo por acaso.
 *
 * A concordância bruta sozinha engana quando uma classe domina — dois
 * classificadores que chutassem "música" sempre concordariam muito. O κ é a
 * estatística que a literatura usa para dois avaliadores, e é o número honesto
 * para dizer o quanto as duas derivações concordam **além** do esperado ao acaso.
 */
function kappaDeCohen(pares: Array<[string, string]>): number | null {
  if (!pares.length) return null;
  const classes = new Set<string>();
  for (const [a, b] of pares) {
    classes.add(a);
    classes.add(b);
  }
  const n = pares.length;
  const po = pares.filter(([a, b]) => a === b).length / n;
  let pe = 0;
  for (const c of classes) {
    const pa = pares.filter(([a]) => a === c).length / n;
    const pb = pares.filter(([, b]) => b === c).length / n;
    pe += pa * pb;
  }
  return pe === 1 ? null : (po - pe) / (1 - pe);
}

function conferir(titulos: Titulo[]): void {
  const folha = lerFolha();
  if (!folha.length) {
    console.error(
      `\n  ✗ Sem folha. Rode primeiro:\n      npm run auditar:segmentos -- --folha\n`,
    );
    process.exit(1);
  }

  const porChave = new Map(titulos.map((t) => [t.chave, t]));
  const naoReconhecidas: string[] = [];
  const pares: Array<{ chave: string; titulo: string; regras: string; conferida: string }> = [];
  let pendentes = 0;

  for (const l of folha) {
    if (!l.conferida) {
      pendentes += 1;
      continue;
    }
    const conferida = resolverConferida(l.conferida);
    if (!conferida) {
      naoReconhecidas.push(`${l.chave}: "${l.conferida}"`);
      continue;
    }
    const t = porChave.get(l.chave);
    const titulo = t?.titulo ?? l.titulo;
    const c: ClassificacaoTitulo = classificarTitulo(titulo);
    pares.push({
      chave: l.chave,
      titulo,
      regras: c.segmento?.id ?? SEM_LINGUAGEM,
      conferida,
    });
  }

  // Valor que não resolve é trabalho que seria descartado em silêncio.
  if (naoReconhecidas.length) {
    console.error(`\n  ✗ ${naoReconhecidas.length} veredito(s) não reconhecido(s):`);
    for (const v of naoReconhecidas.slice(0, 10)) console.error(`      ${v}`);
    console.error(`    Use um slug de ${SEGMENTOS.map((s) => s.slug).join(", ")}, ou '${SEM_LINGUAGEM}'.\n`);
    process.exit(1);
  }

  // Célula vazia não é concordância. Folha vazia não rende número nenhum.
  if (!pares.length) {
    console.error(
      `\n  ✗ A folha tem ${folha.length} linhas e nenhuma preenchida.\n` +
        `    Linha em branco é "ainda não julguei", não concordância — sem veredito\n` +
        `    não há número a publicar.\n`,
    );
    process.exit(1);
  }

  const concordam = pares.filter((p) => p.regras === p.conferida);
  const kappa = kappaDeCohen(pares.map((p) => [p.regras, p.conferida] as [string, string]));
  const conferentes = [...new Set(folha.filter((l) => l.conferida).map((l) => l.conferente || "(não declarado)"))];

  const rotulo = (id: string) => (id === SEM_LINGUAGEM ? "sem linguagem" : segmentoPorId(id)?.nome ?? id);
  const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—");

  console.log(`\n  Concordância entre duas derivações — regras × conferente`);
  console.log(`  ${"─".repeat(62)}`);
  console.log(`  julgados ................ ${pares.length} de ${folha.length}${pendentes ? ` (${pendentes} pendentes)` : ""}`);
  console.log(`  conferente .............. ${conferentes.join(", ")}`);
  console.log(`  concordância bruta ...... ${concordam.length} de ${pares.length} (${pct(concordam.length, pares.length)})`);
  console.log(`  κ de Cohen .............. ${kappa === null ? "—" : kappa.toFixed(3)}`);

  const falsosNegativos = pares.filter((p) => p.regras === SEM_LINGUAGEM && p.conferida !== SEM_LINGUAGEM);
  const falsosPositivos = pares.filter((p) => p.regras !== SEM_LINGUAGEM && p.conferida === SEM_LINGUAGEM);
  const classeTrocada = pares.filter(
    (p) => p.regras !== p.conferida && p.regras !== SEM_LINGUAGEM && p.conferida !== SEM_LINGUAGEM,
  );

  console.log(`\n  onde as duas se separam:`);
  console.log(`    regras não classificam, conferente sim .. ${falsosNegativos.length}`);
  console.log(`    regras classificam, conferente não ...... ${falsosPositivos.length}`);
  console.log(`    as duas classificam, em classes diferentes ${classeTrocada.length}`);

  if (classeTrocada.length) {
    const pares2 = new Map<string, number>();
    for (const p of classeTrocada) {
      const k = `${rotulo(p.regras)} → ${rotulo(p.conferida)}`;
      pares2.set(k, (pares2.get(k) ?? 0) + 1);
    }
    console.log(`\n  pares confundidos:`);
    for (const [k, n] of [...pares2].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(3)}×  ${k}`);
    }
  }

  const divergem = pares.filter((p) => p.regras !== p.conferida);
  if (divergem.length) {
    console.log(`\n  divergências, uma a uma — a lista de triagem:`);
    for (const p of divergem) {
      console.log(`    ${p.titulo.slice(0, 58)}`);
      console.log(`      regras: ${rotulo(p.regras)}   conferente: ${rotulo(p.conferida)}`);
    }
  }

  console.log(`\n  ${"─".repeat(62)}`);
  console.log(`  Este número é concordância, não acerto. Onde as duas derivações`);
  console.log(`  discordam, uma está errada; onde concordam, podem estar erradas`);
  console.log(`  juntas. A cobertura de linguagem segue 'derivada, não publicada'.\n`);
}

// ---------------------------------------------------------------------------
// Relatório estrutural
// ---------------------------------------------------------------------------

function relatar(titulos: Titulo[], e: Estrutural): void {
  const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(0)}%` : "—");
  const rotulo = (id: string) => (id === SEM_LINGUAGEM ? "sem linguagem" : segmentoPorId(id)?.nome ?? id);

  console.log(`\n  Auditoria dos segmentos — estrutura das regras`);
  console.log(`  ${"─".repeat(62)}`);
  console.log(`  regras .................. ${REGRAS_DE_TITULO.length}`);
  console.log(`  títulos auditados ....... ${titulos.length}`);
  for (const [corpus, v] of e.porCorpus) {
    console.log(`    ${corpus.padEnd(14)} ${String(v.total).padStart(4)} títulos, ${v.comClasse} com classe (${pct(v.comClasse, v.total)})`);
  }

  if (e.divergenciasDoArtefato.length) {
    console.log(`\n  ✗ ARTEFATO DIVERGE DO CLASSIFICADOR — ${e.divergenciasDoArtefato.length} projeto(s).`);
    console.log(`    Ou data/graph.json está velho, ou a auditoria não roda o caminho`);
    console.log(`    de produção. Nas duas hipóteses o resto deste relatório não vale.`);
    for (const d of e.divergenciasDoArtefato.slice(0, 8)) {
      console.log(`      ${d.chave}: gravado ${d.gravado}, agora ${d.agora}`);
    }
  } else {
    console.log(`\n  ✓ a classificação gravada no grafo confere com o classificador`);
  }

  console.log(`\n  distribuição:`);
  for (const [id, n] of [...e.distribuicao].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${pct(n, titulos.length).padStart(4)}  ${rotulo(id)}`);
  }

  console.log(`\n  produtividade por regra:`);
  for (const g of REGRAS_DE_TITULO) {
    const v = e.vitorias.get(g.id) ?? 0;
    console.log(`    ${String(v).padStart(4)}  ${g.id}${v === 0 ? "   ← nunca venceu" : ""}`);
  }

  if (e.mortas.length) {
    console.log(`\n  ✗ regra morta — nunca casou em ${titulos.length} títulos:`);
    console.log(`      ${e.mortas.join(", ")}`);
    console.log(`    Regex quebrada, ou vocabulário que não se aplica ao ES.`);
  } else {
    console.log(`\n  ✓ toda regra casou ao menos uma vez`);
  }

  console.log(`\n  conflito de ordem — mais de uma regra casa, e a ordem decide: ${e.conflitos.length}`);
  for (const c of e.conflitos.slice(0, 12)) {
    console.log(`    ${c.titulo.slice(0, 56)}`);
    console.log(`      vence ${c.vencedora}; preterida(s) ${c.preteridas.join(", ")}`);
  }
  if (e.conflitos.length > 12) console.log(`    … e outros ${e.conflitos.length - 12}`);

  console.log(`\n  casamento em três letras ou menos: ${e.frageis.length}`);
  const porRegra = new Map<string, Set<string>>();
  for (const f of e.frageis) {
    (porRegra.get(f.regraId) ?? porRegra.set(f.regraId, new Set()).get(f.regraId)!).add(f.trecho);
  }
  for (const [regra, trechos] of porRegra) {
    console.log(`    ${regra}: ${[...trechos].map((t) => `"${t}"`).join(", ")}`);
  }

  console.log(`\n  casamento dentro de nome de município: ${e.emToponimo.length}`);
  for (const x of e.emToponimo) {
    console.log(`    ${x.regraId} casou em "${x.trecho}", que é ${x.municipio}`);
    console.log(`      ${x.titulo.slice(0, 70)}`);
  }
  if (e.emToponimo.length) {
    console.log(`    Nome do lugar não diz a linguagem. Estes casamentos são falsos`);
    console.log(`    positivos, e a correção da regra é decisão à parte desta medição.`);
  }

  console.log(`\n  casamento no meio de outra palavra: ${e.dentroDePalavra.length}`);
  for (const x of e.dentroDePalavra) {
    console.log(`    ${x.regraId} casou "${x.trecho}" dentro de "${x.palavra}"`);
    console.log(`      ${x.titulo.slice(0, 70)}`);
  }

  console.log(`\n  casamento que depende da forma do título: ${e.porAcento.length}`);
  for (const a of e.porAcento.slice(0, 8)) {
    console.log(`    ${a.regraId} casou só no ${a.caminho}: ${a.titulo.slice(0, 48)}`);
  }

  console.log(`\n  evidência por título: data/auditoria/segmentos-evidencia.csv`);
  console.log(`\n  ${"─".repeat(62)}`);
  console.log(`  Isto audita as **regras**, não as classificações: nada aqui diz se`);
  console.log(`  uma linguagem está certa. Para isso é preciso conferente —`);
  console.log(`  npm run auditar:segmentos -- --folha\n`);
}

// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const iAmostra = args.indexOf("--amostra");
  const amostra = iAmostra >= 0 ? Number(args[iAmostra + 1]) : undefined;
  if (iAmostra >= 0 && (!amostra || amostra < 1)) {
    console.error("\n  ✗ --amostra precisa de um número maior que zero.\n");
    process.exit(1);
  }

  const titulos = [...corpusDoGrafo(), ...corpusDosHabilitados()];
  if (!titulos.length) {
    console.error("\n  ✗ Nenhum título. Rode `npm run build:graph` primeiro.\n");
    process.exit(1);
  }

  if (args.includes("--conferir")) return conferir(titulos);
  if (args.includes("--folha")) return emitirFolha(titulos, amostra);

  const e = verificarEstrutura(titulos);
  gravarEvidencia(titulos);
  relatar(titulos, e);
  // Divergência entre artefato e classificador invalida o relatório, então sai
  // com erro: num script de CI isto tem de falhar, não passar com um aviso.
  if (e.divergenciasDoArtefato.length) process.exit(1);
}

main();

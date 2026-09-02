/**
 * A lista de habilitados da LICC, lida de planilha.
 *
 * ## Por que uma planilha, e não a API
 *
 * O que a LICC publica está repartido por três níveis de acesso:
 *
 * | Dado | Onde vive | Acesso |
 * | --- | --- | --- |
 * | editais, agentes, espaços, eventos | Mapas Culturais | público |
 * | projetos habilitados | `registration` da oportunidade | exige JWT |
 * | valores autorizado e captado | anexos da SECULT | documento |
 * | patrocinadores | publicações da SECULT | documento |
 *
 * A API pública dá o **contexto**; não dá a **substância**. Nenhum ajuste de
 * consulta resolve isso — a substância só entra por documento. Daí esta
 * terceira classe de fonte: uma planilha versionada, preenchida a partir dos
 * anexos oficiais, com a URL e a página de origem **em cada linha**.
 *
 * ## As duas regras que este módulo existe para não quebrar
 *
 * 1. **Célula vazia é ausência, nunca zero.** `valor_captado` em branco
 *    significa "a fonte não publicou", que é diferente de "captou R$ 0". Somar
 *    o segundo no lugar do primeiro produz um indicador que mente com
 *    aparência de precisão.
 * 2. **Sem `fonte_url` a linha não é oficial.** Ela entra marcada
 *    `demonstracao` e o relatório diz quantas foram assim. Nada é descartado
 *    em silêncio, e nada é carimbado de oficial sem endereço para conferir.
 */

import type {
  GraphEdge,
  GraphNode,
  NaturezaProponente,
  ProjetoStatus,
  Proveniencia,
} from "@/types/graph";
import { municipioPorNome, segmentoPorTermo, normaDoExercicio } from "@/ontology";
import { OPORTUNIDADES_LICC } from "./sources/mapas-culturais";
import { normalizar, slugificar } from "@/lib/text";

// ---------------------------------------------------------------------------
// Esquema da planilha
// ---------------------------------------------------------------------------

/** Uma linha da planilha, já convertida e sem nada inventado. */
export interface LinhaHabilitado {
  /** Índice da linha no arquivo, para a mensagem de erro apontar onde. */
  linha: number;
  numeroProcesso?: string;
  projeto: string;
  proponente: string;
  cnpjCpf?: string;
  municipio?: string;
  segmento?: string;
  valorAutorizado?: number;
  valorCaptado?: number;
  /** Um ou vários, separados por `;` na célula. */
  patrocinadores: string[];
  pautado?: boolean;
  continuado?: boolean;
  status?: ProjetoStatus;
  fonteUrl?: string;
  fontePagina?: string;
}

export interface Problema {
  linha: number;
  campo: string;
  motivo: string;
}

export interface RelatorioHabilitados {
  lidas: number;
  aceitas: number;
  /** Nomes dos arquivos de lote que compuseram o exercício. */
  lotes?: string[];
  /** Projetos que reapareceram num lote posterior e foram mesclados. */
  duplicadas?: number;
  /** Campos em que dois anexos oficiais discordam sobre o mesmo projeto. */
  conflitos?: Array<{ projeto: string; campo: string; antes: string; depois: string }>;
  /** Linhas sem `fonte_url`, importadas como demonstração. */
  semFonte: number;
  comValorAutorizado: number;
  comValorCaptado: number;
  municipiosResolvidos: number;
  segmentosResolvidos: number;
  /** Nomes que a ontologia não reconheceu — a lacuna fica visível. */
  municipiosDesconhecidos: string[];
  segmentosDesconhecidos: string[];
  problemas: Problema[];
}

/**
 * Cabeçalhos aceitos por campo, já normalizados.
 *
 * Anexo de órgão público raramente sai duas vezes com o mesmo cabeçalho, então
 * vale reconhecer as variações em vez de exigir que a pessoa renomeie coluna.
 */
const COLUNAS: Record<keyof Omit<LinhaHabilitado, "linha" | "patrocinadores">, string[]> & {
  patrocinadores: string[];
} = {
  numeroProcesso: ["numero_processo", "processo", "n_processo", "no_processo", "protocolo"],
  projeto: ["projeto", "nome_do_projeto", "nome_projeto", "titulo"],
  proponente: ["proponente", "agente", "nome_do_proponente", "razao_social"],
  cnpjCpf: ["cnpj_cpf", "cnpj", "cpf", "documento", "cpf_cnpj"],
  municipio: ["municipio", "cidade", "municipio_de_execucao"],
  segmento: ["segmento", "linguagem", "area", "area_cultural"],
  valorAutorizado: ["valor_autorizado", "autorizado", "valor_aprovado", "teto", "valor"],
  valorCaptado: ["valor_captado", "captado", "valor_arrecadado", "arrecadado"],
  patrocinadores: ["patrocinador", "patrocinadores", "incentivador", "incentivadores", "empresa"],
  pautado: ["pautado", "projeto_pautado", "cota_pautados"],
  continuado: ["continuado", "programa_continuado", "cota_continuados"],
  status: ["status", "situacao"],
  fonteUrl: ["fonte_url", "fonte", "url", "link"],
  fontePagina: ["fonte_pagina", "pagina", "folha"],
};

// ---------------------------------------------------------------------------
// Leitura do CSV
// ---------------------------------------------------------------------------

/**
 * CSV com aspas, delimitador detectado e BOM removido.
 *
 * Planilha brasileira sai tanto com `;` quanto com `,`; e um nome de projeto
 * com vírgula dentro, entre aspas, é rotina. Um `split(",")` ingênuo
 * corromperia a coluna seguinte em silêncio, que é o pior modo de falhar.
 */
export function lerCsv(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, "");
  const delim = detectarDelimitador(limpo);
  const linhas: string[][] = [];
  let campo = "";
  let atual: string[] = [];
  let entreAspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (entreAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else entreAspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') entreAspas = true;
    else if (c === delim) {
      atual.push(campo);
      campo = "";
    } else if (c === "\n") {
      atual.push(campo);
      linhas.push(atual);
      atual = [];
      campo = "";
    } else if (c !== "\r") campo += c;
  }
  if (campo || atual.length) {
    atual.push(campo);
    linhas.push(atual);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

/** O delimitador é o que mais aparece na primeira linha, fora de aspas. */
function detectarDelimitador(texto: string): string {
  const cabecalho = texto.slice(0, texto.indexOf("\n") + 1 || texto.length);
  const conta = (d: string) => cabecalho.split(d).length - 1;
  return conta(";") > conta(",") ? ";" : conta("\t") > conta(",") ? "\t" : ",";
}

/**
 * `R$ 1.234.567,89` → `1234567.89`. Célula vazia → `undefined`.
 *
 * O ponto é ambíguo entre milhar e decimal, então a decisão é explícita: com
 * vírgula presente é pt-BR; sem vírgula, ponto só separa milhar quando os
 * grupos têm exatamente três dígitos. `1.234` vira 1234, `1.2345` vira 1,2345.
 */
export function dinheiro(bruto: string | undefined): number | undefined {
  const v = (bruto ?? "").replace(/r\$/gi, "").replace(/[\s ]/g, "").trim();
  if (!v || /^[-–—]$/.test(v)) return undefined;

  let numerico: string;
  if (v.includes(",")) numerico = v.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(v)) numerico = v.replace(/\./g, "");
  else numerico = v;

  const n = Number(numerico);
  return Number.isFinite(n) ? n : undefined;
}

/** `sim`/`x`/`1` → true; `não`/`0` → false; vazio → `undefined` (não sabido). */
export function booleano(bruto: string | undefined): boolean | undefined {
  const v = normalizar(bruto ?? "");
  if (!v) return undefined;
  if (["sim", "s", "x", "1", "true", "verdadeiro"].includes(v)) return true;
  if (["nao", "n", "0", "false", "falso"].includes(v)) return false;
  return undefined;
}

const STATUS_VALIDOS: ProjetoStatus[] = [
  "inscrito", "habilitado", "aprovado", "captando", "captado",
  "em_execucao", "prestacao_de_contas", "concluido", "inabilitado",
];

/** Converte a planilha em linhas tipadas, relatando o que não deu para ler. */
export function lerHabilitados(texto: string): {
  linhas: LinhaHabilitado[];
  problemas: Problema[];
} {
  const grade = lerCsv(texto);
  const problemas: Problema[] = [];
  if (!grade.length) return { linhas: [], problemas: [{ linha: 0, campo: "arquivo", motivo: "planilha vazia" }] };

  const cabecalho = grade[0].map((c) => normalizar(c).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  const indice = (campo: keyof typeof COLUNAS): number =>
    cabecalho.findIndex((c) => COLUNAS[campo].includes(c));

  const idx = Object.fromEntries(
    (Object.keys(COLUNAS) as Array<keyof typeof COLUNAS>).map((k) => [k, indice(k)]),
  ) as Record<keyof typeof COLUNAS, number>;

  for (const obrigatorio of ["projeto", "proponente"] as const) {
    if (idx[obrigatorio] < 0) {
      problemas.push({
        linha: 1,
        campo: obrigatorio,
        motivo: `coluna ausente; aceita-se ${COLUNAS[obrigatorio].join(", ")}`,
      });
    }
  }
  if (problemas.length) return { linhas: [], problemas };

  const celula = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
  const linhas: LinhaHabilitado[] = [];

  grade.slice(1).forEach((l, n) => {
    const numeroLinha = n + 2; // 1-based, contando o cabeçalho
    const projeto = celula(l, idx.projeto);
    const proponente = celula(l, idx.proponente);
    if (!projeto || !proponente) {
      problemas.push({
        linha: numeroLinha,
        campo: !projeto ? "projeto" : "proponente",
        motivo: "vazio — a linha não identifica o que descreve",
      });
      return;
    }

    const statusBruto = normalizar(celula(l, idx.status)).replace(/\s+/g, "_");
    const status = STATUS_VALIDOS.includes(statusBruto as ProjetoStatus)
      ? (statusBruto as ProjetoStatus)
      : undefined;
    if (statusBruto && !status) {
      problemas.push({
        linha: numeroLinha,
        campo: "status",
        motivo: `"${celula(l, idx.status)}" não é um status da LICC; ficou ausente`,
      });
    }

    linhas.push({
      linha: numeroLinha,
      numeroProcesso: celula(l, idx.numeroProcesso) || undefined,
      projeto,
      proponente,
      cnpjCpf: celula(l, idx.cnpjCpf) || undefined,
      municipio: celula(l, idx.municipio) || undefined,
      segmento: celula(l, idx.segmento) || undefined,
      valorAutorizado: dinheiro(celula(l, idx.valorAutorizado)),
      valorCaptado: dinheiro(celula(l, idx.valorCaptado)),
      patrocinadores: celula(l, idx.patrocinadores)
        .split(/[;|]/)
        .map((p) => p.trim())
        .filter(Boolean),
      pautado: booleano(celula(l, idx.pautado)),
      continuado: booleano(celula(l, idx.continuado)),
      status,
      fonteUrl: celula(l, idx.fonteUrl) || undefined,
      fontePagina: celula(l, idx.fontePagina) || undefined,
    });
  });

  return { linhas, problemas };
}

// ---------------------------------------------------------------------------
// Mesclagem entre lotes
// ---------------------------------------------------------------------------

/** Um campo em que dois lotes discordam sobre o mesmo projeto. */
export interface Conflito {
  campo: string;
  antes: string;
  depois: string;
}

/**
 * Funde a linha de um lote posterior sobre a de um anterior.
 *
 * A SECULT publica os habilitados em lotes ao longo do exercício, e o mesmo
 * projeto reaparece: primeiro habilitado sem valor de captação, depois com. Se
 * a primeira aparição vencesse, o número publicado no lote seguinte seria
 * jogado fora — perder-se-ia dado real por ordem de leitura.
 *
 * Então o lote novo **completa** o antigo campo a campo. Onde os dois trazem
 * valores diferentes, prevalece o mais recente (é a publicação mais atual) e o
 * desacordo vira um `Conflito` relatado — divergência entre anexos oficiais é
 * achado, não ruído para engolir em silêncio.
 */
export function mesclarLinhas(
  antiga: LinhaHabilitado,
  nova: LinhaHabilitado,
): { mesclada: LinhaHabilitado; conflitos: Conflito[] } {
  const conflitos: Conflito[] = [];
  const mesclada: LinhaHabilitado = { ...antiga };

  const campos: Array<keyof LinhaHabilitado> = [
    "numeroProcesso", "cnpjCpf", "municipio", "segmento",
    "valorAutorizado", "valorCaptado", "pautado", "continuado",
    "status", "fonteUrl", "fontePagina",
  ];
  // Lote diferente tem fonte diferente — é o esperado, não desacordo. Tratá-los
  // como conflito encheria o relatório de falso alarme e enterraria o
  // desacordo que importa, que é sobre valor, município ou situação.
  const ESPERA_SE_DIFERENTE = new Set<keyof LinhaHabilitado>(["fonteUrl", "fontePagina"]);

  for (const campo of campos) {
    const a = antiga[campo];
    const b = nova[campo];
    if (b === undefined) continue;
    if (a === undefined) {
      (mesclada[campo] as unknown) = b;
      continue;
    }
    if (a !== b) {
      if (!ESPERA_SE_DIFERENTE.has(campo)) {
        conflitos.push({ campo, antes: String(a), depois: String(b) });
      }
      (mesclada[campo] as unknown) = b;
    }
  }

  // Patrocinadores se acumulam: um projeto pode ganhar aporte de mais empresas
  // entre um anexo e o seguinte, e o segundo anexo não revoga o primeiro.
  const todos = new Map<string, string>();
  for (const nome of [...antiga.patrocinadores, ...nova.patrocinadores]) {
    todos.set(normalizar(nome), nome);
  }
  mesclada.patrocinadores = [...todos.values()];

  return { mesclada, conflitos };
}

// ---------------------------------------------------------------------------
// Montagem dos vértices
// ---------------------------------------------------------------------------

const soDigitos = (s: string) => s.replace(/\D/g, "");

/**
 * Identidade do proponente.
 *
 * CNPJ ou CPF quando houver: é o que a norma usa e o que sobrevive a variação
 * de grafia ("Instituto X" / "INSTITUTO X LTDA"). Sem documento, cai no slug
 * do nome, e duas grafias do mesmo agente viram dois vértices — o relatório
 * de cobertura mostra quantos ficaram sem documento, porque essa duplicação é
 * consequência da fonte, não do código.
 */
function idProponente(l: LinhaHabilitado): string {
  const doc = soDigitos(l.cnpjCpf ?? "");
  return doc.length >= 11 ? `prop-doc-${doc}` : `prop-${slugificar(l.proponente)}`;
}

/**
 * Transforma as linhas em vértices e arestas da LICC.
 *
 * Não emite nó de segmento, município nem órgão: esses já vêm da ontologia e
 * do conjunto institucional. Aqui só nascem projeto, proponente e
 * patrocinador — e as ligações entre eles.
 */
export function montarHabilitados(
  linhas: LinhaHabilitado[],
  ano: number,
): { nodes: GraphNode[]; edges: GraphEdge[]; relatorio: RelatorioHabilitados } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const vistos = new Map<string, GraphNode>();
  const municipiosDesconhecidos = new Set<string>();
  const segmentosDesconhecidos = new Set<string>();
  const projetosPorProponente = new Map<string, number>();
  const oportunidade = (OPORTUNIDADES_LICC as Record<number, number>)[ano];
  const idEdital = oportunidade ? `edital-${oportunidade}` : undefined;

  const adicionar = (n: GraphNode) => {
    const antigo = vistos.get(n.id);
    if (antigo) return antigo;
    vistos.set(n.id, n);
    nodes.push(n);
    return n;
  };
  const ligar = (
    source: string,
    target: string,
    kind: GraphEdge["kind"],
    proveniencia: Proveniencia,
    peso?: number,
  ) => {
    edges.push({
      id: `${kind}:${source}->${target}`,
      source,
      target,
      kind,
      proveniencia,
      ...(peso !== undefined ? { peso } : {}),
    });
  };

  let semFonte = 0;
  let comValorAutorizado = 0;
  let comValorCaptado = 0;
  let municipiosResolvidos = 0;
  let segmentosResolvidos = 0;

  for (const l of linhas) {
    // Sem endereço para conferir, o registro não pode se dizer oficial.
    const proveniencia: Proveniencia = l.fonteUrl ? "oficial" : "demonstracao";
    if (!l.fonteUrl) semFonte++;

    const fontes = l.fonteUrl
      ? [{
          rotulo: l.fontePagina
            ? `Anexo da SECULT, p. ${l.fontePagina}`
            : "Anexo publicado pela SECULT",
          url: l.fonteUrl,
        }]
      : undefined;

    const seg = l.segmento ? segmentoPorTermo(l.segmento) : undefined;
    if (l.segmento && !seg) segmentosDesconhecidos.add(l.segmento);
    if (seg) segmentosResolvidos++;

    const mun = l.municipio ? municipioPorNome(l.municipio) : undefined;
    if (l.municipio && !mun) municipiosDesconhecidos.add(l.municipio);
    if (mun) municipiosResolvidos++;

    if (l.valorAutorizado !== undefined) comValorAutorizado++;
    if (l.valorCaptado !== undefined) comValorCaptado++;

    const idProj = `proj-${slugificar(l.numeroProcesso ?? `${l.projeto}-${ano}`)}`;
    const idProp = idProponente(l);

    adicionar({
      id: idProj,
      slug: slugificar(`${l.projeto}-${ano}`),
      kind: "projeto",
      nome: l.projeto,
      proveniencia,
      fontes,
      fundamentos: ["lei-11246-2021", normaDoExercicio(ano)],
      // Sem `?? 0`: o campo ausente segue ausente. Um projeto cujo valor a
      // SECULT não publicou não captou zero — não se sabe quanto captou.
      orcamento:
        l.valorAutorizado !== undefined || l.valorCaptado !== undefined
          ? { autorizado: l.valorAutorizado, captado: l.valorCaptado }
          : undefined,
      meta: {
        ano,
        numeroProcesso: l.numeroProcesso,
        status: l.status,
        segmentoId: seg?.id,
        municipioId: mun?.id,
        proponenteId: idProp,
        pautado: l.pautado,
        continuado: l.continuado,
      },
    });

    adicionar({
      id: idProp,
      slug: slugificar(l.proponente),
      kind: "proponente",
      nome: l.proponente,
      proveniencia,
      fontes,
      fundamentos: ["lei-11246-2021"],
      meta: {
        municipioId: mun?.id,
        documento: l.cnpjCpf,
        natureza: naturezaPeloDocumento(l),
      },
    });
    projetosPorProponente.set(idProp, (projetosPorProponente.get(idProp) ?? 0) + 1);

    ligar(idProp, idProj, "propoe", proveniencia);
    ligar("secult-es", idProj, "fiscaliza", "derivado");
    if (seg) ligar(idProj, seg.id, "pertence_a", "derivado");
    if (mun) ligar(idProj, mun.id, "ocorre_em", "derivado");
    if (idEdital) ligar(idProj, idEdital, "inscrito_em", proveniencia);

    for (const nome of l.patrocinadores) {
      const idPatr = `patr-${slugificar(nome)}`;
      adicionar({
        id: idPatr,
        slug: slugificar(nome),
        kind: "patrocinador",
        nome,
        proveniencia,
        fontes,
        fundamentos: ["lei-11246-2021"],
      });
      // O peso só entra quando há um patrocinador só: com dois nomes na
      // célula, o rateio entre eles não está publicado, e dividir por igual
      // seria inventar a divisão.
      const peso =
        l.patrocinadores.length === 1 && l.valorCaptado !== undefined
          ? l.valorCaptado
          : undefined;
      ligar(idPatr, idProj, "patrocina", proveniencia, peso);
    }
  }

  for (const [id, quantidade] of projetosPorProponente) {
    const no = vistos.get(id);
    if (no) no.meta = { ...no.meta, projetosNoAno: quantidade };
  }

  return {
    nodes,
    edges,
    relatorio: {
      lidas: linhas.length,
      aceitas: linhas.length,
      semFonte,
      comValorAutorizado,
      comValorCaptado,
      municipiosResolvidos,
      segmentosResolvidos,
      municipiosDesconhecidos: [...municipiosDesconhecidos].sort(),
      segmentosDesconhecidos: [...segmentosDesconhecidos].sort(),
      problemas: [],
    },
  };
}

/**
 * Natureza do proponente pelo documento.
 *
 * 11 dígitos é CPF (pessoa física), 14 é CNPJ. O CNPJ **não** distingue
 * empresa de ONG nem de prefeitura, então aqui para: chutar "organização sem
 * fins lucrativos" a partir da palavra "instituto" no nome seria classificar
 * por adivinhação. Sem documento, o campo fica ausente.
 */
function naturezaPeloDocumento(l: LinhaHabilitado): NaturezaProponente | undefined {
  const doc = soDigitos(l.cnpjCpf ?? "");
  if (doc.length === 11) return "pessoa_fisica";
  if (doc.length === 14) return "pessoa_juridica";
  return undefined;
}

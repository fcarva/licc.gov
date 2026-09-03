/**
 * Coleta os dados abertos do Mapa Cultural do Espírito Santo e escreve
 * `data/raw/licc-{ano}.json`, que o `build-graph.ts` consome no lugar do
 * conjunto de demonstração.
 *
 *   npm run ingest              # exercício corrente
 *   LICC_ANO=2025 npm run ingest
 *   LICC_BASE=https://... npm run ingest
 *
 * ## O que a API dá, e o que ela não dá
 *
 * A plataforma Mapas Culturais não expõe publicamente as inscrições
 * (`registration`) de uma oportunidade — esse endpoint exige JWT. É ali que
 * vivem os projetos da LICC. O que é público são agentes, espaços, eventos,
 * oportunidades e `project`.
 *
 * **`project` do Mapa Cultural NÃO é projeto da LICC.** É qualquer projeto
 * cultural que um agente cadastrou na plataforma. Houve aqui uma versão que
 * transformava cada um deles em `kind: "projeto"` com `proveniencia:
 * "oficial"` e fundamento na Lei 11.246/2021 — ou seja, afirmava que todo
 * projeto cultural do Espírito Santo é incentivado pela LICC. Era pior que o
 * conjunto de demonstração, que ao menos se identifica como fictício.
 *
 * Agora esses registros formam apenas um **índice de enriquecimento**: quando
 * o nome casa com uma linha da lista de habilitados, o projeto da LICC ganha
 * URL, descrição e o id da plataforma. Nunca a existência, nunca a base legal.
 *
 * Quem cria projeto aqui são os `data/raw/habilitados-{ano}*.csv`, lidos por
 * `./habilitados`. São vários porque a SECULT publica em **lotes**: a comissão
 * julgadora da LICC é permanente e habilita ao longo de todo o período de
 * inscrição, então o exercício de 2025 sai em anexos separados, cada um com sua
 * própria contagem.
 *
 * Sem nenhuma dessas planilhas a coleta produz o grafo institucional e a camada
 * territorial, **zero projetos**, e diz isso em voz alta. Um grafo que admite
 * não saber vale mais que um que preenche a lacuna com dado alheio.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { GraphEdge, GraphNode } from "@/types/graph";
import {
  segmentoPorTermo,
  municipioPorNome,
  SEGMENTOS,
  MUNICIPIOS,
  EXERCICIO_PADRAO,
  normaDoExercicio,
} from "@/ontology";
import { slugificar, normalizar, nomesCorrespondem } from "@/lib/text";
import {
  MapasCulturais,
  CONSULTA_AGENTES,
  CONSULTA_PROJETOS,
  CONSULTA_OPORTUNIDADES,
  CONSULTA_ESPACOS,
  CONSULTA_EVENTOS,
  OPORTUNIDADES_LICC,
  type AgenteBruto,
  type ProjetoBruto,
  type OportunidadeBruta,
  type EspacoBruto,
  type EventoBruto,
} from "./sources/mapas-culturais";
import { nosFixos, arestasFixas } from "./seed/institucional";
import {
  lerHabilitados,
  montarHabilitados,
  mesclarLinhas,
  type LinhaHabilitado,
  type Problema,
  type RelatorioHabilitados,
} from "./habilitados";

const DIR_BRUTO = join(process.cwd(), "data", "raw");
const DIR_OFICIAL = join(process.cwd(), "data", "oficial");

interface Coleta {
  agentes: AgenteBruto[];
  projetos: ProjetoBruto[];
  oportunidades: OportunidadeBruta[];
  espacos: EspacoBruto[];
  eventos: EventoBruto[];
}

async function coletar(cliente: MapasCulturais, maximo?: number): Promise<Coleta> {
  console.log("→ conectando ao Mapa Cultural do Espírito Santo…");
  const versao = await cliente.versao();
  console.log(`  plataforma Mapas Culturais ${versao}`);

  console.log("→ oportunidades (editais)");
  const oportunidades = await cliente.buscar<OportunidadeBruta>("opportunity", {
    ...CONSULTA_OPORTUNIDADES,
    maximo: maximo ?? 500,
  });

  console.log("→ agentes culturais");
  const agentes = await cliente.buscar<AgenteBruto>("agent", {
    ...CONSULTA_AGENTES,
    maximo,
  });

  console.log("→ projetos");
  const projetos = await cliente.buscar<ProjetoBruto>("project", {
    ...CONSULTA_PROJETOS,
    maximo,
  });

  console.log("→ espaços culturais");
  const espacos = await cliente.buscar<EspacoBruto>("space", {
    ...CONSULTA_ESPACOS,
    maximo,
  });

  console.log("→ agenda cultural");
  const eventos = await cliente.buscar<EventoBruto>("event", {
    ...CONSULTA_EVENTOS,
    maximo,
  });

  return { agentes, projetos, oportunidades, espacos, eventos };
}

/** Traduz a coleta bruta para os vértices e arestas do LICC Gov Graph. */
function transformar(
  coleta: Coleta,
  ano: number,
  habilitados: { nodes: GraphNode[]; edges: GraphEdge[] },
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [...nosFixos(ano)];
  const edges: GraphEdge[] = [...arestasFixas(ano)];
  const vistos = new Set(nodes.map((n) => n.id));

  const adicionar = (n: GraphNode) => {
    if (vistos.has(n.id)) return;
    vistos.add(n.id);
    nodes.push(n);
  };
  const ligar = (
    source: string,
    target: string,
    kind: GraphEdge["kind"],
    extras: Partial<GraphEdge> = {},
  ) => {
    edges.push({
      id: `${kind}:${source}->${target}`,
      source,
      target,
      kind,
      proveniencia: "oficial",
      ...extras,
    });
  };

  for (const seg of SEGMENTOS) {
    adicionar({
      id: seg.id,
      slug: seg.slug,
      kind: "segmento",
      nome: seg.nome,
      descricao: seg.descricao,
      nomesAlternativos: seg.termosMapaCultural,
      proveniencia: "derivado",
      meta: { cor: seg.cor, slugSegmento: seg.slug },
    });
  }
  for (const mun of MUNICIPIOS) {
    adicionar({
      id: mun.id,
      slug: mun.slug,
      kind: "municipio",
      nome: mun.nome,
      descricao: `Município capixaba — microrregião ${mun.regiao}.`,
      proveniencia: "derivado",
      meta: { regiao: mun.regiao, regiaoMetropolitana: mun.rmgv },
    });
  }

  // Oportunidades da LICC viram nós de governança ligados ao programa.
  const idsLicc = new Set<number>(Object.values(OPORTUNIDADES_LICC));
  for (const op of coleta.oportunidades) {
    const ehLicc = idsLicc.has(op.id) || /licc|incentivo à cultura/i.test(op.name);
    if (!ehLicc) continue;
    const id = `edital-${op.id}`;
    adicionar({
      id,
      slug: slugificar(`${op.name}-${op.id}`),
      kind: "governanca",
      nome: op.name,
      descricao: op.shortDescription ?? undefined,
      url: op.singleUrl ?? `https://mapa.cultura.es.gov.br/oportunidade/${op.id}/`,
      proveniencia: "oficial",
      fundamentos: ["lei-11246-2021"],
      meta: {
        oportunidadeId: op.id,
        inscricoesDe: dataDe(op.registrationFrom),
        inscricoesAte: dataDe(op.registrationTo),
      },
    });
    ligar("secult-es", id, "regula");
    ligar(id, "licc-programa", "regula");
  }

  const agentesPorId = new Map(coleta.agentes.map((a) => [a.id, a]));

  /* ---------------- projetos da LICC: só os habilitados ---------------- */

  // A lista oficial cria os projetos. A plataforma só enriquece o que já
  // existe nela — ver o cabeçalho deste arquivo.
  for (const n of habilitados.nodes) adicionar(n);
  for (const e of habilitados.edges) edges.push(e);

  enriquecerPelaPlataforma(nodes, coleta, agentesPorId);

  /* ---------------- camada territorial (Republic) ---------------- */

  for (const e of coleta.espacos) {
    const mun = e.En_Municipio ? municipioPorNome(e.En_Municipio) : undefined;
    const id = `espaco-${e.id}`;
    adicionar({
      id,
      slug: slugificar(`${e.name}-${e.id}`),
      kind: "espaco",
      nome: e.name,
      descricao: e.endereco ?? undefined,
      url: e.singleUrl ?? undefined,
      proveniencia: "oficial",
      meta: {
        mapaCulturalId: e.id,
        municipioId: mun?.id,
        endereco: e.endereco ?? undefined,
      },
    });
    if (mun) ligar(id, mun.id, "sediado_em", { proveniencia: "derivado" });
  }

  for (const ev of coleta.eventos) {
    const id = `evento-${ev.id}`;
    const ocorrencia = ev.occurrences?.[0];
    const regra = ocorrencia?.rule;
    adicionar({
      id,
      slug: slugificar(`${ev.name}-${ev.id}`),
      kind: "evento",
      nome: ev.name,
      descricao: ev.shortDescription ?? undefined,
      url: ev.singleUrl ?? undefined,
      proveniencia: "oficial",
      meta: {
        mapaCulturalId: ev.id,
        espacoId: ocorrencia?.space ? `espaco-${ocorrencia.space.id}` : undefined,
        quando: typeof regra === "object" ? regra?.description : (regra ?? undefined),
      },
    });
    if (ocorrencia?.space) {
      ligar(id, `espaco-${ocorrencia.space.id}`, "acontece_em", { proveniencia: "oficial" });
    }
  }

  return { nodes, edges };
}

/**
 * Enriquece os projetos e proponentes da lista oficial com o que a plataforma
 * publica: URL, descrição, id e — só quando o anexo não trouxe — segmento,
 * município e natureza jurídica.
 *
 * Enriquecer nunca cria vértice nem altera valor financeiro. Se o casamento
 * por nome errar, o pior que acontece é um link errado; se ele criasse
 * projeto, o erro viraria uma afirmação falsa sobre a política pública.
 */
function enriquecerPelaPlataforma(
  nodes: GraphNode[],
  coleta: Coleta,
  agentesPorId: Map<number, AgenteBruto>,
): { projetos: number; proponentes: number } {
  // Caminho rápido por nome exato; a varredura difusa só entra quando falha.
  const projetosPorNome = new Map(coleta.projetos.map((p) => [normalizar(p.name), p]));
  const agentesPorNome = new Map(coleta.agentes.map((a) => [normalizar(a.name), a]));

  let projetos = 0;
  let proponentes = 0;

  for (const no of nodes) {
    if (no.kind === "projeto") {
      const achado =
        projetosPorNome.get(normalizar(no.nome)) ??
        coleta.projetos.find((p) => nomesCorrespondem(p.name, no.nome));
      if (!achado) continue;
      projetos++;
      no.url ??= achado.singleUrl ?? undefined;
      no.descricao ??= achado.shortDescription ?? undefined;

      const dono = achado.owner ? agentesPorId.get(achado.owner.id) : undefined;
      const areas = [
        ...(Array.isArray(achado.terms?.area) ? (achado.terms!.area as string[]) : []),
        ...(Array.isArray(dono?.terms?.area) ? (dono!.terms!.area as string[]) : []),
      ];
      const seg = resolverSegmento(areas);
      const mun = dono?.En_Municipio ? municipioPorNome(dono.En_Municipio) : undefined;
      no.meta = {
        ...no.meta,
        mapaCulturalId: achado.id,
        segmentoId: no.meta?.segmentoId ?? seg?.id,
        municipioId: no.meta?.municipioId ?? mun?.id,
      };
      continue;
    }

    if (no.kind === "proponente") {
      const achado =
        agentesPorNome.get(normalizar(no.nome)) ??
        coleta.agentes.find((a) => nomesCorrespondem(a.name, no.nome));
      if (!achado) continue;
      proponentes++;
      no.url ??= achado.singleUrl ?? undefined;
      no.descricao ??= achado.shortDescription ?? undefined;
      no.meta = {
        ...no.meta,
        mapaCulturalId: achado.id,
        natureza: no.meta?.natureza ?? naturezaDe(achado),
      };
    }
  }

  return { projetos, proponentes };
}

function resolverSegmento(areas: string[]) {
  for (const area of areas) {
    const seg = segmentoPorTermo(area);
    if (seg) return seg;
  }
  return undefined;
}

function naturezaDe(a: AgenteBruto | undefined) {
  const tipo = typeof a?.type === "object" ? a?.type?.id : a?.type;
  // Na plataforma Mapas Culturais, tipo 1 = pessoa física, 2 = pessoa jurídica.
  return tipo === 2 ? "pessoa_juridica" : tipo === 1 ? "pessoa_fisica" : undefined;
}

function dataDe(v: { date: string } | string | null | undefined): string | undefined {
  if (!v) return undefined;
  return typeof v === "string" ? v : v.date;
}

/**
 * Carrega `data/raw/habilitados-{ano}.csv`, se existir.
 *
 * Compartilhada com `importar-habilitados.ts`, para que o caminho com rede e o
 * caminho sem rede leiam a planilha exatamente do mesmo jeito.
 */
const DIR_DICIONARIO = join(DIR_OFICIAL, "habilitados");

/**
 * Completa os projetos do exercício com o que a **lista de habilitados** diz.
 *
 * ## Por que dicionário, e não lote
 *
 * Os dois anexos da SECULT recortam coisas diferentes, e confundi-los corrompe
 * o grafo. "RECURSO FINANCEIRO CAPTADO 2025" é dinheiro captado no
 * **ano-calendário** 2025; "PROJETOS HABILITADOS - ANO 2025" é quem foi
 * **habilitado** naquele ciclo e capta no seguinte. Medido: dos 63 projetos
 * que captaram em 2025, 30 aparecem na seção de habilitados de 2024, 14 na de
 * 2023 e apenas 4 na de 2025.
 *
 * Tratar a lista como lote somaria as duas coortes — 115 projetos onde existem
 * 63 — e ainda fundiria "Boa Vista Carnaval Capixaba 2026" com o de 2025. Como
 * dicionário, ela só preenche o que falta em quem já está no grafo.
 *
 * ## Casamento por título exato, e só
 *
 * O anexo de captados não publica número de processo, então o casamento é por
 * título normalizado. **Exato**, nunca por semelhança: semelhança casou
 * "Carna Barra - Carnaval da Barra do Jucu" com "Carna Surpresa 2024 - O
 * Carnaval da Barra do Jucu", que são projetos diferentes de anos diferentes.
 * Título que aparece em mais de um exercício é ambíguo e fica de fora — um
 * festival anual tem uma linha por edição, e escolher uma no palpite
 * atribuiria município e cota errados.
 *
 * Preenche só campo **ausente**. O anexo de captados é a fonte do dinheiro
 * deste exercício e não é sobrescrito por lista de outro ciclo.
 */
function enriquecerPelosHabilitados(linhas: LinhaHabilitado[]): {
  enriquecidos: number;
  ambiguos: number;
  semCasamento: number;
} {
  if (!existsSync(DIR_DICIONARIO)) return { enriquecidos: 0, ambiguos: 0, semCasamento: linhas.length };

  const porTitulo = new Map<string, LinhaHabilitado[]>();
  for (const arquivo of readdirSync(DIR_DICIONARIO).filter((f) => f.toLowerCase().endsWith(".csv"))) {
    for (const l of lerHabilitados(readFileSync(join(DIR_DICIONARIO, arquivo), "utf8")).linhas) {
      const chave = normalizar(l.projeto);
      porTitulo.set(chave, [...(porTitulo.get(chave) ?? []), l]);
    }
  }

  let enriquecidos = 0;
  let ambiguos = 0;
  let semCasamento = 0;

  for (const l of linhas) {
    const candidatos = porTitulo.get(normalizar(l.projeto)) ?? [];
    if (!candidatos.length) {
      semCasamento++;
      continue;
    }
    if (candidatos.length > 1) {
      ambiguos++;
      console.warn(
        `  ! "${l.projeto}" aparece em ${candidatos.length} exercícios da lista de ` +
          `habilitados; não dá para saber qual edição é esta, então fica sem município e sem cota`,
      );
      continue;
    }
    const d = candidatos[0];
    let mudou = false;
    if (!l.municipios.length && d.municipios.length) {
      l.municipios = d.municipios;
      mudou = true;
    }
    if (l.enquadramento === undefined && d.enquadramento !== undefined) {
      l.enquadramento = d.enquadramento;
      mudou = true;
    }
    if (l.status === undefined && d.status !== undefined) {
      l.status = d.status;
      mudou = true;
    }
    if (l.numeroProcesso === undefined && d.numeroProcesso !== undefined) {
      l.numeroProcesso = d.numeroProcesso;
      mudou = true;
    }
    if (mudou) enriquecidos++;
  }

  return { enriquecidos, ambiguos, semCasamento };
}

export function carregarHabilitados(
  ano: number,
): { nodes: GraphNode[]; edges: GraphEdge[]; relatorio?: RelatorioHabilitados } {
  const arquivos = lotesDoExercicio(ano);
  if (!arquivos.length) return { nodes: [], edges: [] };

  const problemas: Problema[] = [];
  const conflitos: Array<{ projeto: string; campo: string; antes: string; depois: string }> = [];
  // Ordem de leitura preservada: o mapa mantém a sequência de inserção, então
  // os projetos saem na ordem em que a SECULT os habilitou.
  const porProjeto = new Map<string, LinhaHabilitado>();
  let duplicadas = 0;

  for (const arquivo of arquivos) {
    const nome = basename(arquivo);
    const lidas = lerHabilitados(readFileSync(arquivo, "utf8"));
    for (const pb of lidas.problemas) {
      console.warn(`  ! ${nome}, linha ${pb.linha}, ${pb.campo}: ${pb.motivo}`);
    }
    problemas.push(...lidas.problemas);

    for (const l of lidas.linhas) {
      // O mesmo projeto reaparece entre lotes. O novo completa o antigo em vez
      // de substituí-lo ou de ser descartado — ver `mesclarLinhas`.
      // Chave simples de propósito. Tentou-se casar por semelhança de título
      // aqui, e o resultado foi **fundir projetos distintos**: dentro do
      // próprio anexo de captados, três pares diferentes casavam — "26º
      // Festival de Inverno da Sanfona e da Viola" com "Núcleo de Formação de
      // Sanfona e Viola", do mesmo proponente. Lote é lista de projetos
      // distintos por construção; semelhança de nome não tem o que decidir aqui.
      const chave = normalizar(l.numeroProcesso ?? l.projeto);
      const anterior = porProjeto.get(chave);
      if (!anterior) {
        porProjeto.set(chave, l);
        continue;
      }
      duplicadas++;
      const { mesclada, conflitos: novos } = mesclarLinhas(anterior, l);
      porProjeto.set(chave, mesclada);
      for (const c of novos) {
        conflitos.push({ projeto: l.projeto, ...c });
        console.warn(
          `  ! anexos discordam sobre "${l.projeto}" em ${c.campo}: ` +
            `${c.antes} → ${c.depois} (prevalece ${nome}, o mais recente)`,
        );
      }
    }
    console.log(`  ${nome}: ${lidas.linhas.length} linhas`);
  }

  const linhas = [...porProjeto.values()];
  const dic = enriquecerPelosHabilitados(linhas);
  if (dic.enriquecidos || dic.ambiguos || dic.semCasamento) {
    console.log(
      `  lista de habilitados (dicionário): ${dic.enriquecidos} projeto(s) completado(s), ` +
        `${dic.ambiguos} ambíguo(s), ${dic.semCasamento} sem correspondência`,
    );
  }

  const montado = montarHabilitados(linhas, ano);
  return {
    ...montado,
    relatorio: {
      ...montado.relatorio,
      problemas,
      lotes: arquivos.map((f) => basename(f)),
      duplicadas,
      conflitos,
    },
  };
}

/**
 * Os lotes de habilitados de um exercício.
 *
 * A SECULT **não publica uma lista anual**: a comissão julgadora da LICC é
 * permanente, a habilitação acontece ao longo de todo o período de inscrição, e
 * os anexos saem em lotes ao longo do ano — em 2025 são pelo menos seis, com
 * 28, 33, 35, 37, 41 e 74 projetos, todos rotulados "ANO 2025".
 *
 * Por isso qualquer `habilitados-{ano}*.csv` entra: `habilitados-2025.csv`,
 * `habilitados-2025-lote3.csv`, `habilitados-2025-marco.csv`. Assumir um
 * arquivo por exercício, como esta função fazia antes, descartaria em silêncio
 * todos os lotes menos um.
 */
export function lotesDoExercicio(ano: number): string[] {
  // Dois lugares, nesta ordem. `data/oficial/` é versionado: transcrição de
  // anexo que passou pelos conferidores de `tools/anexos-secult/`, e cujo diff
  // entre coletas fica auditável no git — é a razão de o repositório existir.
  // `data/raw/` é ignorado, e é onde cai a extração local de quem tem os PDFs;
  // vem depois porque completa o versionado, não o contrário.
  const doDiretorio = (dir: string) => {
    if (!existsSync(dir)) return [];
    const casa = new RegExp(`^(habilitados|captados)-${ano}`);
    return readdirSync(dir)
      .filter((f) => casa.test(f) && f.toLowerCase().endsWith(".csv"))
      .sort()
      .map((f) => join(dir, f));
  };
  return [...doDiretorio(DIR_OFICIAL), ...doDiretorio(DIR_BRUTO)];
}

/** Imprime a cobertura da planilha — o que entrou e, sobretudo, o que faltou. */
export function relatar(r: RelatorioHabilitados, ano: number): void {
  const pct = (n: number) => (r.lidas ? `${Math.round((n / r.lidas) * 100)}%` : "—");
  const lotes = r.lotes?.length
    ? ` em ${r.lotes.length} lote${r.lotes.length > 1 ? "s" : ""}`
    : "";
  console.log(`\n  lista de habilitados ${ano}: ${r.lidas} projetos${lotes}`);
  if (r.duplicadas) {
    console.log(`    ${r.duplicadas} projeto(s) repetido(s) entre lotes, mesclados`);
  }
  if (r.conflitos?.length) {
    console.log(`    ! ${r.conflitos.length} campo(s) em que anexos oficiais discordam:`);
    for (const c of r.conflitos.slice(0, 5)) {
      console.log(`      "${c.projeto}" · ${c.campo}: ${c.antes} → ${c.depois}`);
    }
  }
  console.log(`    com valor autorizado ... ${r.comValorAutorizado} (${pct(r.comValorAutorizado)})`);
  console.log(`    com valor captado ...... ${r.comValorCaptado} (${pct(r.comValorCaptado)})`);
  console.log(`    município resolvido .... ${r.municipiosResolvidos} (${pct(r.municipiosResolvidos)})`);
  console.log(`    segmento resolvido ..... ${r.segmentosResolvidos} (${pct(r.segmentosResolvidos)})`);
  if (r.semFonte) {
    console.log(`    ! ${r.semFonte} sem fonte_url — entraram como demonstração, não como oficial`);
  }
  if (r.municipiosDesconhecidos.length) {
    console.log(`    ! municípios não reconhecidos: ${r.municipiosDesconhecidos.join(", ")}`);
  }
  if (r.segmentosDesconhecidos.length) {
    console.log(`    ! segmentos não reconhecidos: ${r.segmentosDesconhecidos.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const ano = Number(process.env.LICC_ANO ?? EXERCICIO_PADRAO);
  const maximo = process.env.LICC_MAX ? Number(process.env.LICC_MAX) : undefined;
  const cliente = new MapasCulturais({
    base: process.env.LICC_BASE,
    log: (m) => console.log(m),
  });

  const habilitados = carregarHabilitados(ano);

  try {
    const coleta = await coletar(cliente, maximo);
    const { nodes, edges } = transformar(coleta, ano, habilitados);

    mkdirSync(DIR_BRUTO, { recursive: true });
    const destino = join(DIR_BRUTO, `licc-${ano}.json`);
    writeFileSync(
      destino,
      JSON.stringify(
        { coletadoEm: new Date().toISOString(), ano, nodes, edges },
        null,
        2,
      ),
    );

    console.log(`\n✓ coleta gravada em ${destino}`);
    console.log(`  plataforma: ${coleta.agentes.length} agentes, ${coleta.projetos.length} projetos cadastrados, ${coleta.oportunidades.length} oportunidades`);
    if (habilitados.relatorio) relatar(habilitados.relatorio, ano);
    else avisarSemLista(ano);
    console.log(`\n  → ${nodes.length} nós e ${edges.length} arestas`);
    console.log("  execute `npm run build:graph` para consolidar data/graph.json");
  } catch (erro) {
    console.error("\n✗ coleta falhou:", erro instanceof Error ? erro.message : erro);
    console.error(
      "  O grafo continua sendo servido a partir do conjunto de demonstração.\n" +
        "  Verifique o acesso de rede a https://mapa.cultura.es.gov.br e repita.",
    );
    process.exitCode = 1;
  }
}

/** Sem a lista oficial não há projeto da LICC — e isso precisa ser dito. */
export function avisarSemLista(ano: number): void {
  console.log(`\n  ! sem data/raw/habilitados-${ano}.csv: nenhum projeto da LICC foi criado.`);
  console.log("    Os projetos cadastrados no Mapa Cultural NÃO são projetos da LICC —");
  console.log("    são projetos culturais quaisquer, e tratá-los como incentivados");
  console.log("    afirmaria algo falso sobre a política. O grafo sai com o conjunto");
  console.log("    institucional e a camada territorial.");
  console.log("    Molde da planilha: data/raw/habilitados-exemplo.csv");
}

if (process.argv[1]?.includes("ingest")) void main();

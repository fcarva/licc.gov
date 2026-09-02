/**
 * Incorpora dados de patrocinadores raspados ao grafo bruto da LICC.
 *
 * Lê  data/raw/patrocinadores-{ano}.json (gerado por scrape-secult.ts)
 * e    data/raw/licc-{ano}.json          (gerado por ingest.ts)
 *
 * Para cada patrocinador encontrado:
 *   - Cria um GraphNode com kind "patrocinador"
 *   - Faz correspondência fuzzy com projetos pelo nome (normalize + lowercase)
 *   - Adiciona GraphEdge com kind "patrocina"
 *   - Soma valores captados no orcamento.captado do nó patrocinador
 *
 * Escreve o resultado enriquecido de volta em data/raw/licc-{ano}.json.
 *
 *   npm run merge:patrocinadores
 *   LICC_ANO=2025 npm run merge:patrocinadores
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { GraphNode, GraphEdge } from "@/types/graph";
import { slugificar, normalizar, nomesCorrespondem } from "@/lib/text";
import type { PatrocinadoresColeta } from "./scrape-secult";

const DIR_BRUTO = join(process.cwd(), "data", "raw");

// ---------------------------------------------------------------------------
// Tipos do arquivo licc-{ano}.json
// ---------------------------------------------------------------------------

interface LiccBruto {
  coletadoEm: string;
  ano: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Correspondência fuzzy de projetos por nome
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const ano = Number(process.env.LICC_ANO ?? 2026);

  const arquivoPatrocinadores = join(DIR_BRUTO, `patrocinadores-${ano}.json`);
  const arquivoGrafo = join(DIR_BRUTO, `licc-${ano}.json`);

  // Valida existência dos arquivos de entrada
  if (!existsSync(arquivoPatrocinadores)) {
    console.error(`✗ Arquivo não encontrado: ${arquivoPatrocinadores}`);
    console.error(
      "  Execute primeiro: npm run scrape:secult",
    );
    process.exitCode = 1;
    return;
  }

  if (!existsSync(arquivoGrafo)) {
    console.error(`✗ Arquivo não encontrado: ${arquivoGrafo}`);
    console.error(
      "  Execute primeiro: npm run ingest  (ou npm run data)",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`→ lendo patrocinadores de ${arquivoPatrocinadores}`);
  const coleta: PatrocinadoresColeta = JSON.parse(
    readFileSync(arquivoPatrocinadores, "utf8"),
  );

  console.log(`→ lendo grafo de ${arquivoGrafo}`);
  const grafo: LiccBruto = JSON.parse(readFileSync(arquivoGrafo, "utf8"));

  // Índice de projetos existentes (kind === "projeto") por nome normalizado
  const projetos = grafo.nodes.filter((n) => n.kind === "projeto");
  const idsPorNomeNorm = new Map(
    projetos.map((n) => [normalizar(n.nome), n.id]),
  );

  const vistos = new Set(grafo.nodes.map((n) => n.id));
  const arestasExistentes = new Set(grafo.edges.map((e) => e.id));

  let nosAdicionados = 0;
  let arestasAdicionadas = 0;
  let projetosVinculados = 0;

  for (const pat of coleta.patrocinadores) {
    const idPat = `pat-${slugificar(pat.nome)}`;

    // Calcula total captado por este patrocinador
    const totalCaptado = pat.valorTotal ??
      pat.projetos.reduce((s, p) => s + (p.valor ?? 0), 0);

    // Cria (ou atualiza) o nó do patrocinador
    if (!vistos.has(idPat)) {
      const no: GraphNode = {
        id: idPat,
        slug: slugificar(pat.nome),
        kind: "patrocinador",
        nome: pat.nome,
        proveniencia: "oficial",
        fundamentos: ["lei-11246-2021"],
        fontes: [{ rotulo: pat.fonte, url: pat.fonte }],
        ...(totalCaptado > 0
          ? { orcamento: { autorizado: totalCaptado, captado: totalCaptado } }
          : {}),
        ...(pat.cnpj ? { meta: { cnpj: pat.cnpj } } : {}),
      };
      grafo.nodes.push(no);
      vistos.add(idPat);
      nosAdicionados++;
    } else {
      // Atualiza captado se já existia
      const existente = grafo.nodes.find((n) => n.id === idPat);
      if (existente && totalCaptado > 0) {
        existente.orcamento = {
          autorizado: totalCaptado,
          captado: totalCaptado,
          ...existente.orcamento,
        };
      }
    }

    // Vincula projetos pelo nome (correspondência fuzzy)
    for (const proj of pat.projetos) {
      const nomeNorm = normalizar(proj.nome);

      // Procura correspondência exata primeiro, depois fuzzy
      let idProjeto = idsPorNomeNorm.get(nomeNorm);
      if (!idProjeto) {
        for (const [nomeExistente, idExistente] of idsPorNomeNorm) {
          if (nomesCorrespondem(nomeExistente, nomeNorm)) {
            idProjeto = idExistente;
            break;
          }
        }
      }

      if (!idProjeto) {
        console.warn(
          `  ⚠ projeto não encontrado no grafo: "${proj.nome}" (patrocinador: ${pat.nome})`,
        );
        continue;
      }

      const idAresta = `patrocina:${idPat}->${idProjeto}`;
      if (!arestasExistentes.has(idAresta)) {
        grafo.edges.push({
          id: idAresta,
          source: idPat,
          target: idProjeto,
          kind: "patrocina",
          proveniencia: "oficial",
          ...(proj.valor ? { peso: proj.valor } : {}),
        });
        arestasExistentes.add(idAresta);
        arestasAdicionadas++;
        projetosVinculados++;
      }
    }
  }

  // Grava grafo enriquecido
  mkdirSync(DIR_BRUTO, { recursive: true });
  writeFileSync(arquivoGrafo, JSON.stringify(grafo, null, 2));

  console.log(`\n✓ grafo enriquecido gravado em ${arquivoGrafo}`);
  console.log(`  ${nosAdicionados} patrocinador(es) adicionado(s)`);
  console.log(`  ${arestasAdicionadas} aresta(s) "patrocina" criada(s) para ${projetosVinculados} projeto(s)`);
  console.log("  execute `npm run build:graph` para consolidar data/graph.json");
}

if (process.argv[1]?.includes("importar-patrocinadores")) void main();

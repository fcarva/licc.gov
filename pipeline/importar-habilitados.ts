/**
 * Monta o grafo da LICC a partir da lista oficial de habilitados, **sem rede**.
 *
 *   npm run importar:habilitados
 *   LICC_ANO=2026 npm run importar:habilitados
 *
 * Lê `data/raw/habilitados-{ano}.csv` e escreve `data/raw/licc-{ano}.json`,
 * que é o mesmo artefato que `npm run ingest` produz — só que sem consultar o
 * Mapa Cultural. É o caminho para quem tem os anexos da SECULT e não tem (ou
 * não quer) acesso à plataforma: a substância da LICC mora nos anexos, não na
 * API, então este caminho sozinho já produz um grafo real.
 *
 * Rodar `npm run ingest` depois acrescenta o que a plataforma publica — URL,
 * descrição, id — sem criar nem alterar nada.
 *
 * O molde da planilha está em `data/raw/habilitados-exemplo.csv` e o esquema
 * das colunas em `docs/pipeline.md`.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EXERCICIO_PADRAO } from "@/ontology";
import { nosFixos, arestasFixas } from "./seed/institucional";
import { carregarHabilitados, relatar } from "./ingest";

const DIR_BRUTO = join(process.cwd(), "data", "raw");

function main(): void {
  const ano = Number(process.env.LICC_ANO ?? EXERCICIO_PADRAO);
  const planilha = join(DIR_BRUTO, `habilitados-${ano}.csv`);

  if (!existsSync(planilha)) {
    console.error(`✗ não encontrei ${planilha}`);
    console.error("\n  Copie o molde e preencha a partir dos anexos da SECULT:");
    console.error(`    cp data/raw/habilitados-exemplo.csv ${planilha}`);
    console.error("\n  Colunas mínimas: projeto, proponente.");
    console.error("  Preencha fonte_url em cada linha — sem endereço para conferir,");
    console.error("  a linha entra marcada como demonstração, não como oficial.");
    process.exitCode = 1;
    return;
  }

  console.log(`→ lendo ${planilha}`);
  const habilitados = carregarHabilitados(ano);
  if (!habilitados.relatorio) {
    console.error("✗ a planilha não produziu nenhuma linha utilizável.");
    process.exitCode = 1;
    return;
  }

  const nodes = [...nosFixos(ano), ...habilitados.nodes];
  const edges = [...arestasFixas(ano), ...habilitados.edges];

  mkdirSync(DIR_BRUTO, { recursive: true });
  const destino = join(DIR_BRUTO, `licc-${ano}.json`);
  writeFileSync(
    destino,
    JSON.stringify({ coletadoEm: new Date().toISOString(), ano, nodes, edges }, null, 2),
  );

  relatar(habilitados.relatorio, ano);
  console.log(`\n✓ gravado em ${destino}`);
  console.log(`  → ${nodes.length} nós e ${edges.length} arestas`);
  console.log("\n  execute `npm run build:graph` para consolidar data/graph.json");
  console.log("  e, se tiver acesso à plataforma, `npm run ingest` para enriquecer");
}

if (process.argv[1]?.includes("importar-habilitados")) main();

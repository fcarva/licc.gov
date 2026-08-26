/**
 * Raspa páginas da SECULT-ES e do Mapa Cultural ES em busca de dados de
 * patrocinadores (patrocinadores) e valores captados da LICC.
 *
 * Requer a variável de ambiente FIRECRAWL_API_KEY.
 *
 *   FIRECRAWL_API_KEY=fc-... npm run scrape:secult
 *   LICC_ANO=2025 FIRECRAWL_API_KEY=fc-... npm run scrape:secult
 *
 * O resultado é gravado em data/raw/patrocinadores-{ano}.json, no formato
 * PatrocinadoresColeta, que importar-patrocinadores.ts consome.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Tipos de saída
// ---------------------------------------------------------------------------

export interface PatrocinadoresColeta {
  coletadoEm: string;
  ano: number;
  fontes: string[];
  patrocinadores: Array<{
    nome: string;
    cnpj?: string;
    projetos: Array<{ nome: string; valor?: number }>;
    valorTotal?: number;
    fonte: string;
  }>;
}

// ---------------------------------------------------------------------------
// Firecrawl
// ---------------------------------------------------------------------------

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: { title?: string; sourceURL?: string };
  };
  error?: string;
}

async function raspar(url: string, apiKey: string): Promise<string | null> {
  console.log(`  → raspando ${url}`);
  const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });

  if (!resp.ok) {
    console.warn(`  ✗ HTTP ${resp.status} para ${url}`);
    return null;
  }

  const json = (await resp.json()) as FirecrawlResponse;
  if (!json.success || !json.data?.markdown) {
    console.warn(`  ✗ Firecrawl não retornou markdown para ${url}: ${json.error ?? "sem dados"}`);
    return null;
  }

  return json.data.markdown;
}

// ---------------------------------------------------------------------------
// Extração de patrocinadores do markdown
// ---------------------------------------------------------------------------

/** Limpa e normaliza um nome de empresa/organização. */
function limparNome(s: string): string {
  return s
    .replace(/\*+/g, "")
    .replace(/#+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links markdown
    .replace(/\s+/g, " ")
    .trim();
}

/** Converte "R$ 1.234.567,89" ou "1234567.89" para número, ou undefined. */
function parseBRL(s: string): number | undefined {
  const limpo = s.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(limpo);
  return isNaN(n) ? undefined : n;
}

interface PatrocinadoresExtraidos {
  patrocinadores: Array<{
    nome: string;
    cnpj?: string;
    projetos: Array<{ nome: string; valor?: number }>;
    valorTotal?: number;
    fonte: string;
  }>;
}

/**
 * Tenta extrair patrocinadores de um bloco de markdown.
 *
 * Padrões reconhecidos:
 *   - "Patrocinado por <Nome>"
 *   - "Patrocinador: <Nome>"
 *   - Tabelas markdown com coluna "Patrocinador" ou "Empresa"
 *   - Linhas "* <Nome da Empresa> — <Valor>"
 */
function extrairPatrocinadores(markdown: string, fonte: string): PatrocinadoresExtraidos {
  const mapa = new Map<string, PatrocinadoresExtraidos["patrocinadores"][number]>();

  const adicionar = (nome: string, projeto?: string, valor?: number) => {
    const chave = nome.toLowerCase();
    if (!mapa.has(chave)) {
      mapa.set(chave, { nome, projetos: [], fonte });
    }
    const p = mapa.get(chave)!;
    if (projeto) {
      p.projetos.push({ nome: projeto, valor });
      if (valor) p.valorTotal = (p.valorTotal ?? 0) + valor;
    }
  };

  const linhas = markdown.split("\n");

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Padrão: "Patrocinado por X" / "Patrocinador: X" / "Patrocinadores: X, Y"
    const mPatrocinado = linha.match(
      /patrocinado(?:\s+por)?[:\s]+(.+)/i,
    );
    if (mPatrocinado) {
      const nomes = mPatrocinado[1].split(/[,;]/);
      for (const n of nomes) {
        const nome = limparNome(n);
        if (nome.length > 2) adicionar(nome);
      }
      continue;
    }

    const mPatrocinador = linha.match(/^patrocinador(?:es)?[:\s]+(.+)/i);
    if (mPatrocinador) {
      const nomes = mPatrocinador[1].split(/[,;]/);
      for (const n of nomes) {
        const nome = limparNome(n);
        if (nome.length > 2) adicionar(nome);
      }
      continue;
    }

    // Tabelas markdown: | Empresa/Patrocinador | Projeto | Valor |
    if (linha.startsWith("|")) {
      const celulas = linha.split("|").map((c) => c.trim()).filter(Boolean);
      // Detecta se é linha de cabeçalho ou separador
      if (celulas.every((c) => /^[-:]+$/.test(c))) continue;

      // Tenta identificar índices pelo cabeçalho acima
      const linhaCab = linhas[i - 1] ?? "";
      const cabecalhos = linhaCab
        .split("|")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);

      const iEmpresa = cabecalhos.findIndex((c) =>
        /empresa|patrocinador|sponsor/.test(c),
      );
      const iProjeto = cabecalhos.findIndex((c) => /projeto|project/.test(c));
      const iValor = cabecalhos.findIndex((c) => /valor|value|montante|r\$/.test(c));

      if (iEmpresa >= 0 && celulas[iEmpresa]) {
        const nome = limparNome(celulas[iEmpresa]);
        const projeto = iProjeto >= 0 ? limparNome(celulas[iProjeto] ?? "") : undefined;
        const valorStr = iValor >= 0 ? celulas[iValor] : undefined;
        const valor = valorStr ? parseBRL(valorStr) : undefined;
        if (nome.length > 2) adicionar(nome, projeto || undefined, valor);
      }
      continue;
    }

    // Listas: "- Nome da Empresa — R$ 1.000.000" ou "* Nome"
    const mLista = linha.match(/^[-*]\s+(.+)/);
    if (mLista) {
      const conteudo = mLista[1];
      // Tenta separar nome e valor por "—", "-", ":"
      const partes = conteudo.split(/\s*[—–-]\s*(?=R\$|\d)/);
      if (partes.length >= 2) {
        const nome = limparNome(partes[0]);
        const valor = parseBRL(partes[1]);
        if (nome.length > 2 && !isNaN(valor ?? NaN)) {
          adicionar(nome, undefined, valor);
        }
      }
      continue;
    }

    // Linhas avulsas com CNPJ (padrão XX.XXX.XXX/XXXX-XX)
    const mCnpj = linha.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (mCnpj) {
      // Tenta capturar o nome antes do CNPJ
      const antes = linha.slice(0, linha.indexOf(mCnpj[1])).replace(/[|:,]/g, "").trim();
      const nome = limparNome(antes);
      if (nome.length > 2) {
        const chave = nome.toLowerCase();
        if (!mapa.has(chave)) mapa.set(chave, { nome, projetos: [], fonte });
        mapa.get(chave)!.cnpj = mCnpj[1];
      }
    }
  }

  return { patrocinadores: Array.from(mapa.values()) };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const URLS_SECULT = [
  "https://secult.es.gov.br/sobre-a-licc",
  "https://secult.es.gov.br/noticias",
  "https://mapa.cultura.es.gov.br/oportunidade/2317/",
];

const DIR_BRUTO = join(process.cwd(), "data", "raw");

async function main(): Promise<void> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error("✗ FIRECRAWL_API_KEY não definida.");
    console.error("  Defina a variável e repita: FIRECRAWL_API_KEY=fc-... npm run scrape:secult");
    process.exitCode = 1;
    return;
  }

  const ano = Number(process.env.LICC_ANO ?? 2026);
  console.log(`→ raspando fontes SECULT-ES para LICC ${ano}…`);

  const coleta: PatrocinadoresColeta = {
    coletadoEm: new Date().toISOString(),
    ano,
    fontes: [],
    patrocinadores: [],
  };

  const mapaFinal = new Map<string, PatrocinadoresColeta["patrocinadores"][number]>();

  for (const url of URLS_SECULT) {
    const markdown = await raspar(url, apiKey);
    if (!markdown) continue;

    coleta.fontes.push(url);
    const { patrocinadores } = extrairPatrocinadores(markdown, url);
    console.log(`    ${patrocinadores.length} patrocinador(es) identificado(s) em ${url}`);

    for (const p of patrocinadores) {
      const chave = p.nome.toLowerCase();
      if (!mapaFinal.has(chave)) {
        mapaFinal.set(chave, { ...p, projetos: [...p.projetos] });
      } else {
        const existente = mapaFinal.get(chave)!;
        for (const proj of p.projetos) {
          existente.projetos.push(proj);
          if (proj.valor) existente.valorTotal = (existente.valorTotal ?? 0) + proj.valor;
        }
        if (p.cnpj && !existente.cnpj) existente.cnpj = p.cnpj;
      }
    }
  }

  coleta.patrocinadores = Array.from(mapaFinal.values());

  mkdirSync(DIR_BRUTO, { recursive: true });
  const destino = join(DIR_BRUTO, `patrocinadores-${ano}.json`);
  writeFileSync(destino, JSON.stringify(coleta, null, 2));

  console.log(`\n✓ ${coleta.patrocinadores.length} patrocinador(es) gravado(s) em ${destino}`);
  console.log("  execute `npm run merge:patrocinadores` para incorporar ao grafo");
}

if (process.argv[1]?.includes("scrape-secult")) void main();

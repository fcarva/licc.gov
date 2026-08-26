/**
 * Cliente da API REST do Mapas Culturais.
 *
 * O Mapa Cultural do Espírito Santo (https://mapa.cultura.es.gov.br) roda a
 * plataforma Mapas Culturais, que expõe uma API de leitura pública em
 * `/api/{entidade}/find`. Este módulo implementa a gramática de consulta
 * documentada no repositório oficial:
 *
 *   documentation/docs/mc_config_api.md — github.com/mapasculturais/mapasculturais
 *
 * Parâmetros de controle: `@select`, `@order`, `@limit`, `@page`, `@files`,
 * `@or`, `@type`. Operadores de filtro: `EQ`, `!EQ`, `LIKE(*x)`, `AND(..)`,
 * `OR(..)`, `BET(a,b)`, `IN(..)`, `GEONEAR(lng,lat,raio)` e a referência a
 * entidades relacionadas na forma `EQ(@Agent:1)`.
 */

export const BASE_PADRAO = "https://mapa.cultura.es.gov.br";

/** Entidades da plataforma que expõem `find` sem autenticação. */
export type Entidade =
  | "agent"
  | "space"
  | "event"
  | "project"
  | "opportunity"
  | "seal";

export interface ClienteOpcoes {
  base?: string;
  /** Itens por página. A plataforma costuma limitar a algumas centenas. */
  tamanhoPagina?: number;
  /** Pausa entre requisições, em ms — cortesia com um servidor público. */
  intervaloMs?: number;
  /** Tentativas por requisição antes de desistir. */
  tentativas?: number;
  /** Timeout por requisição, em ms. */
  timeoutMs?: number;
  /** Recebe mensagens de progresso. */
  log?: (msg: string) => void;
}

export interface Consulta {
  /** Campos a retornar, ex.: "id,name,shortDescription,terms". */
  select?: string;
  /** Ordenação, ex.: "name ASC" ou "createTimestamp DESC". */
  order?: string;
  /** Arquivos a resolver, ex.: "(avatar,avatar.avatarSmall):url". */
  files?: string;
  /** Trata os filtros como OR em vez de AND. */
  or?: boolean;
  /** Filtros por campo, ex.: { id: "BET(100,200)", "term:area": "LIKE(Música)" }. */
  filtros?: Record<string, string>;
  /** Teto de itens; `undefined` percorre todas as páginas. */
  maximo?: number;
}

export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(message);
    this.name = "ErroApi";
  }
}

export class MapasCulturais {
  private readonly base: string;
  private readonly tamanhoPagina: number;
  private readonly intervaloMs: number;
  private readonly tentativas: number;
  private readonly timeoutMs: number;
  private readonly log: (msg: string) => void;

  constructor(opcoes: ClienteOpcoes = {}) {
    this.base = (opcoes.base ?? BASE_PADRAO).replace(/\/+$/, "");
    this.tamanhoPagina = opcoes.tamanhoPagina ?? 100;
    this.intervaloMs = opcoes.intervaloMs ?? 250;
    this.tentativas = opcoes.tentativas ?? 3;
    this.timeoutMs = opcoes.timeoutMs ?? 30_000;
    this.log = opcoes.log ?? (() => {});
  }

  /** Versão da instalação — usado como teste de conectividade. */
  async versao(): Promise<string> {
    const r = await this.requisitar(`${this.base}/api/site/version`);
    return typeof r === "string" ? r : JSON.stringify(r);
  }

  /**
   * Percorre `/api/{entidade}/find` paginando até esgotar os resultados
   * ou atingir `maximo`.
   */
  async buscar<T = Record<string, unknown>>(
    entidade: Entidade,
    consulta: Consulta = {},
  ): Promise<T[]> {
    const resultados: T[] = [];
    let pagina = 1;

    for (;;) {
      const url = this.montarUrl(entidade, consulta, pagina);
      const lote = (await this.requisitar(url)) as T[];

      if (!Array.isArray(lote)) {
        throw new ErroApi(
          `Resposta inesperada de ${entidade}/find: esperava um array`,
          undefined,
          url,
        );
      }

      resultados.push(...lote);
      this.log(
        `  ${entidade}: página ${pagina} → ${lote.length} itens (total ${resultados.length})`,
      );

      const fimDaLista = lote.length < this.tamanhoPagina;
      const atingiuTeto =
        consulta.maximo !== undefined && resultados.length >= consulta.maximo;

      if (fimDaLista || atingiuTeto) break;

      pagina += 1;
      await pausar(this.intervaloMs);
    }

    return consulta.maximo ? resultados.slice(0, consulta.maximo) : resultados;
  }

  /** Monta a URL de uma página respeitando a gramática de parâmetros. */
  montarUrl(entidade: Entidade, consulta: Consulta, pagina: number): string {
    const p = new URLSearchParams();
    if (consulta.select) p.set("@select", consulta.select);
    if (consulta.order) p.set("@order", consulta.order);
    if (consulta.files) p.set("@files", consulta.files);
    if (consulta.or) p.set("@or", "1");
    p.set("@limit", String(this.tamanhoPagina));
    p.set("@page", String(pagina));
    for (const [campo, expressao] of Object.entries(consulta.filtros ?? {})) {
      p.set(campo, expressao);
    }
    return `${this.base}/api/${entidade}/find?${p.toString()}`;
  }

  private async requisitar(url: string): Promise<unknown> {
    let ultimoErro: unknown;

    for (let tentativa = 1; tentativa <= this.tentativas; tentativa++) {
      const controle = new AbortController();
      const timer = setTimeout(() => controle.abort(), this.timeoutMs);
      try {
        const resposta = await fetch(url, {
          signal: controle.signal,
          headers: {
            Accept: "application/json",
            // Identifica o robô para quem administra o servidor público.
            "User-Agent":
              "licc.gov/0.1 (+https://github.com/fcarva/licc.gov) coletor de dados abertos",
          },
        });

        if (!resposta.ok) {
          throw new ErroApi(
            `HTTP ${resposta.status} ${resposta.statusText}`,
            resposta.status,
            url,
          );
        }
        return await resposta.json();
      } catch (erro) {
        ultimoErro = erro;
        // 4xx não melhora com repetição; só insiste em falha de rede ou 5xx.
        if (erro instanceof ErroApi && erro.status && erro.status < 500) throw erro;
        if (tentativa < this.tentativas) {
          const espera = 2 ** tentativa * 500;
          this.log(`  tentativa ${tentativa} falhou, repetindo em ${espera}ms`);
          await pausar(espera);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw ultimoErro instanceof Error
      ? ultimoErro
      : new ErroApi(String(ultimoErro), undefined, url);
  }
}

function pausar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ---------------------------------------------------------------------------
 * Formatos brutos retornados pela plataforma.
 * Só declaramos os campos que o pipeline realmente lê.
 * ------------------------------------------------------------------------- */

export interface AgenteBruto {
  id: number;
  name: string;
  shortDescription?: string | null;
  type?: { id: number; name: string } | number | null;
  terms?: { area?: string[]; [k: string]: string[] | undefined } | null;
  endereco?: string | null;
  En_Municipio?: string | null;
  En_Estado?: string | null;
  site?: string | null;
  singleUrl?: string | null;
}

export interface ProjetoBruto {
  id: number;
  name: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  owner?: { id: number; name: string } | null;
  terms?: { area?: string[]; [k: string]: string[] | undefined } | null;
  singleUrl?: string | null;
  createTimestamp?: { date: string } | string | null;
}

export interface OportunidadeBruta {
  id: number;
  name: string;
  shortDescription?: string | null;
  registrationFrom?: { date: string } | string | null;
  registrationTo?: { date: string } | string | null;
  singleUrl?: string | null;
  owner?: { id: number; name: string } | null;
}

export interface EventoBruto {
  id: number;
  name: string;
  shortDescription?: string | null;
  terms?: { area?: string[]; [k: string]: string[] | undefined } | null;
  singleUrl?: string | null;
  occurrences?: Array<{
    id: number;
    rule?: { description?: string; startsOn?: string; endsOn?: string } | string | null;
    space?: { id: number; name: string } | null;
  }> | null;
}

export interface EspacoBruto {
  id: number;
  name: string;
  En_Municipio?: string | null;
  endereco?: string | null;
  location?: { latitude: number; longitude: number } | null;
  terms?: { area?: string[]; [k: string]: string[] | undefined } | null;
  singleUrl?: string | null;
}

/* ---------------------------------------------------------------------------
 * Consultas prontas usadas pelo `pipeline/ingest.ts`.
 * ------------------------------------------------------------------------- */

/** Agentes culturais — a base dos proponentes. */
export const CONSULTA_AGENTES: Consulta = {
  select: "id,name,shortDescription,type,terms,endereco,En_Municipio,En_Estado,site,singleUrl",
  order: "name ASC",
};

/** Projetos cadastrados na plataforma. */
export const CONSULTA_PROJETOS: Consulta = {
  select: "id,name,shortDescription,owner.{id,name},terms,singleUrl,createTimestamp",
  order: "createTimestamp DESC",
};

/**
 * Oportunidades — os editais. A LICC 2026 é a oportunidade 2317 do
 * Mapa Cultural do ES; a LICC 2025 é a 1878.
 */
export const CONSULTA_OPORTUNIDADES: Consulta = {
  select: "id,name,shortDescription,registrationFrom,registrationTo,owner.{id,name},singleUrl",
  order: "id DESC",
};

/** Espaços culturais — apoiam a leitura territorial. */
export const CONSULTA_ESPACOS: Consulta = {
  select: "id,name,En_Municipio,endereco,location,terms,singleUrl",
  order: "name ASC",
};

/**
 * Eventos — a agenda cultural. `occurrences` traz a regra de repetição e o
 * espaço de cada ocorrência; `rule.description` já vem legível para humanos.
 */
export const CONSULTA_EVENTOS: Consulta = {
  select:
    "id,name,shortDescription,terms,singleUrl,occurrences.{id,rule,space.{id,name}}",
  order: "id DESC",
};

/** IDs conhecidos das oportunidades da LICC no Mapa Cultural do ES. */
export const OPORTUNIDADES_LICC = {
  2025: 1878,
  2026: 2317,
} as const;

import { slugificar } from "@/lib/text";

export interface Municipio {
  id: string;
  slug: string;
  nome: string;
  /** Microrregião de planejamento do Espírito Santo. */
  regiao: Regiao;
  /** Integra a Região Metropolitana da Grande Vitória. */
  rmgv: boolean;
}

export type Regiao =
  | "Metropolitana"
  | "Central Serrana"
  | "Sudoeste Serrana"
  | "Litoral Sul"
  | "Central Sul"
  | "Caparaó"
  | "Rio Doce"
  | "Centro-Oeste"
  | "Nordeste"
  | "Noroeste";

/**
 * Municípios da Região Metropolitana da Grande Vitória.
 *
 * É a lista que define, por exclusão, quais projetos contam para a cota de
 * 10% reservada a iniciativas fora da RMGV.
 */
export const RMGV = [
  "Cariacica",
  "Fundão",
  "Guarapari",
  "Serra",
  "Viana",
  "Vila Velha",
  "Vitória",
] as const;

const POR_REGIAO: Record<Regiao, string[]> = {
  Metropolitana: [...RMGV],
  "Central Serrana": [
    "Itaguaçu",
    "Itarana",
    "Santa Leopoldina",
    "Santa Maria de Jetibá",
    "Santa Teresa",
  ],
  "Sudoeste Serrana": [
    "Afonso Cláudio",
    "Brejetuba",
    "Conceição do Castelo",
    "Domingos Martins",
    "Laranja da Terra",
    "Marechal Floriano",
    "Venda Nova do Imigrante",
  ],
  "Litoral Sul": [
    "Alfredo Chaves",
    "Anchieta",
    "Iconha",
    "Itapemirim",
    "Marataízes",
    "Piúma",
    "Presidente Kennedy",
    "Rio Novo do Sul",
  ],
  "Central Sul": [
    "Atílio Vivácqua",
    "Cachoeiro de Itapemirim",
    "Castelo",
    "Jerônimo Monteiro",
    "Mimoso do Sul",
    "Muqui",
    "Vargem Alta",
  ],
  Caparaó: [
    "Alegre",
    "Apiacá",
    "Bom Jesus do Norte",
    "Divino de São Lourenço",
    "Dores do Rio Preto",
    "Guaçuí",
    "Ibatiba",
    "Ibitirama",
    "Irupi",
    "Iúna",
    "Muniz Freire",
    "São José do Calçado",
  ],
  "Rio Doce": [
    "Aracruz",
    "Baixo Guandu",
    "Colatina",
    "Governador Lindenberg",
    "Ibiraçu",
    "João Neiva",
    "Linhares",
    "Marilândia",
    "Rio Bananal",
    "São Roque do Canaã",
    "Sooretama",
  ],
  "Centro-Oeste": [
    "Água Doce do Norte",
    "Águia Branca",
    "Alto Rio Novo",
    "Mantenópolis",
    "Pancas",
    "São Domingos do Norte",
    "São Gabriel da Palha",
  ],
  Nordeste: [
    "Boa Esperança",
    "Conceição da Barra",
    "Jaguaré",
    "Montanha",
    "Mucurici",
    "Pedro Canário",
    "Pinheiros",
    "Ponto Belo",
    "São Mateus",
  ],
  Noroeste: [
    "Barra de São Francisco",
    "Ecoporanga",
    "Nova Venécia",
    "Vila Pavão",
    "Vila Valério",
  ],
};

/**
 * Os 78 municípios do Espírito Santo.
 *
 * O recorte por microrregião de planejamento varia conforme a fonte oficial
 * consultada; aqui ele serve como agrupamento de leitura. A marcação `rmgv`,
 * essa sim, é normativa — é dela que depende a cota territorial da LICC.
 */
export const MUNICIPIOS: Municipio[] = Object.entries(POR_REGIAO)
  .flatMap(([regiao, nomes]) =>
    nomes.map((nome) => ({
      id: `mun-${slugificar(nome)}`,
      slug: slugificar(nome),
      nome,
      regiao: regiao as Regiao,
      rmgv: (RMGV as readonly string[]).includes(nome),
    })),
  )
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

export const REGIOES: Regiao[] = Object.keys(POR_REGIAO) as Regiao[];

const POR_NOME = new Map(
  MUNICIPIOS.map((m) => [slugificar(m.nome), m] as const),
);

export function municipioPorNome(nome: string): Municipio | undefined {
  return POR_NOME.get(slugificar(nome));
}

export function municipioPorId(id: string): Municipio | undefined {
  return MUNICIPIOS.find((m) => m.id === id);
}

export function municipioPorSlug(slug: string): Municipio | undefined {
  return MUNICIPIOS.find((m) => m.slug === slug);
}

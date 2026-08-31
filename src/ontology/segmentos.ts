import { normalizar } from "@/lib/text";

export interface Segmento {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  /**
   * Termos da taxonomia `area` do Mapas Culturais que caem neste segmento.
   * O pipeline usa esta lista para classificar projetos vindos da API sem
   * depender de um campo próprio da SECULT.
   */
  termosMapaCultural: string[];
  /**
   * Cor da linguagem: traço do vértice, texto do rótulo de setor e, a 50% de
   * opacidade sobre branco, o preenchimento aceso — como no HTML do CivLab.
   */
  cor: string;
}

/**
 * Segmentos culturais da LICC.
 *
 * A LICC aceita projetos "em qualquer formato ou linguagem cultural", de modo
 * que não há uma lista fechada de segmentos na norma. O agrupamento abaixo é
 * derivado da taxonomia `area` da plataforma Mapas Culturais — a mesma que o
 * Mapa Cultural do Espírito Santo usa para classificar agentes, espaços e
 * projetos — e serve como eixo de leitura, não como classificação oficial.
 */
export const SEGMENTOS: Segmento[] = [
  {
    id: "seg-musica",
    slug: "musica",
    nome: "Música",
    descricao:
      "Shows, festivais, gravação e circulação musical, formação e bandas.",
    termosMapaCultural: ["Música"],
    cor: "#c2566f",
  },
  {
    id: "seg-audiovisual",
    slug: "audiovisual",
    nome: "Audiovisual",
    descricao:
      "Cinema, séries, documentários, mostras, festivais e formação audiovisual.",
    termosMapaCultural: ["Audiovisual", "Cinema", "Fotografia"],
    cor: "#c07344",
  },
  {
    id: "seg-artes-cenicas",
    slug: "artes-cenicas",
    nome: "Artes Cênicas",
    descricao: "Teatro, dança, circo, ópera e artes performativas.",
    termosMapaCultural: ["Teatro", "Dança", "Circo", "Artes Cênicas", "Ópera"],
    cor: "#a55fae",
  },
  {
    id: "seg-patrimonio",
    slug: "patrimonio",
    nome: "Patrimônio Cultural",
    descricao:
      "Salvaguarda do patrimônio imaterial e revitalização do patrimônio arquitetônico.",
    termosMapaCultural: [
      "Patrimônio Cultural",
      "Patrimônio Imaterial",
      "Patrimônio Material",
      "Arquitetura",
      "Arqueologia",
    ],
    cor: "#96754a",
  },
  {
    id: "seg-literatura",
    slug: "literatura",
    nome: "Livro, Leitura e Literatura",
    descricao: "Edição, feiras literárias, bibliotecas e mediação de leitura.",
    termosMapaCultural: [
      "Livro, Leitura e Literatura",
      "Literatura",
      "Livro",
      "Leitura",
    ],
    cor: "#5f7ec2",
  },
  {
    id: "seg-artes-visuais",
    slug: "artes-visuais",
    nome: "Artes Visuais",
    descricao: "Exposições, artes plásticas, design, moda e arte urbana.",
    termosMapaCultural: ["Artes Visuais", "Design", "Moda", "Arte Urbana"],
    cor: "#4a90a8",
  },
  {
    id: "seg-culturas-populares",
    slug: "culturas-populares",
    nome: "Culturas Populares e Tradicionais",
    descricao:
      "Congo, folia de reis, mestres de ofício, culturas indígenas, quilombolas e de matriz africana.",
    termosMapaCultural: [
      "Cultura Popular",
      "Culturas Populares",
      "Artesanato",
      "Culturas Indígenas",
      "Culturas Afro-brasileiras",
      "Gastronomia",
    ],
    cor: "#5d9464",
  },
  {
    id: "seg-museus-memoria",
    slug: "museus-memoria",
    nome: "Museus e Memória",
    descricao: "Museus, arquivos, acervos e centros de memória.",
    termosMapaCultural: ["Museu", "Arquivo", "Memória", "Biblioteca"],
    cor: "#8172c0",
  },
  {
    id: "seg-cultura-digital",
    slug: "cultura-digital",
    nome: "Cultura Digital e Gestão",
    descricao:
      "Jogos, cultura digital, economia criativa, formação e gestão cultural.",
    termosMapaCultural: [
      "Cultura Digital",
      "Gestão Cultural",
      "Jogos",
      "Economia Criativa",
    ],
    cor: "#6d7a8a",
  },
];

const INDICE_TERMOS: Map<string, Segmento> = (() => {
  const m = new Map<string, Segmento>();
  for (const seg of SEGMENTOS) {
    for (const termo of seg.termosMapaCultural) {
      m.set(normalizar(termo), seg);
    }
    m.set(normalizar(seg.nome), seg);
  }
  return m;
})();

/**
 * Resolve um termo da taxonomia do Mapa Cultural para um segmento da LICC.
 * Retorna `undefined` quando o termo não se encaixa — o pipeline então
 * mantém o projeto sem segmento em vez de forçar uma classificação errada.
 */
export function segmentoPorTermo(termo: string): Segmento | undefined {
  const chave = normalizar(termo);
  const direto = INDICE_TERMOS.get(chave);
  if (direto) return direto;
  for (const [t, seg] of INDICE_TERMOS) {
    if (chave.includes(t) || t.includes(chave)) return seg;
  }
  return undefined;
}

export function segmentoPorId(id: string): Segmento | undefined {
  return SEGMENTOS.find((s) => s.id === id);
}

export function segmentoPorSlug(slug: string): Segmento | undefined {
  return SEGMENTOS.find((s) => s.slug === slug);
}

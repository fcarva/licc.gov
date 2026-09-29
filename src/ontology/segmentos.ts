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

// ---------------------------------------------------------------------------
// Classificação por título
// ---------------------------------------------------------------------------

/**
 * Regras que inferem a linguagem cultural do **título** do projeto.
 *
 * ## Por que isto existe
 *
 * Nenhum dos dois anexos da SECULT publica a linguagem do projeto: nem a lista
 * de habilitados, nem o de recurso captado. A cobertura de `segmento` era 0%, e
 * com ela ficavam mudos o anel externo do grafo (que setoriza por linguagem) e
 * a conversão autorizado→captado por linguagem.
 *
 * ## O que isto é, e o que não é
 *
 * É `derivado` — "calculado ou classificado a partir de dados oficiais", que é
 * exatamente a terceira proveniência do modelo. **Não é `oficial`**, e o nó
 * carrega `meta.segmentoInferido` para a interface poder dizê-lo.
 *
 * A ordem importa: vale o primeiro casamento, e as regras vão da forma
 * artística mais específica para a mais geral. Título que não casa fica
 * **sem segmento** — ausente, nunca "outros", que seria um balde fingindo
 * classe.
 *
 * ## "Festival" não classifica
 *
 * Aqui esta lista divergiu de propósito do vocabulário herdado do `aval-pol`,
 * que agrupa "música popular e festivais" numa classe só. Festival é **formato
 * de evento**, não linguagem: "Festival de Cinema de Santa Teresa" é
 * audiovisual e "Festival de Teatro de Guaçuí" é artes cênicas, mas "Moqueca
 * Pop Festival" não diz a que linguagem pertence. Palavra que nomeia formato
 * — festival, mostra, encontro, semana — só entra acompanhada da linguagem, e
 * sozinha deixa o projeto sem classe.
 */
export interface RegraTitulo {
  /**
   * Nome curto da regra, para o relatório de auditoria poder citá-la.
   * Não é o id do segmento: duas regras podem apontar para o mesmo segmento.
   */
  id: string;
  segmentoId: string;
  padrao: RegExp;
}

const REGRAS_TITULO: RegraTitulo[] = [
  // Audiovisual antes de tudo: "Festival de Cinema" tem de cair aqui, não em música.
  { id: "audiovisual", segmentoId: "seg-audiovisual", padrao: /cinema|cine\b|\bfilme|curta|longa.?metragem|document[áa]rio|audiovisual|anima[çc][ãa]o|webs[ée]rie|\bs[ée]rie\b|fotograf/i },
  { id: "cenicas", segmentoId: "seg-artes-cenicas", padrao: /teatr|espet[áa]cul|\bdan[çc]a|ballet|\bbal[ée]\b|circo|circens|palha[çc]|c[êe]nic|\bmamulengo|bonecos/i },
  { id: "populares", segmentoId: "seg-culturas-populares", padrao: /congo|folia|\breis\b|jongo|ticumbi|folclor|carnaval|\bsamba|\bboi\b|caxambu|pomeran|quadrilh|capoeira|tradicion|artesanat|ind[íi]gen|quilombo|\bfesta d|divino|padroeir/i },
  { id: "literatura", segmentoId: "seg-literatura", padrao: /\blivro|literat|leitura|poesi|\bpoet|cordel|conta[çc][ãa]o de hist|\bsarau/i },
  { id: "museus", segmentoId: "seg-museus-memoria", padrao: /museu|acervo|arquivo hist|biblioteca|mem[óo]ria/i },
  { id: "patrimonio", segmentoId: "seg-patrimonio", padrao: /patrim[ôo]n|restaura[çc][ãa]o|casar[ãa]o|tombad|\bigreja|capela|s[íi]tio hist/i },
  { id: "visuais", segmentoId: "seg-artes-visuais", padrao: /grafit|graff|arte urbana|\bmural|exposi[çc][ãa]o|artes visuais|escultur|pintur|\bdesign\b|\bmoda\b/i },
  // Música por último entre as linguagens: só chega aqui o que nenhuma forma
  // mais específica reclamou.
  { id: "musica", segmentoId: "seg-musica", padrao: /m[úu]sic|\bshow\b|orquestr|sinf[ôo]n|filarm[ôo]n|camerat|\bcoral\b|\bcoro\b|\bcorais|\bbanda|sanfon|\bviola\b|\bjazz|\brock|\bblues|forr[óo]|sertanej|can[çc][ãa]o|\bcanto\b|\b[óo]pera\b|concerto|\bmpb\b|\bchoro\b|\bcavaquinho/i },
  { id: "digital", segmentoId: "seg-cultura-digital", padrao: /\bjogo|\bgame|cultura digital|economia criativa|gest[ãa]o cultural|podcast|\bpodcast/i },
];

/** Vista somente-leitura das regras, para a auditoria contá-las e nomeá-las. */
export const REGRAS_DE_TITULO: readonly RegraTitulo[] = REGRAS_TITULO;

export interface CasamentoRegra {
  /** Posição da regra na lista. A ordem é o que decide o empate. */
  ordem: number;
  regraId: string;
  segmentoId: string;
  /** O trecho do título que a regex casou — a evidência da classificação. */
  trecho: string;
  /**
   * Em que forma do título a regex casou.
   *
   * `segmentoPorTitulo` testa o normalizado **e** o cru, então regra que casa em
   * só um dos dois depende de acento e é frágil: basta a fonte grafar sem acento
   * (ou com) para a classe mudar. A auditoria precisa ver isso.
   */
  caminho: "ambos" | "normalizado" | "cru";
}

export interface ClassificacaoTitulo {
  titulo: string;
  /** O vencedor: o primeiro casamento na ordem das regras. */
  segmento?: Segmento;
  /**
   * Todos os casamentos, na ordem das regras — não só o vencedor.
   *
   * Com mais de um, a **ordem** está decidindo sozinha qual linguagem o projeto
   * recebe, e essa decisão fica invisível em quem só devolve o vencedor. É o que
   * a auditoria chama de conflito de ordem.
   */
  casamentos: CasamentoRegra[];
}

/**
 * Classifica o título **e devolve a evidência** de como chegou lá.
 *
 * É esta função que `segmentoPorTitulo` usa, de propósito: a auditoria tem de
 * exercitar o caminho de produção. Auditoria que reimplementa o classificador
 * audita uma cópia, e as duas divergem sem avisar.
 */
export function classificarTitulo(titulo: string): ClassificacaoTitulo {
  const t = normalizar(titulo);
  const casamentos: CasamentoRegra[] = [];

  REGRAS_TITULO.forEach((regra, ordem) => {
    // `exec` no lugar de `test` só para guardar o trecho: as regex não têm
    // flag `g`, então não carregam `lastIndex` e a chamada é sem estado.
    const noNormalizado = regra.padrao.exec(t);
    const noCru = regra.padrao.exec(titulo);
    if (!noNormalizado && !noCru) return;
    casamentos.push({
      ordem,
      regraId: regra.id,
      segmentoId: regra.segmentoId,
      trecho: (noNormalizado ?? noCru)![0],
      caminho: noNormalizado && noCru ? "ambos" : noNormalizado ? "normalizado" : "cru",
    });
  });

  return {
    titulo,
    segmento: casamentos.length ? segmentoPorId(casamentos[0].segmentoId) : undefined,
    casamentos,
  };
}

/**
 * Infere a linguagem cultural do título, ou devolve `undefined`.
 *
 * Use **só** quando a fonte não publicar o segmento. O resultado é `derivado`
 * e precisa ser marcado como tal onde aparecer.
 */
export function segmentoPorTitulo(titulo: string): Segmento | undefined {
  return classificarTitulo(titulo).segmento;
}

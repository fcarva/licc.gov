import type { Fonte } from "@/types/graph";

export interface FundamentoLegal {
  id: string;
  slug: string;
  norma: string;
  nome: string;
  descricao: string;
  publicadoEm?: string;
  url?: string;
  /** `false` quando a redação exata não pôde ser conferida na fonte primária. */
  verificado: boolean;
  fonte: Fonte;
}

/**
 * Normas que sustentam a LICC.
 *
 * Cada item carrega `verificado` porque a interface exibe esse selo: a mesma
 * disciplina do CivLab, que ancora toda entidade na norma que a institui, só
 * tem valor se o elo for auditável. `verificado: false` significa "a norma é
 * citada por fonte secundária e ainda não foi conferida no texto oficial".
 */
export const FUNDAMENTOS: FundamentoLegal[] = [
  {
    id: "lei-11246-2021",
    slug: "lei-11246-2021",
    norma: "Lei nº 11.246/2021",
    nome: "Lei de Incentivo à Cultura Capixaba (LICC)",
    descricao:
      "Institui a LICC alterando a Lei nº 7.000/2001. Permite que agentes e grupos culturais recebam patrocínio de empresas contribuintes do ICMS, que em contrapartida obtêm crédito presumido abatível do imposto devido.",
    publicadoEm: "2021-04-07",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Sobre a LICC",
      url: "https://secult.es.gov.br/sobre-a-licc",
    },
  },
  {
    id: "lei-7000-2001",
    slug: "lei-7000-2001",
    norma: "Lei nº 7.000/2001",
    nome: "Lei do ICMS do Espírito Santo",
    descricao:
      "Norma geral do ICMS estadual, alterada pela Lei nº 11.246/2021 para acomodar o crédito presumido da LICC.",
    publicadoEm: "2001-12-27",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Sobre a LICC",
      url: "https://secult.es.gov.br/sobre-a-licc",
    },
  },
  {
    id: "portaria-sefaz-01r-2025",
    slug: "portaria-sefaz-01r-2025",
    norma: "Portaria SEFAZ nº 01-R/2025",
    nome: "Autorização do teto anual de captação",
    descricao:
      "Autoriza a captação de R$ 25 milhões em benefícios fiscais relativos ao ICMS estadual para a LICC.",
    publicadoEm: "2025-01-07",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — ampliação para R$ 25 milhões",
      url: "https://secult.es.gov.br/governo-amplia-para-r-25-milhoes-os-recursos-destinados-a-lei-de-incentivo-a-cultura-capixaba-licc",
    },
  },
  {
    id: "in-licc-2026",
    slug: "instrucao-normativa-licc-2026",
    norma: "Instrução Normativa LICC nº 001/2026",
    nome: "Instrução Normativa da LICC para o exercício de 2026",
    descricao:
      "Disciplina o exercício de 2026. As inscrições correram de 02 de fevereiro a 30 de junho de 2026, exclusivamente pelo Mapa Cultural do Espírito Santo (oportunidade 2317).",
    // Número e data vêm da página de legislação da própria SECULT, que lista
    // "INSTRUÇÃO NORMATIVA Nº 001-2026 DE 12 DE JANEIRO DE 2026" publicada em
    // 13/01/2026. É o órgão publicador identificando o próprio documento — daí
    // o registro seguir conferido. O que o texto da IN diz por dentro não está
    // conferido, e por isso mora em regras próprias, não nesta descrição.
    publicadoEm: "2026-01-12",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Instrução Normativa LICC 2026",
      url: "https://secult.es.gov.br/instrucao-normativa-licc-2026",
    },
  },
  {
    id: "decreto-5035-r-2021",
    slug: "decreto-5035-r-2021",
    norma: "Decreto nº 5.035-R/2021",
    nome: "Regulamento do incentivo fiscal da LICC",
    descricao:
      "Dispõe sobre a regulamentação do incentivo fiscal concedido nos termos dos arts. 5º-B, IX, da Lei nº 7.000, de 27 de dezembro de 2001, com o objetivo de estimular a realização de projetos culturais no Estado. É o elo que faltava entre a lei e as instruções normativas: prevê que a SECULT expeça instrução normativa com os procedimentos e requisitos de cadastramento do proponente.",
    publicadoEm: "2021-12-15",
    // Ementa transcrita de duas fontes independentes; o texto integral não foi
    // lido — o egresso deste ambiente não alcança o domínio da SEFAZ.
    verificado: false,
    fonte: {
      rotulo: "SECULT-ES — Legislação LICC",
      url: "https://secult.es.gov.br/GrupodeArquivos/legislacao-licc",
    },
  },
  {
    id: "lei-14903-2024",
    slug: "lei-14903-2024",
    norma: "Lei Federal nº 14.903/2024",
    nome: "Marco Regulatório do Fomento à Cultura",
    descricao:
      "Estabelece o marco regulatório do fomento à cultura, no âmbito da administração pública da União, dos Estados, do Distrito Federal e dos Municípios. Orienta o controle a mirar o resultado cultural alcançado, e não a punição por falha procedimental na prestação de contas — o que tensiona o desenho das instruções normativas estaduais.",
    publicadoEm: "2024-06-27",
    // Primeira norma federal do grafo. A ementa é literal, recuperada da
    // Câmara dos Deputados; a segunda frase da descrição é leitura de fonte
    // secundária e não do texto, e é ela que mantém este registro não
    // conferido.
    verificado: false,
    fonte: {
      rotulo: "Câmara dos Deputados — publicação original",
      url: "https://www2.camara.leg.br/legin/fed/lei/2024/lei-14903-27-junho-2024-795863-publicacaooriginal-172233-pl.html",
    },
  },
  {
    id: "in-licc-001-2025",
    slug: "instrucao-normativa-licc-001-2025",
    norma: "Instrução Normativa LICC nº 001/2025",
    nome: "Instrução Normativa da LICC para o exercício de 2025",
    descricao:
      "Disciplina a inscrição, a habilitação, a análise de mérito e a tramitação dos projetos da LICC no exercício de 2025, e fixa as cotas de 30% para projetos pautados, 10% para projetos fora da Região Metropolitana e 10% para programas continuados. Publicada como anexo da oportunidade 1878 no Mapa Cultural do Espírito Santo.",
    url: "https://mapa.cultura.es.gov.br/files/opportunity/1878/instrucao-normativa-licc-no-001-2025-2.pdf",
    verificado: true,
    fonte: {
      rotulo: "Mapa Cultural ES — anexo da oportunidade 1878",
      url: "https://mapa.cultura.es.gov.br/files/opportunity/1878/instrucao-normativa-licc-no-001-2025-2.pdf",
    },
  },
];

export interface RegraLICC {
  id: string;
  titulo: string;
  descricao: string;
  /** Fração do teto reservada, quando a regra for uma cota. */
  cota?: number;
  /** Limite absoluto, quando a regra for um teto de contagem. */
  limite?: number;
  fundamentoId: string;
  verificado: boolean;
  /**
   * Por que este painel **não consegue apurar** o cumprimento da regra, mesmo
   * com a norma conferida. Ausente = é apurável com o que o grafo tem.
   *
   * São duas limitações independentes, e o modelo antes só representava uma.
   * `verificado` responde "li a norma?" e se resolve lendo o texto. Este campo
   * responde "consigo calcular o cumprimento?" e, para algumas regras, é
   * permanente: o limite de projetos por proponente soma pessoas jurídicas com
   * sócios ou dirigentes em comum, e sem o Quadro de Sócios e Administradores
   * da Receita Federal nenhum cálculo aqui alcança isso.
   *
   * Sem esta distinção, virar `verificado: true` depois de ler a instrução
   * normativa faria a interface trocar "quem alcançou o número" por "quem
   * descumpriu a norma" — acusação que o dado não sustenta.
   *
   * Guarda a razão, não um booleano mudo, para a tela poder dizer *o quê*.
   */
  naoApuravel?: string;
  fonte: Fonte;
}

/**
 * Regras estruturais da LICC que o grafo audita.
 *
 * A interface usa `cota` para desenhar as barras de reserva no painel de
 * orçamento e `limite` para sinalizar proponentes acima do teto de projetos.
 */
export const REGRAS: RegraLICC[] = [
  {
    id: "cota-pautados",
    titulo: "30% para eventos calendarizados com mais de 10 anos",
    descricao:
      "Trinta por cento dos recursos são destinados a projetos de eventos calendarizados com mais de 10 anos de existência.",
    cota: 0.3,
    fundamentoId: "in-licc-001-2025",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Recurso financeiro captado 2025 (art. 18 da IN 01/2025)",
      url: "https://secult.es.gov.br/licc",
    },
  },
  {
    id: "cota-continuados",
    titulo: "10% para planos plurianuais",
    descricao:
      "Dez por cento dos recursos são destinados a projetos de planos plurianuais cujo objeto trata de formação continuada, manutenção de equipamentos culturais e corpos estáveis.",
    cota: 0.1,
    fundamentoId: "in-licc-001-2025",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Recurso financeiro captado 2025 (art. 18 da IN 01/2025)",
      url: "https://secult.es.gov.br/licc",
    },
  },
  {
    id: "cota-fora-rmgv",
    titulo: "10% fora da Região Metropolitana",
    descricao:
      "Dez por cento dos recursos são destinados a projetos cuja sede do agente cultural e cujos locais de execução estejam em região do Estado diferente da metropolitana.",
    cota: 0.1,
    fundamentoId: "in-licc-001-2025",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Recurso financeiro captado 2025 (art. 18 da IN 01/2025)",
      url: "https://secult.es.gov.br/licc",
    },
  },
  {
    id: "cota-demais",
    titulo: "50% para os demais projetos",
    descricao:
      "Metade dos recursos é destinada aos projetos que não se enquadram nas três reservas anteriores. Faltava no modelo: sem ela as três cotas somavam 50% e o restante do teto aparecia como se não tivesse destinação normativa.",
    cota: 0.5,
    fundamentoId: "in-licc-001-2025",
    verificado: true,
    fonte: {
      rotulo: "SECULT-ES — Recurso financeiro captado 2025 (art. 18 da IN 01/2025)",
      url: "https://secult.es.gov.br/licc",
    },
  },
  {
    id: "limite-projetos-por-proponente",
    titulo: "Máximo de 3 projetos por proponente ao ano",
    descricao:
      "Cada agente cultural pode inscrever até três projetos por ano. O parágrafo único soma no mesmo limite as pessoas jurídicas que tenham sócios ou dirigentes em comum, ainda que com CNPJs distintos. A citação disponível é da IN nº 001/2026; o texto de 2025, a que esta regra está vinculada, não foi conferido, e o limite pode diferir entre exercícios.",
    limite: 3,
    fundamentoId: "in-licc-001-2025",
    verificado: false,
    naoApuravel:
      "o limite soma pessoas jurídicas com sócios ou dirigentes em comum, e o Quadro de Sócios e Administradores da Receita Federal não é consultável por aqui — o grafo enxerga CNPJ isolado, não malha societária",
    fonte: {
      rotulo: "Compilação LegisWeb da Instrução Normativa SECULT nº 001/2026 (fonte secundária)",
      url: "https://www.legisweb.com.br/legislacao/?legislacao=489349",
    },
  },
  {
    id: "vedacao-fragmentacao",
    titulo: "Vedação ao fracionamento entre proponentes distintos",
    descricao:
      "Veda que proponentes aparentemente independentes inscrevam ações que partilhem equipamento, temática e cronograma — o fracionamento disfarçado de um projeto único em vários, para escapar do limite por proponente.",
    fundamentoId: "in-licc-2026",
    verificado: false,
    naoApuravel:
      "os anexos publicados pela SECULT não trazem equipamento, temática nem cronograma dos projetos; não há campo a comparar entre eles",
    fonte: {
      rotulo: "Compilação LegisWeb da Instrução Normativa SECULT nº 001/2026 (fonte secundária)",
      url: "https://www.legisweb.com.br/legislacao/?legislacao=489349",
    },
  },
  {
    id: "sancoes-inadimplemento",
    titulo: "Indeferimento liminar e inscrição em Cadin-ES",
    descricao:
      "O descumprimento de diligências no acompanhamento processual leva a indeferimento liminar e pode levar à inscrição do proponente e de seus sócios no cadastro estadual de inadimplentes (Cadin-ES).",
    // Entra como regra separada de propósito, em vez de engordar a descrição de
    // `in-licc-2026`. Aquele registro está conferido; `verificado` é por
    // registro, e enfiar detalhe não conferido dentro dele quebraria o selo.
    fundamentoId: "in-licc-2026",
    verificado: false,
    naoApuravel:
      "tramitação processual e inscrição em cadastro de inadimplentes não são publicadas nos anexos; o grafo não vê o processo, só o resultado dele",
    fonte: {
      rotulo: "Compilação LegisWeb da Instrução Normativa SECULT nº 001/2026 (fonte secundária)",
      url: "https://www.legisweb.com.br/legislacao/?legislacao=489349",
    },
  },
];

/**
 * Exercício que o catálogo representa por padrão.
 *
 * 2025 é o último ciclo **fechado** da LICC: a Instrução Normativa nº 001/2025
 * está publicada e a oportunidade 1878 do Mapa Cultural já encerrou. A LICC
 * 2026 segue com inscrições abertas até 30/06/2026, então seus números seriam
 * parciais — e um painel de transparência que mostra número parcial sem dizer
 * que é parcial engana mais do que informa.
 */
export const EXERCICIO_PADRAO = 2025;

/** Instrução normativa que rege cada exercício. */
export function normaDoExercicio(ano: number): string {
  return ano >= 2026 ? "in-licc-2026" : "in-licc-001-2025";
}

/** Teto de captação do exercício, em reais. */
export const TETO_AUTORIZADO = 25_000_000;

export const FONTE_TETO: Fonte = {
  rotulo: "Portaria SEFAZ nº 01-R, de 07/01/2025",
  url: "https://secult.es.gov.br/governo-amplia-para-r-25-milhoes-os-recursos-destinados-a-lei-de-incentivo-a-cultura-capixaba-licc",
};

export function fundamentoPorId(id: string): FundamentoLegal | undefined {
  return FUNDAMENTOS.find((f) => f.id === id);
}

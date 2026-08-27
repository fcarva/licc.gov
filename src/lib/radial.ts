/**
 * Matemática do grafo radial e das cadeias de responsabilização.
 *
 * Fica fora do componente porque é lógica pura, testável sem montar React.
 */

import type { Graph, GraphNode, NodeKind } from "@/types/graph";
import { ANEIS, NODE_KINDS, type Forma } from "@/ontology/nodes";
import { EDGE_KINDS } from "@/ontology/edges";

export interface NoPosicionado {
  no: GraphNode;
  x: number;
  y: number;
  /** Raio do símbolo em px. */
  r: number;
  forma: Forma;
  /** Cor forte: traço e texto. */
  cor: string;
  /** Preenchimento quando o vértice acende. */
  corPastel: string;
  /** Raio da órbita a partir do centro. */
  orbita: number;
  angulo: number;
}

/**
 * Fatia angular de um anel setorizado.
 *
 * O anel dos projetos é dividido por linguagem cultural — música, artes
 * cênicas, audiovisual — e cada fatia recebe o nome escrito ao longo do arco.
 * É o que torna visível, no próprio grafo, *que tipo* de cultura o dinheiro
 * financia, sem precisar de um anel a mais.
 */
export interface SetorAnel {
  id: string;
  /** Categoria do anel que este setor divide. */
  kind: NodeKind;
  rotulo: string;
  cor: string;
  anguloInicio: number;
  anguloFim: number;
  raio: number;
  quantidade: number;
}

export interface AnelDesenhado {
  kind: NodeKind;
  rotulo: string;
  papel: string;
  cor: string;
  /** Raio nominal do anel, onde o rótulo é escrito. */
  raio: number;
  quantidade: number;
}

export interface Layout {
  nos: NoPosicionado[];
  aneis: AnelDesenhado[];
  setores: SetorAnel[];
  /** Extensão necessária do meio-lado do viewBox. */
  extensao: number;
}

/**
 * Fração do raio útil em que cada anel assenta.
 *
 * Os valores acompanham a proporção medida no SF Gov Graph, onde os anéis se
 * adensam para fora: o miolo institucional é pequeno e a periferia concentra
 * a maior parte dos vértices.
 */
const FRACAO_POR_ANEL: Record<number, number> = {
  1: 0.3,
  2: 0.52,
  3: 0.73,
  4: 0.93,
};

/** Espaço angular mínimo entre dois símbolos vizinhos, em px de arco. */
const FOLGA_ARCO = 5;
/** Distância entre fileiras escalonadas de um mesmo anel. */
const PASSO_FILEIRA = 17;
/** Respiro angular entre dois setores vizinhos, em radianos. */
const VAO_SETOR = 0.035;
/** O anel que se divide por linguagem cultural. */
const KIND_SETORIZADO: NodeKind = "projeto";

/**
 * Distribui os vértices em anéis concêntricos.
 *
 * Quando um anel tem mais vértices do que cabem na sua circunferência, ele se
 * divide em fileiras escalonadas — é o que produz, no CivLab, o padrão de
 * duas coroas próximas para uma mesma categoria.
 */
export function calcularLayout(grafo: Graph, raioUtil: number): Layout {
  const nos: NoPosicionado[] = [];
  const aneis: AnelDesenhado[] = [];
  const setores: SetorAnel[] = [];
  let extensao = 0;

  // Paleta dos segmentos: os projetos herdam a cor da sua linguagem cultural.
  const segmentos = new Map(
    grafo.nodes
      .filter((n) => n.kind === "segmento")
      .map((n) => [
        n.id,
        {
          nome: n.nome,
          cor: String(n.meta?.cor ?? NODE_KINDS.segmento.cor),
          corPastel: String(n.meta?.corPastel ?? NODE_KINDS.segmento.corPastel),
        },
      ]),
  );
  const paletaDoNo = (n: GraphNode, spec: (typeof ANEIS)[number]) => {
    const seg = segmentos.get(String(n.meta?.segmentoId ?? ""));
    return seg && spec.kind === KIND_SETORIZADO
      ? { cor: seg.cor, corPastel: seg.corPastel }
      : { cor: spec.cor, corPastel: spec.corPastel };
  };

  for (const spec of ANEIS) {
    const doAnel = grafo.nodes.filter((n) => n.kind === spec.kind);
    if (!doAnel.length) continue;

    // Centro: um vértice só, sem órbita.
    if (spec.anel === 0) {
      const no = doAnel[0];
      nos.push({
        no,
        x: 0,
        y: 0,
        r: spec.raioBase,
        forma: spec.forma,
        cor: spec.cor,
        corPastel: spec.corPastel,
        orbita: 0,
        angulo: 0,
      });
      extensao = Math.max(extensao, spec.raioBase);
      continue;
    }

    // Maior captação primeiro: vizinhos no anel ficam comparáveis a olho.
    const ordenados = [...doAnel].sort(
      (a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0),
    );

    const raioNominal = raioUtil * (FRACAO_POR_ANEL[spec.anel ?? 1] ?? 0.9);

    // A escala de tamanho é interna ao anel. Comparar um projeto ao programa
    // inteiro achataria todos os projetos no mesmo raio; comparado aos seus
    // pares, a diferença de captação volta a ser visível.
    const maiorDoAnel = Math.max(
      1,
      ...doAnel.map((n) => n.orcamento?.captado ?? 0),
    );
    const tamanho = (n: GraphNode) => {
      const captado = n.orcamento?.captado ?? 0;
      const escala = captado > 0 ? Math.sqrt(captado / maiorDoAnel) : 0;
      return spec.raioBase * (0.62 + escala * 0.9);
    };

    // Quantos cabem numa volta, dado o símbolo médio.
    const larguraMedia =
      (ordenados.reduce((s, n) => s + tamanho(n) * 2, 0) / ordenados.length) + FOLGA_ARCO;
    const cabemPorFileira = Math.max(
      6,
      Math.floor((2 * Math.PI * raioNominal) / larguraMedia),
    );
    const fileiras = Math.max(1, Math.ceil(ordenados.length / cabemPorFileira));

    /**
     * Agrupamento angular.
     *
     * O anel dos projetos é dividido em fatias contíguas por linguagem
     * cultural; os demais formam um grupo único. Assim `música`, `teatro` e
     * `artes visuais` ocupam arcos identificáveis sem virar um anel próprio —
     * o que devolveria o desenho à condição de taxonomia.
     */
    const grupos: Array<{ id: string; rotulo: string; cor: string; itens: GraphNode[] }> =
      spec.kind === KIND_SETORIZADO
        ? agruparPorSegmento(ordenados, segmentos)
        : [{ id: spec.kind, rotulo: "", cor: spec.cor, itens: ordenados }];

    const totalNoAnel = ordenados.length;
    const vaoTotal = grupos.length > 1 ? VAO_SETOR * grupos.length : 0;
    const disponivel = 2 * Math.PI - vaoTotal;
    // -90° põe o primeiro vértice no topo; o eixo vertical inferior fica
    // livre para a cadeia descer do centro até a periferia.
    let cursor = -Math.PI / 2;

    for (const grupo of grupos) {
      const span = (grupo.itens.length / totalNoAnel) * disponivel;
      const inicio = cursor;

      grupo.itens.forEach((no, j) => {
        const fileira = j % fileiras;
        const posicao = Math.floor(j / fileiras);
        const naFileira = Math.ceil((grupo.itens.length - fileira) / fileiras);
        const passo = span / Math.max(1, naFileira);
        // Escalona o raio e desloca em fileiras alternadas, para que os
        // símbolos não se alinhem em raios idênticos.
        const orbita = raioNominal + (fileira - (fileiras - 1) / 2) * PASSO_FILEIRA;
        const angulo =
          inicio + posicao * passo + passo / 2 + (fileira % 2) * passo * 0.3;
        const r = tamanho(no);
        const { cor, corPastel } = paletaDoNo(no, spec);

        nos.push({
          no,
          x: Math.cos(angulo) * orbita,
          y: Math.sin(angulo) * orbita,
          r,
          forma: spec.forma,
          cor,
          corPastel,
          orbita,
          angulo,
        });
        extensao = Math.max(extensao, orbita + r);
      });

      if (grupos.length > 1) {
        setores.push({
          id: grupo.id,
          kind: spec.kind,
          rotulo: grupo.rotulo,
          cor: grupo.cor,
          anguloInicio: inicio,
          anguloFim: inicio + span,
          raio: raioNominal + ((fileiras - 1) / 2) * PASSO_FILEIRA,
          quantidade: grupo.itens.length,
        });
      }

      cursor = inicio + span + (grupos.length > 1 ? VAO_SETOR : 0);
    }

    aneis.push({
      kind: spec.kind,
      rotulo: spec.rotuloAnel ?? spec.rotuloPlural.toUpperCase(),
      papel: spec.papel ?? "",
      cor: spec.cor,
      raio: raioNominal,
      quantidade: ordenados.length,
    });
  }

  return { nos, aneis, setores, extensao };
}

/**
 * Agrupa os projetos por linguagem cultural, em ordem de captação.
 *
 * Projetos sem segmento resolvido formam um grupo próprio no fim — a lacuna
 * fica visível em vez de ser diluída numa categoria "outros" qualquer, que é a
 * forma silenciosa de esconder classificação faltante.
 */
function agruparPorSegmento(
  projetos: GraphNode[],
  segmentos: Map<string, { nome: string; cor: string; corPastel: string }>,
): Array<{ id: string; rotulo: string; cor: string; itens: GraphNode[] }> {
  const porId = new Map<string, GraphNode[]>();
  for (const p of projetos) {
    const id = String(p.meta?.segmentoId ?? "sem-segmento");
    (porId.get(id) ?? porId.set(id, []).get(id)!).push(p);
  }

  return [...porId.entries()]
    .map(([id, itens]) => {
      const seg = segmentos.get(id);
      return {
        id,
        rotulo: seg?.nome ?? "Sem segmento",
        cor: seg?.cor ?? NODE_KINDS.segmento.cor,
        itens: itens.sort(
          (a, b) => (b.orcamento?.captado ?? 0) - (a.orcamento?.captado ?? 0),
        ),
        captado: itens.reduce((t, x) => t + (x.orcamento?.captado ?? 0), 0),
        semSegmento: id === "sem-segmento",
      };
    })
    // Maior captação primeiro; o grupo sem segmento sempre fecha a volta.
    .sort((a, b) =>
      a.semSegmento !== b.semSegmento
        ? Number(a.semSegmento) - Number(b.semSegmento)
        : b.captado - a.captado,
    )
    .map(({ id, rotulo, cor, itens }) => ({ id, rotulo, cor, itens }));
}

export interface Cadeia {
  /** Vértices que permanecem acesos. */
  nos: Set<string>;
  /** Ligações desenhadas, na ordem em que a história se conta. */
  ligacoes: Array<{
    de: string;
    para: string;
    enfase: "forte" | "fraca";
    /** Verbo escrito sobre a linha, como o "appoints" do CivLab. */
    rotulo?: string;
  }>;
}

/**
 * Monta a cadeia de responsabilização de um vértice.
 *
 * Cada tipo conta uma história diferente sobre o mesmo mecanismo:
 *
 * - **Patrocinador** — o imposto que deixou de ir ao Estado, os projetos que a
 *   empresa escolheu bancar e, por eles, os segmentos que priorizou. É a
 *   leitura que revela concentração setorial do capital.
 * - **Projeto** — quem faz, quem financiou e quem aprovou o enquadramento.
 * - **Proponente** — seus projetos e, através deles, quem os financia.
 * - **Órgão** — o que regula, aprova e fiscaliza.
 */
export function calcularCadeia(grafo: Graph, idSelecionado: string): Cadeia {
  const porId = new Map(grafo.nodes.map((n) => [n.id, n]));
  const alvo = porId.get(idSelecionado);
  const nos = new Set<string>();
  const ligacoes: Cadeia["ligacoes"] = [];

  if (!alvo) return { nos, ligacoes };

  const PUBLICO = "publico-es";
  const ligar = (
    de: string,
    para: string,
    enfase: "forte" | "fraca" = "forte",
    rotulo?: string,
  ) => {
    if (!porId.has(de) || !porId.has(para) || de === para) return;
    if (ligacoes.some((l) => l.de === de && l.para === para)) return;
    nos.add(de);
    nos.add(para);
    ligacoes.push({ de, para, enfase, rotulo });
  };

  nos.add(alvo.id);
  if (porId.has(PUBLICO)) nos.add(PUBLICO);

  const arestasDe = grafo.edges.filter((e) => e.source === alvo.id);
  const arestasPara = grafo.edges.filter((e) => e.target === alvo.id);

  switch (alvo.kind) {
    case "patrocinador": {
      // O elo que dá sentido ao resto: o ICMS que não entrou no caixa estadual.
      ligar(PUBLICO, alvo.id, "forte", "renúncia de ICMS");
      for (const e of arestasDe) {
        if (e.kind !== "patrocina") continue;
        ligar(alvo.id, e.target, "forte", "patrocina");
        // Segmento do projeto financiado — a prioridade setorial da empresa.
        const projeto = porId.get(e.target);
        const seg = String(projeto?.meta?.segmentoId ?? "");
        if (seg) nos.add(seg);
      }
      break;
    }

    case "projeto": {
      const proponente = String(alvo.meta?.proponenteId ?? "");
      const orgao = grafo.edges.find(
        (e) => e.target === alvo.id && (e.kind === "aprova" || e.kind === "fiscaliza"),
      )?.source;

      if (orgao) {
        ligar(PUBLICO, orgao, "fraca");
        ligar(orgao, alvo.id, "forte", "enquadra");
      }
      if (proponente) ligar(proponente, alvo.id, "forte", "propõe");
      for (const e of arestasPara) {
        if (e.kind === "patrocina") ligar(e.source, alvo.id, "forte", "patrocina");
      }
      const seg = String(alvo.meta?.segmentoId ?? "");
      if (seg) nos.add(seg);
      break;
    }

    case "proponente": {
      ligar(PUBLICO, alvo.id, "fraca");
      for (const e of arestasDe) {
        if (e.kind !== "propoe") continue;
        ligar(alvo.id, e.target, "forte", "propõe");
        // Quem banca cada projeto deste proponente.
        for (const p of grafo.edges) {
          if (p.kind === "patrocina" && p.target === e.target) {
            ligar(p.source, e.target, "fraca");
          }
        }
      }
      break;
    }

    case "governanca": {
      ligar(PUBLICO, alvo.id, "forte");
      for (const e of arestasDe) {
        if (["regula", "aprova", "fiscaliza", "nomeia"].includes(e.kind)) {
          ligar(
            alvo.id,
            e.target,
            e.kind === "nomeia" ? "forte" : "fraca",
            EDGE_KINDS[e.kind].rotulo,
          );
        }
      }
      break;
    }

    default: {
      // Segmentos, municípios e normas: acende quem os toca.
      for (const e of arestasDe) ligar(alvo.id, e.target, "fraca");
      for (const e of arestasPara) ligar(e.source, alvo.id, "fraca");
    }
  }

  return { nos, ligacoes };
}

/** Caminho SVG do símbolo de um vértice, centrado na origem. */
export function caminhoDaForma(forma: Forma, r: number): string {
  switch (forma) {
    case "circulo":
    case "ponto":
      return `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
    case "losango":
      return `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`;
    case "quadrado": {
      const c = r * 0.85;
      const k = c * 0.32; // canto arredondado
      return [
        `M ${-c + k} ${-c}`,
        `H ${c - k}`, `Q ${c} ${-c} ${c} ${-c + k}`,
        `V ${c - k}`, `Q ${c} ${c} ${c - k} ${c}`,
        `H ${-c + k}`, `Q ${-c} ${c} ${-c} ${c - k}`,
        `V ${-c + k}`, `Q ${-c} ${-c} ${-c + k} ${-c}`,
        "Z",
      ].join(" ");
    }
    case "estrela": {
      // Contorno serrilhado, como o vértice do cidadão no SF Gov Graph.
      const pontas = 22;
      const interno = r * 0.86;
      const pontos: string[] = [];
      for (let i = 0; i < pontas * 2; i++) {
        const raio = i % 2 === 0 ? r : interno;
        const a = (Math.PI / pontas) * i - Math.PI / 2;
        pontos.push(`${(Math.cos(a) * raio).toFixed(2)},${(Math.sin(a) * raio).toFixed(2)}`);
      }
      return `M ${pontos.join(" L ")} Z`;
    }
    default:
      return "";
  }
}

export function corDaCategoria(kind: NodeKind): string {
  return NODE_KINDS[kind].cor;
}

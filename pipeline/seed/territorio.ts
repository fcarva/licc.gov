/**
 * Camada territorial do conjunto de demonstração — o equivalente ao Republic
 * do CivLab, que monitora o que acontece na cidade e nos bairros.
 *
 * Aqui isso vira: espaços culturais por município e a agenda de eventos que
 * neles ocorre. Quando o pipeline roda com rede, `/api/space/find` e
 * `/api/event/find` do Mapa Cultural do ES substituem tudo isto.
 */

import type { GraphEdge, GraphNode } from "@/types/graph";
import { MUNICIPIOS } from "@/ontology";
import { slugificar } from "@/lib/text";

const TIPOS_ESPACO = [
  "Teatro Municipal",
  "Centro Cultural",
  "Biblioteca Pública",
  "Casa de Cultura",
  "Praça de Eventos",
  "Galpão Cultural",
  "Museu Municipal",
  "Ponto de Cultura",
];

const TIPOS_EVENTO = [
  "Sarau",
  "Mostra de Curtas",
  "Oficina de Percussão",
  "Feira de Artesanato",
  "Roda de Congo",
  "Encontro de Contadores de História",
  "Apresentação de Dança",
  "Concerto Didático",
  "Exposição Coletiva",
  "Ciclo de Debates",
];

export interface ResultadoTerritorio {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Gera espaços e eventos concentrados nos municípios que já têm projeto.
 *
 * A concentração é intencional: mostra o mesmo desequilíbrio territorial que a
 * cota de 10% da LICC tenta corrigir, em vez de espalhar equipamentos
 * uniformemente por 78 municípios, o que seria bonito e falso.
 */
export function gerarTerritorio(
  projetos: GraphNode[],
  rnd: () => number,
  ano: number,
): ResultadoTerritorio {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const comProjeto = new Set(
    projetos.map((p) => String(p.meta?.municipioId ?? "")).filter(Boolean),
  );

  const ligar = (source: string, target: string, kind: GraphEdge["kind"]) => {
    edges.push({
      id: `${kind}:${source}->${target}`,
      source,
      target,
      kind,
      proveniencia: "demonstracao",
    });
  };

  let contadorEvento = 0;

  for (const mun of MUNICIPIOS) {
    const ativo = comProjeto.has(mun.id);
    // Municípios sem projeto ainda podem ter equipamento cultural, mas menos.
    const quantos = ativo ? 1 + Math.floor(rnd() * 3) : rnd() < 0.35 ? 1 : 0;

    for (let i = 0; i < quantos; i++) {
      const tipo = TIPOS_ESPACO[Math.floor(rnd() * TIPOS_ESPACO.length)];
      const nome = `${tipo} de ${mun.nome}`;
      const idEspaco = `espaco-${slugificar(nome)}`;
      if (nodes.some((n) => n.id === idEspaco)) continue;

      nodes.push({
        id: idEspaco,
        slug: slugificar(nome),
        kind: "espaco",
        nome,
        descricao: `Equipamento cultural em ${mun.nome} (${mun.regiao}).`,
        proveniencia: "demonstracao",
        meta: {
          municipioId: mun.id,
          regiao: mun.regiao,
          acessivel: rnd() < 0.55,
        },
      });
      ligar(idEspaco, mun.id, "sediado_em");

      const eventos = ativo ? 1 + Math.floor(rnd() * 4) : Math.floor(rnd() * 2);
      for (let j = 0; j < eventos; j++) {
        contadorEvento += 1;
        const titulo = TIPOS_EVENTO[Math.floor(rnd() * TIPOS_EVENTO.length)];
        const mes = String(1 + Math.floor(rnd() * 12)).padStart(2, "0");
        const dia = String(1 + Math.floor(rnd() * 28)).padStart(2, "0");
        const idEvento = `evento-${ano}-${String(contadorEvento).padStart(4, "0")}`;

        nodes.push({
          id: idEvento,
          slug: `${slugificar(`${titulo}-${mun.nome}`)}-${contadorEvento}`,
          kind: "evento",
          nome: `${titulo} — ${mun.nome}`,
          descricao: `Ocorre em ${nome}.`,
          proveniencia: "demonstracao",
          meta: {
            inicio: `${ano}-${mes}-${dia}`,
            espacoId: idEspaco,
            municipioId: mun.id,
          },
        });
        ligar(idEvento, idEspaco, "acontece_em");
      }
    }
  }

  return { nodes, edges };
}

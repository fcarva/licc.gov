"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Graph, GraphNode } from "@/types/graph";
import { concentracaoDoCapital, desigualdadeTerritorial } from "@/lib/indicadores";
import { CORES_GRAFICO } from "@/ontology/paleta-grafico";
import { brl, numero, percentual } from "@/lib/format";
import { Cartao, TituloSecao, Metrica } from "./Coluna";
import { AlocacaoProporcional, type LinhaAlocacao } from "./AlocacaoProporcional";
import { corDoSegmento } from "@/ontology/paleta-orcamento";

export interface CotaResumo {
  regraId: string;
  titulo: string;
  reservado: number;
  alocado: number;
  cumprimento: number;
  atendida: boolean | null;
  classificaveis?: { comDado: number; total: number };
}

/**
 * Coluna-documento do orçamento, ao lado da rosca.
 *
 * Espelha o painel de orçamento do SF Government Graph: os números do
 * exercício em cima e, embaixo, a alocação — a lista em que a altura de cada
 * faixa é a sua parcela do total.
 */
export function PainelOrcamento({
  grafo,
  segmentos,
  totais,
  cotas,
  variacaoCaptado,
  onDestacar,
}: {
  grafo: Graph;
  segmentos: GraphNode[];
  totais: { autorizado: number; captado: number };
  cotas: CotaResumo[];
  variacaoCaptado: number | null;
  onDestacar?: (id: string | undefined) => void;
}) {
  const teto = grafo.meta.tetoAutorizado;

  const linhas: LinhaAlocacao[] = segmentos
    .map((s) => ({
      id: s.id,
      rotulo: s.nome,
      valor: s.orcamento?.captado ?? 0,
      cor: corDoSegmento(s.id),
    }))
    .filter((l) => l.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const naoCaptado = Math.max(0, teto - totais.captado);

  // Os dois achados que a rosca não mostra: quem concentra o aporte e quem
  // ficou de fora do território. Aqui só a manchete — a apuração inteira, com
  // denominador e tabela, mora em /indicadores.
  const capital = useMemo(() => concentracaoDoCapital(grafo), [grafo]);
  const territorio = useMemo(() => desigualdadeTerritorial(grafo), [grafo]);

  return (
    <>
      <Cartao>
        <TituloSecao
          acao={
            <Link
              href="/orcamento"
              className="text-xs text-realce underline-offset-2 hover:underline"
            >
              Página completa
            </Link>
          }
        >
          Orçamento{" "}
          <span className="font-normal text-tinta-fraca">{grafo.meta.ano}</span>
        </TituloSecao>

        <p className="mb-4 text-xs leading-relaxed text-tinta-fraca">
          O teto é a renúncia de ICMS que o Estado autoriza para o exercício. Os
          projetos o consomem ao receber autorização de captação; só vira
          recurso quando uma empresa contribuinte de fato aporta.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Metrica
            rotulo="Teto autorizado"
            valor={brl(teto)}
            nota="Portaria SEFAZ nº 01-R"
          />
          <Metrica
            rotulo="Autorizado em projetos"
            valor={brl(totais.autorizado)}
            nota={`${percentual(totais.autorizado / teto)} do teto`}
          />
          <Metrica
            rotulo="Efetivamente captado"
            valor={brl(totais.captado)}
            nota={`${percentual(totais.autorizado > 0 ? totais.captado / totais.autorizado : 0)} do autorizado`}
            variacao={variacaoCaptado}
          />
          <Metrica
            rotulo="Teto não captado"
            valor={brl(naoCaptado)}
            nota="o arco cinza da rosca"
          />
        </div>
      </Cartao>

      <Cartao>
        <TituloSecao>Cotas obrigatórias</TituloSecao>
        <ul className="space-y-2.5">
          {cotas.map((c) => (
            <li key={c.regraId}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-tinta">{c.titulo}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    c.atendida === null
                      ? "bg-cinza-medio text-tinta-fraca"
                      : c.atendida
                        ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-600/10 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {c.atendida === null ? "sem dado" : c.atendida ? "atendida" : "abaixo"}
                </span>
              </div>
              <p className="tabular mt-0.5 text-[11px] text-tinta-fraca">
                {c.atendida === null ? (
                  <>a fonte não publica o campo que classifica esta cota</>
                ) : (
                  <>
                    {brl(c.alocado)} de {brl(c.reservado)} · {percentual(c.cumprimento)}{" "}
                    da reserva
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </Cartao>

      {capital || territorio ? (
        <Cartao>
          <TituloSecao
            acao={
              <Link
                href="/indicadores"
                className="text-xs text-realce underline-offset-2 hover:underline"
              >
                Ver indicadores
              </Link>
            }
          >
            O que os números dizem
          </TituloSecao>
          <ul className="space-y-3">
            {capital ? (
              <li>
                <p className="text-sm leading-relaxed text-tinta-suave">
                  <strong
                    className="tabular font-semibold"
                    style={{ color: CORES_GRAFICO.capital }}
                  >
                    {numero(capital.dados.empresasParaMetade)} das{" "}
                    {numero(capital.dados.empresas.length)} empresas
                  </strong>{" "}
                  respondem por metade de tudo que foi aportado.
                </p>
              </li>
            ) : null}
            {territorio ? (
              <li>
                <p className="text-sm leading-relaxed text-tinta-suave">
                  <strong
                    className="tabular font-semibold"
                    style={{ color: CORES_GRAFICO.interior }}
                  >
                    {numero(territorio.dados.semProjeto)} dos{" "}
                    {numero(territorio.dados.municipios.length)} municípios
                  </strong>{" "}
                  não receberam nenhum projeto no exercício, e{" "}
                  <span className="tabular">{percentual(territorio.dados.fracaoNaRmgv, 1)}</span>{" "}
                  do valor ficou na Região Metropolitana.
                </p>
              </li>
            ) : null}
          </ul>
        </Cartao>
      ) : null}

      <Cartao>
        <TituloSecao>Alocação por linguagem</TituloSecao>
        <p className="mb-3 text-xs leading-relaxed text-tinta-fraca">
          A altura da faixa é a fatia: quanto mais alta, mais recurso
          concentrado ali. O filete leva a cor da fatia na rosca — passe o
          ponteiro numa para achar a outra.
        </p>
        <div onMouseLeave={() => onDestacar?.(undefined)}>
          <AlocacaoProporcional
            total={linhas.reduce((s, l) => s + l.valor, 0)}
            linhas={linhas}
            alturaTotal={Math.min(360, 70 + linhas.length * 28)}
            onPairar={onDestacar}
          />
        </div>
        <p className="mt-3 border-t border-borda pt-2.5 text-[11px] text-tinta-fraca">
          {numero(linhas.length)} linguagens com captação registrada no exercício.
        </p>
      </Cartao>
    </>
  );
}

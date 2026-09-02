# Pipeline de dados

```
anexos da SECULT              mapa.cultura.es.gov.br
  (PDF, HTML)                    /api/{entidade}/find
        │                                 │
        │ transcrição                     │
        ▼                                 ▼
data/raw/habilitados-{ano}.csv    pipeline/ingest.ts
        │                                 │
        │   pipeline/importar-habilitados.ts (sem rede)
        └────────────────┬────────────────┘
                         ▼
              data/raw/licc-{ano}.json
                         │                  pipeline/seed/gerar.ts
                         └────────┬─────────────────┘  (quando não há coleta)
                                  ▼
                        pipeline/build-graph.ts
                                  ▼
                    data/graph.json + data/stats.json
                                  ▼
                src/lib/dados.ts → app/api/* → interface
```

**Quem cria projeto da LICC é a planilha, não a API.** A coleta traz o
contexto; a substância vem dos anexos. Ver §0.

## 0. A lista de habilitados — `data/raw/habilitados-{ano}.csv`

O que a LICC publica está repartido por três níveis de acesso:

| Dado | Onde vive | Acesso |
| --- | --- | --- |
| editais, agentes, espaços, eventos | Mapas Culturais | público |
| **projetos habilitados** | `registration` da oportunidade | exige JWT |
| **valores autorizado e captado** | anexos da SECULT | documento |
| **patrocinadores** | publicações da SECULT | documento |

A API pública dá o **contexto**; não dá a **substância**. Por isso a planilha é
fonte de primeira classe, e não gambiarra: é a arquitetura honesta para o que o
Estado de fato publica.

```bash
cp data/raw/habilitados-exemplo.csv data/raw/habilitados-2025.csv
# preencha a partir dos anexos, depois:
npm run importar:habilitados        # sem rede nenhuma
npm run build:graph
```

### Colunas

Obrigatórias: `projeto`, `proponente`. Todas as demais são opcionais, e o
importador aceita variações de cabeçalho (`processo`, `cidade`, `linguagem`,
`incentivador`…), porque anexo de órgão público raramente sai duas vezes com o
mesmo nome de coluna.

| Coluna | Observação |
| --- | --- |
| `numero_processo` | Vira o id estável do projeto. Sem ele, usa-se o nome. |
| `projeto`, `proponente` | Obrigatórias. |
| `cnpj_cpf` | Identidade do proponente. 11 dígitos = pessoa física, 14 = jurídica. Sem documento, duas grafias do mesmo agente viram dois vértices — e o relatório mostra quantos ficaram assim. |
| `municipio`, `segmento` | Resolvidos pela ontologia. Sem casamento, o campo fica **ausente** e o nome aparece no relatório. |
| `valor_autorizado`, `valor_captado` | `R$ 1.234.567,89` ou `1234567.89`. |
| `patrocinador` | Vários separados por `;`. |
| `pautado`, `continuado` | `sim`/`não`. Em branco = não sabido, e a cota não conta a linha. |
| `status` | Um dos estados da tramitação (`habilitado`, `captando`, `concluido`…). |
| `fonte_url`, `fonte_pagina` | **O endereço para conferir.** |

### As duas regras do importador

1. **Célula vazia é ausência, nunca zero.** `valor_captado` em branco significa
   "a fonte não publicou", que é diferente de "captou R$ 0". Somar o segundo no
   lugar do primeiro produz indicador que mente com aparência de precisão. Por
   isso `Orcamento.autorizado` e `Orcamento.captado` são **opcionais** no tipo:
   um campo obrigatório forçaria o `0`.
2. **Sem `fonte_url` a linha não é oficial.** Ela entra marcada `demonstracao`
   e o relatório diz quantas foram assim. Nada é descartado em silêncio, e nada
   é carimbado de oficial sem endereço para conferir.

## 1. Coleta — `pipeline/ingest.ts`

O Mapa Cultural do Espírito Santo roda a plataforma **Mapas Culturais**, que
expõe leitura pública em `/api/{entidade}/find`. A gramática implementada em
`pipeline/sources/mapas-culturais.ts` segue a documentação oficial do
[repositório do projeto](https://github.com/mapasculturais/mapasculturais):

- **Controle:** `@select`, `@order`, `@limit`, `@page`, `@files`, `@or`, `@type`
- **Filtros:** `EQ`, `!EQ`, `LIKE(*x)`, `AND(..)`, `OR(..)`, `BET(a,b)`,
  `GEONEAR(lng,lat,raio)`
- **Relações:** `owner: EQ(@Agent:1)`, `project: EQ(@Project:4)`
- **Taxonomias:** `term:area`, `term:linguagem`

O cliente pagina até esgotar, espaça as requisições em 250 ms, tenta 3 vezes com
recuo exponencial e **não repete um 4xx** — código de cliente não melhora com
insistência. Identifica-se por `User-Agent` próprio, por cortesia com um
servidor público.

Entidades coletadas: `opportunity` (editais), `agent` (proponentes),
`project`, `space` (espaços culturais) e `event` (agenda). Os IDs conhecidos da
LICC no Mapa Cultural do ES são **2317** (2026) e **1878** (2025).

`space` e `event` alimentam a **camada territorial** — o equivalente ao Republic
do CivLab, que acompanha o que acontece na cidade e nos bairros. Aqui a unidade
é o município: onde há equipamento cultural, onde há agenda, onde não há nada.

### `project` do Mapa Cultural **não** é projeto da LICC

É qualquer projeto cultural que um agente cadastrou na plataforma. Houve aqui
uma versão que transformava cada um deles em `kind: "projeto"` com
`proveniencia: "oficial"` e fundamento na Lei 11.246/2021 — ou seja, afirmava
que todo projeto cultural do Espírito Santo é incentivado pela LICC. Era pior
que o conjunto de demonstração, que ao menos se identifica como fictício.

Hoje esses registros formam um **índice de enriquecimento**: quando o nome casa
com uma linha da lista de habilitados (por `nomesCorrespondem()`, em
`src/lib/text.ts`), o projeto ganha URL, descrição e o id da plataforma. Nunca a
existência, nunca a base legal, nunca um valor.

Sem `data/raw/habilitados-{ano}.csv`, a coleta produz o grafo institucional e a
camada territorial, **zero projetos**, e diz isso em voz alta. Um grafo que
admite não saber vale mais que um que preenche a lacuna com dado alheio.

## 2. Consolidação — `pipeline/build-graph.ts`

Usa `data/raw/licc-{ano}.json` se existir; senão, gera o conjunto de
demonstração. Em seguida:

1. **Poda arestas órfãs** — nó removido não deixa aresta pendurada.
2. **Propaga agregados** — segmento, município e proponente recebem a soma dos
   projetos ligados a eles. Patrocinador acumula pelo **peso real das arestas**,
   não pelo teto do projeto: é o que ele de fato aportou.
3. **Calcula posição e variação** — o lugar de cada entidade por captação
   dentro da própria categoria ("posição 1 de 80") e a variação sobre o
   exercício anterior. Só posiciona quem movimenta recurso: "posição 40 de 54"
   entre entidades zeradas não informa nada.
4. **Apura as cotas** — 30% pautados, 10% fora da RMGV, 10% continuados — e
   marca proponentes no limite de projetos.
5. **Conta a proveniência** de cada registro, que alimenta a faixa de aviso.

## 3. Conjunto de demonstração — `pipeline/seed/`

Existe para que a interface possa ser desenvolvida e revisada sem rede.

- **Determinístico**: PRNG `mulberry32` semeado; o mesmo `seed` gera sempre o
  mesmo grafo, então diffs de dados são legíveis.
- **Com exercício anterior**: cada projeto carrega `orcamento.anterior`, que dá
  lastro à variação ano a ano exibida na interface.
- **Coerente com a norma**: respeita o teto de R$ 25 milhões, o limite de 3
  projetos por proponente e produz 82 projetos — a contagem oficial de
  habilitados da LICC 1 em 2026.
- **Inconfundível**: empresas e proponentes usam letras gregas
  (`Empresa Sigma Celulose`, `Produtora Alfa`). Tudo sai carimbado
  `proveniencia: "demonstracao"`.

`pipeline/seed/territorio.ts` gera espaços e agenda concentrados nos municípios
que já têm projeto. A concentração é intencional: mostra o mesmo desequilíbrio
territorial que a cota de 10% tenta corrigir, em vez de espalhar equipamentos
uniformemente por 78 municípios, o que seria bonito e falso.

`pipeline/seed/institucional.ts` é a exceção: órgãos, normas e as notícias
verificadas nos portais oficiais entram como `oficial`, com link para a fonte.

## 4. Serviço — `src/lib/dados.ts`

Carrega os artefatos uma vez e mantém em memória os índices por id e por slug e
as listas de adjacência de entrada e saída. Se os artefatos não existirem,
constrói o grafo em memória — a aplicação nunca sobe quebrada por falta de um
passo de build.

## Operação

```bash
npm run ingest                    # coleta
LICC_ANO=2025 npm run ingest      # outro exercício
LICC_MAX=50 npm run ingest        # amostra, para testar
npm run build:graph               # consolida
npm run data                      # os dois
```

`data/raw/` é ignorado pelo git; `data/graph.json` e `data/stats.json` são
versionados de propósito — o grafo é um artefato auditável, e a diferença entre
duas coletas deve aparecer no histórico.

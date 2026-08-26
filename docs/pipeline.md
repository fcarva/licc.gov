# Pipeline de dados

```
mapa.cultura.es.gov.br
        │  /api/{entidade}/find
        ▼
pipeline/ingest.ts ─────────────► data/raw/licc-{ano}.json
        │                                 │
        │ (sem rede)                      │
        ▼                                 ▼
pipeline/seed/gerar.ts ────────► pipeline/build-graph.ts
                                          │
                                          ▼
                            data/graph.json + data/stats.json
                                          │
                                          ▼
                        src/lib/dados.ts → app/api/* → interface
```

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

### O que a API não entrega

As **inscrições** (`registration`) de uma oportunidade exigem autenticação por
JWT — não são públicas. Como os valores autorizado e captado de cada projeto da
LICC vivem ali, eles **não são preenchidos** pela coleta. O campo fica ausente,
nunca estimado. Preenchê-lo depende dos anexos que a SECULT publica.

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

# Anexos da SECULT → CSV de habilitados

Estes dois scripts **rodam na sua máquina**. No ambiente onde o licc.gov foi
desenvolvido, `secult.es.gov.br` está bloqueado pela política de egresso da
organização — o `curl` e o `WebFetch` recebem o mesmo `EGRESS_BLOCKED`.

O que eles fazem: baixam os anexos "LISTA DE PROJETOS HABILITADOS" e os
convertem no CSV que `npm run importar:habilitados` consome. É o caminho que
transforma a cobertura de **0% de fonte oficial** em dado real.

## Preparo

```bash
cd tools/anexos-secult
npm init -y
npm i pdfjs-dist
```

## 1. Baixar

```bash
node baixar.mjs
node baixar.mjs --pagina https://secult.es.gov.br/outra-pagina
node baixar.mjs --pdf https://secult.es.gov.br/Media/.../LISTA....pdf
```

Descobre os PDFs varrendo as páginas da LICC em vez de usar lista fixa: a
comissão é permanente, a SECULT publica em lotes ao longo do ano, e uma lista
de URLs no código envelhece no dia seguinte.

Grava em `saida/`, com `fontes.json` mapeando arquivo → URL de origem. Esse
endereço vira o `fonte_url` de cada linha do CSV, e sem ele a linha entra no
grafo como **demonstração**, não como oficial.

## 2. Extrair

```bash
node extrair.mjs
```

Lê cada PDF por **posição geométrica**: cada fragmento de texto tem coordenada,
as colunas saem da posição do cabeçalho, e nada é inferido.

Não usa modelo de linguagem, e a razão não é purismo. Um modelo que arredonda
um valor ou pula uma linha produz exatamente o erro que este projeto existe
para não cometer — e produz em silêncio.

Grava em `csv/`. Depois:

```bash
cp csv/*.csv ../../data/raw/
cd ../.. && npm run importar:habilitados && npm run build:graph
```

## Os dois conferidores

**Contagem de linhas.** Todo anexo declara a própria quantidade
("Quantidade: 74"). Se a extração render outro número, o script não grava.

**Formato de valor.** Todo `valor_autorizado` precisa se parecer com dinheiro.

O segundo existe porque o primeiro não basta, e isso foi medido: no primeiro
teste desta ferramenta a contagem bateu — 5 de 5 — enquanto **todos** os
valores estavam truncados (`R$ 480.000,00` virava `R$ 4`). A coluna estreita
fazia o texto quebrar em duas linhas físicas, e cada pedaço caía num `y`
diferente.

Daí também a junção de continuação: linha sem conteúdo na coluna âncora é
continuação da anterior, não registro novo. Sem isso, um nome de projeto longo
viraria dois registros — um com metade do nome, outro sem proponente, que seria
descartado em silêncio, **sem quebrar a contagem**.

## Quando não conferir

O script diz por que e não grava. Os casos comuns:

| Sintoma | Causa provável |
| --- | --- |
| `nenhuma linha reconhecida` | o cabeçalho usa termos fora de `COLUNAS` em `extrair.mjs` |
| `a contagem não bate` | faltou linha, ou entrou linha que não é projeto |
| `valores não se parecem com dinheiro` | coluna cortada no lugar errado |
| `resposta não é PDF` | a URL devolveu página de erro travestida |

Nos dois primeiros, ajuste os padrões de `COLUNAS` — são regex por campo,
justamente porque a SECULT não usa o mesmo cabeçalho em todos os anexos.

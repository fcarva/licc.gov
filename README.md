# licc.gov — LICC Gov Graph

Catálogo relacional em grafo da **Lei de Incentivo à Cultura Capixaba (LICC)**,
na linha do [SF Government Graph](https://sfgov.civlab.org/) do CivLab:
entidades tipadas, ligadas por relações nomeadas, cada uma ancorada na norma que
a institui — e não apenas um painel financeiro.

Responde, num só lugar: **quem aprova, quem aporta, quem executa, o que se
produz, onde chega, e sob qual norma.**

> Projeto independente. Não é um sítio oficial da SECULT-ES nem do Governo do
> Estado do Espírito Santo.

---

## O grafo segue o dinheiro

No CivLab o cidadão está no centro porque elege o prefeito e paga imposto. Na
LICC o mecanismo é outro: o Estado **abre mão** de ICMS para que a política
exista. O capixaba é **financiador indireto e beneficiário final** ao mesmo
tempo — e é isso que os anéis desenham, de dentro para fora:

| Anel | Papel | Quem | Forma |
| --- | --- | --- | --- |
| centro | Origem e destino do valor | População Capixaba | estrela serrilhada |
| `APROVAÇÃO E FOMENTO` | Define diretrizes e o teto | SECULT, SEFAZ, CEC, CAP, Governo | círculo |
| `O CAPITAL` | Aloca a renúncia de ICMS | Empresas patrocinadoras | losango |
| `A EXECUÇÃO` | Realiza o projeto | Produtoras, coletivos, ONGs, artistas, prefeituras | ponto |
| `O BEM PÚBLICO` | Resultado entregue | Projetos, setorizados por linguagem | quadrado |

O anel externo é **dividido em fatias por linguagem cultural** — música, artes
cênicas, audiovisual, patrimônio —, cada uma nomeada ao longo do arco e com os
projetos tingidos na sua cor. Assim dá para ler *que tipo* de cultura o dinheiro
financia sem que o segmento vire um anel próprio.

**Clicar acende a cadeia de responsabilização** e apaga o resto:

- **Patrocinador** → a linha até o centro (o ICMS que não entrou no caixa
  estadual), os projetos que escolheu bancar e os segmentos que priorizou. Cada
  linha traz o verbo da relação escrito por cima.
- **Projeto** → proponente, patrocinadores e o órgão que aprovou o
  enquadramento.
- **Proponente** → seus projetos e quem os financia.

## O que existe aqui

| Camada | Onde | O que faz |
| --- | --- | --- |
| Ontologia | `src/ontology/` | 12 categorias de vértice, 15 relações, 9 segmentos, 78 municípios, 5 normas, 4 regras auditadas |
| Geometria | `src/lib/radial.ts` | Layout radial e cadeias de responsabilização |
| Coleta | `pipeline/sources/` | Cliente da API REST do Mapas Culturais |
| Consolidação | `pipeline/build-graph.ts` | Agregados, posição, variação anual, conferência de cotas |
| Demonstração | `pipeline/seed/` | Grafo determinístico para rodar sem rede |
| API | `app/api/` | 8 rotas JSON |
| Interface | `src/components/`, `app/` | Grafo radial, sunburst, coluna-documento, busca global |
| Engenharia reversa | `tools/scrape-civlab/` | Toolkit para medir o CivLab na sua máquina |

## Começando

```bash
npm install
npm run dev            # http://localhost:3000
```

O grafo é gerado em memória na primeira requisição, então a aplicação sobe sem
nenhum passo de dados. Para materializar os artefatos:

```bash
npm run build:graph    # → data/graph.json + data/stats.json
```

### Coletando os dados reais

```bash
npm run ingest         # mapa.cultura.es.gov.br → data/raw/licc-2026.json
npm run build:graph    # consolida
npm run data           # os dois
```

Variáveis: `LICC_ANO` (padrão `2026`), `LICC_BASE`
(`https://mapa.cultura.es.gov.br`), `LICC_MAX` (teto por entidade, para testes).

Assim que `data/raw/licc-{ano}.json` existir, o construtor usa a coleta real e
ignora o conjunto de demonstração.

## Proveniência: a regra que não se quebra

Um grafo bonito de dados sintéticos é indistinguível de um grafo bonito de dados
reais. Para que a confusão nunca aconteça, **todo registro carrega um selo**, e
o selo aparece na interface:

- **`oficial`** — publicação da SECULT-ES, da SEFAZ-ES, do Governo do ES ou do
  Mapa Cultural, com link para a fonte.
- **`derivado`** — calculado ou classificado a partir de dados oficiais.
- **`demonstracao`** — registro fictício, gerado localmente. Empresas e
  proponentes usam **letras gregas** justamente para não serem confundidos com
  agentes reais.

Enquanto houver qualquer registro `demonstracao`, uma faixa fica visível em
todas as páginas. Ela some sozinha quando a coleta real substitui os dados.

Onde a fonte não publica um valor, **o campo fica ausente. Nunca estimado.**

## Fatos oficiais embutidos

| Fato | Fonte |
| --- | --- |
| LICC = Lei nº 11.246/2021, que alterou a Lei nº 7.000/2001 | [SECULT-ES](https://secult.es.gov.br/sobre-a-licc) |
| Teto de R$ 25 milhões (Portaria SEFAZ nº 01-R, de 07/01/2025) | [SECULT-ES](https://secult.es.gov.br/governo-amplia-para-r-25-milhoes-os-recursos-destinados-a-lei-de-incentivo-a-cultura-capixaba-licc) |
| Cotas: 30% pautados · 10% fora da RMGV · 10% continuados | [SECULT-ES](https://secult.es.gov.br/Noticia/licc-2026-inscricoes-para-projetos-culturais-estao-abertas) |
| Inscrições 2026 até 30/06, só pelo Mapa Cultural | [SECULT-ES](https://secult.es.gov.br/Noticia/licc-2026-inscricoes-para-projetos-culturais-estao-abertas) |
| LICC 2026 = oportunidade 2317; LICC 2025 = 1878 | [Mapa Cultural ES](https://mapa.cultura.es.gov.br/oportunidade/2317/) |

A regra de **máximo 3 projetos por proponente** está marcada
`verificado: false` — veio do briefing (LegisWeb) e ainda não foi conferida na
instrução normativa vigente. A interface exibe esse estado.

## Exercício

O exercício padrão é **2025**, o último ciclo fechado — a Instrução Normativa
nº 001/2025 está publicada e a oportunidade 1878 encerrou. A LICC 2026 segue
com inscrições até 30/06/2026, e mostrar número parcial sem dizer que é parcial
engana mais do que informa. `LICC_ANO=2026 npm run data` monta o exercício em
curso.

## Monitor territorial

`/monitor` é a camada inspirada no **Republic** do CivLab, que acompanha a
cidade e os bairros. Aqui a unidade é o município capixaba, e o que se monitora
é a chegada efetiva da política: projetos incentivados, espaços culturais,
agenda e agentes sediados — e onde não há nada, o que também é informação.

## API

| Rota | O que devolve |
| --- | --- |
| `GET /api/graph` | Grafo completo. `?kinds=` `?segmento=` `?municipio=` recortam |
| `GET /api/entities` | Lista de vértices. `?kind=` `?ordem=captado` `?limit=` `?offset=` |
| `GET /api/entities/[slug]` | Vértice + vizinhança + agregados + notícias + fundamentos |
| `GET /api/budget` | Execução por `?por=segmento\|municipio\|regiao\|status\|patrocinador` |
| `GET /api/monitor` | Índice territorial; `?municipio=` traz o panorama de um |
| `GET /api/news` | Feed agregado |
| `GET /api/search` | Busca sobre nome, sigla, nomes alternativos e descrição |
| `GET /api/stats` | Totais, cotas e contagem por proveniência |

Recortes filtrados sempre devolvem grafo consistente — aresta cuja ponta foi
filtrada é descartada.

## Engenharia reversa do CivLab

`tools/scrape-civlab/` mede a referência: raios dos anéis, contagem, forma,
paleta e tokens de estilo. **Roda na sua máquina** — o ambiente de
desenvolvimento tem egresso bloqueado para `civlab.org` e `api.firecrawl.dev`.

```bash
cd tools/scrape-civlab && npm i playwright && npx playwright install chromium
node extrair-topologia.mjs
FIRECRAWL_API_KEY=fc-... node extrair-estilos.mjs
# copie saida/ de volta ao repositório:
npx tsx pipeline/importar-referencia.ts   # → docs/referencia-civlab.md
```

O CivLab é Next.js **App Router**: o estado vem em *RSC flight chunks*
(`self.__next_f.push`), não em `__NEXT_DATA__`. O script cobre os dois, mais a
captura de respostas de rede. Detalhes em `tools/scrape-civlab/README.md`.

## Decisões de interface

- **Posições calculadas, não simuladas.** Sem física: o desenho é determinístico
  e nenhum vértice desconectado é arremessado para fora da tela.
- **SVG, não canvas** — cada vértice vira alvo focável por teclado.
- **Escala de tamanho interna ao anel.** Comparar um projeto ao programa inteiro
  achataria todos os projetos no mesmo raio.
- **Área, não raio**, acompanha o valor — é como o olho compara grandezas.
- **Alocação por altura proporcional**, não barras: lê-se a composição inteira
  de uma vez.
- **O vão do sunburst é dado**, não defeito: um arco cinza fecha o anel e mostra
  o teto ainda não captado.
- **Notícias em prosa** com entidades linkadas e notas numeradas — é o que
  transforma o feed em responsabilização.
- `/` ou `Ctrl/⌘+K` abrem a busca; setas navegam; `Esc` fecha.

## Limitações conhecidas

- A API pública do Mapas Culturais **não expõe as inscrições** (`registration`)
  de uma oportunidade — esse endpoint exige autenticação por JWT. Os valores
  financeiros por projeto precisam vir dos anexos publicados pela SECULT;
  enquanto não vierem, ficam ausentes.
- O recorte por microrregião varia conforme a fonte oficial; aqui serve como
  agrupamento de leitura. A marcação de RMGV, essa sim, é normativa.
- Sem coleta real disponível, o que se vê é o conjunto de demonstração.

## Paleta

As cores não foram escolhidas: foram **aferidas por amostragem de pixels** dos
quadros de uma gravação do SF Government Graph. Fundo `#ebeae4`, centro
`#f5ccba`, anéis `#f6c4cc`, `#e2c1f8` e `#d2c9e5`. Em repouso o vértice é só
contorno; o preenchimento pastel entra quando ele acende.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · SVG puro para
as duas visualizações · sem banco: o grafo é um artefato JSON versionável.

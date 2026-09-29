# Referência aferida do CivLab

> Extraída do HTML da home de `sfgov.civlab.org`, capturado via Firecrawl pelo
> usuário em 26/08/2026. Substitui as estimativas por amostragem de pixels que
> vinham sendo usadas até então — várias estavam erradas.

## Cores reais das categorias

A amostragem de pixels media o vértice **aceso**, não a cor da categoria. O
HTML revela a regra: o traço leva a cor cheia e o preenchimento é a mesma cor a
50% de opacidade sobre branco.

```html
<circle fill="var(--white)"/>
<circle fill="#f2686f" fill-opacity="0.5"/>
<circle stroke="#f2686f"/>
```

| Categoria | Cor | Onde aparece |
| --- | --- | --- |
| People of San Francisco | `#F27836` | centro e métrica "Residents" |
| Elected | `#F2686F` | anel 1 |
| Commission | `#C15EF2` | anel 2 |
| Advisory | `#F25EEF` | anel 3 |
| Department | `#826DC8` | anel 4 |

## Geometria do grafo

```html
<svg viewBox="0 20 800 750" preserveAspectRatio="xMidYMid meet">
```

Centro em `(400, 375)`.

| Anel | Raio | Traço | Rótulo |
| --- | --- | --- | --- |
| ELECTED | 147 | `#F2686F` `stroke-dasharray="4 2"` | `y=497` |
| COMMISSION | 236,25 | `#C15EF2` | `y=586,25` |
| DEPARTMENT | 330,75 | `#826DC8` | `y=680,75` |

O rótulo fica **25 px para dentro** do anel: `y = cy + raio − 25`. Frações do
raio máximo: `0,444`, `0,714`, `1,0`. O maior raio ocupa `330,75/400 = 0,827`
da meia-largura.

Fonte do rótulo: `font-size="12"`, `font-weight="600"`.

## Formas

| Categoria | Elemento |
| --- | --- |
| People | `<path>` de bezier serrilhado, raio ~52–56, branco com traço `#F27836` |
| Elected | `<circle>` branco, traço `#F2686F`, `r` de 10,5 a 21 |
| Commission | `<rect w=16.8 h=16.8 rx=4>` **rotacionado** — vira losango |
| Advisory | `<path>` de bezier, um squircle |
| Department | `<rect w≈16.8–29.4 rx=3>` **rotacionado** |

Os retângulos giram acompanhando a posição angular (incrementos de
`360/54 ≈ 6,67°` nas comissões e `360/56 ≈ 6,43°` nos departamentos), o que
produz o aspecto de losango em ângulos variados.

Círculos pequenos de `r="4.2"` com traço `#826DC8` aparecem espalhados por
todos os anéis — marcadores de vínculo, não vértices próprios.

## Layout

```html
<div class="grid grid-cols-1 lg:grid-cols-[minmax(400px,40%)_1fr]">
```

A coluna-documento é `order-2 lg:order-1` e o canvas `order-1 lg:order-2`: no
celular **o grafo vem primeiro**.

Cartões: `bg-white rounded-xl` — raio de 12 px e **sem sombra**. Empilham com
`mt-3`. Seções internas separam-se por `border-t border-grey-light py-8`.

## Controles

O segmentado do rodapé inverte a convenção: a aba **ativa** é a que fica
`disabled` e sem fundo; a inativa recebe `bg-grey-mid text-grey-4`.

A busca é um botão de 36×36 (`h-9 w-9`) com lupa, que expande — não um campo
sempre aberto.

## Notícias em prosa

O texto é cortado por `line-clamp-4 md:line-clamp-6`. Cada entidade citada
carrega **o glifo da sua categoria** antes do nome, dimensionado em `1em`, e
não um ponto genérico:

```html
<a class="underline decoration-red hover:text-red" href="/sf/elected/ccsf-mayor">
  <span class="[&>svg]:w-[1em] [&>svg]:h-[1em]"><svg>…glifo…</svg></span>Mayor
</a>
```

As notas de rodapé são `<sup class="text-[10px]">` com o link em
`text-grey-4 font-semibold`.

## Métricas

Cada métrica do Panorama traz o glifo da categoria ao lado do rótulo. A
variação anual usa `text-purple font-medium opacity-75`.

## Estrutura de URLs

`/sf/elected/…`, `/sf/topics/…`, `/sf/departments/…`, `/sf/commissions/…`,
`/sf/advisories/…`. Slugs prefixados por `ccsf-` e `sfusd-`.

---

# Página de departamento (despejo de 27/08/2026)

> Extraído por Firecrawl de `/sf/departments/ccsf-department-of-public-health`
> e `/sf/departments/ccsf-office-of-the-treasurer-tax-collector`.

## Abas (padrão Radix)

Invólucro `w-full rounded-xl overflow-hidden`, filho direto `flex`. Estado nos
atributos, não em classes ad hoc:

- `role="tab"` / `role="tabpanel"`, pareados por `aria-controls` no botão e
  `aria-labelledby`/`id` no painel;
- `data-state="active|inactive"` + `aria-selected`;
- `tabindex="0"` só na aba ativa, `-1` nas demais;
- estilo: `data-[state=active]:bg-white`,
  `data-[state=inactive]:bg-grey-mid data-[state=inactive]:text-grey-4`.

Painéis: `News` → `…-content-news`, `Who's connected?` → `…-content-graph`,
`Budget` → `…-content-budget`.

## Rosca de orçamento

```html
<svg class="budget-graph data-viz" viewBox="0 0 800 750" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(400,355)">
    <g class="rotating" transform="rotate(-107.005…)">
```

| Medida | Valor |
| --- | --- |
| Raio externo | 320 |
| Fronteira entre anéis | 250,667 |
| Raio interno (miolo) | 181,333 |
| Frações do raio externo | `0,567 / 0,783 / 1,0` |
| Traço normal | `stroke-width: 1.5` |
| Traço do setor selecionado | `stroke-width: 2` |
| Filtro por fatia | `filter: saturate(1.25)` inline |
| `aria-label` | "Sunburst chart of SF government budget by department" |

O `g.rotating` gira em tempo de execução ao selecionar um setor (valor
observado: `-107,005°`) — a rosca traz a fatia à posição de leitura. As fatias
não têm transição CSS própria; a interpolação é estado de runtime.

**Interações:**

- *Hover*: só abre o tooltip. **Nenhuma fatia escurece** — todas permanecem em
  `opacity: 1`. Tooltip: `div` absoluto `pointer-events: none`, fundo branco,
  borda `1px solid #ccc`, `padding: 4px 8px`, raio 4px, fonte 12px,
  `z-index: 1000`. Bordado, não sombreado.
- *Clique*: sincroniza a página inteira com o setor — métricas, alocação e
  trilha mudam (ex.: clicar em Public safety levou a Police Department,
  $850.36M/$164.14M, 8 categorias, trilha "CivLab · Police Department").
- *Seleção*: `stroke-width: 2` na fatia; sem alteração nas demais.

**Tipografia do miolo**: rótulo 14px/500, valor 34px/600 ("$16.2 Billion").
Rótulos de arco 16px/500. Relativo ao viewBox de 750: valor ≈ `0,045`.

## Alocação (breakdown)

Cada linha leva `border-b-[<cor>]` na cor da categoria e o texto num tom escuro
da mesma família — observado `border-b-[#29D8CB]` com `text-[#127B74]`. Não é
fundo tingido.

## Superfícies

`rounded-xl` (12px) **sem box-shadow** nos cartões e no invólucro de abas; foco
via `focus:ring-2 focus:ring-grey-4`. Tipografia Inter: `type-header-1`
30/33 600, `type-paragraph-2` 16/22,4, `type-ui-3` para rótulos compactos.

---

# Remedição de 29/09/2026 — `graph.civlab.org/sf`

> Lida via Firecrawl, que não passa pelo proxy de egresso. **O original mudou
> desde os despejos de agosto**, e o que segue substitui o que diverge acima.

## A coluna-documento da home, em ordem

1. Trilha `CivLab / SF Gov`
2. **Latest News** — prosa com entidades ligadas e notas de rodapé numeradas
3. **Trending Topics** — fichas de tópico e um `View All` para `/sf/topics`
4. **People in Focus** — três cartões com **foto**, cargo, descrição e `View profile →`
5. **Overview** — "Top level metrics … tracking total entity counts and fiscal data",
   em dois degraus:
   - contagens: Residents 842.027 (com `*` ligando à fonte demográfica),
     Elected 10, Commissions 51, Advisory 55, Departments 54;
   - `This Year 2026-2027`: Total Budget $16.85B ↑5,38%, Total Revenue $16.85B
     ↑5,38%, City Employees 34.151 ↓3,44% — cada um com a variação anual;
   - e **dois chamados**: `Explore budget` e `How the budget is made`, este
     apontando para o ensaio no Substack.
6. **About** — "We cannot govern systems we don't understand…", a nota
   _"CivLab is not affiliated with the City and County of San Francisco"_ e os
   contatos.

O canvas segue com o segmentado `Graph | Budget`, e a legenda de categorias
aparece sobre ele (`ELECTED COMMISSION DEPARTMENT People of San Francisco`).

## As abas de entidade ganharam uma quarta

Em `/sf/departments/ccsf-department-of-public-health`: **News · Who's connected?
· Budget · Media**. O cabeçalho traz, em ordem: nome, descrição, os links
`Legal Source` e `Official Website`, a contagem `7743 Budgeted Employees` e o
cartão do titular (`Public Health, Director` / `Daniel Tsai` / `Appointed 2025`).

Cada notícia é ficha com título, data, resumo, veículo e imagem, e a lista fecha
com `Load more`.

## Tópicos são uma seção de topo, com abas próprias

`/sf/topics/<slug>`, trilha `CivLab / SF Gov / Topics`, e as abas são
**News · Who's Responsible? · Media** — repare que num tópico a pergunta deixa
de ser "quem se conecta" e passa a ser **quem responde**. O cabeçalho é só nome
e uma linha de descrição ("Policies and programs related to housing development,
affordability, and regulation").

## Navegação: o original não tem barra, e o Overview não navega

Medido no HTML e nas rotas, porque é contraintuitivo.

**Não existe índice de categoria.** `graph.civlab.org/sf/departments` responde 200
mas o `url` final é `/sf` — **redireciona para a home**. A categoria é segmento de
URL (`/sf/departments/<slug>`), não página. Quem indexa as 54 secretarias é o
próprio grafo: clicar no anel.

**A única seção de topo é `/sf/topics`**, e a moldura dela diz para que serve:
*"Explore the issues that San Franciscans care about most. Click into any topic
to see which parts of the government are responsible and find recent news
articles covering the latest developments."*

**O `SF Gov ⌄` da trilha é `aria-label="Switch government graph"`** — troca de
governo, não menu de seções.

**O Overview agrega, não navega.** As contagens são texto puro:

```html
<div><div class="type-ui-1 …"><span>Departments</span></div>
     <p class="type-header-3 mt-1.5">54</p></div>
```

Nenhuma âncora. A única da grade é o `*` de "Residents", e aponta para a fonte
demográfica externa. Faz sentido: atrás de "Departments 54" não há página.

Então todo o cromo de topo do original é: trilha com seletor de governo, busca
`h-9 w-9`, e dois botões de histórico `h-9 w-9` num cartão só. Mais nada.

### Como isso foi adaptado

| Decisão | Aqui |
| --- | --- |
| Barra de navegação | reduzida ao **fluxo do valor** — os quatro anéis. É o equivalente a clicar num anel do grafo, e atrás deles há índice (28 empresas, 52 proponentes) que lá não existe. |
| Contagens do Overview | **viram link**, divergência de dado e não de desenho: a estrutura é a mesma, mas aqui há página atrás do número. |
| Orçamento, Indicadores, Segmentos, Municípios, Monitor, Notícias, Sobre | **rodapé**, alcançáveis de toda página. Lá orçamento é aba, notícias são a coluna e "sobre" é seção; aqui são páginas, e páginas precisam de porta. |
| `/temas` no molde de `/sf/topics` | ainda não existe — é o eixo que falta |

## Vértice em repouso é **branco**, e a regra das três camadas é do glifo

A medição que mais corrige o que estava escrito. No HTML de `graph.civlab.org/sf`:

```
177 × fill="#FFFFFF" fill-opacity="1" stroke="<cor>" stroke-opacity="1"
 12 × fill-opacity="0.5"
```

Os 177 são os vértices do grafo (`cursor: pointer`, `data-node-id`). Os 12 são os
**glifos inline** — `cx="10.5" cy="11" r="7"`, coordenada fixa, ícone de categoria
no texto e na legenda. É ali, e só ali, que aparece a pilha de três camadas
(branco, cor a 50%, traço na cor).

Então a regra correta tem dois casos:

| Onde | Como se desenha |
| --- | --- |
| Glifo de categoria (texto, legenda, métrica) | três camadas: branco + cor a `fill-opacity 0.5` + traço na cor |
| Vértice do grafo, **em repouso** | branco cheio, traço na cor, `stroke-opacity 1` |
| Vértice do grafo, **aceso** por seleção | aí sim a cor a 50% por cima |

O `licc.gov` pintava todo vértice a 50% em repouso, porque `aceso` valia
`!cadeia || cadeia.nos.has(id)` — sem seleção, `cadeia` é nula e o primeiro termo
já dava verdadeiro. O desenho ficava pesado e, pior, a cor deixava de significar:
se tudo está aceso, acender não distingue nada.

## O que isso muda aqui

| Achado | Estado no licc.gov |
| --- | --- |
| Ordem da coluna da home | já espelhada: notícias, temas em alta, entidades em foco, panorama, este exercício, sobre |
| `Explore budget` vira a aba do canvas | **corrigido**: era link para `/orcamento`, agora troca a vista ao lado por contexto |
| `How the budget is made` | sem contraparte — seria um `/como-funciona`, e metade dos passos da LICC está `verificado: false` |
| Aba `Media` | sem contraparte: não há acervo de mídia no grafo |
| Foto em "People in Focus" | sem contraparte: a ontologia tem um só `pessoa`, e não há banco de imagem oficial |
| Tópicos com abas próprias | sem contraparte; `/segmentos` é taxonomia de linguagem, não questão |
| Variação anual em toda métrica | **não apurável**: `variacaoAnual` é nulo em todo nó, porque só há um exercício carregado |
| Vértice branco em repouso | **corrigido** — era pintado a 50% sempre |
| `Read more` em cinza ao fim da prosa | **corrigido** — estava no cabeçalho, competindo com o título |
| Fichas de tópico preenchidas, `View All` vazada | **corrigido** |
| Segmentado do canvas embaixo à direita | **corrigido** — estava centralizado |
| Prosa cortada por `line-clamp-4 md:line-clamp-6` | **divergência deliberada**: não cortamos, e mantemos a lista de notas de rodapé com veículo e link. O sobrescrito já é o link, como no original; a lista é transparência nossa, e custa altura de propósito |
| Coluna como um cartão com divisórias internas | ainda são cartões soltos com `gap-4` |
| Sem barra de navegação no topo | divergência: o original navega por trilha, busca e conteúdo; aqui há onze seções que lá não existem |

---

# O que se implementou diferente, e por quê

Registro das divergências deliberadas entre o original e o licc.gov. Nenhuma é
descuido; todas foram decididas contra a medida acima. Quem for "corrigir"
alguma delas deve ler o motivo antes.

| Onde | O original | Aqui | Por quê |
| --- | --- | --- | --- |
| Seleção na rosca | `stroke-width: 2`, traço na mesma cor do vão | `stroke-width: 2` **e** o traço num tom escuro da própria fatia | Lá a fatia selecionada também é trazida à posição de leitura pelo `g.rotating`; sem essa rotação, um traço branco de 2px sobre vão branco não é sinal nenhum. As demais fatias seguem intocadas, que é o ponto da regra. |
| Rótulo de arco | 16px fixos | 16px, encolhendo até 9,5px; abaixo disso não desenha | O SF Gov Graph tem poucos setores largos; a LICC tem 9 linguagens, e 5 delas dão arcos curtos. Encolher preserva o nome — truncar ("Audiov…") não nomeia nada. |
| Anéis do radial | 3 anéis, frações `0,444 / 0,714 / 1,0` | 4 anéis, `0,444 / 0,629 / 0,815 / 1,0` | O fluxo do valor da LICC tem quatro etapas. Mantidos o primeiro anel e o último nas frações do original, o passo vira `(1 − 0,444)/3`: preserva-se o vazio central largo e a regularidade, que é o que caracteriza o desenho. |
| Aba ativa | fica `disabled`, sem fundo | fica `tabindex="0"`, sem fundo | `disabled` tira a aba ativa da ordem de foco. Adotou-se a semântica Radix da página de departamento (`data-state`, `aria-controls`, setas) em todos os controles, inclusive o do rodapé. |
| Aba inativa | `bg-grey-mid` | `--color-cinza-medio` (`#dcdad2`) | Não havia equivalente na paleta daqui, e usar `papel-fundo` — a cor da tela — fazia o controle inteiro desaparecer sobre o fundo. |
| Rosca girando | `g.rotating` com `rotate()` calculado | não implementado | Polimento de animação; não muda a leitura. |
| Seções de topo | uma por categoria de vértice (`/sf/elected/`, `/sf/commissions/`, `/sf/advisories/`, `/sf/departments/`) | `/orgaos`, `/patrocinadores`, `/proponentes`, `/projetos` | Mesma divisão, adaptada: a correspondência é **por posição no anel**, que é o que `analogoCivLab` registra em cada categoria. Aqui a ordem das quatro é a do fluxo do valor — quem autoriza, quem põe, quem executa, o que se produz. |
| Coluna do índice | lista de alocação, borda inferior na cor da categoria | igual, e **não** tabela | Não é escolha estética: `Tabela` carrega `min-w-[40rem]` e a coluna-documento tem ~576px a 1440px, então cinco colunas rolariam na horizontal em toda categoria. A lista é o que o original faz e é o que cabe. |
| Largura da página | canvas + coluna, só | mais duas faixas de largura cheia, acima e abaixo do par | A aba de orçamento do original tem a rosca e o *breakdown*; o `/orcamento` daqui tem também conferência de cota e duas tabelas territoriais, que não têm contraparte lá. Comprimi-las a 40% as tornaria ilegíveis, e removê-las seria publicar menos. Ficam em largura cheia abaixo do par. |
| Total da categoria | — | ausente em `governanca` | Somar ali não é uma grandeza: cinco dos seis órgãos não têm orçamento e o sexto é `licc-programa`, que espelha o total do exercício. Os três anéis do dinheiro mostram o total porque ali ele é o mesmo R$ 25 mi visto em estágios diferentes, e dizer isso é informação. |

## Paleta do orçamento

As cores da rosca (`#f8da84`, `#9cc2fc`, `#d1fe89`, `#f48d4a`, `#4cffb2`,
`#8ae9f7`) continuam as **aferidas por amostragem**, e isso está certo: são
cores de dado, não de categoria, e o valor amostrado já inclui o
`filter: saturate(1.25)` que o original aplica em cada `path`. Reaplicar o
filtro sobre elas dobraria o efeito.

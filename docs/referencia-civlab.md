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

## Paleta do orçamento

As cores da rosca (`#f8da84`, `#9cc2fc`, `#d1fe89`, `#f48d4a`, `#4cffb2`,
`#8ae9f7`) continuam as **aferidas por amostragem**, e isso está certo: são
cores de dado, não de categoria, e o valor amostrado já inclui o
`filter: saturate(1.25)` que o original aplica em cada `path`. Reaplicar o
filtro sobre elas dobraria o efeito.

# licc.gov — notas para o agente

Catálogo relacional em grafo da Lei de Incentivo à Cultura Capixaba, na linha do
SF Government Graph do CivLab. Next.js 16 (App Router), React 19, TypeScript,
Tailwind 4. Sem banco: o grafo é um artefato JSON versionado.

Este arquivo registra **o que não se descobre lendo o código**. A visão geral
está no `README.md`; o modelo, em `docs/ontologia.md`; o ETL, em
`docs/pipeline.md`; o que foi aferido do CivLab, em `docs/referencias.md`.

## Comandos

```bash
npm run dev            # http://localhost:3000
npm run typecheck      # tsc --noEmit — rode antes de qualquer commit
npm run build          # 342 páginas estáticas
npm run build:graph    # regenera data/graph.json e data/stats.json
npm run ingest         # coleta o Mapa Cultural do ES (ver bloqueio abaixo)
npm run importar:habilitados   # planilha da SECULT → grafo, sem rede nenhuma
npm run auditar:segmentos      # audita a classificação por linguagem
```

A aplicação sobe sem nenhum passo de dados: se `data/graph.json` não existir,
`src/lib/dados.ts` constrói o grafo em memória.

## A regra que não se quebra: proveniência

Todo vértice e toda aresta carregam `proveniencia: "oficial" | "derivado" |
"demonstracao"`, e o selo **aparece na interface**. Enquanto houver qualquer
registro `demonstracao`, uma faixa fica visível em todas as páginas.

Um grafo bonito de dados sintéticos é indistinguível de um grafo bonito de dados
reais — e este é um projeto de transparência. Daí decorrem três regras:

1. **Todo código que cria vértice ou aresta carimba proveniência.** Não há
   valor padrão implícito.
2. **Onde a fonte não publica um valor, o campo fica ausente.** Nunca estimado,
   nunca interpolado. Um `orcamento` ausente é informação; um inventado é dano.
3. **Registros fictícios usam letras gregas** (`Empresa Sigma Celulose`,
   `Produtora Alfa`) para que jamais sejam confundidos com agentes reais.
   Não troque por nomes plausíveis, por mais que a demo fique mais bonita.

## O que cria projeto da LICC

**A lista de habilitados, não a API.** `data/raw/habilitados-{ano}*.csv`,
transcrita dos anexos da SECULT, com `fonte_url` em cada linha. O esquema está
em `docs/pipeline.md`; o molde versionado, em `data/raw/habilitados-exemplo.csv`.

**São vários arquivos de propósito.** A comissão da LICC é permanente e a SECULT
publica em **lotes** — só 2025 tem pelo menos seis anexos, com 28, 33, 35, 37,
41 e 74 projetos, todos rotulados "ANO 2025". As URLs estão em
`docs/pipeline.md`. Quando o mesmo projeto reaparece, o lote novo **completa** o
antigo campo a campo; conflito de valor prevalece pelo mais recente e é
relatado. Assumir um arquivo por exercício descartaria cinco lotes em silêncio.

`project` do Mapa Cultural **não** é projeto da LICC — é qualquer projeto
cultural cadastrado na plataforma. Houve uma versão que carimbava cada um deles
como `oficial` com fundamento na Lei 11.246/2021; era pior que o seed, que ao
menos se identifica como fictício. Hoje eles só **enriquecem** (URL, descrição,
id) o que a lista já criou. Sem a planilha, `npm run ingest` produz zero
projetos e avisa.

**Célula vazia é ausência, nunca zero.** É por isso que `Orcamento.autorizado` e
`Orcamento.captado` são opcionais: campo obrigatório forçaria `0` no lugar da
ausência, e "não publicado" viraria "R$ 0" — a forma mais silenciosa de mentir
num painel financeiro. Os agregados somam só o que existe e guardam
`orcamento.cobertura` com quantos entraram na conta.

Normas e regras trazem também `verificado: boolean`. `false` significa "citada
por fonte secundária, ainda não conferida no texto oficial" — hoje é o caso do
limite de 3 projetos por proponente. A interface exibe esse estado em vez de
escondê-lo. Não promova nada a `true` sem ter lido a fonte primária.

## Por que os anéis são o que são

O grafo radial (`src/components/GrafoRadial.tsx`, geometria em
`src/lib/radial.ts`) segue **o fluxo do valor**, não uma taxonomia:

```
centro  População Capixaba      estrela   financiadora indireta e beneficiária
anel 1  Aprovação e fomento     círculo   SECULT, SEFAZ, CEC, CAP, Governo
anel 2  O capital               losango   empresas patrocinadoras (renúncia de ICMS)
anel 3  A execução              ponto     produtoras, coletivos, ONGs, prefeituras
anel 4  O bem público           quadrado  projetos, setorizados por linguagem
```

Na LICC o Estado abre mão de ICMS para que a política exista, então o capixaba
é financiador indireto **e** beneficiário final — por isso ele é o centro, e por
isso clicar num patrocinador acende uma linha até ele: é o imposto que não
entrou no caixa estadual.

**`segmento` não ocupa anel — ele setoriza o anel dos projetos.** As linguagens
culturais dividem o anel externo em fatias contíguas, cada uma com o nome
escrito ao longo do arco e os projetos tingidos na sua cor. Assim música,
teatro e audiovisual ficam visíveis no grafo sem virar um anel próprio, que
devolveria o desenho à condição de taxonomia. `municipio`, `evento`, `espaco`,
`pessoa`, `edital` e `fundamento` também têm `anel: null`: aparecem nas páginas
e no `/monitor`, não no desenho do fluxo.

**A rosca de orçamento usa Flexoki; o grafo, a paleta aferida do CivLab.** A
troca no painel de orçamento é divergência deliberada, pedida, e está
documentada em `src/ontology/paleta-orcamento.ts` com os dois desvios que o
validador aponta. Os valores vêm de `css/flexoki.css` no repositório
`kepano/flexoki`, e a **ordem das matizes foi buscada** rodando
`scripts/validate_palette.js` sobre permutações — o validador confere o pior par
adjacente, então a ordem decide a aprovação. O que segue abaixo vale para os
anéis do grafo.

**Vértice em repouso é branco; as três camadas são do glifo.** Medido no HTML
de `graph.civlab.org/sf` em 29/09/2026: 177 vértices saem
`fill="#FFFFFF" fill-opacity="1"` com `stroke-opacity="1"`, e os únicos doze
`fill-opacity="0.5"` da página são os glifos inline, de coordenada fixa. A cor a
50% é o estado **aceso por seleção**, não o repouso. Aqui `aceso` valia
`!cadeia || cadeia.nos.has(id)`, e sem seleção `cadeia` é nula — o primeiro termo
já dava verdadeiro e o grafo inteiro nascia pintado. Além de pesado, isso esvazia
a codificação: se tudo está aceso, acender não distingue nada.

**A paleta do grafo vem do HTML do CivLab, não de amostragem.** Houve uma versão
amostrada por contagem de pixels dos quadros da gravação; estava errada, e a
razão vale guardar: **o pixel media o vértice aceso**, que já é a cor misturada
a 50% com o branco. Media-se o efeito e guardava-se como causa.

A regra real é **uma cor por categoria, em três camadas** — base branca, a
mesma cor a `fill-opacity 0.5`, traço na cor cheia. Por isso `corPastel`
deixou de existir: um pastel guardado pode divergir da cor de que deriva.

Centro `#f27836`, anéis `#f2686f`, `#c15ef2`, `#f25eef` e `#826dc8`, sobre o
fundo `#ebeae4` — este sim aferido, porque foi amostrado do plano de fundo e
não de um vértice. A correspondência com o CivLab é **por posição no anel**
(People→`publico`, Elected→`governanca`, Commission→`patrocinador`,
Advisory→`proponente`, Department→`projeto`), não por semelhança de nome.

Medidas, interações e o que se decidiu divergir estão em
`docs/referencia-civlab.md`. Antes de "corrigir" cor, raio ou traço no olho,
leia lá.

**As cotas são quatro, não três.** O art. 18 da IN 01/2025, transcrito no
anexo de recurso captado: 30% eventos calendarizados com mais de 10 anos, 10%
planos plurianuais, 10% fora da região metropolitana e **50% os demais**. A
quarta faltava, e sem ela metade do teto aparecia sem destinação normativa. Ela
é o complemento — projeto que não se enquadra em nenhuma das outras três.

As cadeias de responsabilização estão em `calcularCadeia()`, e cada tipo conta
uma história diferente sobre o mesmo mecanismo. Alterar uma delas é alterar o
argumento da página, não só o desenho.

## Armadilhas já pagas

- **Projeto sem linguagem classificada é fatia própria, não sobra.** O arco
  cinza da rosca mede "teto ainda não captado", e ele é a diferença entre o teto
  e a soma das fatias. Enquanto os projetos sem segmento ficavam de fora, essa
  diferença os absorvia: em 2025 o captado é 100% do teto e mesmo assim 45% do
  círculo aparecia cinza — o gráfico afirmava que o Estado não captou metade da
  renúncia quando captou tudo. Lacuna medida tem de aparecer como lacuna, com o
  tamanho que tem, e não vazar para dentro de outra grandeza.
- **O ciano do Flexoki não passa o piso de croma em degrau nenhum** (0,075 no
  700, 0,086 no 600, 0,093 no 500). É propriedade da paleta, não erro de
  escolha; ficou o 600, que dá a melhor separação. As regras duras — CVD ≥ 8 e
  visão normal ≥ 15 — passam, e o piso de croma existe para marca fina não virar
  cinza, caso que a rosca não é.
- **Captado abaixo da reserva com saldo zero é remanejamento, não
  descumprimento.** O art. 18, § 2º permite à SECULT mover sobra entre cotas, e
  o anexo de 2025 registra a operação: a cota II captou R$ 2.329.896 de
  R$ 2.500.000 e imprime "Saldo disponível: R$ 0,00 remanejado para cota III",
  que captou exatamente R$ 2.500.000 + R$ 170.104. Marcar aquilo como `✗` seria
  o juízo de cumprimento que o painel não faz — reserva consumida com saldo zero
  é reserva aplicada, e a regularidade é questão jurídica, não aritmética.
- **Total impresso por cota vence o piso derivado.** O piso somado dos projetos
  classificados existia para suprir a ausência do oficial, não para competir com
  ele: havendo `data/oficial/cotas-{ano}.csv`, é ele que decide `atendida`, e a
  barra passa a ser a do documento.
- **"Festival" não classifica linguagem.** É formato de evento: "Festival de
  Cinema de Santa Teresa" é audiovisual e "Festival de Teatro de Guaçuí" é artes
  cênicas, mas "Moqueca Pop Festival" não diz a que linguagem pertence. Aqui as
  regras divergem de propósito do `aval-pol`, que agrupa "música popular e
  festivais" numa classe só. Palavra de formato — festival, mostra, encontro,
  semana — só entra acompanhada da linguagem.
- **Concordância entre duas derivações não é acerto, e o nome da variável
  importa.** A auditoria de segmentos mede as regras contra um conferente, e
  quando esse conferente é outra inferência o que sai é desacordo, não verdade:
  onde as duas discordam uma está errada; onde concordam **podem estar erradas
  juntas**. Em 2025 deu 85,7% e κ de Cohen 0,813 — e, com esse κ, `graff` ainda
  casava dentro de "ORIGRAFFES" e `\bfesta d` classificava a "Festa da Palavra"
  como cultura popular. Chamar isso de "acurácia" faria a interface trocar
  "derivado" por "conferido" sem nada ter sido conferido.
- **Folha de conferência tem de ser cega, e célula vazia não é veredito.** Folha
  que mostra o que as regras decidiram mede assentimento: quem preenche ancora na
  resposta à vista e o número sai inflado sem ninguém mentir. Por isso o veredito
  da máquina mora em `segmentos-evidencia.csv` e só encontra a folha na leitura de
  volta. E `nenhuma` ("julguei, não dá para dizer") é diferente de vazio ("ainda
  não julguei") — sem essa distinção não se mede se os projetos **sem** classe
  estão certos, que é onde o classificador erra sem aparecer. Folha sem veredito
  recusa e sai com código 1, como os conferidores de `tools/anexos-secult/`.
- **Auditar o classificador pede o corpus todo, não o que está no grafo.** O
  artefato sob teste é a lista de regras, então ela roda contra os 530 títulos —
  63 do grafo mais 467 da lista de habilitados —, e foi isso que resolveu o caso
  ORIGRAFFES: sobre os 63 o casamento de `graff` dentro de um nome inventado
  parecia defeito, e outra linha do corpus grande soletra "Origraffes (Original
  Graffiti Espírito Santo)". É festival de grafite, a regra acertou por um
  caminho suspeito, e só o corpus maior provou.
- **Topônimo não é linguagem.** `divino`, que existe para a Festa do Divino,
  casava em "Divino de São Lourenço" — município capixaba — e, por vir antes de
  `patrimonio` na ordem, escondia a classe certa de um projeto de restauro. O
  termo dispara **uma vez em 530 títulos e é falso positivo**; a Festa do Divino
  real é pega por `\bfesta d`. A verificação confere o trecho casado contra os 78
  municípios da ontologia, então acha a classe inteira do problema em vez do caso.
- **Auditoria que reimplementa o classificador audita uma cópia.** Por isso
  `segmentoPorTitulo()` é invólucro fino de `classificarTitulo()`, que devolve a
  evidência (regra, trecho, caminho, candidatas preteridas). E por isso o
  relatório compara o `segmentoId` gravado em `data/graph.json` com o que o
  classificador produz agora, saindo com erro quando divergem: artefato velho e
  auditoria fora do caminho de produção invalidam o relatório do mesmo jeito.
- **A divisão de topo é por anel, e é a do CivLab.** Lá as seções são uma por
  categoria de vértice (`/sf/elected/`, `/sf/commissions/`, `/sf/advisories/`,
  `/sf/departments/`); aqui são `/orgaos`, `/patrocinadores`, `/proponentes` e
  `/projetos`, na ordem do fluxo do valor. A correspondência é **por posição no
  anel**, registrada em `analogoCivLab` dentro de cada categoria de
  `src/ontology/nodes.ts`, e o campo `rota` aponta cada categoria ao seu índice.
  `/orcamento`, `/indicadores` e `/monitor` são nossos, não divisões do original.
- **`licc-programa` é `kind: "governanca"`, e não é um órgão.** Ele fica ali para
  ocupar o primeiro anel do desenho, e carrega o espelho dos R$ 25 mi do
  exercício. Some-o com os outros cinco — que não têm orçamento nenhum — e o
  índice de órgãos publica "Captado R$ 25.000.000", afirmando que os órgãos
  captaram o teto quando eles autorizam a renúncia e não a recebem. Por isso o
  total de categoria é condicionado ao que ele mede, e em `governanca` não há.
- **Coluna-documento não comporta tabela financeira.** Ela tem ~576px a 1440px de
  viewport e `Tabela` carrega `min-w-[40rem]`, então qualquer tabela de quatro
  colunas ali rola na horizontal. A coluna do original é **lista de alocação** —
  nome, e embaixo os números, com borda inferior na cor da categoria —, e é por
  isso que `IndiceCategoria` usa lista. O que precisa de tabela desce para a
  faixa de largura cheia que `PaginaComCanvas` expõe em `abaixo`.
- **Rótulo de cobertura tem de dizer a origem quando o campo é derivado.** A
  linha de linguagem em `/indicadores` dizia "identificada", o que se lê como
  fonte oficial; cobertura alta é onde o rótulo engana mais, porque 100% de
  classificação nossa não é 100% de dado publicado.
- **Dois anexos, dois recortes que se chamam "2025".** "RECURSO FINANCEIRO
  CAPTADO 2025" é dinheiro captado no **ano-calendário**; "PROJETOS HABILITADOS
  - ANO 2025" é quem foi **habilitado** naquele ciclo e capta no seguinte. Dos
  63 projetos que captaram em 2025, 30 estão na seção de habilitados de 2024, 14
  na de 2023 e só 4 na de 2025. Tratar a lista como lote produzia 115 projetos
  onde existem 63. Ela entra como **dicionário**: enriquece quem já está no
  grafo, nunca cria projeto.
- **Casamento por semelhança de nome funde projeto distinto.** `nomesCorrespondem`
  casou "Carna Barra - Carnaval da Barra do Jucu" com "Carna Surpresa 2024 - O
  Carnaval da Barra do Jucu", e "Boa Vista Carnaval Capixaba 2026" com o de
  2025. Dentro do próprio anexo de captados havia três pares que ele fundiria. O
  casamento é por **título normalizado exato**, e título que aparece em mais de
  um exercício fica de fora — festival anual tem uma linha por edição.
- **Alocação de cota é piso, não total.** Ela soma só os projetos classificados,
  então piso **acima** da reserva prova cumprimento, mas piso **abaixo** não
  prova nada enquanto houver projeto sem classificar. `atendida: false` exige
  cobertura completa; do contrário é `null`, exibido como "indeterminado". Sem
  isso a tela dizia "✗ 46,6%" sobre 31 de 63 projetos — o mesmo erro do "1112%",
  de cabeça para baixo.
- **Banda de coluna aberta engole a paginação.** `enquadramento` ia de 715 ao
  infinito, e o número da página (x≈810) entrava como classe de cota: os
  "enquadramentos desconhecidos" de 2022 e 2023 eram `"18"`, `"24"`, `"26"`.
- **Conferidor que prova a leitura bloqueia; divergência que descreve a fonte,
  não.** A lista traz `500.000.00` num projeto (ponto no lugar da vírgula) e um
  valor LICC R$ 100 acima do total noutro — os dois conferidos na geometria
  crua. Descartar 113 registros bons por causa deles seria deixar de publicar o
  que a SECULT publicou. Banda torta falha em bloco; uma linha em 113 é a fonte.
- **No anexo da SECULT o rótulo do projeto é centralizado sobre o grupo de
  termos**, não impresso na primeira linha dele. Num grupo de três, o primeiro
  termo fica *acima* do próprio rótulo; num grupo par, o rótulo cai no vão
  entre as duas linhas centrais. Ler por "âncora mais próxima acima" atribuía o
  aporte da Perfil Alumínio à escola de samba da linha de cima, publicando que
  ela captou R$ 611 mil contra R$ 492 mil habilitados. A leitura certa é uma
  partição contígua que minimiza |y_rótulo − centro(grupo)|: resíduo médio de
  0,4pt sobre 63 projetos.
- **A ordem dos testes em `ehMoldura` é conserto, não estilo.** O cabeçalho de
  cota carrega o teto da cota na banda do valor habilitado
  (`x=175 "Valor: R$ 12.500.000,00"`). Enquanto o guarda "linha com dinheiro
  nunca é moldura" vinha primeiro, a seção virava um projeto fantasma de
  R$ 12,5 mi que roubava termo do vizinho.
- **Ausência não é `false`.** `Boolean(p.meta?.pautado)` e
  `!rmgv.has(municipioId ?? "")` liam "a fonte não diz" como "não se enquadra" e
  como "fica fora da região metropolitana" — o painel declarou 1112% de
  cumprimento de uma cota territorial sobre 63 projetos sem município nenhum.
  Classificador de cota devolve `boolean | undefined`, e cota sem projeto
  classificável é `atendida: null`, exibida como "sem dado".
- **Ressalva fixa vira mentira ao avesso.** A frase de abertura de
  `/indicadores` afirmava que os gráficos liam o conjunto de demonstração;
  quando os 63 projetos passaram a ser oficiais, ela seguiu afirmando. Texto que
  qualifica dado tem de ser condicionado ao dado.
- **A camada territorial mora em `nosFixos`, não no seed.** Os 78 municípios e
  os segmentos são ontologia, não demonstração. Enquanto o seed os emitia,
  trocá-lo pelo anexo real levava os dois embora: `/monitor` passou a listar
  zero municípios. A lacuna que importa mostrar é "nenhum projeto chegou aqui",
  e para isso o município precisa existir.
- **`build:graph` num clone limpo caía no seed.** `data/raw/licc-{ano}.json` é
  ignorado pelo git, e o construtor só tinha dois caminhos: coleta local ou
  conjunto de demonstração. Quem clonasse e rodasse `build:graph` — comando que
  a própria documentação manda rodar depois de mexer em ontologia —
  **sobrescrevia** os 63 projetos reais por dados fictícios, em silêncio. Hoje há
  um degrau no meio: havendo transcrição versionada em `data/oficial/`, ela é a
  fonte, e o seed é último recurso.
- **Nem toda norma que incide sobre a LICC a funda.** `licc-programa` declarava
  `fundamentos: FUNDAMENTOS.map((f) => f.id)`, o que valia enquanto todas eram
  capixabas. Com a Lei federal 14.903/2024 no grafo, isso emitia uma aresta
  `fundamenta` afirmando que ela institui o programa estadual. `FundamentoLegal`
  tem `esfera` por isso, e o programa usa `FUNDAMENTOS_DA_LICC`.
- **Acumulador zerado não pode sobreviver à agregação.** `propagarAgregados()`
  cria `orcamento` zerado em todo nó para poder somar dentro, e 101 nós ficavam
  com `autorizado: 0, captado: 0` sem terem orçamento nenhum — norma, órgão,
  edital, pessoa, e município sem projeto. O tipo torna esses campos opcionais
  justamente para permitir a ausência; preenchê-los com zero desfazia no
  construtor a garantia que o tipo dá. Hoje um passe final arranca o orçamento
  de quem não recebeu contribuição. **Patrocinador é a exceção que quase quebrou
  o conserto**: ele acumula por peso de aresta e nunca passa por `somar`, então
  precisa se registrar à parte, senão a limpeza o esvazia.
- **`build:graph` sozinho não propaga mudança de ontologia.** `data/raw/licc-{ano}.json`
  guarda um instantâneo de `nosFixos()`, então editar `pipeline/seed/institucional.ts`
  ou `src/ontology/` e rodar só `build:graph` reconstrói o grafo a partir do
  instantâneo antigo — a edição não chega à tela e nada avisa. A ordem é
  `npm run importar:habilitados && npm run build:graph`.
- **Presença e atribuição de valor são duas contas, e a leitura tem de usar a
  mesma do construtor.** `propagarAgregados` já aplica a regra certa — dinheiro
  onde a fonte nomeia **um** município, presença em todos —, mas `obterPanorama`
  somava por conta própria a lista de projetos. Quando essa lista passou a ser de
  presença, o valor dos 3 projetos multi-município passou a ser contado em cada
  um: **oito municípios publicavam números diferentes em duas páginas** — Serra
  R$ 500 mil em `/monitor/serra` contra R$ 0 em `/municipios`, Vitória R$ 6,74 mi
  contra R$ 5,93 mi — e o total territorial subia a R$ 18,59 mi sobre R$ 14,37 mi
  atribuídos. Dinheiro tem uma fonte da verdade, e é o construtor; a página lê
  `municipio.orcamento` e não soma nada.
- **Presença não é contribuição — marcar as duas igual ressuscita o acumulador
  zerado.** O registro de presença chamava `recebeu.add()`, então a limpeza final
  poupava Serra, Guarapari, Linhares e Cachoeiro de Itapemirim, que ficavam com
  `autorizado: 0, captado: 0` sem ter orçamento atribuído nenhum. São **três**
  estados, não dois: quem recebeu valor guarda tudo; quem só tem presença guarda
  `cobertura` — `{comValor: 0, total: 1}` diz exatamente "um projeto aqui, nenhum
  com valor" — e fica sem `autorizado`/`captado`; quem não tem nem presença perde
  o orçamento inteiro. Apagar tudo esconderia o projeto; manter o zero afirmaria
  uma destinação de R$ 0.
- **Razão tem de nomear o próprio denominador.** `/municipios` publicava "33,6%
  do total captado" para o interior e `/indicadores`, "66,4% do valor" para a
  RMGV — as duas dividindo pelos R$ 14,37 mi **atribuídos a município**, não
  pelos R$ 25 mi captados. Sobre o captado do exercício é 19,3% e 38,2%. As duas
  páginas concordavam entre si, o que faz o defeito sobreviver a qualquer
  conferência cruzada: é o "1112%" em escala menor, e inflava justamente o lado
  politicamente carregado. Hoje o rótulo diz "do valor com município atribuído" e
  os R$ 10,6 mi sem território aparecem como número próprio.
- **A mesma razão errada mora em três lugares.** "66,4% do valor" apareceu em
  `/indicadores`, em `/municipios` (como "33,6% do total captado") e ainda uma
  terceira vez no painel de orçamento da home. Corrigir onde se viu não é
  corrigir: frase que cita número derivado é copiada, e `grep` pelo texto acha só
  a redação, não a razão. Ao mexer num denominador, procure pelo **nome da
  grandeza** (`fracaoNaRmgv`) em todo o repositório, não pela frase.
- **A referência do CivLab envelhece — ela é um instantâneo, não um espelho.**
  Os despejos de agosto/2026 registravam abas `News | Who's connected? | Budget`;
  a remedição de 29/09/2026, via Firecrawl sobre `graph.civlab.org/sf`, achou uma
  quarta aba (`Media`), páginas de tópico com abas próprias
  (`News | Who's Responsible? | Media`) e a home reorganizada. `firecrawl_scrape`
  **existe nesta sessão** e não passa pelo proxy de egresso, então remedir é
  barato: faça isso antes de "corrigir" divergência contra a tabela antiga.
- **Varredura de links tem de cobrir toda rota, não as que se lembrou.** Seis
  `href="/segmentos/<slug>"` na tabela do indicador 3 apontavam para uma rota que
  **nunca existiu** — 404 em produção. A conferência anterior olhou só `/entidade`
  e `/monitor` e passou limpa. A página de um segmento é `/entidade/<slug>`, que é
  o que `/segmentos` já usava.
- **Dois títulos iguais em seções vizinhas esconde o que a tabela mostra.** Em
  `/orcamento`, "Por microrregião (resumo)" e "Por microrregião" — a segunda lista
  municípios.
- **Tarja e número têm de contar a mesma coisa.** Em `/orcamento` a cota sem
  dado exibia a tarja "sem dado" e, logo abaixo, "R$ 0 de R$ 12.500.000" com a
  barra vazia — que se lê como "o Estado não destinou nada". Corrigir só o selo
  e deixar o número foi meio conserto.
- **Dinheiro no artefato versionado é arredondado a centavo.**
  `arredondarDinheiro()` roda depois de toda agregação, num passe só. Sem ele,
  `27802174.470000006` vira ruído de diff entre coletas e precisão que a fonte
  não tem. Razões (`execucao`, `comprometimentoDoTeto`) **não** se arredondam:
  a cauda ali é da divisão, é determinística, e cortá-la perderia precisão real.
- **`verificado` e `naoApuravel` são perguntas diferentes.** O primeiro é "li a
  norma?" e se resolve lendo o texto; o segundo é "consigo calcular o
  cumprimento?" e para algumas regras é permanente. Enquanto só existia o
  primeiro, bastaria conferir a IN para a interface passar de "quem alcançou o
  número" a "quem descumpriu a norma" — acusação que o dado nunca sustentou. As
  duas tarjas aparecem separadas em `/sobre` de propósito.
- **Tarja de bloco de texto segue a afirmação, não o registro citado.** No bloco
  de tensão normativa de `/indicadores`, herdar `verificado` do fundamento
  deixava o lado estadual sem tarja — a IN 2026 está conferida na *identidade* —
  como se a prosa sobre diligência e Cadin-ES tivesse sido lida no texto oficial.
  Não foi.
- **Posições são calculadas, não simuladas.** Houve uma versão com
  `react-force-graph-2d` + `d3-force`; foi removida. A física produzia um miolo
  comprimido ilegível e arremessava para fora da tela todo vértice que perdia
  sua única aresta ao desligar uma camada. Não reintroduza física.
- **`next/dynamic` não encaminha `ref`.** Foi o que matou silenciosamente
  `zoomToFit`, os botões de zoom e a configuração de forças na versão antiga. Se
  algum dia precisar de um componente dinâmico com ref, passe a instância por
  uma prop comum, não por `ref`.
- **A escala de tamanho é interna ao anel**, nunca global. Comparar um projeto
  ao programa inteiro achata todos os projetos no mesmo raio.
- **A aba inativa usa `cinza-medio`, não `papel-fundo`.** `papel-fundo` é a cor
  da tela: pintar o controle com ela faz o segmentado sumir sobre o fundo, que
  foi o que aconteceu. `--color-cinza-medio` existe só para isso.
- **Não importe valor de módulo `"use client"` para componente de servidor.**
  O Next entrega *toda* exportação de um módulo cliente como referência de
  cliente, não como valor. As cores dos gráficos moravam em
  `GraficosIndicadores.tsx` e chegavam `undefined` na página — a legenda saía
  com os quadradinhos transparentes enquanto o gráfico ao lado pintava certo.
  Valor compartilhado mora em módulo sem diretiva (`src/ontology/paleta-grafico.ts`).
- **A paleta do orçamento não serve como paleta de gráfico.** Ela é fiel ao
  CivLab e funciona na rosca — fatias largas, traço branco entre elas, nome no
  arco. Como marca fina reprova no validador: acima da banda de luminosidade,
  abaixo do piso de croma, e `#c9b3fc` com `#ffb3c9` a ΔE 10,7, indistinguíveis
  mesmo com visão normal. Os gráficos de `/indicadores` usam
  `src/ontology/paleta-grafico.ts`, conferida nos dois temas.
- **Controle em coluna rolável precisa de `shrink-0`.** A coluna-documento é um
  `flex flex-col` com `max-h`; sem isso os cartões esmagam o segmentado a zero
  de altura, e ele fica no DOM, acessível ao leitor de tela, invisível na tela.
- **O vão do sunburst é dado, não defeito**: um arco cinza fecha o anel e
  representa o teto ainda não captado. Não o remova para "centralizar" o
  gráfico.
- **Rótulos de aresta têm forma ativa e passiva** (`rotulo` / `rotuloInverso`).
  Inverter ingenuamente produz "É fiscaliza por".
- **Quem publica o edital é a SECULT; quem inscreve projeto nele é o
  proponente.** A aresta `inscrito_em` vai do projeto para o edital, e `publica`
  do órgão para o edital. Inverter isso conta uma história falsa sobre como a
  lei funciona.
- **O rótulo do anel some quando o anel é setorizado**, senão colide com o nome
  da linguagem escrito no arco.

## Rede: o que está bloqueado

O egresso **não é uma lista de hosts bloqueados — é permissão por allowlist**, e
praticamente nada externo passa. Medido: além de `mapa.cultura.es.gov.br`,
`secult.es.gov.br`, `civlab.org`, `api.firecrawl.dev` e `r.jina.ai`, respondem
`EGRESS_BLOCKED` ou HTTP 000 também `planalto.gov.br`, `www2.camara.leg.br`,
`www3.sefaz.es.gov.br`, `legisweb.com.br` e `servicodados.ibge.gov.br`. Não
adianta procurar espelho: presuma bloqueado até provar o contrário. O bloqueio é
**da organização, não do contêiner** — `curl` e `WebFetch` falham igual.

Duas saídas funcionam, e **as duas só localizam, nenhuma lê**:

- `WebSearch` — foi assim que as URLs dos anexos em `docs/pipeline.md` foram
  achadas.
- `mcp__Firecrawl__firecrawl_search` — não passa pelo proxy de egresso. Devolve
  título, URL e descrição.
- `mcp__Firecrawl__firecrawl_scrape` — **existe**, e lê a página inteira, também
  sem passar pelo proxy. Foi assim que `graph.civlab.org/sf` foi remedido e que o
  ensaio "How the SF Budget is Made" foi lido. Isto muda o que se pode auditar:
  página pública que o Firecrawl alcança é **texto lido**, não só identidade. O
  que continua valendo é que nada disso alcança `planalto.gov.br` ou os diários
  oficiais pelo proxy, então norma segue conferida só onde há PDF acessível.

Daí a regra prática: essas buscas **auditam identidade de norma** — número,
data, ementa, URL oficial, e o trecho que o buscador expõe — e **não auditam
texto de norma**. Foi assim que o Decreto nº 5.035-R/2021 entrou na ontologia e
que a IN 2026 ganhou número e data. Nenhuma delas promove nada a
`verificado: true`, que significa "conferida no texto oficial".

`npm run ingest` **falha com HTTP 403 e isso é esperado** — não é bug, não tente
consertar, não retente 4xx (o cliente já foi escrito para não fazê-lo). O grafo
segue servido pelo conjunto de demonstração. Contornar a política de egresso não
é opção; a orientação do próprio proxy é reportar o host bloqueado.

`tools/scrape-civlab/` e `tools/anexos-secult/` **rodam na máquina do usuário**,
não aqui, e instalam a própria dependência (por isso Playwright e `pdfjs-dist`
não estão nas dependências da raiz).

O segundo baixa os anexos de habilitados e os converte em CSV por leitura
**posicional** do PDF. Não use modelo de linguagem para transcrever tabela
financeira: ele arredonda valor e pula linha em silêncio. Dois conferidores
travam a gravação — a contagem que o anexo declara e o formato de cada valor.
O segundo não é redundante: em teste a contagem bateu, 5 de 5, com todos os
valores truncados por quebra de linha dentro da célula.

## Onde ficam as coisas

| Caminho | Papel |
| --- | --- |
| `src/ontology/` | A verdade do modelo: 12 categorias, 15 relações, segmentos, municípios, normas |
| `src/lib/radial.ts` | Geometria dos anéis e cadeias de responsabilização |
| `src/lib/indicadores.ts` | Os quatro indicadores; devolvem `null` sobre zero observações |
| `pipeline/habilitados.ts` | Leitura da planilha oficial: CSV → vértices |
| `src/lib/dados.ts` | Acesso pelo servidor: índices, vizinhança, busca, panorama |
| `pipeline/sources/` | Cliente da API do Mapas Culturais |
| `pipeline/seed/` | Conjunto de demonstração determinístico (`mulberry32`) |
| `pipeline/build-graph.ts` | Agregados, posição, variação anual, conferência de cotas |
| `pipeline/auditar-segmentos.ts` | Auditoria da linguagem: estrutura das regras e concordância |
| `src/components/PaginaComCanvas.tsx` | O arranjo de duas colunas aferido do original, com faixas de largura cheia |
| `src/components/IndiceCategoria.tsx` | Índice de uma categoria do grafo — a divisão de topo do CivLab |
| `src/lib/fatias-orcamento.ts` | Grafo → fatias da rosca, por linguagem e por território |
| `data/auditoria/` | Folha de conferência e evidência por título, versionadas |
| `tools/scrape-civlab/` | Medição do CivLab — executa fora deste ambiente |
| `tools/anexos-secult/` | Anexos da SECULT → CSV — executa fora deste ambiente |
| `data/*.json` | Artefatos versionados de propósito: o diff entre coletas é auditável |

`data/raw/` é ignorado pelo git. Quando `data/raw/licc-{ano}.json` existe, o
construtor usa a coleta real e ignora o seed.

O seed é determinístico: o mesmo `seed` gera o mesmo grafo, então mudanças em
`data/graph.json` são diffs legíveis. Se um diff vier enorme sem motivo, algo
quebrou a determinismo.

## Estado atual

Branch `claude/licc-cultura-dashboard-hfgv61`. Sem PR aberto — só abra se pedido.

**O exercício padrão é 2025** (`EXERCICIO_PADRAO` em `src/ontology/legal.ts`),
que é o último ciclo fechado: a Instrução Normativa nº 001/2025 está publicada e
a oportunidade 1878 encerrou. A LICC 2026 segue com inscrições até 30/06/2026 e
seus números seriam parciais. `normaDoExercicio(ano)` resolve qual IN rege cada
ano; use-a em vez de fixar o id da norma.

**O grafo não tem mais nenhum registro de demonstração.** Os projetos de 2025
vêm do anexo "RECURSO FINANCEIRO CAPTADO 2025", transcrito por
`tools/anexos-secult/extrair-captados.mjs` e versionado em
`data/oficial/captados-2025.csv`:

| | |
| --- | --- |
| projetos | 63 |
| proponentes | 52 |
| patrocinadores | 28 empresas, 46 CNPJs de estabelecimento |
| termos de patrocínio | 95 |
| autorizado | R$ 27.802.174,47 |
| captado | **R$ 25.000.000,00** — o teto inteiro |

`contagemPorProveniencia` fecha em `{oficial: 536, derivado: 247,
demonstracao: 0}`, e a faixa de aviso sumiu sozinha, como previsto.

A soma dos tetos por projeto (R$ 27,8 mi) passar do teto de renúncia
(R$ 25 mi) **não é erro**: a SECULT habilita mais teto do que há renúncia, e a
disputa por patrocinador decide quem capta. Em 2025 a conta fechou em 100%.

A **lista de projetos habilitados** (`data/oficial/habilitados/`, 467 projetos
de 2022 a 2026) completa o que o anexo de captados não publica: município subiu
de 0% para 63% e a cota do art. 18 passou a vir classificada pela própria
SECULT.

**Linguagem cultural: 65%, e tudo derivado.** Nenhum dos dois anexos publica o
segmento do projeto, então `segmentoPorTitulo()` em `src/ontology/segmentos.ts`
o classifica do título por regras ordenadas e explícitas. Isso é `derivado` —
a terceira proveniência do modelo —, o nó carrega `meta.segmentoInferido` e o
rótulo em `/indicadores` diz "classificada do título (derivado, não publicado)".
O vocabulário das regex veio de `fcarva/aval-pol`
(`analise/06_alocacao_linguagens.py`), adaptado às 9 classes do Mapas Culturais.
**A pendência herdada de lá está medida, não resolvida.** Aquele repositório
emitiu uma folha de 60 títulos e nunca a preencheu. `npm run auditar:segmentos`
fecha essa parte: a folha é censo dos 63, cega, e está preenchida em
`data/auditoria/segmentos-folha.csv` com `conferente: modelo` — segunda
derivação, não gabarito. Concordância 85,7%, κ de Cohen 0,813, com nove
divergências: seis que as regras não classificam e o conferente sim (Bach sem a
palavra "música", "Compondo na Rua", "Batidas do Mundo"), duas em que as regras
classificam e o conferente não, e uma de classe trocada — "2ª Festa da Palavra",
festival literário que `\bfesta d` carimbou como cultura popular. **A conferência
humana continua faltando**, e a interface segue dizendo "derivado, não publicado".

**As cotas do art. 18 agora vêm impressas** (`data/oficial/cotas-2025.csv`). Os
anexos de recurso captado são seccionados por inciso e cada seção fecha com
"Total Captado" e "Saldo disponível" — números que **não** dependem de atribuir
projeto a cota:

| cota | reservado | captado | |
| --- | --- | --- | --- |
| I — 30% | 7.500.000 | 7.500.000 | ✓ |
| II — 10% | 2.500.000 | 2.329.896 | remanejada, saldo zero |
| III — 10% | 2.500.000 | 2.670.104 | ✓ |
| IV — 50% | 12.500.000 | 12.500.000 | ✓ |

Território, medido — e o denominador importa. Dos R$ 25 mi captados, só
**R$ 14,37 mi têm município atribuído**: 23 projetos não publicam local de
execução e 3 acontecem em vários sem que a fonte publique o rateio, então
**R$ 10,63 mi (42,5%) não entram em município nenhum**. Sobre o que é atribuído,
a RMGV com 7 municípios fica com R$ 9,5 mi e os 71 do interior com R$ 4,8 mi;
Gini de 0,921. Por **presença** 19 municípios têm projeto e 59 não têm nenhum —
e 4 dos 19 (Serra, Guarapari, Linhares, Cachoeiro de Itapemirim) têm projeto sem
valor atribuído, porque entram só por projeto multi-município.

## Próximos passos

1. **Contagem de vértices por anel — a geometria já está aferida.** Este passo
   dizia que `FRACAO_POR_ANEL` vinha "por impressão visual dos quadros do vídeo",
   e envelheceu: `docs/referencia-civlab.md` traz `0,444 / 0,714 / 1,0` lidos do
   HTML, e os quatro anéis daqui são divergência raciocinada, com a regra
   escrita. O que `tools/scrape-civlab/` ainda acrescentaria é topologia —
   quantos vértices por anel, os marcadores de vínculo de `r="4.2"` —, não os
   raios. Roda numa máquina com rede; `npx tsx pipeline/importar-referencia.ts`
   consome a `saida/`.
2. **Fechar os 23 projetos sem município.** Dos 63, 40 casaram com a lista de
   habilitados por título exato; 4 são ambíguos (o mesmo título em mais de um
   exercício) e 18 não têm correspondência — título grafado diferente entre os
   dois anexos. Casar esses exige critério que não seja semelhança de nome:
   valor autorizado idêntico somado a proponente correspondente é o candidato
   mais promissor. Três nomes de município também não resolvem contra a
   ontologia: "Vila Veha" (erro de digitação da fonte), "Marechal" e "Itaúnas"
   (distrito, não município).
3. **Conferir a linguagem à mão, e só depois mexer nas regras.** A medição está
   feita (`npm run auditar:segmentos -- --conferir`), mas o conferente é outra
   derivação: falta uma passada humana sobre `data/auditoria/segmentos-folha.csv`
   — mova a folha, reemita e preencha com `conferente: humano`, para as duas
   colunas ficarem comparáveis. **Só então** corrigir regra, usando a lista de
   divergências: `\bfesta d` é o alvo mais claro (dispara 28 vezes e pegou um
   festival literário) e `divino` é falso positivo puro (uma ocorrência, e é
   município). Corrigir antes da passada humana é fitar o classificador a uma
   inferência, que é a armadilha de ajustar ao gabarito com o gabarito errado.
4. **Valores por projeto.** A API pública do Mapas Culturais não expõe as
   inscrições (`registration`) de uma oportunidade — exige JWT — e é ali que
   vivem os valores da LICC. Precisam vir dos anexos publicados pela SECULT.
   Até lá, ausentes.
5. **Conferir a regra dos 3 projetos** na instrução normativa vigente e, se
   confirmada, marcar `verificado: true` em `src/ontology/legal.ts` — mas
   **sem remover o `naoApuravel`**. Os dois campos são independentes: conferir a
   norma não torna o cumprimento apurável, porque o parágrafo único soma pessoas
   jurídicas com sócios ou dirigentes em comum e o QSA da Receita não é
   consultável daqui. Apagar o segundo ao preencher o primeiro faz a tela trocar
   "quem alcançou o número" por "quem descumpriu a norma".
6. **O anexo de 2026 usa outro desenho de página e ainda não entra.** Ali o
   valor habilitado se repete em várias linhas de termo (99 de 129), então
   "linha com autorizado" deixa de identificar projeto e a partição por
   centralização não fecha: 3 projetos com captado acima do autorizado e a soma
   R$ 69.371,00 abaixo dos totais impressos. A ferramenta recusa gravar, e está
   certa. 2026 é exercício **aberto** — números parciais por definição —, então
   isto não bloqueia nada.

## Convenções

Código, comentários, identificadores e interface em **português do Brasil**.
Comentários explicam *por que*, não *o quê*. Números financeiros usam a classe
`.tabular` para alinhar coluna.

Rode `npm run typecheck` e `npm run build` antes de commitar. Se tocar em
ontologia ou pipeline, rode também `npm run build:graph` e confira o resumo que
ele imprime — cotas, totais e contagem por proveniência.

## Origem

Construído na sessão `session_015CE6UPEGrorVRRDirqjN69`
(`https://claude.ai/code/session_015CE6UPEGrorVRRDirqjN69`), também registrada
no trailer `Claude-Session:` do commit inicial.

Projeto independente. Não é sítio oficial da SECULT-ES nem do Governo do
Espírito Santo, assim como o CivLab não tem vínculo com a Prefeitura de São
Francisco.

## Regras do Next.js

@AGENTS.md

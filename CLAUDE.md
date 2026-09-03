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
npm run build          # 549 páginas estáticas
npm run build:graph    # regenera data/graph.json e data/stats.json
npm run ingest         # coleta o Mapa Cultural do ES (ver bloqueio abaixo)
npm run importar:habilitados   # planilha da SECULT → grafo, sem rede nenhuma
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

**A paleta vem do HTML do CivLab, não de amostragem.** Houve uma versão
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
  título, URL e descrição; nesta sessão **não há `firecrawl_scrape`**.

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

`contagemPorProveniencia` fecha em `{oficial: 533, derivado: 159,
demonstracao: 0}`, e a faixa de aviso sumiu sozinha, como previsto.

A soma dos tetos por projeto (R$ 27,8 mi) passar do teto de renúncia
(R$ 25 mi) **não é erro**: a SECULT habilita mais teto do que há renúncia, e a
disputa por patrocinador decide quem capta. Em 2025 a conta fechou em 100%.

O que o anexo de captados **não** publica fica ausente, e a lacuna é medida:
município 0%, segmento 0%, e por isso as quatro cotas do art. 18 aparecem como
`sem dado` em vez de `✗`. Preencher exige o anexo de habilitados, que traz esses
campos e mescla por cima campo a campo (`mesclarLinhas`).

## Próximos passos

1. **Calibrar o grafo contra medida.** Rodar `tools/scrape-civlab/` numa máquina
   com rede, trazer `saida/` e executar `npx tsx pipeline/importar-referencia.ts`,
   que gera `docs/referencia-civlab.md` com raios, contagens, formas e paleta
   aferidos. Hoje `FRACAO_POR_ANEL` em `src/lib/radial.ts` está por impressão
   visual dos quadros do vídeo.
2. **Município e segmento por projeto.** É a maior lacuna medida: 0% dos 63
   projetos, e é o que trava dois dos quatro indicadores e as quatro cotas. Vem
   do anexo de **habilitados** (não o de captados, que não traz esses campos);
   `tools/anexos-secult/extrair.mjs` já o lê, e `mesclarLinhas` completa o
   projeto campo a campo sem perder o que o anexo de captados trouxe.
3. **Valores por projeto.** A API pública do Mapas Culturais não expõe as
   inscrições (`registration`) de uma oportunidade — exige JWT — e é ali que
   vivem os valores da LICC. Precisam vir dos anexos publicados pela SECULT.
   Até lá, ausentes.
4. **Conferir a regra dos 3 projetos** na instrução normativa vigente e, se
   confirmada, marcar `verificado: true` em `src/ontology/legal.ts` — mas
   **sem remover o `naoApuravel`**. Os dois campos são independentes: conferir a
   norma não torna o cumprimento apurável, porque o parágrafo único soma pessoas
   jurídicas com sócios ou dirigentes em comum e o QSA da Receita não é
   consultável daqui. Apagar o segundo ao preencher o primeiro faz a tela trocar
   "quem alcançou o número" por "quem descumpriu a norma".
5. **O anexo de 2026 usa outro desenho de página e ainda não entra.** Ali o
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

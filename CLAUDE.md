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

**A paleta é aferida, não escolhida.** Fundo `#ebeae4`, centro `#f5ccba`,
anéis `#f6c4cc`, `#e2c1f8` e `#d2c9e5` — amostrados por contagem de pixels dos
quadros da gravação do CivLab. Em repouso o vértice é **só contorno**; o
preenchimento pastel entra quando ele acende. Cada categoria tem `cor` (traço e
texto) e `corPastel` (preenchimento). Não sature a paleta.

As cadeias de responsabilização estão em `calcularCadeia()`, e cada tipo conta
uma história diferente sobre o mesmo mecanismo. Alterar uma delas é alterar o
argumento da página, não só o desenho.

## Armadilhas já pagas

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

O egresso deste ambiente bloqueia `mapa.cultura.es.gov.br`, `civlab.org`,
`api.firecrawl.dev` e `r.jina.ai`.

`npm run ingest` **falha com HTTP 403 e isso é esperado** — não é bug, não tente
consertar, não retente 4xx (o cliente já foi escrito para não fazê-lo). O grafo
segue servido pelo conjunto de demonstração. Contornar a política de egresso não
é opção; a orientação do próprio proxy é reportar o host bloqueado.

`tools/scrape-civlab/` **roda na máquina do usuário**, não aqui, e instala o
próprio Playwright (por isso ele não está nas dependências da raiz).

## Onde ficam as coisas

| Caminho | Papel |
| --- | --- |
| `src/ontology/` | A verdade do modelo: 12 categorias, 15 relações, segmentos, municípios, normas |
| `src/lib/radial.ts` | Geometria dos anéis e cadeias de responsabilização |
| `src/lib/dados.ts` | Acesso pelo servidor: índices, vizinhança, busca, panorama |
| `pipeline/sources/` | Cliente da API do Mapas Culturais |
| `pipeline/seed/` | Conjunto de demonstração determinístico (`mulberry32`) |
| `pipeline/build-graph.ts` | Agregados, posição, variação anual, conferência de cotas |
| `tools/scrape-civlab/` | Medição do CivLab — executa fora deste ambiente |
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

O grafo carregado tem 82 projetos, 22 patrocinadores, 54 proponentes, 78
municípios, 68 espaços e 127 eventos. Teto de R$ 25 milhões, 96% comprometido em
tetos de projeto, 58% desse valor efetivamente captado.

O número 82 vem da lista de habilitados de **2026** e serve só para calibrar a
ordem de grandeza — não é contagem conferida de 2025, e todo projeto sai
carimbado `demonstracao` de qualquer forma.

## Próximos passos

1. **Calibrar o grafo contra medida.** Rodar `tools/scrape-civlab/` numa máquina
   com rede, trazer `saida/` e executar `npx tsx pipeline/importar-referencia.ts`,
   que gera `docs/referencia-civlab.md` com raios, contagens, formas e paleta
   aferidos. Hoje `FRACAO_POR_ANEL` em `src/lib/radial.ts` está por impressão
   visual dos quadros do vídeo.
2. **Coleta real.** `npm run ingest` num ambiente sem bloqueio substitui o
   conjunto de demonstração. A faixa de aviso some sozinha quando não restar
   registro `demonstracao`.
3. **Valores por projeto.** A API pública do Mapas Culturais não expõe as
   inscrições (`registration`) de uma oportunidade — exige JWT — e é ali que
   vivem os valores da LICC. Precisam vir dos anexos publicados pela SECULT.
   Até lá, ausentes.
4. **Conferir a regra dos 3 projetos** na instrução normativa vigente e, se
   confirmada, marcar `verificado: true` em `src/ontology/legal.ts`.

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

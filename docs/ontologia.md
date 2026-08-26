# Ontologia do LICC Gov Graph

O modelo espelha o **SF Government Graph** do CivLab e o adapta ao mecanismo da
Lei de Incentivo à Cultura Capixaba.

O que se transporta da referência não é a aparência, e sim três decisões de
modelagem:

1. **Entidades tipadas, não linhas de planilha.** Um órgão, uma empresa e um
   projeto são coisas diferentes, com páginas próprias e endereço estável.
2. **Relações nomeadas.** `appoints` e `oversees` viram `nomeia` e `fiscaliza`.
   A pergunta que o grafo responde é "quem responde por quê", não só "quanto".
3. **Âncora legal em toda entidade.** É o que separa um catálogo de governo de
   um painel de indicadores.

## Os anéis seguem o dinheiro

No CivLab o cidadão está no centro porque elege o prefeito e paga imposto. Na
LICC o mecanismo é outro: o Estado **abre mão** de ICMS para que a política
exista. O capixaba não é espectador — é **financiador indireto e beneficiário
final** ao mesmo tempo. Por isso os anéis não são uma taxonomia, são o
**fluxo do valor**, de dentro para fora.

| Anel | Papel | Quem | Forma |
| --- | --- | --- | --- |
| centro | Origem e destino do valor | População Capixaba | estrela serrilhada |
| 1 · `APROVAÇÃO E FOMENTO` | Define diretrizes e o teto | Governo do ES, SECULT, SEFAZ, CEC, CAP | círculo |
| 2 · `O CAPITAL` | Aloca a renúncia de ICMS | Empresas patrocinadoras | losango |
| 3 · `A EXECUÇÃO` | Realiza o projeto | Produtoras, coletivos, ONGs, artistas, prefeituras do interior | ponto |
| 4 · `O BEM PÚBLICO` | Resultado entregue | Projetos e editais | quadrado arredondado |

As formas reproduzem a gramática aferida no CivLab: cada categoria tem símbolo
próprio, inativo em contorno e aceso em preenchimento, com o rótulo do anel em
versalete espaçado desenhado no raio.

Quando um anel tem mais vértices do que cabem na circunferência, ele se divide
em **fileiras escalonadas** — é o que produz, no original, duas coroas próximas
para a mesma categoria.

**Segmento e município não ocupam anel.** Eles colorem, agrupam e recortam, mas
não movem nem recebem recurso; promovê-los a anel transformaria o mecanismo de
volta em taxonomia. Ficam disponíveis como entidades e como eixos de leitura.

## Vértices fora do fluxo

| Categoria | Papel |
| --- | --- |
| `segmento` | Área cultural, pela taxonomia de área do Mapas Culturais |
| `municipio` | Os 78 municípios; sustentam a cota territorial |
| `fundamento` | Leis, portarias e instruções normativas |
| `evento` | Agenda cultural (camada Republic) |
| `espaco` | Equipamentos culturais (camada Republic) |

## Arestas

| Relação | Passiva | Análogo CivLab | Peso |
| --- | --- | --- | --- |
| `propoe` | proposto por | sponsors | — |
| `patrocina` | patrocinado por | funds | **R$** |
| `pertence_a` | reúne | tagged with topic | — |
| `ocorre_em` | recebe | serves district | — |
| `aprova` | aprovado por | approves | — |
| `regula` | regulado por | regulates | — |
| `nomeia` | nomeado por | appoints | — |
| `fiscaliza` | fiscalizado por | oversees | — |
| `fundamenta` | fundamentado em | enabled by legal source | — |
| `beneficia` | beneficiado por | serves residents | — |
| `acontece_em` | recebe | takes place at | — |
| `sediado_em` | abriga | located in | — |

`patrocina` é a única aresta que move dinheiro. Cada relação tem forma ativa e
passiva, para a interface escrever "Fiscaliza (82)" no órgão e "Fiscalizado por"
no projeto — e nunca o "É fiscaliza por" que sai de uma inversão ingênua.

## Cadeias de responsabilização

Selecionar um vértice acende o caminho e apaga o resto. Cada tipo conta uma
história diferente sobre o mesmo mecanismo:

- **Patrocinador** → linha até o **centro** (o ICMS que deixou de entrar no
  caixa estadual), os projetos que a empresa escolheu bancar e os segmentos que
  priorizou. É a leitura que revela concentração setorial do capital.
- **Projeto** → proponente (quem faz), patrocinadores (quem financiou) e SECULT
  (quem aprovou o enquadramento).
- **Proponente** → seus projetos e, através deles, quem os financia.
- **Órgão** → o que regula, aprova, fiscaliza e nomeia.

Implementadas em `calcularCadeia()`, em `src/lib/radial.ts`.

## Segmentos

A LICC aceita projetos "em qualquer formato ou linguagem cultural" — a norma
**não fecha** uma lista de segmentos. Os 9 aqui derivam da taxonomia `area` da
plataforma Mapas Culturais e servem como eixo de leitura, não classificação
oficial.

Cada segmento declara `termosMapaCultural`, e `segmentoPorTermo()` resolve um
termo vindo da API. Quando nenhum casa, **o projeto fica sem segmento** — errar
a classificação é pior que admitir a lacuna.

## Território

Os 78 municípios estão agrupados em 10 microrregiões de planejamento. Esse
recorte varia conforme a fonte oficial e serve como agrupamento de leitura.

A marcação `rmgv`, essa sim, é normativa: são os 7 municípios da Região
Metropolitana da Grande Vitória (Cariacica, Fundão, Guarapari, Serra, Viana,
Vila Velha, Vitória), e é por exclusão dela que se apura a cota de 10%.

## Normas e regras

`src/ontology/legal.ts` traz 5 normas e 4 regras estruturais, cada uma com
`verificado` e `fonte`.

`verificado: false` significa "citada por fonte secundária, ainda não conferida
no texto oficial" — hoje é o caso do limite de 3 projetos por proponente. A
interface exibe esse estado em vez de escondê-lo: o elo com a norma só vale
alguma coisa se for auditável.

As regras com `cota` viram barras de conferência no painel de orçamento; a com
`limite` sinaliza proponentes no teto.

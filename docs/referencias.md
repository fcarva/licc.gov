# Referências

## CivLab — SF Government Graph

A interface foi reconstruída a partir de **fontes primárias**: dois PDFs da
página real (home e uma página de departamento) e uma gravação de tela de 84 s,
decodificada e lida quadro a quadro. O que se apurou, e onde entrou:

### O grafo é radial concêntrico, não force-directed

Centro em "People of San Francisco" (polígono serrilhado), anéis por tipo com
**forma própria** para cada um:

| CivLab | Forma | licc.gov |
| --- | --- | --- |
| People | estrela serrilhada | População Capixaba |
| Elected | círculo | Aprovação e fomento |
| Commission | losango | O capital |
| Advisory | ponto | A execução |
| Department | quadrado arredondado | O bem público |

Rótulo do anel em **versalete espaçado**, horizontal, no raio do anel — não
curvado no arco. Quando a contagem não cabe num raio, o anel se divide em
fileiras escalonadas.

### Selecionar acende a cadeia

`People →(seta) Mayor → Recreation and Park Commission → Recreation and Park
Department`, com linha lateral para o conselho consultivo — exatamente o que a
aba lista como `Overseen by` e `Advised by`. Em `Sheriff`, um leque para os 5
conselhos que ele nomeia. O resto esmaece para contorno.

### Demais achados

| Achado | Onde aparece no licc.gov |
| --- | --- |
| Cards brancos flutuantes (raio ~16px, sombra suave) sobre cinza | `Cartao` em `src/components/Coluna.tsx` |
| Canvas com segmentado `Graph \| Budget` no rodapé | `CanvasVisualizacao.tsx` |
| Sunburst de 2 anéis, fatia da entidade acesa, rótulos curvos | `Sunburst.tsx` |
| `Rank 1 of 54` | `posicao` em `build-graph.ts`, exibido por `Metrica` |
| `↑3.90% from last year` | `variacaoAnual`, com `orcamento.anterior` no seed |
| `Allocation` como lista de **altura proporcional**, não barras | `AlocacaoProporcional.tsx` |
| Abas condicionais `News \| Who's connected? \| Budget` | `EntidadeVista.tsx` |
| Notícias em prosa com entidades linkadas e notas numeradas | `NoticiasEmProsa.tsx` |
| Trilha em pílula, busca em pílula | `Trilha`, `BuscaGlobal` |
| Toda entidade ligada à fonte legal | relação `fundamenta` |
| Visão centrada no residente | vértice raiz `publico`, relação `beneficia` |
| Busca sobre nome, descrição, atuação e nomes alternativos | `buscar()` em `src/lib/dados.ts` |

Fontes: [civlab.org](https://www.civlab.org/) ·
[sfgov.civlab.org](https://sfgov.civlab.org/) ·
[Introducing the SF Government Graph](https://www.writing.civlab.org/p/introducing-the-sf-government-graph) ·
[SF Government Graph v2 is Live](https://www.writing.civlab.org/p/sf-government-graph-v2-is-live) ·
[Sanctuary Computer](https://www.sanctuary.computer/work/civlab) ·
[garden3d](https://garden3d.substack.com/p/mapping-san-franciscos-government)

Construído por Michael Adams com os estúdios XXIX e Sanctuary Computer, do
coletivo garden3d. Não tem vínculo com a Prefeitura de São Francisco — assim
como este projeto não tem vínculo com a SECULT-ES.

## Republic

O Republic do CivLab **não é** um grafo federal: é um monitor de cidade, que
acompanha notícias políticas, crime, licenças, eventos e grupos comunitários por
bairro.
([writing.civlab.org](https://www.writing.civlab.org/p/monitor-the-situation-in-your-city))

No licc.gov isso vira `/monitor`, com o município como unidade:

| Republic | licc.gov | Fonte |
| --- | --- | --- |
| Events | Agenda cultural | `/api/event/find` |
| Community groups | Espaços culturais e coletivos | `/api/space/find` |
| Permits | Editais e prazos | `/api/opportunity/find` |
| Political news | SECULT / DIO-ES | notícias por entidade |
| Neighborhoods | Municípios e microrregiões | ontologia territorial |

## LICC — Lei de Incentivo à Cultura Capixaba

- [SECULT-ES — Sobre a LICC](https://secult.es.gov.br/sobre-a-licc)
- [Ampliação para R$ 25 milhões](https://secult.es.gov.br/governo-amplia-para-r-25-milhoes-os-recursos-destinados-a-lei-de-incentivo-a-cultura-capixaba-licc)
- [LICC 2026: inscrições abertas](https://secult.es.gov.br/Noticia/licc-2026-inscricoes-para-projetos-culturais-estao-abertas)
- [Instrução Normativa LICC nº 001/2025 (PDF)](https://mapa.cultura.es.gov.br/files/opportunity/1878/instrucao-normativa-licc-no-001-2025-2.pdf)
- [Mapa Cultural ES — oportunidade 2317 (LICC 2026)](https://mapa.cultura.es.gov.br/oportunidade/2317/)

## Mapas Culturais

- [Repositório](https://github.com/mapasculturais/mapasculturais)
- [Documentação da API](https://docs.mapasculturais.org/mc_config_api/)
- [Mapa Cultural do Espírito Santo](https://mapa.cultura.es.gov.br/)

## Firecrawl e Open Lovable

O briefing propunha extrair o DOM e as classes do CivLab com
[Firecrawl](https://www.firecrawl.dev/) e alimentar o
[open-lovable](https://github.com/firecrawl/open-lovable) com esse despejo.

Isso **não é executável do ambiente onde o projeto foi desenvolvido**: a
política de egresso bloqueia `civlab.org`, `api.firecrawl.dev` e até proxies de
leitura como `r.jina.ai`, e não há chave de API no ambiente. Contornar a
política não é opção — a orientação do próprio proxy é reportar o host
bloqueado.

O que existe no lugar, em `tools/scrape-civlab/`: **o toolkit completo, para
rodar na máquina de quem tem acesso**. Ele captura respostas de rede, recupera
os *RSC flight chunks* (o CivLab é App Router — `__NEXT_DATA__` é o mecanismo do
Pages Router e ali não existe), mede a geometria desenhada do SVG e extrai os
tokens de estilo, com ou sem Firecrawl. `pipeline/importar-referencia.ts`
converte a saída em `docs/referencia-civlab.md`, e é contra esses números que o
grafo radial se calibra.

Vale registrar por que a rota do despejo de HTML não seria a melhor mesmo com
rede aberta: ela reproduz a casca de uma tela, e o que dá valor ao CivLab é a
ontologia por trás dela — entidades tipadas, relações nomeadas, âncora legal.
Copiar o CSS teria produzido uma interface parecida sobre um modelo inexistente.

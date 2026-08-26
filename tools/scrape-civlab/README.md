# Toolkit de engenharia reversa do CivLab

Estes dois scripts **rodam na sua máquina**, não no ambiente onde o licc.gov foi
desenvolvido — lá o proxy de egresso bloqueia `civlab.org` e `api.firecrawl.dev`.

O objetivo não é copiar código do CivLab. É **medir**: raios dos anéis, contagem
por anel, forma e paleta por tipo, tokens de cor e sombra. Com esses números, o
`GrafoRadial` do licc.gov é calibrado contra medida aferida em vez de impressão
visual.

## Preparo

```bash
cd tools/scrape-civlab
npm init -y
npm i playwright
npx playwright install chromium
```

## 1. Topologia e geometria

```bash
node extrair-topologia.mjs
node extrair-topologia.mjs --headed            # ver o navegador trabalhando
node extrair-topologia.mjs --url https://republic.civlab.org/
node extrair-topologia.mjs --espera 20000      # site lento
```

Três estratégias, em ordem de qualidade:

1. **Captura de rede** — grava toda resposta JSON e `text/x-component`. Num app
   de grafo é onde a topologia costuma vir limpa.
2. **RSC flight chunks** — o CivLab é Next.js **App Router**, que hidrata por
   `self.__next_f.push([1,"…"])`. Não use `__NEXT_DATA__` como alvo principal:
   esse é o mecanismo do Pages Router e no App Router ele não existe. O script
   concatena os chunks, desescapa e varre objetos JSON balanceados.
3. **`__NEXT_DATA__`** — retaguarda, caso alguma rota ainda seja Pages Router.

Também mede o SVG desenhado: raio, ângulo, forma, preenchimento, traço e
tracejado de cada nó, agrupados em anéis por raio.

Gera em `saida/`:

| Arquivo | Conteúdo |
| --- | --- |
| `rede.json` | respostas JSON capturadas |
| `estado-embutido.json` | chunks RSC, objetos recuperados, `__NEXT_DATA__` |
| `geometria.json` | anéis, raios, contagens, formas, paleta, rótulos |
| `tela-*.png` | capturas de cada rota visitada |

## 2. Linguagem visual

```bash
FIRECRAWL_API_KEY=fc-... node extrair-estilos.mjs
node extrair-estilos.mjs        # sem chave: mede direto no navegador
```

Com chave, chama `POST https://api.firecrawl.dev/v2/scrape` pedindo `rawHtml` e
`screenshot`. Sem chave, mede via `getComputedStyle` — que na prática entrega
tokens **mais precisos**, porque já vêm resolvidos, sem precisar interpretar a
cascata do Tailwind.

Gera `saida/estilos.json` (tokens `:root`, estilos dos componentes-chave,
paleta efetiva do SVG) e, quando houver Firecrawl, `saida/bruto.html`.

## 3. De volta ao licc.gov

Copie a pasta `saida/` para `tools/scrape-civlab/saida/` no repositório e rode:

```bash
npx tsx pipeline/importar-referencia.ts
```

Isso gera `docs/referencia-civlab.md` com os números aferidos, que é o documento
consultado ao ajustar `src/components/GrafoRadial.tsx` e `app/globals.css`.

## Limites

- Respeite o `robots.txt` e os termos de uso do CivLab. Isto é leitura pontual
  para estudo de interface, não coleta em escala: os scripts visitam quatro
  rotas, uma vez.
- `saida/` é ignorado pelo git — pode conter respostas grandes e capturas.
- O CivLab não tem vínculo com a Prefeitura de São Francisco, e o licc.gov não
  tem vínculo com a SECULT-ES.

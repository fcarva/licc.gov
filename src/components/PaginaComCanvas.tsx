/**
 * O arranjo de duas colunas do SF Government Graph: documento à esquerda,
 * canvas à direita.
 *
 * As medidas são as aferidas do original em `docs/referencia-civlab.md`:
 *
 *     grid-cols-1 lg:grid-cols-[minmax(400px,40%)_1fr]
 *     coluna  order-2 lg:order-1     ← no celular o grafo vem primeiro
 *     canvas  order-1 lg:order-2
 *
 * Existe porque o mesmo grid estava escrito à mão na home e ia se repetir em
 * cada página de categoria. Duas cópias de um layout medido divergem na terceira
 * vez que alguém ajusta uma delas.
 *
 * É só moldura: quem guarda a seleção é a página, porque é ela que sabe o que a
 * coluna deve mostrar quando algo é escolhido.
 */
export function PaginaComCanvas({
  titulo,
  subtitulo,
  acima,
  coluna,
  canvas,
  abaixo,
}: {
  titulo?: string;
  subtitulo?: React.ReactNode;
  /** Métricas de cabeçalho, em largura cheia sobre as duas colunas. */
  acima?: React.ReactNode;
  coluna: React.ReactNode;
  canvas: React.ReactNode;
  /**
   * Conteúdo em largura cheia abaixo do par.
   *
   * A coluna-documento tem 40% da tela, e tabela financeira larga fica ilegível
   * ali. O par canvas + coluna é para a leitura que o gráfico explica; o que não
   * tem contraparte no original — conferência de cota, tabelas territoriais —
   * desce para a largura inteira em vez de ser comprimido ou removido.
   */
  abaixo?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1700px] px-4 py-5">
      {titulo ? (
        <header className="mb-4 max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-tinta">{titulo}</h1>
          {subtitulo ? (
            <p className="mt-1.5 text-sm leading-relaxed text-tinta-suave">{subtitulo}</p>
          ) : null}
        </header>
      ) : null}

      {acima ? <div className="mb-5">{acima}</div> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(400px,40%)_minmax(0,1fr)] lg:items-start">
        {/* `rolagem-fina` e `max-h` fazem a coluna rolar sozinha, como no
            original; `order` inverte no celular para o grafo vir primeiro. */}
        <div className="rolagem-fina order-2 flex flex-col gap-4 lg:order-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          {coluna}
        </div>

        <div className="order-1 h-[62vh] min-h-[26rem] lg:order-2 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-6rem)]">
          {canvas}
        </div>
      </div>

      {abaixo ? <div className="mt-8">{abaixo}</div> : null}
    </div>
  );
}

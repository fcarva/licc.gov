/** Moldura das páginas de leitura: largura contida, título e subtítulo. */
export function Pagina({
  titulo,
  subtitulo,
  acoes,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-borda pb-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-tinta">{titulo}</h1>
          {subtitulo ? (
            <p className="mt-1.5 text-sm leading-relaxed text-tinta-suave">{subtitulo}</p>
          ) : null}
        </div>
        {acoes}
      </header>
      {children}
    </div>
  );
}

/** Tabela de leitura financeira: cabeçalho fixo e números alinhados. */
export function Tabela({
  colunas,
  children,
}: {
  colunas: Array<{ rotulo: string; alinhar?: "esquerda" | "direita" }>;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-borda bg-papel">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-borda">
            {colunas.map((c) => (
              <th
                key={c.rotulo}
                scope="col"
                className={`px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-tinta-fraca ${
                  c.alinhar === "direita" ? "text-right" : "text-left"
                }`}
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">{children}</tbody>
      </table>
    </div>
  );
}

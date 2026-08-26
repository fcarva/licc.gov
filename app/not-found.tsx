import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-mono text-sm text-tinta-fraca">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-tinta">
        Entidade não encontrada
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-tinta-suave">
        Esse endereço não corresponde a nenhum vértice do grafo. Ele pode ter
        saído do recorte na última coleta.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-md border border-borda bg-papel px-3 py-1.5 text-sm text-tinta-suave transition-colors hover:bg-papel-suave hover:text-tinta"
        >
          Voltar ao grafo
        </Link>
        <Link
          href="/sobre"
          className="rounded-md px-3 py-1.5 text-sm text-realce underline underline-offset-2 hover:opacity-80"
        >
          Como os dados são montados
        </Link>
      </div>
    </div>
  );
}

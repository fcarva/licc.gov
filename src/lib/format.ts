/** Formatação em português do Brasil, compartilhada por servidor e cliente. */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const BRL_CENTAVOS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUM = new Intl.NumberFormat("pt-BR");

export function brl(valor: number | undefined | null): string {
  if (valor === undefined || valor === null) return "—";
  return BRL.format(valor);
}

export function brlExato(valor: number): string {
  return BRL_CENTAVOS.format(valor);
}

/** Forma curta para rótulos apertados: R$ 1,2 mi. */
export function brlCurto(valor: number | undefined | null): string {
  if (valor === undefined || valor === null) return "—";
  if (Math.abs(valor) >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(valor) >= 1_000) {
    return `R$ ${(valor / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return BRL.format(valor);
}

export function numero(valor: number): string {
  return NUM.format(valor);
}

/** `0.531` → `53,1%`. */
export function percentual(fracao: number | null | undefined, casas = 1): string {
  if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return "—";
  return `${(fracao * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** `2026-06-30` → `30 de junho de 2026`. */
export function dataLonga(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** `2026-06-30` → `30/06/2026`. */
export function dataCurta(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

const ROTULOS_STATUS: Record<string, string> = {
  inscrito: "Inscrito",
  habilitado: "Habilitado",
  aprovado: "Aprovado",
  captando: "Em captação",
  captado: "Captação concluída",
  em_execucao: "Em execução",
  prestacao_de_contas: "Prestação de contas",
  concluido: "Concluído",
  inabilitado: "Inabilitado",
};

export function rotuloStatus(status: string | undefined): string {
  if (!status) return "—";
  return ROTULOS_STATUS[status] ?? status;
}

const ROTULOS_NATUREZA: Record<string, string> = {
  pessoa_fisica: "Pessoa física",
  pessoa_juridica: "Pessoa jurídica",
  coletivo: "Coletivo",
};

export function rotuloNatureza(natureza: string | undefined): string {
  if (!natureza) return "—";
  return ROTULOS_NATUREZA[natureza] ?? natureza;
}

const ROTULOS_PROVENIENCIA: Record<string, string> = {
  oficial: "Fonte oficial",
  derivado: "Derivado de fonte oficial",
  demonstracao: "Dado de demonstração",
};

export function rotuloProveniencia(p: string): string {
  return ROTULOS_PROVENIENCIA[p] ?? p;
}

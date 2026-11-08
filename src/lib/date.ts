// Datas sempre no horário de Brasília, independente do fuso do navegador.
// Espelho de supabase/functions/_shared/time.ts.

export const BR_TIMEZONE = "America/Sao_Paulo";

/** Data de hoje em Brasília no formato YYYY-MM-DD. */
export function todayInBrasilia(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** A data (YYYY-MM-DD) já passou, considerando o dia de hoje em Brasília? */
export function isPastDate(dateStr: string | null | undefined, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  return dateStr < todayInBrasilia(now);
}

/** "2026-11-08" → "08/11/2026" */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/** Data e hora (ISO) exibidas no horário de Brasília. */
export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: BR_TIMEZONE });
}

/** Dia da semana no padrão do banco: 1 = segunda ... 6 = sábado, 7 = domingo. */
export function dbDayOfWeek(dateStr: string): number {
  const jsDay = new Date(`${dateStr}T12:00:00`).getDay();
  return jsDay === 0 ? 7 : jsDay;
}

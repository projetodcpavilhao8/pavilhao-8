// Datas sempre no horário de Brasília. O servidor das edge functions roda em
// UTC (3h à frente), então "new Date().toISOString()" vira o dia seguinte a
// partir das 21h. Espelho de src/lib/date.ts.

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

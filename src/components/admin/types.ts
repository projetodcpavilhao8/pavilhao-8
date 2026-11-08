export const DAY_NAMES = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DAY_SHORT = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface ClassTemplate {
  id: string;
  title: string;
  time: string;
  capacity: number;
  price: number; // centavos
  day_of_week: number | null; // null = Seg-Sáb
  checkout_url: string | null;
  instructor: string | null;
}

export interface Suspension {
  id: string;
  class_id: string;
  suspended_date: string;
}

export interface Reservation {
  id: string;
  class_id: string;
  class_date: string | null;
  status: string;
  created_at: string;
  user_id: string;
  payment_id?: string | null;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  class_title?: string;
  class_time?: string;
  payment_status?: string | null;
  transaction_id?: string | null;
  paid_at?: string | null;
}

export const dayLabel = (dow: number | null) =>
  !dow ? "Seg-Sáb" : DAY_NAMES[dow] || `Dia inválido (${dow})`;

export const hhmm = (time: string | null | undefined) => time?.slice(0, 5) ?? "";

export const classLabel = (t: ClassTemplate) =>
  `${t.title} — ${hhmm(t.time)} (${dayLabel(t.day_of_week)})${t.instructor ? ` · ${t.instructor}` : ""}`;

/** Ordena por dia da semana (Seg-Sáb primeiro) e depois por horário. */
export const sortClasses = (a: ClassTemplate, b: ClassTemplate) =>
  (a.day_of_week ?? 0) - (b.day_of_week ?? 0) || (a.time || "").localeCompare(b.time || "");

export const isPaid = (r: Reservation) => r.status === "confirmed" || r.payment_status === "paid";

export const isManualReservation = (r: Reservation) => !!r.transaction_id?.startsWith("MANUAL-");

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "erro desconhecido");

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Classe padrão dos <select> nativos do painel. */
export const selectClass = "w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground";

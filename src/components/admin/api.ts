// Chamadas do painel admin. O supabase-js envia o JWT da sessão em cada
// invoke, e as edge functions exigem app_metadata.role === "admin".

import { supabase } from "@/integrations/supabase/client";
import type { ClassTemplate, Reservation } from "./types";
import { hhmm } from "./types";

export async function adminCall<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin", { body: { action, payload } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

async function fetchUsersByIds(ids: string[]): Promise<AdminUser[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.functions.invoke("admin-users", { body: { ids } });
  return (data?.users || []) as AdminUser[];
}

interface PaymentInfo {
  status: string;
  transaction_id: string | null;
  paid_at: string | null;
}

/**
 * Completa as reservas com dados do aluno, da aula e do pagamento.
 * Pagamento: primeiro pelo reservation_id; em pedidos com várias aulas o
 * payment só aponta para a 1ª reserva, então cai para reservations.payment_id.
 */
export async function enrichReservations(rows: Reservation[], classes: ClassTemplate[]): Promise<Reservation[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const reservationIds = rows.map((r) => r.id);
  const paymentIds = [...new Set(rows.map((r) => r.payment_id).filter(Boolean) as string[])];

  const [users, byReservation, byId] = await Promise.all([
    fetchUsersByIds(userIds),
    adminCall<{ data: (PaymentInfo & { reservation_id: string })[] }>("list_payments_for_reservations", { reservationIds })
      .catch(() => ({ data: [] })),
    paymentIds.length
      ? adminCall<{ data: (PaymentInfo & { id: string })[] }>("list_payments_by_ids", { paymentIds }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] as (PaymentInfo & { id: string })[] }),
  ]);

  const usersMap = new Map(users.map((u) => [u.id, u]));
  const classesMap = new Map(classes.map((c) => [c.id, c]));

  // Vêm ordenados por created_at desc: o primeiro de cada reserva é o mais recente.
  const payByReservation = new Map<string, PaymentInfo>();
  for (const p of byReservation.data || []) {
    if (!payByReservation.has(p.reservation_id)) payByReservation.set(p.reservation_id, p);
  }
  const payById = new Map((byId.data || []).map((p) => [p.id, p as PaymentInfo]));

  return rows.map((r) => {
    const user = usersMap.get(r.user_id);
    const cls = classesMap.get(r.class_id);
    const payment = payByReservation.get(r.id) || (r.payment_id ? payById.get(r.payment_id) : undefined);
    return {
      ...r,
      user_name: user?.name || "?",
      user_email: user?.email || "?",
      user_phone: user?.phone || "",
      class_title: cls?.title || "?",
      class_time: hhmm(cls?.time) || "?",
      payment_status: payment?.status || null,
      transaction_id: payment?.transaction_id || null,
      paid_at: payment?.paid_at || null,
    };
  });
}

export function cancelReservation(id: string) {
  return adminCall("cancel_reservation", { id });
}

export function markReservationPaid(r: Reservation, transactionCode?: string) {
  return adminCall<{ ok: boolean; transactionId: string; paidAt: string }>("mark_paid", {
    reservationId: r.id,
    userId: r.user_id,
    classId: r.class_id,
    transactionCode,
  });
}

export function transferReservation(id: string, newClassId: string, newClassDate: string) {
  return adminCall("transfer_reservation", { id, new_class_id: newClassId, new_class_date: newClassDate });
}

import { useState } from "react";
import { ArrowLeftRight, CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateBR, formatDateTimeBR, isPastDate, todayInBrasilia } from "@/lib/date";
import { cancelReservation, markReservationPaid, transferReservation } from "./api";
import ClassSelect from "./ClassSelect";
import { type ClassTemplate, type Reservation, errorMessage, isManualReservation, isPaid } from "./types";

interface ReservationItemProps {
  reservation: Reservation;
  activeClasses: ClassTemplate[];
  /** Chamado depois de qualquer ação, com a reserva atualizada (ou null se precisa recarregar). */
  onChanged: (updated: Reservation | null) => void;
  /** Versão enxuta para a grade semanal (sem aula/data, que já estão no título). */
  compact?: boolean;
}

/** Link para abrir conversa no WhatsApp (adiciona o 55 do Brasil se faltar). */
const whatsappLink = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length >= 12 && digits.startsWith("55") ? digits : `55${digits}`}`;
};

const ReservationItem = ({ reservation: r, activeClasses, onChanged, compact }: ReservationItemProps) => {
  const [transferOpen, setTransferOpen] = useState(false);
  const [target, setTarget] = useState({ date: "", classId: "" });
  const [busy, setBusy] = useState(false);

  const paid = isPaid(r);
  const canceled = r.status === "canceled";
  const past = isPastDate(r.class_date);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error("Erro: " + errorMessage(e)); }
    setBusy(false);
  };

  const markPaid = () => run(async () => {
    const code = window.prompt("Código/transação do pagamento (opcional)");
    if (code === null) return; // clicou em Cancelar
    const res = await markReservationPaid(r, code.trim() || undefined);
    toast.success("Pagamento confirmado manualmente");
    onChanged({ ...r, status: "confirmed", payment_status: "paid", transaction_id: res.transactionId, paid_at: res.paidAt });
  });

  const cancel = () => run(async () => {
    if (!confirm(`Cancelar a reserva de ${r.user_name}?`)) return;
    await cancelReservation(r.id);
    toast.success("Reserva cancelada!");
    onChanged({ ...r, status: "canceled" });
  });

  const transfer = () => run(async () => {
    if (!target.date || !target.classId) {
      toast.error("Escolha a nova data e o horário");
      return;
    }
    await transferReservation(r.id, target.classId, target.date);
    toast.success("Reserva transferida!");
    setTransferOpen(false);
    setTarget({ date: "", classId: "" });
    onChanged(null);
  });

  const badge = canceled
    ? { text: "Cancelada", cls: "bg-destructive/15 text-destructive" }
    : paid
      ? { text: "Pago", cls: "bg-primary/15 text-primary" }
      : { text: "Aguardando", cls: "bg-muted text-muted-foreground" };

  return (
    <div className={`bg-secondary rounded-xl border border-border ${past && !compact ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.text}</span>
            {!compact && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  isManualReservation(r) ? "bg-amber-500/15 text-amber-500 border-amber-500/30" : "bg-sky-500/15 text-sky-400 border-sky-500/30"
                }`}
                title={isManualReservation(r) ? "Criada manualmente pelo admin" : "Feita pelo aluno no site"}
              >
                {isManualReservation(r) ? "Manual" : "Site"}
              </span>
            )}
            {past && !compact && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Histórico</span>}
            <span className="text-sm font-medium truncate">{r.user_name}</span>
          </div>
          {!compact && (
            <p className="text-xs text-foreground/80 mt-1">{r.class_title} {r.class_time} — {formatDateBR(r.class_date)}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {r.user_phone ? (
              <a href={whatsappLink(r.user_phone)} target="_blank" rel="noreferrer" className="hover:text-primary underline-offset-2 hover:underline">
                {r.user_phone}
              </a>
            ) : null}
            {r.user_phone ? " · " : ""}{r.user_email}
          </p>
          {!compact && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Reservado em {formatDateTimeBR(r.created_at)}
              {r.paid_at ? ` · Pago em ${formatDateTimeBR(r.paid_at)}` : ""}
              {r.transaction_id ? ` · TX ${r.transaction_id}` : ""}
            </p>
          )}
        </div>

        {!canceled && (
          <div className="flex items-center gap-0.5 shrink-0">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mr-1" />}
            {!paid && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={markPaid} className="h-7 px-2 text-primary hover:text-primary" title="Confirmar pagamento">
                <CheckCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setTransferOpen((v) => !v)} className="h-7 px-2 text-muted-foreground hover:text-foreground" title="Transferir para outro horário">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={cancel} className="h-7 px-2 text-destructive hover:text-destructive" title="Cancelar reserva">
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {transferOpen && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <p className="text-[11px] text-muted-foreground">Transferir para:</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              min={todayInBrasilia()}
              value={target.date}
              onChange={(e) => setTarget({ date: e.target.value, classId: "" })}
              className="bg-background border-border h-8 text-xs"
            />
            <ClassSelect classes={activeClasses} value={target.classId} onChange={(classId) => setTarget((t) => ({ ...t, classId }))} date={target.date || undefined} placeholder="Horário..." className="h-8 text-xs" />
          </div>
          <Button size="sm" onClick={transfer} disabled={busy} className="w-full h-7 text-xs bg-primary text-primary-foreground">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirmar transferência"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReservationItem;

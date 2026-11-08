import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminCall } from "./api";
import ClassSelect from "./ClassSelect";
import { type ClassTemplate, errorMessage } from "./types";

const EMPTY = { name: "", email: "", phone: "", classId: "", classDate: "", transactionCode: "" };

interface ManualReservationFormProps {
  activeClasses: ClassTemplate[];
  onCreated: () => void;
  onCancel: () => void;
}

/** Cria uma reserva já confirmada e paga (pagamento recebido por fora do site). */
const ManualReservationForm = ({ activeClasses, onCreated, onCancel }: ManualReservationFormProps) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const field = "bg-background border-border mt-1 h-9 text-sm";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.classId || !form.classDate) {
      toast.error("Preencha nome, e-mail, data e horário");
      return;
    }
    setSaving(true);
    try {
      await adminCall("manual_reservation", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/\D/g, ""),
        classId: form.classId,
        classDate: form.classDate,
        transactionCode: form.transactionCode.trim(),
      });
      toast.success("Reserva manual criada!");
      setForm(EMPTY);
      onCreated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 bg-secondary rounded-xl border border-primary/30 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Reserva manual</h3>
      <p className="text-xs text-muted-foreground">A reserva já sai confirmada e paga. Para trocar o aluno de horário, use o botão de transferir na reserva.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Nome do aluno *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className={field} required />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">E-mail *</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className={field} required />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Telefone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="51999999999" className={field} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Data da aula *</Label>
          <Input type="date" value={form.classDate} onChange={(e) => setForm({ ...form, classDate: e.target.value, classId: "" })} className={field} required />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Horário *</Label>
          <ClassSelect classes={activeClasses} value={form.classId} onChange={(classId) => setForm({ ...form, classId })} date={form.classDate || undefined} className="mt-1" required />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Código do pagamento</Label>
          <Input value={form.transactionCode} onChange={(e) => setForm({ ...form, transactionCode: e.target.value })} placeholder="Opcional" className={field} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-9 text-xs rounded-full">Cancelar</Button>
        <Button type="submit" disabled={saving} className="flex-1 h-9 text-xs bg-gradient-primary text-primary-foreground font-bold rounded-full">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Criar reserva confirmada"}
        </Button>
      </div>
    </form>
  );
};

export default ManualReservationForm;

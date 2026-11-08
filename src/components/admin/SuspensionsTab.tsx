import { useState } from "react";
import { Ban, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dbDayOfWeek, formatDateBR, todayInBrasilia } from "@/lib/date";
import { adminCall } from "./api";
import ClassSelect from "./ClassSelect";
import { type ClassTemplate, type Suspension, DAY_NAMES, errorMessage, hhmm } from "./types";

interface SuspensionsTabProps {
  classes: ClassTemplate[];
  activeClasses: ClassTemplate[];
  suspensions: Suspension[];
  setSuspensions: React.Dispatch<React.SetStateAction<Suspension[]>>;
  reload: () => void;
}

const SuspensionsTab = ({ classes, activeClasses, suspensions, setSuspensions, reload }: SuspensionsTabProps) => {
  const [dayDate, setDayDate] = useState("");
  const [closingDay, setClosingDay] = useState(false);
  const [date, setDate] = useState("");
  const [classId, setClassId] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const today = todayInBrasilia();

  // Fecha o dia inteiro (feriado etc.): reservas existentes não são alteradas.
  const closeDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayDate) return;
    if (!confirm(`Fechar o dia ${formatDateBR(dayDate)} inteiro? Nenhuma aula desse dia vai aceitar novas reservas. As reservas já feitas não mudam.`)) return;
    setClosingDay(true);
    try {
      const res = await adminCall<{ ok?: boolean; suspended?: number; error?: string }>("suspend_day", { date: dayDate });
      if (res?.ok) {
        toast.success(`Dia ${formatDateBR(dayDate)} fechado (${res.suspended} aula${res.suspended === 1 ? "" : "s"})`);
        setDayDate("");
        reload();
      } else {
        toast.error(res?.error || "Erro ao fechar o dia");
      }
    } catch (err) {
      toast.error("Erro: " + errorMessage(err));
    } finally {
      setClosingDay(false);
    }
  };

  const suspendOne = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !classId) {
      toast.error("Selecione a data e o horário");
      return;
    }
    try {
      const res = await adminCall<{ data: Suspension }>("insert_suspension", { class_id: classId, suspended_date: date });
      if (res?.data) {
        setSuspensions((prev) => [...prev, res.data]);
        setClassId("");
        toast.success("Aula suspensa!");
      }
    } catch (err) {
      const msg = errorMessage(err);
      toast.error(msg.includes("23505") || msg.includes("duplicate") ? "Essa data já está suspensa para esse horário" : "Erro: " + msg);
    }
  };

  const reactivate = async (ids: string[]) => {
    setBusyIds((prev) => new Set([...prev, ...ids]));
    const done: string[] = [];
    for (const id of ids) {
      try {
        await adminCall("delete_suspension", { id });
        done.push(id);
      } catch (err) {
        toast.error("Erro: " + errorMessage(err));
      }
    }
    setSuspensions((prev) => prev.filter((s) => !done.includes(s.id)));
    setBusyIds((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    if (done.length) toast.success(done.length === 1 ? "Aula reativada!" : `${done.length} aulas reativadas!`);
  };

  const classesMap = new Map(classes.map((c) => [c.id, c]));
  const visible = suspensions.filter((s) => showPast || s.suspended_date >= today);
  const pastCount = suspensions.filter((s) => s.suspended_date < today).length;

  const byDate = new Map<string, Suspension[]>();
  for (const s of [...visible].sort((a, b) => a.suspended_date.localeCompare(b.suspended_date))) {
    byDate.set(s.suspended_date, [...(byDate.get(s.suspended_date) || []), s]);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Os alunos não veem o horário no dia suspenso. Reservas já feitas não são alteradas.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <form onSubmit={closeDay} className="p-4 bg-secondary rounded-xl border border-primary/40 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Ban className="w-4 h-4 text-primary" /> Fechar dia inteiro</h3>
          <p className="text-[11px] text-muted-foreground">Feriados, eventos: suspende todas as aulas da data.</p>
          <Input type="date" min={today} value={dayDate} onChange={(e) => setDayDate(e.target.value)} className="bg-background border-border h-9 text-sm" required />
          <Button type="submit" disabled={closingDay} className="w-full h-9 text-sm rounded-full bg-primary text-primary-foreground font-bold">
            {closingDay ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fechar dia"}
          </Button>
        </form>

        <form onSubmit={suspendOne} className="p-4 bg-secondary rounded-xl border border-border space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Ban className="w-4 h-4" /> Suspender uma aula</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Data</Label>
            <Input type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setClassId(""); }} className="bg-background border-border mt-1 h-9 text-sm" required />
          </div>
          <ClassSelect classes={activeClasses} value={classId} onChange={setClassId} date={date || undefined} placeholder="Horário..." required />
          <Button type="submit" variant="destructive" className="w-full rounded-full h-9 text-sm">Suspender</Button>
        </form>
      </div>

      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-semibold">{showPast ? "Todas as suspensões" : "Próximas suspensões"}</h3>
        {pastCount > 0 && (
          <button type="button" onClick={() => setShowPast((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground underline">
            {showPast ? "Esconder antigas" : `Mostrar antigas (${pastCount})`}
          </button>
        )}
      </div>

      {byDate.size === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma suspensão programada</p>
      ) : (
        <div className="space-y-2">
          {[...byDate.entries()].map(([d, items]) => {
            const dow = dbDayOfWeek(d);
            return (
              <div key={d} className={`p-3 bg-secondary rounded-xl border border-border ${d < today ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {formatDateBR(d)} <span className="text-xs text-muted-foreground font-normal">· {DAY_NAMES[dow] || "Domingo"} · {items.length} aula{items.length === 1 ? "" : "s"}</span>
                  </span>
                  {items.length > 1 && (
                    <Button size="sm" variant="outline" onClick={() => reactivate(items.map((s) => s.id))} className="h-7 px-2 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Reabrir dia
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {items
                    .sort((a, b) => (classesMap.get(a.class_id)?.time || "").localeCompare(classesMap.get(b.class_id)?.time || ""))
                    .map((s) => {
                      const c = classesMap.get(s.class_id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={busyIds.has(s.id)}
                          onClick={() => reactivate([s.id])}
                          title="Clique para reativar esta aula"
                          className="text-xs px-2 py-1 rounded-full border border-border bg-background hover:border-primary/60 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {hhmm(c?.time)} {c?.instructor || c?.title || "?"} <CheckCircle className="w-3 h-3 text-primary" />
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuspensionsTab;

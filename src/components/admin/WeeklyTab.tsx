import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { todayInBrasilia } from "@/lib/date";
import { adminCall, enrichReservations } from "./api";
import ReservationItem from "./ReservationItem";
import { type ClassTemplate, type Reservation, type Suspension, DAY_SHORT, errorMessage, hhmm } from "./types";

interface WeekDay {
  date: string;
  dow: number; // 1 = segunda ... 6 = sábado
  label: string;
}

/** Segunda a sábado da semana atual (em Brasília) deslocada por `offset` semanas. */
function getWeekDates(offset: number): WeekDay[] {
  const base = new Date(`${todayInBrasilia()}T12:00:00`);
  const day = base.getDay();
  base.setDate(base.getDate() + (day === 0 ? -6 : 1 - day) + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { date: `${d.getFullYear()}-${mm}-${dd}`, dow: i + 1, label: `${DAY_SHORT[i + 1]} ${dd}/${mm}` };
  });
}

interface WeeklyTabProps {
  classes: ClassTemplate[];
  activeClasses: ClassTemplate[];
  suspensions: Suspension[];
  /** A aba está visível? Recarrega ao voltar para ela. */
  active: boolean;
}

const WeeklyTab = ({ classes, activeClasses, suspensions, active }: WeeklyTabProps) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [byCell, setByCell] = useState<Map<string, Reservation[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ classId: string; date: string; label: string } | null>(null);

  const weekDates = getWeekDates(weekOffset);
  const today = todayInBrasilia();

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const dates = getWeekDates(offset).map((d) => d.date);
      const res = await adminCall<{ data: Reservation[] }>("list_weekly_reservations", { dates });
      const rows = await enrichReservations(res.data || [], classes);
      const map = new Map<string, Reservation[]>();
      for (const r of rows) {
        const key = `${r.class_id}_${r.class_date}`;
        map.set(key, [...(map.get(key) || []), r]);
      }
      setByCell(map);
    } catch (e) {
      toast.error("Erro ao carregar semana: " + errorMessage(e));
    }
    setLoading(false);
  }, [classes]);

  useEffect(() => {
    if (active) load(weekOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, weekOffset]);

  const suspended = new Set(suspensions.map((s) => `${s.class_id}_${s.suspended_date}`));
  const times = [...new Set(activeClasses.map((t) => hhmm(t.time)))].sort();

  // Totais da semana
  let weekConfirmed = 0, weekPending = 0, weekCapacity = 0;
  for (const d of weekDates) {
    for (const c of activeClasses) {
      if (c.day_of_week && c.day_of_week !== d.dow) continue;
      const key = `${c.id}_${d.date}`;
      if (suspended.has(key)) continue;
      weekCapacity += c.capacity;
      for (const r of byCell.get(key) || []) {
        if (r.status === "confirmed") weekConfirmed++;
        else if (r.status === "pending") weekPending++;
      }
    }
  }

  const cellStudents = selected
    ? (byCell.get(`${selected.classId}_${selected.date}`) || []).filter((r) => r.status !== "canceled")
    : [];

  const weekTitle = weekOffset === 0
    ? "Semana atual"
    : weekOffset === 1 ? "Próxima semana" : weekOffset === -1 ? "Semana passada"
    : weekOffset > 0 ? `Daqui a ${weekOffset} semanas` : `${-weekOffset} semanas atrás`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => { setWeekOffset((o) => o - 1); setSelected(null); }} className="h-8 px-3" aria-label="Semana anterior">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <div className="text-sm font-medium">{weekTitle}</div>
          <div className="text-xs text-muted-foreground">{weekDates[0].label.split(" ")[1]} – {weekDates[5].label.split(" ")[1]}</div>
        </div>
        <div className="flex gap-1">
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" onClick={() => { setWeekOffset(0); setSelected(null); }} className="h-8 px-3 text-xs">Hoje</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => load(weekOffset)} disabled={loading} className="h-8 px-2" aria-label="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setWeekOffset((o) => o + 1); setSelected(null); }} className="h-8 px-3" aria-label="Próxima semana">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{weekConfirmed} pagas</span>
        <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">{weekPending} aguardando</span>
        <span className="px-2 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
          {weekCapacity > 0 ? Math.round((weekConfirmed / weekCapacity) * 100) : 0}% de ocupação
        </span>
      </div>

      {loading && byCell.size === 0 ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="p-2 text-left text-muted-foreground font-medium w-14">Hora</th>
                {weekDates.map((d) => (
                  <th key={d.date} className={`p-2 text-center font-medium ${d.date === today ? "text-primary" : "text-muted-foreground"}`}>
                    {d.label}{d.date === today && <div className="text-[10px] font-normal">hoje</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time} className="border-t border-border">
                  <td className="p-2 text-muted-foreground font-mono">{time}</td>
                  {weekDates.map((d) => {
                    const cls = activeClasses.find((t) => hhmm(t.time) === time && (!t.day_of_week || t.day_of_week === d.dow));
                    if (!cls) return <td key={d.date} className="p-1" />;

                    const key = `${cls.id}_${d.date}`;
                    const list = byCell.get(key) || [];
                    const confirmed = list.filter((r) => r.status === "confirmed").length;
                    const pending = list.filter((r) => r.status === "pending").length;
                    const isSuspended = suspended.has(key);
                    const full = confirmed >= cls.capacity;
                    const isSelected = selected?.classId === cls.id && selected?.date === d.date;

                    const style = isSelected
                      ? "border-primary bg-primary/10"
                      : isSuspended
                        ? "border-dashed border-border bg-background opacity-60"
                        : full
                          ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                          : "border-border bg-secondary hover:bg-secondary/60";

                    return (
                      <td key={d.date} className={`p-1 ${d.date < today ? "opacity-60" : ""}`}>
                        <button
                          onClick={() => setSelected(isSelected ? null : { classId: cls.id, date: d.date, label: `${d.label} · ${time} · ${cls.instructor || cls.title}` })}
                          className={`w-full rounded-lg p-2 text-left transition-colors border ${style}`}
                        >
                          <div className="font-medium truncate">{cls.instructor || cls.title}</div>
                          {isSuspended ? (
                            <div className="mt-0.5 text-muted-foreground">Suspensa{confirmed ? ` · ${confirmed}` : ""}</div>
                          ) : (
                            <div className={`mt-0.5 font-bold ${full ? "text-destructive" : "text-primary"}`}>
                              {confirmed}/{cls.capacity}
                              {pending > 0 && <span className="text-muted-foreground font-normal"> +{pending}</span>}
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-2">Números: pagas/vagas · "+N" = aguardando pagamento. Clique numa aula para ver os alunos.</p>
        </div>
      )}

      {selected && (
        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{selected.label}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="h-7 px-2 text-xs">Fechar</Button>
          </div>
          {cellStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma reserva neste horário</p>
          ) : (
            cellStudents.map((r) => (
              <ReservationItem key={r.id} reservation={r} activeClasses={activeClasses} compact onChanged={() => load(weekOffset)} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyTab;

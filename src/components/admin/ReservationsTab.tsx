import { useCallback, useEffect, useState } from "react";
import { FileDown, Loader2, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateBR, todayInBrasilia } from "@/lib/date";
import { adminCall, enrichReservations } from "./api";
import ClassSelect from "./ClassSelect";
import ManualReservationForm from "./ManualReservationForm";
import ReservationItem from "./ReservationItem";
import { printReservations } from "./reservationsPdf";
import { type ClassTemplate, type Reservation, classLabel, errorMessage } from "./types";

type StatusFilter = "confirmed" | "pending" | "all";

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "confirmed", label: "Pagas" },
  { key: "pending", label: "Aguardando" },
  { key: "all", label: "Todas" },
];

interface ReservationsTabProps {
  classes: ClassTemplate[];
  activeClasses: ClassTemplate[];
  /** A aba está visível? Recarrega ao voltar para ela. */
  active: boolean;
}

const ReservationsTab = ({ classes, activeClasses, active }: ReservationsTabProps) => {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("confirmed");
  const [date, setDate] = useState("");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminCall<{ data: Reservation[] }>("list_reservations", {
        status, classDate: date || undefined, classId: classId || undefined, limit: 200,
      });
      setRows(await enrichReservations(res.data || [], classes));
    } catch (e) {
      toast.error("Erro ao carregar reservas: " + errorMessage(e));
    }
    setLoading(false);
  }, [status, date, classId, classes]);

  useEffect(() => {
    if (active) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status, date, classId]);

  const term = search.trim().toLowerCase();
  const visible = rows.filter((r) =>
    !term || `${r.user_name} ${r.user_email} ${r.user_phone} ${r.class_title} ${r.class_time}`.toLowerCase().includes(term),
  );

  const hasFilters = !!(date || classId || search);
  const clearFilters = () => { setDate(""); setClassId(""); setSearch(""); };

  const exportPdf = () => {
    if (visible.length === 0) {
      toast.error("Nenhuma reserva para exportar");
      return;
    }
    const cls = classes.find((t) => t.id === classId);
    const label = [
      date ? formatDateBR(date) : "Todas as datas",
      cls ? classLabel(cls) : "Todas as aulas",
      `Status: ${STATUS_OPTIONS.find((o) => o.key === status)?.label}`,
    ].join(" · ");
    if (!printReservations(visible, label)) toast.error("O navegador bloqueou a janela. Libere pop-ups para este site.");
  };

  const count = (s: string) => visible.filter((r) => r.status === s).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                status === key ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          <Button size="sm" variant="outline" onClick={() => setDate(todayInBrasilia())} className="h-8 px-3 text-xs">Hoje</Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-8 px-2" title="Atualizar">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} className="h-8 px-2" title="Imprimir / salvar PDF">
            <FileDown className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={() => setShowManual((v) => !v)} className="h-8 px-3 text-xs bg-primary text-primary-foreground">
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Nova
          </Button>
        </div>
      </div>

      {showManual && (
        <ManualReservationForm activeClasses={activeClasses} onCancel={() => setShowManual(false)} onCreated={() => { setShowManual(false); load(); }} />
      )}

      <div className="grid sm:grid-cols-3 gap-2">
        <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setClassId(""); }} className="bg-secondary border-border h-9 text-sm" aria-label="Data da aula" />
        <ClassSelect classes={activeClasses} value={classId} onChange={setClassId} date={date || undefined} placeholder="Todas as aulas" className="bg-secondary" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, e-mail ou telefone" className="bg-secondary border-border h-9 text-sm" />
      </div>
      {hasFilters && (
        <button type="button" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">Limpar filtros</button>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma reserva com estes filtros</p>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <ReservationItem
              key={r.id}
              reservation={r}
              activeClasses={activeClasses}
              onChanged={(updated) => (updated ? setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x))) : load())}
            />
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2">
            {count("confirmed")} confirmadas · {count("pending")} pendentes · {count("canceled")} canceladas
            {rows.length >= 200 && " · mostrando as 200 mais recentes, use os filtros para refinar"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReservationsTab;

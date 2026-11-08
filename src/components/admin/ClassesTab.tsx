import { useState } from "react";
import { Loader2, Plus, Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { adminCall } from "./api";
import PriceInput from "./PriceInput";
import {
  type ClassTemplate, DAY_NAMES, dayLabel, errorMessage, formatBRL, hhmm, selectClass, sortClasses,
} from "./types";

type ClassFieldsValue = Pick<ClassTemplate, "title" | "time" | "capacity" | "price" | "day_of_week" | "instructor">;

const EMPTY_CLASS: ClassFieldsValue = { title: "Sprint Bike", time: "", capacity: 10, price: 2990, day_of_week: null, instructor: "" };

const DaySelect = ({ value, onChange, className = "" }: { value: number | null; onChange: (v: number | null) => void; className?: string }) => (
  <select value={value ?? 0} onChange={(e) => onChange(parseInt(e.target.value) || null)} className={cn(selectClass, className)}>
    <option value={0}>Todos (Seg-Sáb)</option>
    {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
  </select>
);

/** Campos do horário — usados tanto na edição quanto no cadastro. */
const ClassFields = ({ value, onChange }: { value: ClassFieldsValue; onChange: (v: ClassFieldsValue) => void }) => {
  const set = <K extends keyof ClassFieldsValue>(k: K, v: ClassFieldsValue[K]) => onChange({ ...value, [k]: v });
  const field = "bg-background border-border mt-1 h-9 text-sm";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div>
        <Label className="text-xs text-muted-foreground">Título</Label>
        <Input value={value.title} onChange={(e) => set("title", e.target.value)} className={field} required />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Dia da semana</Label>
        <DaySelect value={value.day_of_week} onChange={(v) => set("day_of_week", v)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Horário</Label>
        <Input type="time" value={hhmm(value.time)} onChange={(e) => set("time", e.target.value)} className={field} required />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Professora</Label>
        <Input value={value.instructor || ""} onChange={(e) => set("instructor", e.target.value)} placeholder="Nome da professora" className={field} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Vagas (0 = desativado)</Label>
        <Input type="number" min={0} value={value.capacity} onChange={(e) => set("capacity", parseInt(e.target.value) || 0)} className={field} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Preço por aula</Label>
        <div className="mt-1"><PriceInput cents={value.price} onChange={(c) => set("price", c)} className="bg-background border-border h-9 text-sm" /></div>
      </div>
    </div>
  );
};

const ClassRow = ({ cls, onSaved, onDeleted }: { cls: ClassTemplate; onSaved: (c: ClassTemplate) => void; onDeleted: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<ClassFieldsValue>(cls);
  const [saving, setSaving] = useState(false);

  const dirty = (Object.keys(EMPTY_CLASS) as (keyof ClassFieldsValue)[]).some((k) => (draft[k] ?? "") !== (cls[k] ?? ""));

  const save = async () => {
    setSaving(true);
    try {
      const updated = { ...cls, ...draft };
      await adminCall("update_class", {
        id: cls.id, title: updated.title, time: updated.time, capacity: updated.capacity, price: updated.price,
        day_of_week: updated.day_of_week, instructor: updated.instructor || null, checkout_url: cls.checkout_url,
      });
      onSaved(updated);
      toast.success("Horário salvo!");
    } catch (e) {
      toast.error("Erro ao salvar: " + errorMessage(e));
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!confirm(`Excluir "${dayLabel(cls.day_of_week)} ${hhmm(cls.time)} — ${cls.instructor || cls.title}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await adminCall("delete_class", { id: cls.id });
      onDeleted(cls.id);
      toast.success("Horário excluído!");
    } catch (e) {
      toast.error("Erro: " + errorMessage(e));
    }
  };

  return (
    <div className="bg-secondary rounded-xl border border-border overflow-hidden">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/70 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold tabular-nums shrink-0">{hhmm(cls.time)}</span>
          <span className="text-sm truncate">{cls.title}</span>
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{cls.instructor || "sem professora"}</span>
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">· {cls.capacity} vagas · {formatBRL(cls.price)}</span>
          {cls.capacity === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive shrink-0">Desativado</span>}
          {dirty && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 shrink-0">Não salvo</span>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 pt-3 space-y-3 border-t border-border">
          <ClassFields value={draft} onChange={setDraft} />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="destructive" onClick={remove} className="h-8 px-3 text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
            </Button>
            {dirty && (
              <Button size="sm" variant="outline" onClick={() => setDraft(cls)} className="h-8 px-3 text-xs">Desfazer</Button>
            )}
            <Button size="sm" onClick={save} disabled={saving || !dirty} className="h-8 px-3 text-xs bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" /> Salvar</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const NewClassForm = ({ onCreated }: { onCreated: (c: ClassTemplate) => void }) => {
  const [form, setForm] = useState<ClassFieldsValue>(EMPTY_CLASS);
  const [adding, setAdding] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.time) {
      toast.error("Preencha título e horário");
      return;
    }
    setAdding(true);
    try {
      const res = await adminCall<{ data: ClassTemplate }>("insert_class", {
        ...form, instructor: form.instructor || null, checkout_url: null, date: null,
      });
      if (res?.data) {
        onCreated(res.data);
        setForm(EMPTY_CLASS);
        toast.success("Horário criado!");
      }
    } catch (err) {
      toast.error("Erro: " + errorMessage(err));
    }
    setAdding(false);
  };

  return (
    <form onSubmit={submit} className="p-4 bg-secondary rounded-xl border border-primary/30 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Novo horário</h3>
      <ClassFields value={form} onChange={setForm} />
      <Button type="submit" disabled={adding} className="w-full bg-gradient-primary text-primary-foreground font-bold rounded-full h-10">
        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar horário"}
      </Button>
    </form>
  );
};

interface ClassesTabProps {
  classes: ClassTemplate[];
  setClasses: React.Dispatch<React.SetStateAction<ClassTemplate[]>>;
}

const ClassesTab = ({ classes, setClasses }: ClassesTabProps) => {
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState(-1); // -1 = todos
  const [showNew, setShowNew] = useState(false);

  const term = search.trim().toLowerCase();
  const filtered = classes
    .filter((t) => dayFilter === -1 || (t.day_of_week ?? 0) === dayFilter)
    .filter((t) => !term || `${t.instructor || ""} ${t.title || ""}`.toLowerCase().includes(term))
    .sort(sortClasses);

  const groups: { day: number; items: ClassTemplate[] }[] = [];
  for (const t of filtered) {
    const day = t.day_of_week ?? 0;
    const g = groups.find((g) => g.day === day);
    if (g) g.items.push(t);
    else groups.push({ day, items: [t] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por professora ou título..." className="bg-secondary border-border h-9 text-sm sm:flex-1" />
        <select value={dayFilter} onChange={(e) => setDayFilter(parseInt(e.target.value))} className={cn(selectClass, "bg-secondary sm:w-48")}>
          <option value={-1}>Todos os dias</option>
          <option value={0}>Seg-Sáb</option>
          {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
        </select>
        <Button size="sm" onClick={() => setShowNew((v) => !v)} className="h-9 px-3 text-xs bg-primary text-primary-foreground shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo horário
        </Button>
      </div>

      {showNew && <NewClassForm onCreated={(c) => { setClasses((prev) => [...prev, c]); setShowNew(false); }} />}

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum horário encontrado com esses filtros.</p>
      ) : (
        groups.map((g) => (
          <div key={g.day} className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
              {g.day === 0 ? "Todos os dias (Seg-Sáb)" : dayLabel(g.day)}
            </h4>
            {g.items.map((t) => (
              <ClassRow
                key={t.id}
                cls={t}
                onSaved={(c) => setClasses((prev) => prev.map((x) => (x.id === c.id ? c : x)))}
                onDeleted={(id) => setClasses((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default ClassesTab;

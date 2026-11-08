import { dbDayOfWeek } from "@/lib/date";
import { cn } from "@/lib/utils";
import { type ClassTemplate, classLabel, selectClass, sortClasses } from "./types";

interface ClassSelectProps {
  classes: ClassTemplate[];
  value: string;
  onChange: (id: string) => void;
  /** Se informado, mostra só os horários que acontecem nessa data. */
  date?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/** Seletor de horário usado em todo o painel. */
const ClassSelect = ({ classes, value, onChange, date, placeholder = "Selecione...", className = "", required }: ClassSelectProps) => {
  const dow = date ? dbDayOfWeek(date) : null;
  const options = classes
    // Domingo (7) não tem aula; "Seg-Sáb" (null) vale para os outros dias.
    .filter((t) => dow === null || (dow !== 7 && (!t.day_of_week || t.day_of_week === dow)))
    .sort(sortClasses);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(selectClass, className)} required={required}>
      <option value="">{date && options.length === 0 ? "Nenhuma aula nesse dia" : placeholder}</option>
      {options.map((t) => (
        <option key={t.id} value={t.id}>{classLabel(t)}</option>
      ))}
    </select>
  );
};

export default ClassSelect;

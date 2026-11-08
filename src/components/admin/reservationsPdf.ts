import { formatDateBR, formatDateTimeBR } from "@/lib/date";
import type { Reservation } from "./types";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Abre a lista de reservas numa janela pronta para imprimir / salvar em PDF. */
export function printReservations(rows: Reservation[], filtersLabel: string) {
  const td = (v: string) => `<td>${escapeHtml(v)}</td>`;
  const body = rows
    .map((r, i) => {
      const status = r.status === "canceled" ? "Cancelada" : r.status === "confirmed" ? "Pago" : "Pendente";
      return `<tr>${td(String(i + 1))}${td(r.user_name || "-")}${td(r.user_phone || "-")}${td(`${r.class_title || "-"} ${r.class_time || ""}`)}${td(formatDateBR(r.class_date))}${td(status)}</tr>`;
    })
    .join("");
  const confirmed = rows.filter((r) => r.status === "confirmed").length;

  const html = `<html><head><meta charset="utf-8"><title>Agendamentos</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 30px; color: #222; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 13px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 8px 10px; background: #f5c518; color: #000; font-weight: 600; }
      td { padding: 6px 10px; border-bottom: 1px solid #333; }
      .summary { margin-top: 16px; font-size: 13px; color: #555; }
      @media print { body { margin: 15px; } }
    </style></head><body>
    <h1>Agendamentos — Pavilhão 8</h1>
    <div class="subtitle">${escapeHtml(filtersLabel)} · Gerado em ${formatDateTimeBR(new Date().toISOString())}</div>
    <table>
      <thead><tr><th>#</th><th>Aluno(a)</th><th>Telefone</th><th>Aula</th><th>Data</th><th>Status</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="summary">${confirmed} confirmadas de ${rows.length} no total</div>
    </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  return true;
}

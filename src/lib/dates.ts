import type { ClockTime, ISODate } from "@/types/domain";

const pad = (n: number) => String(n).padStart(2, "0");

/** Data local (não UTC) no formato YYYY-MM-DD. */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-10-23" → Date às 12:00 locais (evita pular de dia no horário de verão). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISODate(iso), days));
}

/** Diferença em dias inteiros entre duas datas ISO (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

/** Segunda-feira da semana da data. */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(12, 0, 0, 0);
  return copy;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function clockToMinutes(t: ClockTime): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToClock(total: number): ClockTime {
  const m = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatClock(d: Date): ClockTime {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 95 → "1h35", 45 → "45 min" */
export function formatDuration(min: number): string {
  const rounded = Math.round(min);
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

/** 1500 s → "25:00" */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sexta-feira, 23 de outubro" */
export function formatLongDate(d: Date): string {
  return capitalize(
    new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(d),
  );
}

/** "23 de out." */
export function formatShortDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(d);
}

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** "Hoje", "Amanhã", "Ontem", "Seg, 26 de out." */
export function relativeDayLabel(iso: ISODate, today: ISODate): string {
  const diff = diffDays(today, iso);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  const d = parseISODate(iso);
  if (diff > 1 && diff < 7) return WEEKDAY_LONG[d.getDay()];
  return `${WEEKDAY_SHORT[d.getDay()]}, ${formatShortDate(d)}`;
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

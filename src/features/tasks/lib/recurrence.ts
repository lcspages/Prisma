import type { ISODate, Recurrence, Task } from "@/types/domain";
import { addDaysISO, parseISODate } from "@/lib/dates";

const CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export type RecurrenceKind = "none" | "daily" | "weekdays" | "weekly";

/** Dias da semana (0 = domingo) cobertos pela regra. */
export function ruleDays(rule: string): number[] {
  if (rule.includes("FREQ=DAILY")) return [0, 1, 2, 3, 4, 5, 6];
  const match = rule.match(/BYDAY=([A-Z,]+)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((c) => CODES.indexOf(c))
    .filter((i) => i >= 0)
    .sort();
}

export function kindOf(rec: Recurrence | null): RecurrenceKind {
  if (!rec) return "none";
  if (rec.rule.includes("FREQ=DAILY")) return "daily";
  const days = ruleDays(rec.rule);
  if (days.join() === "1,2,3,4,5") return "weekdays";
  return "weekly";
}

export function labelFor(days: number[]): string {
  if (days.length === 7) return "Todo dia";
  if (days.join() === "1,2,3,4,5") return "Dias úteis";
  if (days.length === 1) return `${days[0] === 0 || days[0] === 6 ? "Todo" : "Toda"} ${NAMES[days[0]]}`;
  const names = days.map((d) => NAMES[d]);
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`.replace(/^./, (c) => c.toUpperCase());
}

/** Monta a regra a partir dos dias escolhidos. */
export function buildRecurrence(days: number[], streak = 0): Recurrence | null {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 0) return null;
  const rule = sorted.length === 7 ? "FREQ=DAILY" : `FREQ=WEEKLY;BYDAY=${sorted.map((d) => CODES[d]).join(",")}`;
  return { rule, label: labelFor(sorted), streak };
}

/** Próxima data da regra estritamente depois de `after`. */
export function nextDate(rule: string, after: ISODate): ISODate {
  const days = ruleDays(rule);
  if (days.length === 0) return addDaysISO(after, 1);
  for (let i = 1; i <= 7; i++) {
    const candidate = addDaysISO(after, i);
    if (days.includes(parseISODate(candidate).getDay())) return candidate;
  }
  return addDaysISO(after, 7);
}

/**
 * Cria a próxima ocorrência de uma tarefa recorrente.
 * A data parte da maior entre a data da tarefa e hoje, para uma
 * tarefa atrasada não gerar ocorrências no passado.
 */
export function spawnNext(task: Task, id: string, today: ISODate, now: string): Task | null {
  if (!task.recurrence) return null;
  const base = task.dueDate && task.dueDate > today ? task.dueDate : today;
  return {
    ...task,
    id,
    dueDate: nextDate(task.recurrence.rule, base),
    completedAt: null,
    spawnedNextId: null,
    postponedCount: 0,
    subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
    recurrence: { ...task.recurrence, streak: task.recurrence.streak + 1 },
    createdAt: now,
  };
}

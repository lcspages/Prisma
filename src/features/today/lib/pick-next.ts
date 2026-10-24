import type { ID, ISODate, Task } from "@/types/domain";
import { clockToMinutes } from "@/lib/dates";
import { byPriority, isBlocked } from "@/lib/selectors";

export type NextReason = "now" | "upcoming" | "overdue" | "anytime" | "missed";

export interface NextPick {
  task: Task;
  reason: NextReason;
}

/**
 * Escolhe a tarefa do bloco "A seguir":
 * a que está no horário agora → atrasadas → a próxima da agenda →
 * a mais importante sem horário → a primeira que passou do horário.
 * Tarefas bloqueadas nunca são sugeridas.
 */
export function pickNext(open: Task[], today: ISODate, nowMin: number, byId: Map<ID, Task>): NextPick | null {
  const free = open.filter((t) => !isBlocked(t, byId)).sort(byPriority(today));
  const todays = free.filter((t) => t.dueDate === today);
  const agenda = todays.filter((t) => t.scheduledTime);

  const current = agenda.find((t) => {
    const start = clockToMinutes(t.scheduledTime!);
    return start <= nowMin && nowMin < start + (t.estimateMin ?? 30);
  });
  if (current) return { task: current, reason: "now" };

  const overdue = free.find((t) => t.dueDate !== null && t.dueDate < today);
  if (overdue) return { task: overdue, reason: "overdue" };

  const upcoming = agenda.find((t) => clockToMinutes(t.scheduledTime!) > nowMin);
  if (upcoming) return { task: upcoming, reason: "upcoming" };

  const anytime = todays.find((t) => !t.scheduledTime);
  if (anytime) return { task: anytime, reason: "anytime" };

  const missed = agenda[0];
  if (missed) return { task: missed, reason: "missed" };

  return null;
}

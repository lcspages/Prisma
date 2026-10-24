/** Cálculos derivados do estado. Funções puras, sem React. */
import type { Habit, ID, ISODate, Task, Workspace } from "@/types/domain";
import { addDays, addDaysISO, clockToMinutes, parseISODate, toISODate } from "@/lib/dates";
import { QUADRANT_ORDER, quadrantOf } from "@/features/tasks/lib/quadrant";

export function isBlocked(task: Task, byId: Map<ID, Task>): boolean {
  if (!task.blockedById) return false;
  const blocker = byId.get(task.blockedById);
  return Boolean(blocker && !blocker.completedAt);
}

/** Ordem de prioridade: atrasada → com horário (cronológica) → sem horário (pela matriz). */
export function byPriority(today: ISODate) {
  return (a: Task, b: Task) => {
    const ao = a.dueDate !== null && a.dueDate < today ? 0 : 1;
    const bo = b.dueDate !== null && b.dueDate < today ? 0 : 1;
    if (ao !== bo) return ao - bo;
    if (a.scheduledTime && b.scheduledTime) return clockToMinutes(a.scheduledTime) - clockToMinutes(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    return (
      QUADRANT_ORDER[quadrantOf(a)] - QUADRANT_ORDER[quadrantOf(b)] ||
      (a.estimateMin ?? 999) - (b.estimateMin ?? 999)
    );
  };
}

export function isDoneOn(task: Task, day: ISODate): boolean {
  return Boolean(task.completedAt) && toISODate(new Date(task.completedAt!)) === day;
}

/** Tarefas abertas para hoje (inclui as atrasadas). */
export function openForToday(tasks: Task[], today: ISODate): Task[] {
  return tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate <= today);
}

export function totalEstimate(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0);
}

export function focusMinutesOn(ws: Workspace, day: ISODate): number {
  return ws.focusSessions
    .filter((s) => toISODate(new Date(s.startedAt)) === day)
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function xpOn(ws: Workspace, day: ISODate): number {
  return ws.xpEvents.filter((e) => toISODate(new Date(e.at)) === day).reduce((s, e) => s + e.amount, 0);
}

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  date: ISODate;
  level: ActivityLevel;
  minutes: number;
  tasks: number;
}

/**
 * Atividade diária para o mapa de consistência:
 * minutos de foco + 15 min por tarefa concluída + 5 min por hábito.
 */
export function activityDays(ws: Workspace, today: Date, days = 126): ActivityDay[] {
  const minutes = new Map<ISODate, number>();
  const tasks = new Map<ISODate, number>();
  const add = (map: Map<ISODate, number>, k: ISODate, v: number) => map.set(k, (map.get(k) ?? 0) + v);
  ws.focusSessions.forEach((s) => add(minutes, toISODate(new Date(s.startedAt)), s.minutes));
  ws.tasks.forEach((t) => t.completedAt && add(tasks, toISODate(new Date(t.completedAt)), 1));
  ws.habits.forEach((h) => h.checks.forEach((d) => add(minutes, d, 5)));

  return Array.from({ length: days }, (_, i) => {
    const date = toISODate(addDays(today, i - (days - 1)));
    const done = tasks.get(date) ?? 0;
    const score = (minutes.get(date) ?? 0) + done * 15;
    const level: ActivityLevel = score === 0 ? 0 : score < 40 ? 1 : score < 90 ? 2 : score < 150 ? 3 : 4;
    return { date, level, minutes: minutes.get(date) ?? 0, tasks: done };
  });
}

/** Dias seguidos com alguma atividade, contando de hoje (ou de ontem, se hoje ainda está vazio). */
export function currentStreak(days: ActivityDay[]): number {
  let i = days.length - 1;
  if (i >= 0 && days[i].level === 0) i--;
  let streak = 0;
  for (; i >= 0 && days[i].level > 0; i--) streak++;
  return streak;
}

/** O hábito vale nesse dia da semana? */
export function isHabitDay(habit: Pick<Habit, "days">, day: ISODate): boolean {
  return habit.days.includes(parseISODate(day).getDay());
}

/**
 * Sequência: dias seguidos em que o hábito foi feito, contando só os dias
 * em que ele vale (um hábito de dias úteis não quebra no fim de semana).
 * Hoje ainda não feito não quebra a sequência.
 */
export function habitStreak(habit: Pick<Habit, "checks" | "days">, today: ISODate): number {
  const set = new Set(habit.checks);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = addDaysISO(today, -i);
    if (!isHabitDay(habit, day)) continue;
    if (set.has(day)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/** Hábitos que valem hoje, na ordem de criação. */
export function habitsForDay(habits: Habit[], day: ISODate): Habit[] {
  return habits.filter((h) => isHabitDay(h, day));
}

/** Minutos de foco por hora do dia nos últimos `days` dias. */
export function focusByHour(ws: Workspace, today: Date, days = 30): number[] {
  const since = addDays(today, -days).getTime();
  const hours = Array.from({ length: 24 }, () => 0);
  ws.focusSessions.forEach((s) => {
    const start = new Date(s.startedAt);
    if (start.getTime() < since) return;
    hours[start.getHours()] += s.minutes;
  });
  return hours;
}


/** Ordem de lista: atrasadas e mais próximas primeiro, sem data no fim; no mesmo dia, por prioridade. */
export function byDueDate(today: ISODate) {
  const prio = byPriority(today);
  return (a: Task, b: Task) => {
    if (a.dueDate === b.dueDate) return prio(a, b);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  };
}

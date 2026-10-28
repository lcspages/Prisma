import type { Task } from "@/types/domain";

/**
 * XP por tarefa. A mesma função roda no cliente (atualização otimista)
 * e no servidor (valor oficial), para os números nunca divergirem.
 */
export function xpForTask(task: Task): number {
  let xp = 10;
  if (task.estimateMin) xp += Math.min(30, Math.round(task.estimateMin / 5));
  if (task.important) xp += 10;
  if (task.subtasks.length >= 3) xp += 5;
  if (task.recurrence) xp += Math.min(15, task.recurrence.streak);
  return xp;
}

export const XP_PER_HABIT = 10;
/** Hábito com 10 dias seguidos ou mais vale o dobro. */
export const XP_PER_HABIT_STREAK = 20;
export const HABIT_STREAK_BONUS_DAYS = 10;

/** XP de marcar um hábito, pela sequência que ele alcança naquele dia. */
export function xpForHabit(streak: number): number {
  return streak >= HABIT_STREAK_BONUS_DAYS ? XP_PER_HABIT_STREAK : XP_PER_HABIT;
}
export const XP_PER_WORKOUT_LOG = 3;

/** 2 XP a cada 5 minutos de foco concluído. */
export function xpForFocus(minutes: number): number {
  return Math.floor(minutes / 5) * 2;
}

/** Cada nível pede 50 XP a mais que o anterior: 150, 200, 250… */
function xpNeededFor(level: number): number {
  return 150 + (level - 1) * 50;
}

export interface LevelInfo {
  level: number;
  /** XP acumulado dentro do nível atual */
  current: number;
  /** XP necessário para fechar o nível atual */
  needed: number;
  progress: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpNeededFor(level)) {
    remaining -= xpNeededFor(level);
    level += 1;
  }
  const needed = xpNeededFor(level);
  return { level, current: remaining, needed, progress: remaining / needed };
}

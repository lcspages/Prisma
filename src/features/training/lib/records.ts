import type { Exercise, ExerciseLog, ID, ISODate } from "@/types/domain";

/** Músculos completos: o grupo inteiro de uma vez. */
export const FULL_GROUPS = ["Peito", "Costas", "Ombros", "Braços", "Pernas", "Abdômen", "Cardio"];

/** Músculos divididos: partes de um grupo, para treinos mais específicos. */
export const SPLIT_GROUPS = [
  "Peito superior",
  "Peito inferior",
  "Dorsal",
  "Trapézio",
  "Lombar",
  "Deltoides",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Quadríceps",
  "Posterior de coxa",
  "Glúteos",
  "Panturrilha",
];

export const DEFAULT_GROUPS = [...FULL_GROUPS, ...SPLIT_GROUPS];

/** Separa os grupos em completos e divididos (grupos criados pelo usuário entram em divididos). */
export function splitGroups(extra: string[] = []) {
  const custom = [...new Set(extra)].filter((g) => !DEFAULT_GROUPS.includes(g));
  return { full: FULL_GROUPS, split: [...SPLIT_GROUPS, ...custom] };
}

/** Último registro antes de `before` (o "treino anterior"). */
export function previousLog(logs: ExerciseLog[], exerciseId: ID, before: ISODate): ExerciseLog | undefined {
  return logs
    .filter((l) => l.exerciseId === exerciseId && l.date < before)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

export function logOn(logs: ExerciseLog[], exerciseId: ID, date: ISODate): ExerciseLog | undefined {
  return logs.find((l) => l.exerciseId === exerciseId && l.date === date);
}

/** Maior carga (musculação) ou maior distância (cardio) antes de `before`. */
export function bestBefore(logs: ExerciseLog[], exercise: Exercise, before: ISODate): number | null {
  const values = logs
    .filter((l) => l.exerciseId === exercise.id && l.date < before)
    .map((l) => (exercise.kind === "cardio" ? l.distanceKm : l.load))
    .filter((v): v is number => typeof v === "number" && v > 0);
  return values.length ? Math.max(...values) : null;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Exercícios na ordem escolhida pelo usuário (os sem posição ficam no fim, na ordem de criação). */
export function sortExercises<T extends Pick<Exercise, "order">>(list: T[]): T[] {
  return list
    .map((e, i) => ({ e, i }))
    .sort((x, y) => (x.e.order ?? Number.MAX_SAFE_INTEGER) - (y.e.order ?? Number.MAX_SAFE_INTEGER) || x.i - y.i)
    .map((x) => x.e);
}

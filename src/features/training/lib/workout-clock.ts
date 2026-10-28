"use client";

/**
 * Cronômetro do treino e timer de descanso, guardados no aparelho
 * (continuam valendo se a pessoa trocar de aba ou fechar o app).
 */
import { useSyncExternalStore } from "react";

function createStore<T>(key: string, empty: T, valid: (v: unknown) => v is T) {
  let value: T | null = null;
  const listeners = new Set<() => void>();
  const read = (): T => {
    if (value !== null) return value;
    value = empty;
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (valid(parsed)) value = parsed;
    } catch {
      /* sem armazenamento */
    }
    return value;
  };
  const set = (next: T) => {
    value = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* sem armazenamento */
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const use = () => useSyncExternalStore(subscribe, read, () => empty);
  return { get: read, set, use };
}

/* ---------- Cronômetro do treino ---------- */

export interface Stopwatch {
  startedAt: number | null;
  accumulated: number;
}

const isStopwatch = (v: unknown): v is Stopwatch =>
  !!v && typeof v === "object" && typeof (v as Stopwatch).accumulated === "number";

export const stopwatch = createStore<Stopwatch>("prisma:workout-stopwatch", { startedAt: null, accumulated: 0 }, isStopwatch);

export const elapsedOf = (w: Stopwatch, now = Date.now()) => w.accumulated + (w.startedAt ? Math.max(0, now - w.startedAt) : 0);

/* ---------- Último treino encerrado (para reabrir) ---------- */

export interface LastFinished {
  sessionId: string;
  /** Tempo exato do cronômetro ao encerrar (ms) */
  ms: number;
}

const isLast = (v: unknown): v is LastFinished =>
  !!v && typeof v === "object" && typeof (v as LastFinished).sessionId === "string" && typeof (v as LastFinished).ms === "number";

export const lastFinished = createStore<LastFinished | { sessionId: ""; ms: 0 }>("prisma:workout-last", { sessionId: "", ms: 0 }, isLast);

/** Por quanto tempo depois de encerrar ainda dá para reabrir o treino. */
export const REOPEN_WINDOW_MS = 60 * 60_000;

/* ---------- Descanso entre séries ---------- */

export interface Rest {
  /** Duração escolhida (segundos) */
  seconds: number;
  /** Fim do descanso em andamento (ms) ou null */
  endsAt: number | null;
  /** Duração do descanso em andamento (segundos), para a barra de progresso */
  total: number;
}

const isRest = (v: unknown): v is Rest => !!v && typeof v === "object" && typeof (v as Rest).seconds === "number";

export const rest = createStore<Rest>("prisma:workout-rest", { seconds: 60, endsAt: null, total: 0 }, isRest);

export const REST_MIN_SECONDS = 5;
export const REST_MAX_SECONDS = 30 * 60;

/* ---------- Séries feitas no treino do dia ---------- */

export interface SeriesDone {
  date: string;
  /** id do exercício → números das séries marcadas (1, 2, 3…) */
  done: Record<string, number[]>;
}

const isSeries = (v: unknown): v is SeriesDone =>
  !!v && typeof v === "object" && typeof (v as SeriesDone).date === "string" && typeof (v as SeriesDone).done === "object";

export const seriesDone = createStore<SeriesDone>("prisma:workout-series", { date: "", done: {} }, isSeries);

/** Séries marcadas hoje de um exercício (as de outros dias são descartadas). */
export function seriesOf(state: SeriesDone, date: string, exerciseId: string): number[] {
  return state.date === date ? (state.done[exerciseId] ?? []) : [];
}

export function toggleSeries(date: string, exerciseId: string, n: number) {
  const cur = seriesDone.get();
  const base = cur.date === date ? cur.done : {};
  const list = base[exerciseId] ?? [];
  const next = list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b);
  seriesDone.set({ date, done: { ...base, [exerciseId]: next } });
}

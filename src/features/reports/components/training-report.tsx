"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuDumbbell, LuTrophy } from "react-icons/lu";
import type { Exercise, ISODate, Workspace } from "@/types/domain";
import { addDaysISO, formatDuration, formatShortDate, parseISODate, startOfWeek, toISODate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/features/training/lib/records";

const WEEKS = 8;

interface WeekStats {
  start: ISODate;
  minutes: number;
  workouts: number;
  days: number;
  volume: number;
  km: number;
}

function weekStats(data: Workspace, start: ISODate): WeekStats {
  const end = addDaysISO(start, 7);
  const inWeek = (d: ISODate) => d >= start && d < end;
  const sessions = data.workoutSessions.filter((w) => inWeek(w.date));
  const logs = data.exerciseLogs.filter((l) => inWeek(l.date));
  const kind = new Map(data.exercises.map((e) => [e.id, e.kind]));
  const days = new Set([...sessions.map((w) => w.date), ...logs.map((l) => l.date)]);
  let volume = 0;
  let km = 0;
  for (const l of logs) {
    if (kind.get(l.exerciseId) === "cardio") km += l.distanceKm ?? 0;
    else volume += (l.load ?? 0) * (l.reps ?? 0) * (l.sets ?? 1);
  }
  return {
    start,
    minutes: sessions.reduce((sum, w) => sum + w.minutes, 0),
    workouts: sessions.length,
    days: days.size,
    volume,
    km,
  };
}

interface BestMark {
  exercise: Exercise;
  value: number;
  date: ISODate;
  /** Valor anterior ao recorde (para mostrar quanto subiu) */
  previous: number | null;
}

/** Maior carga de cada exercício de musculação (cardio: maior distância). */
function records(data: Workspace): BestMark[] {
  const out: BestMark[] = [];
  for (const exercise of data.exercises) {
    const cardio = exercise.kind === "cardio";
    const logs = data.exerciseLogs
      .filter((l) => l.exerciseId === exercise.id)
      .map((l) => ({ date: l.date, value: (cardio ? l.distanceKm : l.load) ?? 0 }))
      .filter((l) => l.value > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!logs.length) continue;
    let best = logs[0];
    let previous: number | null = null;
    for (const l of logs.slice(1)) {
      if (l.value > best.value) {
        previous = best.value;
        best = l;
      }
    }
    out.push({ exercise, value: best.value, date: best.date, previous });
  }
  return out.sort((a, b) => (a.date === b.date ? b.value - a.value : a.date < b.date ? 1 : -1));
}

function compare(now: number, before: number, format: (n: number) => string) {
  if (!before && !now) return null;
  if (!before) return "primeira semana com registro";
  const diff = now - before;
  if (diff === 0) return "igual à semana passada";
  return `${format(Math.abs(diff))} a ${diff > 0 ? "mais" : "menos"} que na semana passada`;
}

/** Relatório do treino: tempo na semana, dias, carga levantada, evolução e recordes. */
export function TrainingReport({ data, now }: { data: Workspace; now: Date }) {
  const today = toISODate(now);
  const thisWeek = toISODate(startOfWeek(now));
  const weeks = useMemo(
    () => Array.from({ length: WEEKS }, (_, i) => weekStats(data, addDaysISO(thisWeek, (i - WEEKS + 1) * 7))),
    [data, thisWeek],
  );
  const best = useMemo(() => records(data), [data]);
  const [showAll, setShowAll] = useState(false);
  const current = weeks[WEEKS - 1];
  const last = weeks[WEEKS - 2];
  const maxMinutes = Math.max(1, ...weeks.map((w) => w.minutes));
  const hasAny = data.workoutSessions.length > 0 || data.exerciseLogs.length > 0;
  const recentFrom = addDaysISO(today, -6);
  const list = showAll ? best : best.slice(0, 6);

  if (!hasAny) {
    return (
      <div className="flex flex-col items-start gap-3 text-ink-2 sm:flex-row sm:items-center">
        <p className="flex-1">
          Registre a carga dos exercícios e use o botão <b className="text-ink">Encerrar</b> no fim do treino para ver aqui seu tempo de treino e
          seus recordes.
        </p>
        <Link href="/treino" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-on-primary">
          <LuDumbbell className="size-4" aria-hidden />
          Ir para o Treino
        </Link>
      </div>
    );
  }

  const stats = [
    {
      label: "Tempo de treino",
      value: current.minutes ? formatDuration(current.minutes) : "0 min",
      hint: compare(current.minutes, last.minutes, formatDuration),
    },
    {
      label: "Treinos encerrados",
      value: String(current.workouts),
      hint: current.days > current.workouts ? `${current.days} dias com registro` : null,
    },
    {
      label: "Dias treinados",
      value: `${current.days} de 7`,
      hint: compare(current.days, last.days, (n) => `${n} ${n === 1 ? "dia" : "dias"}`),
    },
    {
      label: "Carga levantada",
      value: `${formatNumber(Math.round(current.volume))} kg`,
      hint: current.km > 0 ? `+ ${formatNumber(Math.round(current.km * 10) / 10)} km de cardio` : "carga × repetições × séries",
    },
  ];

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface-2 p-4">
            <dt className="text-meta text-ink-2">{s.label}</dt>
            <dd className="tabular mt-1 text-title font-semibold text-ink">{s.value}</dd>
            {s.hint && <dd className="mt-0.5 text-[12px] leading-4 text-ink-3">{s.hint}</dd>}
          </div>
        ))}
      </dl>

      <div>
        <h3 className="mb-3 text-meta font-semibold text-ink-2">Tempo de treino por semana</h3>
        <ol className="flex h-36 items-end gap-2" aria-label="Tempo de treino nas últimas 8 semanas">
          {weeks.map((w, i) => {
            const isCurrent = i === WEEKS - 1;
            const label = `Semana de ${formatShortDate(parseISODate(w.start))}: ${w.minutes ? formatDuration(w.minutes) : "sem treino"}`;
            return (
              <li key={w.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" aria-label={label} title={label}>
                <span className="tabular text-[10px] font-semibold text-ink-3">{w.minutes ? formatDuration(w.minutes) : ""}</span>
                <span
                  aria-hidden
                  className={cn("w-full max-w-10 rounded-t-lg", isCurrent ? "bg-primary" : "bg-primary/35")}
                  style={{ height: `${Math.max(w.minutes ? 6 : 2, (w.minutes / maxMinutes) * 100)}%` }}
                />
                <span className={cn("text-[10px]", isCurrent ? "font-semibold text-ink" : "text-ink-3")}>
                  {isCurrent ? "Esta" : formatShortDate(parseISODate(w.start)).replace(" de ", "/").replace(".", "")}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-meta font-semibold text-ink-2">
          <LuTrophy className="size-4 text-accent-ink" aria-hidden />
          Recordes
        </h3>
        {best.length === 0 ? (
          <p className="text-ink-2">Registre a carga dos exercícios para ver seus recordes.</p>
        ) : (
          <>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {list.map((r) => {
                const cardio = r.exercise.kind === "cardio";
                const unit = cardio ? "km" : "kg";
                const recent = r.date >= recentFrom;
                return (
                  <li key={r.exercise.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 font-semibold text-ink">
                        <span className="truncate">{r.exercise.name}</span>
                        {recent && r.previous !== null && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">Novo</span>
                        )}
                      </p>
                      <p className="text-meta text-ink-3">
                        {r.exercise.group} · {formatShortDate(parseISODate(r.date))}
                        {r.previous !== null && ` · antes ${formatNumber(r.previous)} ${unit}`}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-lead font-semibold text-ink">
                      {formatNumber(r.value)} {unit}
                    </span>
                  </li>
                );
              })}
            </ul>
            {best.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 rounded-lg px-1 py-1 text-meta font-semibold text-primary-ink hover:underline"
              >
                {showAll ? "Mostrar menos" : `Mostrar todos (${best.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { LuCheck, LuFlame, LuPlus } from "react-icons/lu";
import type { Habit, ISODate, Workspace } from "@/types/domain";
import { createHabit, openHabitForm, toggleHabit } from "@/lib/store/app-store";
import { habitStreak, habitsForDay } from "@/lib/selectors";
import { cn } from "@/lib/cn";
import { ModuleDot } from "@/components/layout/module-badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/page";
import { HABIT_SUGGESTIONS } from "../lib/suggestions";

/**
 * Hábitos de hoje: a primeira coisa da tela inicial.
 * Um toque em qualquer parte do card marca ou desmarca.
 */
export function TodayHabits({
  data,
  today,
  title = "Hábitos de hoje",
  showWeekLink = true,
}: {
  data: Workspace;
  today: ISODate;
  title?: string;
  showWeekLink?: boolean;
}) {
  const todays = habitsForDay(data.habits, today);
  const done = todays.filter((h) => h.checks.includes(today)).length;

  if (data.habits.length === 0) return <FirstHabit />;

  return (
    <section aria-labelledby="habits-today-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 id="habits-today-title" className="text-title font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {todays.length > 0 && (
            <span className="tabular text-ink-2">
              {done} de {todays.length}
            </span>
          )}
        </div>
        {showWeekLink && (
          <Link href="/habitos" className="text-meta font-semibold text-primary-ink hover:underline">
            Ver a semana
          </Link>
        )}
      </div>

      {todays.length > 0 && (
        <ProgressBar value={done} max={todays.length} label="Hábitos feitos hoje" className="mb-4 h-2" />
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {todays.map((h) => (
          <HabitTile key={h.id} habit={h} today={today} data={data} />
        ))}
        <button
          type="button"
          onClick={() => openHabitForm({})}
          className="flex min-h-[76px] items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong px-3 text-ink-2 transition-colors hover:border-primary hover:text-ink sm:min-h-[88px]"
        >
          <LuPlus className="size-5" aria-hidden />
          Novo hábito
        </button>
      </div>

      {todays.length === 0 && (
        <p className="mt-3 text-ink-2">Nenhum hábito marcado para hoje. Aproveite o descanso.</p>
      )}
      {todays.length > 0 && done === todays.length && (
        <p className="mt-3 font-semibold text-primary-ink">Rotina de hoje completa.</p>
      )}
    </section>
  );
}

function HabitTile({ habit, today, data }: { habit: Habit; today: ISODate; data: Workspace }) {
  const checked = habit.checks.includes(today);
  const streak = habitStreak(habit, today);
  const module = habit.moduleId ? data.modules.find((m) => m.id === habit.moduleId) : undefined;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => toggleHabit(habit.id, today)}
      className={cn(
        "flex min-h-[76px] items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors sm:min-h-[88px] sm:gap-3 sm:p-4",
        checked ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors sm:size-9",
          checked ? "border-primary bg-primary text-on-primary" : "border-line-strong",
        )}
      >
        {checked && <LuCheck className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-semibold leading-5", checked ? "text-ink-2 line-through decoration-ink-3/60" : "text-ink")}>
          {habit.name}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 text-meta text-ink-3">
          {streak > 0 && (
            <span className="flex items-center gap-0.5 font-semibold text-accent-ink">
              <LuFlame className="size-3" aria-hidden />
              {streak} {streak === 1 ? "dia" : "dias"}
            </span>
          )}
          {module && (
            <span className="flex items-center gap-1">
              <ModuleDot module={module} />
              {module.name}
            </span>
          )}
          {streak === 0 && !module && <span>Comece hoje</span>}
        </span>
      </span>
    </button>
  );
}

/** Primeira vez: um toque numa ideia já cria o hábito. */
function FirstHabit() {
  return (
    <section aria-labelledby="first-habit-title" className="rounded-[28px] border border-line bg-surface p-6 md:p-8">
      <h2 id="first-habit-title" className="text-title font-semibold tracking-[-0.01em] text-ink">
        Comece pela sua rotina
      </h2>
      <p className="mt-1 max-w-prose text-ink-2">
        Hábitos são o coração do Prisma: coisas pequenas que você marca todo dia. Toque numa ideia para criar agora.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {HABIT_SUGGESTIONS.slice(0, 6).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => createHabit({ name: s })}
            className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-canvas px-4 text-ink transition-colors hover:border-primary hover:bg-primary-soft"
          >
            <LuPlus className="size-4 text-primary-ink" aria-hidden />
            {s}
          </button>
        ))}
      </div>
      <Button variant="primary" className="mt-6" onClick={() => openHabitForm({})}>
        Criar do meu jeito
      </Button>
    </section>
  );
}

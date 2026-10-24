"use client";

import { LuFlame, LuPencil, LuPlus } from "react-icons/lu";
import type { Habit, Workspace } from "@/types/domain";
import { openHabitForm } from "@/lib/store/app-store";
import { addDaysISO, toISODate } from "@/lib/dates";
import { habitStreak, isHabitDay } from "@/lib/selectors";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { ModuleDot } from "@/components/layout/module-badge";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, ProgressBar } from "@/components/ui/page";
import { daysLabel } from "../lib/suggestions";
import { HabitWeek } from "./habit-week";
import { TodayHabits } from "./today-habits";

export function HabitsPage() {
  return <WorkspaceGate>{(data, now) => <HabitsContent data={data} now={now} />}</WorkspaceGate>;
}

function HabitsContent({ data, now }: { data: Workspace; now: Date }) {
  const today = toISODate(now);
  return (
    <Page>
      <PageHeader
        title="Hábitos"
        description="Sua rotina. Marque o que fez hoje e acompanhe a semana de segunda a domingo."
        actions={
          <Button variant="primary" onClick={() => openHabitForm({})}>
            <LuPlus className="size-4" aria-hidden />
            Novo hábito
          </Button>
        }
      />

      <TodayHabits data={data} today={today} title="Hoje" showWeekLink={false} />

      {data.habits.length > 0 && (
        <section aria-labelledby="habits-week-title" className="mt-10">
          <h2 id="habits-week-title" className="mb-4 text-lead font-semibold text-ink">
            Esta semana
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.habits.map((h) => (
              <HabitCard key={h.id} habit={h} today={today} data={data} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

function HabitCard({ habit, today, data }: { habit: Habit; today: string; data: Workspace }) {
  const streak = habitStreak(habit, today);
  const module = habit.moduleId ? data.modules.find((m) => m.id === habit.moduleId) : undefined;
  const last30 = Array.from({ length: 30 }, (_, i) => addDaysISO(today, -i)).filter((d) => isHabitDay(habit, d));
  const done30 = last30.filter((d) => habit.checks.includes(d)).length;

  return (
    <article className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lead font-semibold text-ink">{habit.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-meta text-ink-2">
            <span>{daysLabel(habit.days)}</span>
            {streak > 0 ? (
              <span className="flex items-center gap-1 font-semibold text-accent-ink">
                <LuFlame className="size-3.5" aria-hidden />
                {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
              </span>
            ) : (
              <span className="text-ink-3">Sem sequência ainda</span>
            )}
            {module ? (
              <span className="flex items-center gap-1.5">
                <ModuleDot module={module} />
                {module.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openHabitForm({ habitId: habit.id })}
                className="font-semibold text-primary-ink hover:underline"
              >
                Vincular a um módulo
              </button>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openHabitForm({ habitId: habit.id })}
          aria-label={`Editar ${habit.name}`}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <LuPencil className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-5">
        <HabitWeek habit={habit} today={today} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <ProgressBar value={done30} max={Math.max(last30.length, 1)} label="Dias feitos nos últimos 30" className="flex-1" />
        <span className="tabular text-meta text-ink-2">
          {done30} de {last30.length} dias
        </span>
      </div>
    </article>
  );
}

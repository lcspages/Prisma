"use client";

import { useId, useState } from "react";
import { LuLink, LuPlus, LuRepeat, LuUnlink } from "react-icons/lu";
import type { Module, Workspace } from "@/types/domain";
import { openHabitForm, updateHabit } from "@/lib/store/app-store";
import { toISODate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/page";
import { daysLabel } from "../lib/suggestions";
import { HabitWeek } from "./habit-week";

/** Hábitos vinculados a um módulo, e como vincular um hábito já criado. */
export function ModuleHabits({ data, module }: { data: Workspace; module: Module }) {
  const today = toISODate(new Date());
  const linked = data.habits.filter((h) => h.moduleId === module.id);
  const available = data.habits.filter((h) => h.moduleId !== module.id);
  const [pick, setPick] = useState("");
  const id = useId();

  const link = () => {
    const habit = data.habits.find((h) => h.id === pick);
    if (habit) updateHabit({ ...habit, moduleId: module.id });
    setPick("");
  };

  return (
    <div className="space-y-6">
      {available.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-surface p-3"
          onSubmit={(e) => {
            e.preventDefault();
            link();
          }}
        >
          <div className="min-w-[220px] flex-1">
            <label htmlFor={id} className="mb-1.5 block text-meta font-semibold text-ink-2">
              Vincular um hábito que você já criou
            </label>
            <Dropdown
              id={id}
              ariaLabel="Hábito"
              value={pick}
              onChange={setPick}
              placeholder="Escolha um hábito"
              options={available.map((h) => ({
                value: h.id,
                label: h.name,
                icon: <LuRepeat className="size-4 text-ink-3" />,
                hint: h.moduleId ? `em ${data.modules.find((m) => m.id === h.moduleId)?.name ?? "outro módulo"}` : undefined,
              }))}
            />
          </div>
          <Button type="submit" variant="primary" disabled={!pick}>
            <LuLink className="size-4" aria-hidden />
            Vincular
          </Button>
        </form>
      )}

      {linked.length === 0 ? (
        <EmptyState
          title={`Nenhum hábito em ${module.name}`}
          body="Crie o hábito na aba Hábitos e vincule aqui quando quiser."
          action={
            <Button onClick={() => openHabitForm({})}>
              <LuPlus className="size-4" aria-hidden />
              Novo hábito
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {linked.map((h) => (
            <li key={h.id} className="rounded-3xl border border-line bg-surface p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{h.name}</p>
                  <p className="text-meta text-ink-2">{daysLabel(h.days)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateHabit({ ...h, moduleId: null })}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-meta text-ink-3 hover:bg-surface-2 hover:text-ink"
                >
                  <LuUnlink className="size-3.5" aria-hidden />
                  Desvincular
                </button>
              </div>
              <HabitWeek habit={h} today={today} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

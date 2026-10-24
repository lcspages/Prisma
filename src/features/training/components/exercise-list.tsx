"use client";

import { useId, useState } from "react";
import { LuChevronDown, LuPlus, LuTrash2 } from "react-icons/lu";
import type { Workspace } from "@/types/domain";
import { deleteExercise, saveExercise } from "@/lib/store/app-store";
import { formatShortDate, parseISODate, toISODate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { GroupPicker } from "./group-picker";
import { bestBefore, DEFAULT_GROUPS, formatNumber, splitGroups } from "../lib/records";

/** Exercícios cadastrados por grupo, com recorde e último registro. */
export function ExerciseList({ data }: { data: Workspace }) {
  const exercises = data.exercises;
  const groups = [...new Set([...exercises.map((e) => e.group), ...DEFAULT_GROUPS])];
  const usedGroups = groups.filter((g) => exercises.some((e) => e.group === g));
  const [name, setName] = useState("");
  const [group, setGroup] = useState(usedGroups[0] ?? DEFAULT_GROUPS[0]);
  const ids = { name: useId(), group: useId() };
  const { full, split } = splitGroups(exercises.map((e) => e.group));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (g: string) =>
    setCollapsed((c) => {
      const next = new Set(c);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  const tomorrow = toISODate(new Date(Date.now() + 86_400_000));

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-[1fr_220px_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          saveExercise({ name, group, kind: group === "Cardio" ? "cardio" : "strength" });
          setName("");
        }}
      >
        <Field label="Novo exercício" htmlFor={ids.name}>
          <Input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Supino inclinado" />
        </Field>
        <Field label="Grupo" htmlFor={ids.group}>
          <GroupPicker id={ids.group} value={group} onChange={setGroup} full={full} split={split} />
        </Field>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          <LuPlus className="size-4" aria-hidden />
          Adicionar
        </Button>
      </form>

      {usedGroups.map((g) => {
        const count = exercises.filter((e) => e.group === g).length;
        const isOpen = !collapsed.has(g);
        return (
        <section key={g}>
          <h3>
            <button
              type="button"
              onClick={() => toggle(g)}
              aria-expanded={isOpen}
              className="mb-2 flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-meta font-semibold text-ink-2 hover:text-ink"
            >
              <LuChevronDown className={cn("size-4 transition-transform", !isOpen && "-rotate-90")} aria-hidden />
              {g}
              <span className="tabular font-medium text-ink-3">{count}</span>
            </button>
          </h3>
          {isOpen && (
          <ul className="divide-y divide-line rounded-3xl border border-line bg-surface">
            {exercises
              .filter((e) => e.group === g)
              .map((e) => {
                const logs = data.exerciseLogs.filter((l) => l.exerciseId === e.id).sort((a, b) => (a.date < b.date ? 1 : -1));
                const best = bestBefore(data.exerciseLogs, e, tomorrow);
                return (
                  <li key={e.id} className="group flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{e.name}</p>
                      <p className="text-meta text-ink-3">
                        {logs.length
                          ? `${logs.length} ${logs.length === 1 ? "registro" : "registros"}, último em ${formatShortDate(parseISODate(logs[0].date))}`
                          : "Sem registros"}
                      </p>
                    </div>
                    {best !== null && (
                      <span className="tabular text-right">
                        <span className="block text-meta text-ink-3">Recorde</span>
                        <span className="font-semibold text-ink">
                          {formatNumber(best)} {e.kind === "cardio" ? "km" : "kg"}
                        </span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteExercise(e.id)}
                      aria-label={`Excluir ${e.name}`}
                      className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                    >
                      <LuTrash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
          </ul>
          )}
        </section>
        );
      })}
    </div>
  );
}

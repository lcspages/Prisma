"use client";

import { useId, useState } from "react";
import { LuChevronDown, LuPlus, LuTrash2 } from "react-icons/lu";
import type { Exercise, Workspace } from "@/types/domain";
import { deleteExercise, saveExercise, updateExerciseTargets } from "@/lib/store/app-store";
import { formatShortDate, parseISODate, toISODate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { GroupPicker } from "./group-picker";
import { bestBefore, DEFAULT_GROUPS, formatNumber, sortExercises, splitGroups } from "../lib/records";

/** Exercícios cadastrados por grupo, com recorde e último registro. */
export function ExerciseList({ data }: { data: Workspace }) {
  const exercises = data.exercises;
  const groups = [...new Set([...exercises.map((e) => e.group), ...DEFAULT_GROUPS])];
  const usedGroups = groups.filter((g) => exercises.some((e) => e.group === g));
  const [name, setName] = useState("");
  const [group, setGroup] = useState(usedGroups[0] ?? DEFAULT_GROUPS[0]);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("12");
  const ids = { name: useId(), group: useId(), sets: useId(), reps: useId() };
  const isCardio = group === "Cardio";
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
        className={cn(
          "grid gap-3 rounded-3xl border border-line bg-surface p-5 sm:items-end",
          isCardio ? "sm:grid-cols-[1fr_220px_auto]" : "sm:grid-cols-[1fr_200px_auto_auto]",
        )}
        onSubmit={(e) => {
          e.preventDefault();
          saveExercise({
            name,
            group,
            kind: isCardio ? "cardio" : "strength",
            ...(isCardio ? {} : { sets: toCount(sets), reps: toCount(reps) }),
          });
          setName("");
        }}
      >
        <Field label="Novo exercício" htmlFor={ids.name}>
          <Input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Supino inclinado" />
        </Field>
        <Field label="Grupo" htmlFor={ids.group}>
          <GroupPicker id={ids.group} value={group} onChange={setGroup} full={full} split={split} />
        </Field>
        {!isCardio && (
          <div className="grid grid-cols-2 gap-3 sm:w-[168px]">
            <Field label="Séries" htmlFor={ids.sets}>
              <Input
                id={ids.sets}
                inputMode="numeric"
                value={sets}
                onChange={(e) => setSets(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="3"
                className="tabular text-center"
              />
            </Field>
            <Field label="Repetições" htmlFor={ids.reps}>
              <Input
                id={ids.reps}
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="12"
                className="tabular text-center"
              />
            </Field>
          </div>
        )}
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
            {sortExercises(exercises.filter((e) => e.group === g))
              .map((e) => {
                const logs = data.exerciseLogs.filter((l) => l.exerciseId === e.id).sort((a, b) => (a.date < b.date ? 1 : -1));
                const best = bestBefore(data.exerciseLogs, e, tomorrow);
                return (
                  <li key={e.id} className="group flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink">
                        {e.name}
                        {e.kind === "strength" && <TargetEditor exercise={e} />}
                      </div>
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

/** Número de séries/repetições digitado (vazio ou zero vira "sem padrão"). */
function toCount(v: string): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 999) : null;
}

/** "3 × 12" ao lado do nome: toque para mudar as séries e repetições padrão. */
function TargetEditor({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const ids = { sets: useId(), reps: useId() };
  const has = Boolean(exercise.sets || exercise.reps);
  const text = has ? `${exercise.sets ?? "–"} × ${exercise.reps ?? "–"}` : "Definir séries";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setSets(exercise.sets ? String(exercise.sets) : "");
          setReps(exercise.reps ? String(exercise.reps) : "");
          setOpen(true);
        }}
        aria-label={has ? `Séries e repetições: ${exercise.sets ?? "sem"} séries de ${exercise.reps ?? "sem"} repetições. Alterar` : "Definir séries e repetições"}
        className={cn(
          "tabular rounded-full px-2 py-0.5 text-[12px] font-semibold",
          has ? "bg-surface-2 text-ink-2 hover:text-ink" : "border border-dashed border-line-strong text-ink-3 hover:text-ink",
        )}
      >
        {text}
      </button>
    );
  }

  const field = "tabular h-8 w-12 rounded-lg border border-line bg-canvas px-1 text-center text-meta font-semibold text-ink outline-none focus:border-primary";
  return (
    <form
      className="flex items-center gap-1.5 font-normal"
      onSubmit={(e) => {
        e.preventDefault();
        updateExerciseTargets(exercise, { sets: toCount(sets), reps: toCount(reps) });
        setOpen(false);
      }}
    >
      <label htmlFor={ids.sets} className="sr-only">
        Séries
      </label>
      <input id={ids.sets} inputMode="numeric" autoFocus value={sets} placeholder="Sér." onChange={(e) => setSets(e.target.value.replace(/\D/g, "").slice(0, 2))} className={field} />
      <span className="text-ink-3" aria-hidden>
        ×
      </span>
      <label htmlFor={ids.reps} className="sr-only">
        Repetições
      </label>
      <input id={ids.reps} inputMode="numeric" value={reps} placeholder="Reps" onChange={(e) => setReps(e.target.value.replace(/\D/g, "").slice(0, 3))} className={field} />
      <Button type="submit" size="sm" variant="primary">
        OK
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-1.5 py-1 text-meta text-ink-3 hover:text-ink">
        Cancelar
      </button>
    </form>
  );
}

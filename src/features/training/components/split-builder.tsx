"use client";

import { useState } from "react";
import { LuCheck, LuGripVertical, LuListChecks, LuPlus, LuX } from "react-icons/lu";
import type { Exercise, ID, TrainingPlan, Workspace } from "@/types/domain";
import { saveTrainingPlan } from "@/lib/store/app-store";
import { parseISODate, toISODate, WEEKDAY_LONG } from "@/lib/dates";
import { useDropZone } from "@/lib/hooks/use-drop-zone";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { sortExercises, splitGroups } from "../lib/records";

const BLOCK_TYPE = "text/prisma-block";
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Monta a divisão semanal arrastando blocos musculares para os dias. */
export function SplitBuilder({ data, plan }: { data: Workspace; plan: TrainingPlan }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ day: number; group: string } | null>(null);
  const picks = plan.dayPicks ?? {};
  const strengthOf = (group: string) => sortExercises(data.exercises.filter((e) => e.kind === "strength" && e.group === group));
  const { full, split } = splitGroups(data.exercises.map((e) => e.group));
  const todayDow = parseISODate(toISODate(new Date())).getDay();

  const update = (split: TrainingPlan["split"], dayPicks: NonNullable<TrainingPlan["dayPicks"]> = picks) =>
    saveTrainingPlan({ ...plan, split, dayPicks });

  /** Escolha de exercícios de um grupo num dia (undefined = todos). */
  const withPick = (all: NonNullable<TrainingPlan["dayPicks"]>, day: number, group: string, ids: ID[] | undefined) => {
    const dayMap = { ...(all[String(day)] ?? {}) };
    if (ids) dayMap[group] = ids;
    else delete dayMap[group];
    const next = { ...all };
    if (Object.keys(dayMap).length) next[String(day)] = dayMap;
    else delete next[String(day)];
    return next;
  };

  const addTo = (day: number, group: string, from?: number) => {
    const split = { ...plan.split };
    let dayPicks = picks;
    if (from !== undefined && from !== day) {
      split[String(from)] = (split[String(from)] ?? []).filter((g) => g !== group);
      // Ao mover o bloco, a escolha de exercícios vai junto.
      const moved = picks[String(from)]?.[group];
      dayPicks = withPick(withPick(dayPicks, from, group, undefined), day, group, moved);
    }
    const list = split[String(day)] ?? [];
    if (!list.includes(group)) split[String(day)] = [...list, group];
    update(split, dayPicks);
  };

  const removeFrom = (day: number, group: string) =>
    update(
      { ...plan.split, [String(day)]: (plan.split[String(day)] ?? []).filter((g) => g !== group) },
      withPick(picks, day, group, undefined),
    );

  const savePick = (day: number, group: string, ids: ID[]) => {
    const total = strengthOf(group).length;
    update(plan.split, withPick(picks, day, group, ids.length >= total ? undefined : ids));
  };

  return (
    <div className="space-y-5">
      <p className="text-meta text-ink-2">
        Arraste um bloco para um dia. No celular, toque no bloco e depois em “Adicionar” no dia. Para usar só alguns
        exercícios de um grupo num dia (ex.: 2 de ombro no dia de peito), toque no ícone de lista do bloco.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <BlockGroup
          id="split-full"
          title="Músculos completos"
          hint="O grupo inteiro no mesmo treino"
          groups={full}
          selected={selected}
          onSelect={setSelected}
        />
        <BlockGroup
          id="split-parts"
          title="Músculos divididos"
          hint="Partes de um grupo, para treinos específicos"
          groups={split}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {WEEK_ORDER.map((d) => (
          <DayDrop
            key={d}
            day={d}
            isToday={d === todayDow}
            groups={plan.split[String(d)] ?? []}
            countOf={(g) => {
              const all = strengthOf(g);
              const pick = picks[String(d)]?.[g];
              return { total: all.length, chosen: pick ? all.filter((e) => pick.includes(e.id)).length : all.length };
            }}
            onPick={(g) => setPicking({ day: d, group: g })}
            selected={selected}
            onAdd={(g, from) => addTo(d, g, from)}
            onRemove={(g) => removeFrom(d, g)}
          />
        ))}
      </div>

      {picking && (
        <PickExercises
          key={`${picking.day}-${picking.group}`}
          day={picking.day}
          group={picking.group}
          exercises={strengthOf(picking.group)}
          initial={picks[String(picking.day)]?.[picking.group]}
          onClose={() => setPicking(null)}
          onSave={(ids) => {
            savePick(picking.day, picking.group, ids);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

/** Escolhe quais exercícios de um grupo entram num dia (ex.: só 2 de ombro no dia de peito). */
function PickExercises({
  day,
  group,
  exercises,
  initial,
  onClose,
  onSave,
}: {
  day: number;
  group: string;
  exercises: Exercise[];
  initial: ID[] | undefined;
  onClose: () => void;
  onSave: (ids: ID[]) => void;
}) {
  const [chosen, setChosen] = useState<ID[]>(() => (initial ? initial.filter((id) => exercises.some((e) => e.id === id)) : exercises.map((e) => e.id)));
  const toggle = (id: ID) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const all = chosen.length === exercises.length;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${group} · ${WEEKDAY_LONG[day]}`}
      description="Escolha os exercícios deste dia. Em outro dia, o mesmo grupo pode ter outros exercícios."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={exercises.length > 0 && chosen.length === 0} onClick={() => onSave(chosen)}>
            Salvar
          </Button>
        </>
      }
    >
      {exercises.length === 0 ? (
        <p className="text-ink-2">Nenhum exercício de {group} ainda. Cadastre na aba Exercícios.</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-meta text-ink-2">
              {chosen.length} de {exercises.length} exercícios
            </p>
            <button
              type="button"
              onClick={() => setChosen(all ? [] : exercises.map((e) => e.id))}
              className="text-meta font-semibold text-primary-ink hover:underline"
            >
              {all ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>
          <ul className="space-y-1.5">
            {exercises.map((e) => {
              const on = chosen.includes(e.id);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(e.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      on ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border",
                        on ? "border-primary bg-primary text-on-primary" : "border-line-strong",
                      )}
                    >
                      {on && <LuCheck className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{e.name}</span>
                    {e.sets && e.reps ? <span className="tabular shrink-0 text-meta text-ink-3">{e.sets}x{e.reps}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}

function DayDrop({
  day,
  isToday,
  groups,
  countOf,
  onPick,
  selected,
  onAdd,
  onRemove,
}: {
  day: number;
  isToday: boolean;
  groups: string[];
  countOf: (group: string) => { total: number; chosen: number };
  onPick: (group: string) => void;
  selected: string | null;
  onAdd: (group: string, from?: number) => void;
  onRemove: (group: string) => void;
}) {
  const { isOver, props } = useDropZone(BLOCK_TYPE, (value) => {
    const [group, from] = value.split("\n");
    onAdd(group, from !== undefined ? Number(from) : undefined);
  });
  return (
    <section
      {...props}
      aria-label={WEEKDAY_LONG[day]}
      className={cn(
        "flex min-h-[150px] flex-col rounded-3xl border p-3 transition-colors",
        isOver ? "border-primary bg-primary-soft" : isToday ? "border-line-strong bg-surface" : "border-line bg-surface/60",
      )}
    >
      <h4 className={cn("px-1 text-meta font-semibold", isToday ? "text-primary-ink" : "text-ink-2")}>
        {WEEKDAY_LONG[day]}
        {isToday && " (hoje)"}
      </h4>
      <ul className="mt-2 flex flex-1 flex-col gap-1.5">
        {groups.length === 0 && <li className="px-1 text-meta text-ink-3">Descanso</li>}
        {groups.map((g) => {
          const count = countOf(g);
          const partial = count.chosen < count.total;
          return (
          <li
            key={g}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(BLOCK_TYPE, `${g}\n${day}`);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="flex cursor-grab items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-meta font-semibold text-on-primary active:cursor-grabbing"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{g}</span>
              {count.total > 0 && (
                <span className="block text-[11px] font-medium opacity-80">
                  {partial ? `${count.chosen} de ${count.total} exercícios` : `${count.total} ${count.total === 1 ? "exercício" : "exercícios"}`}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onPick(g)}
              aria-label={`Escolher exercícios de ${g} (${WEEKDAY_LONG[day]})`}
              title="Escolher exercícios deste dia"
              className="grid size-6 shrink-0 place-items-center rounded-md hover:bg-[#141414]/15"
            >
              <LuListChecks className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onRemove(g)}
              aria-label={`Tirar ${g} de ${WEEKDAY_LONG[day]}`}
              className="grid size-5 place-items-center rounded-md hover:bg-[#141414]/15"
            >
              <LuX className="size-3" aria-hidden />
            </button>
          </li>
          );
        })}
      </ul>
      {selected && !groups.includes(selected) && (
        <button
          type="button"
          onClick={() => onAdd(selected)}
          className="mt-2 flex items-center gap-1 rounded-xl border border-dashed border-primary/60 px-2 py-1.5 text-meta font-semibold text-primary-ink hover:bg-primary-soft"
        >
          <LuPlus className="size-3.5" aria-hidden />
          Adicionar {selected}
        </button>
      )}
    </section>
  );
}

function BlockGroup({
  id,
  title,
  hint,
  groups,
  selected,
  onSelect,
}: {
  id: string;
  title: string;
  hint: string;
  groups: string[];
  selected: string | null;
  onSelect: (fn: (s: string | null) => string | null) => void;
}) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-line bg-surface p-5">
      <h3 id={id} className="font-semibold text-ink">
        {title}
      </h3>
      <p className="mt-0.5 text-meta text-ink-2">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {groups.map((g) => (
          <div
            key={g}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(BLOCK_TYPE, g);
              e.dataTransfer.effectAllowed = "copy";
            }}
            aria-pressed={selected === g}
            onClick={() => onSelect((s) => (s === g ? null : g))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect((s) => (s === g ? null : g));
              }
            }}
            className={cn(
              "flex h-9 cursor-grab select-none items-center gap-1.5 rounded-xl border px-3 transition-colors active:cursor-grabbing",
              selected === g ? "border-primary bg-primary-soft text-ink" : "border-line bg-canvas text-ink-2 hover:border-line-strong",
            )}
          >
            <LuGripVertical className="size-3.5 text-ink-3" aria-hidden />
            {g}
          </div>
        ))}
      </div>
    </section>
  );
}

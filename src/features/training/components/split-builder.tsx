"use client";

import { useState } from "react";
import { LuGripVertical, LuPlus, LuX } from "react-icons/lu";
import type { TrainingPlan, Workspace } from "@/types/domain";
import { saveTrainingPlan } from "@/lib/store/app-store";
import { parseISODate, toISODate, WEEKDAY_LONG } from "@/lib/dates";
import { useDropZone } from "@/lib/hooks/use-drop-zone";
import { cn } from "@/lib/cn";
import { splitGroups } from "../lib/records";

const BLOCK_TYPE = "text/prisma-block";
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Monta a divisão semanal arrastando blocos musculares para os dias. */
export function SplitBuilder({ data, plan }: { data: Workspace; plan: TrainingPlan }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { full, split } = splitGroups(data.exercises.map((e) => e.group));
  const todayDow = parseISODate(toISODate(new Date())).getDay();

  const update = (split: TrainingPlan["split"]) => saveTrainingPlan({ ...plan, split });

  const addTo = (day: number, group: string, from?: number) => {
    const split = { ...plan.split };
    if (from !== undefined && from !== day) split[String(from)] = (split[String(from)] ?? []).filter((g) => g !== group);
    const list = split[String(day)] ?? [];
    if (!list.includes(group)) split[String(day)] = [...list, group];
    update(split);
  };

  const removeFrom = (day: number, group: string) =>
    update({ ...plan.split, [String(day)]: (plan.split[String(day)] ?? []).filter((g) => g !== group) });

  return (
    <div className="space-y-5">
      <p className="text-meta text-ink-2">
        Arraste um bloco para um dia. No celular, toque no bloco e depois em “Adicionar” no dia.
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
            selected={selected}
            onAdd={(g, from) => addTo(d, g, from)}
            onRemove={(g) => removeFrom(d, g)}
          />
        ))}
      </div>
    </div>
  );
}

function DayDrop({
  day,
  isToday,
  groups,
  selected,
  onAdd,
  onRemove,
}: {
  day: number;
  isToday: boolean;
  groups: string[];
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
        {groups.map((g) => (
          <li
            key={g}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(BLOCK_TYPE, `${g}\n${day}`);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="flex cursor-grab items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-meta font-semibold text-on-primary active:cursor-grabbing"
          >
            <span className="flex-1">{g}</span>
            <button
              type="button"
              onClick={() => onRemove(g)}
              aria-label={`Tirar ${g} de ${WEEKDAY_LONG[day]}`}
              className="grid size-5 place-items-center rounded-md hover:bg-[#141414]/15"
            >
              <LuX className="size-3" aria-hidden />
            </button>
          </li>
        ))}
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

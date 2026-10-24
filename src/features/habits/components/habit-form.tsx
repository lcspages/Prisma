"use client";

import { useId, useState } from "react";
import { LuCheck, LuMinus, LuTrash2 } from "react-icons/lu";
import type { Habit } from "@/types/domain";
import { ALL_DAYS } from "@/types/domain";
import { createHabit, deleteHabit, openHabitForm, updateHabit, useAppStore } from "@/lib/store/app-store";
import { WEEKDAY_SHORT } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Chip, Field, Input } from "@/components/ui/field";
import { ModuleBadge } from "@/components/layout/module-badge";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { HABIT_SUGGESTIONS, WEEK_ORDER, WEEKDAYS } from "../lib/suggestions";

type When = "every" | "weekdays" | "custom";

const NO_ITEMS: never[] = [];

function whenOf(days: number[]): When {
  if (days.length === 7) return "every";
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return "weekdays";
  return "custom";
}

/** Janela global de criar/editar hábito. */
export function HabitFormHost() {
  const request = useAppStore((s) => s.ui.habitForm);
  const habit = useAppStore((s) => (request?.habitId ? s.data?.habits.find((h) => h.id === request.habitId) : undefined));
  if (!request || (request.habitId && !habit)) return null;
  return <HabitForm key={request.habitId ?? "new"} habit={habit} initialName={request.name} />;
}

/**
 * Criar é só dar um nome (ou tocar numa sugestão) e escolher os dias.
 * Vincular a um módulo é opcional e já aparece na criação.
 */
function HabitForm({ habit, initialName }: { habit?: Habit; initialName?: string }) {
  const modules = useAppStore((s) => s.data?.modules ?? NO_ITEMS);
  const existing = useAppStore((s) => s.data?.habits ?? NO_ITEMS);
  const [name, setName] = useState(habit?.name ?? initialName ?? "");
  const [days, setDays] = useState<number[]>(habit?.days ?? ALL_DAYS);
  const [when, setWhen] = useState<When>(whenOf(habit?.days ?? ALL_DAYS));
  const [moduleId, setModuleId] = useState<string>(habit?.moduleId ?? "");
  const ids = { name: useId() };
  const close = () => openHabitForm(null);

  const suggestions = HABIT_SUGGESTIONS.filter(
    (s) => !existing.some((h) => h.name.toLowerCase() === s.toLowerCase()),
  ).slice(0, 6);

  const pickWhen = (w: When) => {
    setWhen(w);
    if (w === "every") setDays(ALL_DAYS);
    if (w === "weekdays") setDays(WEEKDAYS);
  };

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? (cur.length > 1 ? cur.filter((x) => x !== d) : cur) : [...cur, d]));

  const valid = name.trim().length > 0 && days.length > 0;

  const submit = () => {
    if (!valid) return;
    if (habit) updateHabit({ ...habit, name, days, moduleId: moduleId || null });
    else createHabit({ name, days, moduleId: moduleId || null });
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      size="sm"
      title={habit ? "Editar hábito" : "Novo hábito"}
      description={habit ? undefined : "Algo pequeno que você quer fazer todo dia. Depois é só marcar."}
      footer={
        <>
          {habit && (
            <Button
              variant="ghost"
              onClick={() => {
                close();
                deleteHabit(habit.id);
              }}
            >
              <LuTrash2 className="size-4" aria-hidden />
              Excluir
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button onClick={close}>Cancelar</Button>
            <Button variant="primary" onClick={submit} disabled={!valid}>
              {habit ? "Salvar" : "Criar hábito"}
            </Button>
          </div>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Nome" htmlFor={ids.name}>
          <Input
            id={ids.name}
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Beber 2 L de água"
            maxLength={60}
          />
        </Field>

        {!habit && suggestions.length > 0 && (
          <div>
            <p className="mb-2 text-meta font-semibold text-ink-2">Ou escolha uma ideia</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Chip key={s} selected={name === s} onClick={() => setName(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-meta font-semibold text-ink-2">Quando</legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={when === "every"} onClick={() => pickWhen("every")}>
              Todo dia
            </Chip>
            <Chip selected={when === "weekdays"} onClick={() => pickWhen("weekdays")}>
              Dias úteis
            </Chip>
            <Chip selected={when === "custom"} onClick={() => pickWhen("custom")}>
              Escolher dias
            </Chip>
          </div>
          {when === "custom" && (
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
              {WEEK_ORDER.map((d) => (
                <Chip key={d} selected={days.includes(d)} onClick={() => toggleDay(d)} className="w-12 justify-center px-0">
                  {WEEKDAY_SHORT[d]}
                </Chip>
              ))}
            </div>
          )}
        </fieldset>

        {modules.length > 0 && (
          <fieldset>
            <legend className="mb-2 flex w-full items-baseline justify-between text-meta font-semibold text-ink-2">
              Vincular a um módulo
              <span className="font-medium text-ink-3">opcional</span>
            </legend>
            <div role="radiogroup" aria-label="Vincular a um módulo" className="grid grid-cols-2 gap-2">
              <ModuleOption selected={moduleId === ""} onSelect={() => setModuleId("")} label="Nenhum">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-dashed border-line-strong text-ink-3">
                  <LuMinus className="size-3.5" />
                </span>
              </ModuleOption>
              {modules.map((m) => (
                <ModuleOption key={m.id} selected={moduleId === m.id} onSelect={() => setModuleId(m.id)} label={m.name}>
                  <ModuleBadge module={m} size="option" />
                </ModuleOption>
              ))}
            </div>
            <p className="mt-2 text-meta text-ink-3">O hábito também aparece dentro do módulo escolhido.</p>
          </fieldset>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

function ModuleOption({
  selected,
  onSelect,
  label,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex min-w-0 items-center gap-2.5 rounded-2xl border p-2 pr-3 text-left transition-colors",
        selected ? "border-primary bg-primary-soft text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
      <span className={cn("min-w-0 flex-1 truncate", selected && "font-semibold")}>{label}</span>
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full transition-colors",
          selected ? "bg-primary text-on-primary" : "border border-line-strong",
        )}
      >
        {selected && <LuCheck className="size-3" />}
      </span>
    </button>
  );
}

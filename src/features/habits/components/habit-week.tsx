"use client";

import { LuCheck } from "react-icons/lu";
import type { Habit, ISODate } from "@/types/domain";
import { toggleHabit } from "@/lib/store/app-store";
import { addDaysISO, parseISODate, startOfWeek, toISODate, WEEKDAY_SHORT } from "@/lib/dates";
import { isHabitDay } from "@/lib/selectors";
import { cn } from "@/lib/cn";

/** Segunda a domingo da semana atual. */
export function currentWeek(today: ISODate): ISODate[] {
  const monday = toISODate(startOfWeek(parseISODate(today)));
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

/**
 * Semana do hábito, sempre de segunda a domingo. Hoje fica destacado
 * no próprio lugar; dias futuros e dias em que o hábito não vale ficam apagados.
 */
export function HabitWeek({ habit, today, size = "md" }: { habit: Habit; today: ISODate; size?: "sm" | "md" }) {
  const week = currentWeek(today);
  return (
    <ol className="grid grid-cols-7 gap-1.5">
      {week.map((d) => {
        const date = parseISODate(d);
        const done = habit.checks.includes(d);
        const isToday = d === today;
        const future = d > today;
        const scheduled = isHabitDay(habit, d);
        const label = `${WEEKDAY_SHORT[date.getDay()]} ${date.getDate()}`;
        return (
          <li key={d} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-[11px]", isToday ? "font-semibold text-primary-ink" : "text-ink-3")}>
              {WEEKDAY_SHORT[date.getDay()]}
            </span>
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={`${habit.name}, ${isToday ? "hoje" : label}`}
              disabled={future || (!scheduled && !done)}
              title={!scheduled ? "Este hábito não vale neste dia" : future ? "Ainda não chegou" : undefined}
              onClick={() => toggleHabit(habit.id, d)}
              className={cn(
                "grid aspect-square w-full place-items-center rounded-xl border-[1.5px] transition-colors disabled:cursor-not-allowed",
                size === "md" ? "max-w-11" : "max-w-8",
                done
                  ? "border-primary bg-primary text-on-primary"
                  : isToday
                    ? "border-primary bg-surface hover:bg-primary-soft"
                    : !scheduled || future
                      ? "border-dashed border-line bg-transparent opacity-60"
                      : "border-line bg-surface hover:border-line-strong",
              )}
            >
              {done ? (
                <LuCheck className={size === "md" ? "size-4" : "size-3.5"} aria-hidden />
              ) : (
                <span className={cn("tabular text-meta", isToday ? "font-semibold text-ink" : "text-ink-3")}>
                  {scheduled ? date.getDate() : "–"}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

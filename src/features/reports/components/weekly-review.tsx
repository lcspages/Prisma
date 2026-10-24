"use client";

import { LuSplit } from "react-icons/lu";
import type { Task, Workspace } from "@/types/domain";
import { openBreakdown, openEditor } from "@/lib/store/app-store";
import { formatDuration, parseISODate, startOfWeek, toISODate, WEEKDAY_LONG } from "@/lib/dates";
import { Button } from "@/components/ui/button";

export interface WeekSummary {
  completed: number;
  focusMinutes: number;
  bestDay: string | null;
  postponed: Task[];
  overdue: number;
}

export function summarizeWeek(ws: Workspace, now: Date): WeekSummary {
  const start = toISODate(startOfWeek(now));
  const today = toISODate(now);
  const inWeek = (iso: string) => iso >= start && iso <= today;

  const perDay = new Map<string, number>();
  ws.focusSessions.forEach((s) => {
    const d = toISODate(new Date(s.startedAt));
    if (inWeek(d)) perDay.set(d, (perDay.get(d) ?? 0) + s.minutes);
  });
  const completedTasks = ws.tasks.filter((t) => t.completedAt && inWeek(toISODate(new Date(t.completedAt))));
  completedTasks.forEach((t) => {
    const d = toISODate(new Date(t.completedAt!));
    perDay.set(d, (perDay.get(d) ?? 0) + 15);
  });
  const best = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    completed: completedTasks.length,
    focusMinutes: ws.focusSessions
      .filter((s) => inWeek(toISODate(new Date(s.startedAt))))
      .reduce((sum, s) => sum + s.minutes, 0),
    bestDay: best ? WEEKDAY_LONG[parseISODate(best[0]).getDay()] : null,
    postponed: ws.tasks
      .filter((t) => !t.completedAt && t.postponedCount >= 2)
      .sort((a, b) => b.postponedCount - a.postponedCount),
    overdue: ws.tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate < today).length,
  };
}

/** Resumo da semana + tarefas que vivem sendo adiadas, com atalho para quebrá-las. */
export function WeeklyReview({ summary, compact = false }: { summary: WeekSummary; compact?: boolean }) {
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Concluídas", String(summary.completed)],
          ["Foco", formatDuration(summary.focusMinutes)],
          ["Melhor dia", summary.bestDay ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-surface-2/70 px-3 py-3">
            <dt className="text-meta text-ink-2">{label}</dt>
            <dd className="tabular mt-0.5 truncate text-lead font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="font-semibold text-ink">
          {summary.postponed.length === 0 ? "Nenhuma tarefa travada" : "Tarefas que você vem adiando"}
        </p>
        <p className="mt-0.5 text-ink-2">
          {summary.postponed.length === 0
            ? "Nada foi adiado duas vezes ou mais. Bom sinal."
            : "Tarefa adiada várias vezes costuma ser grande demais. Quebre em passos menores."}
        </p>
        {summary.postponed.length > 0 && (
          <ul className="mt-3 space-y-2">
            {summary.postponed.slice(0, compact ? 3 : 10).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3">
                <button type="button" onClick={() => openEditor({ taskId: t.id })} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-semibold text-ink">{t.title}</span>
                  <span className="text-meta text-ink-3">
                    Adiada {t.postponedCount} vezes{t.subtasks.length ? `, ${t.subtasks.length} passos` : ""}
                  </span>
                </button>
                <Button size="sm" onClick={() => openBreakdown(t.id)}>
                  <LuSplit className="size-3.5" aria-hidden />
                  Quebrar em passos
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {summary.overdue > 0 && (
        <p className="text-meta text-ink-2">
          {summary.overdue === 1 ? "1 tarefa está atrasada." : `${summary.overdue} tarefas estão atrasadas.`} Reorganize na Semana.
        </p>
      )}
    </div>
  );
}

export function weekKey(now: Date) {
  return toISODate(startOfWeek(now));
}

/** A revisão aparece sexta a partir das 17h, sábado e domingo. */
export function isReviewTime(now: Date) {
  const day = now.getDay();
  return day === 6 || day === 0 || (day === 5 && now.getHours() >= 17);
}

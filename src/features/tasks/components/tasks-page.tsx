"use client";

import { useMemo, useState } from "react";
import { LuPlus } from "react-icons/lu";
import type { Task, Workspace } from "@/types/domain";
import { openEditor } from "@/lib/store/app-store";
import { addDaysISO, toISODate } from "@/lib/dates";
import { byDueDate, isBlocked } from "@/lib/selectors";
import { cn } from "@/lib/cn";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { ModuleDot } from "@/components/layout/module-badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { TaskRow } from "./task-card";

/** Filtro de módulo: "all" = todas, "none" = só as sem módulo, ou o id de um módulo. */
type Filter = "all" | "none" | string;
type Status = "open" | "done";

export function TasksPage() {
  return <WorkspaceGate>{(data, now) => <TasksContent data={data} now={now} />}</WorkspaceGate>;
}

function TasksContent({ data, now }: { data: Workspace; now: Date }) {
  const today = toISODate(now);
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<Status>("open");
  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks]);
  const moduleIds = useMemo(() => new Set(data.modules.map((m) => m.id)), [data.modules]);
  const hasModule = (t: Task) => t.moduleId !== null && moduleIds.has(t.moduleId);

  // Se o módulo filtrado for excluído, volta para "Todas".
  const active: Filter = filter === "all" || filter === "none" || moduleIds.has(filter) ? filter : "all";
  const matches = (t: Task) => (active === "all" ? true : active === "none" ? !hasModule(t) : t.moduleId === active);

  const open = data.tasks.filter((t) => !t.completedAt);
  const countOpen = (fn: (t: Task) => boolean) => open.filter(fn).length;
  const options = [
    { id: "all", label: "Todas", count: open.length },
    { id: "none", label: "Sem módulo", count: countOpen((t) => !hasModule(t)) },
    ...data.modules.map((m) => ({ id: m.id, label: m.name, count: countOpen((t) => t.moduleId === m.id), module: m })),
  ];

  const visible = data.tasks.filter((t) => (status === "open" ? !t.completedAt : t.completedAt)).filter(matches);
  const moduleOf = (t: Task) => data.modules.find((m) => m.id === t.moduleId);
  const tomorrow = addDaysISO(today, 1);

  const sections =
    status === "open"
      ? [
          { id: "late", title: "Atrasadas", tasks: visible.filter((t) => t.dueDate !== null && t.dueDate < today) },
          { id: "today", title: "Hoje", tasks: visible.filter((t) => t.dueDate === today) },
          { id: "tomorrow", title: "Amanhã", tasks: visible.filter((t) => t.dueDate === tomorrow) },
          { id: "later", title: "Próximos dias", tasks: visible.filter((t) => t.dueDate !== null && t.dueDate > tomorrow) },
          { id: "undated", title: "Sem data", tasks: visible.filter((t) => t.dueDate === null) },
        ]
          .map((s) => ({ ...s, tasks: s.tasks.sort(byDueDate(today)) }))
          .filter((s) => s.tasks.length > 0)
      : [
          {
            id: "done",
            title: "Concluídas",
            tasks: visible.sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1)),
          },
        ].filter((s) => s.tasks.length > 0);

  const newTask = () =>
    openEditor({ taskId: null, defaults: { moduleId: active !== "all" && active !== "none" ? active : null } });

  const activeLabel = options.find((o) => o.id === active)?.label ?? "Todas";

  return (
    <Page>
      <PageHeader
        title="Tarefas"
        description="Todas as suas tarefas, com ou sem módulo."
        actions={
          <Button variant="primary" onClick={newTask}>
            <LuPlus className="size-4" aria-hidden />
            Nova tarefa
          </Button>
        }
      />

      <div className="mb-6 space-y-3">
        <div role="group" aria-label="Filtrar por módulo" className="flex flex-wrap gap-2">
          {options.map((o) => {
            const selected = active === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(o.id)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border px-3.5 transition-colors",
                  selected ? "border-ink bg-ink text-canvas" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                {"module" in o && o.module ? (
                  <ModuleDot module={o.module} />
                ) : o.id === "none" ? (
                  <span aria-hidden className="size-2 rounded-full border border-current opacity-70" />
                ) : null}
                {o.label}
                <span className="tabular opacity-60">{o.count}</span>
              </button>
            );
          })}
        </div>
        <div role="tablist" aria-label="Situação" className="inline-flex rounded-xl bg-surface-2 p-1">
          {(
            [
              ["open", "Abertas"],
              ["done", "Concluídas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={status === id}
              onClick={() => setStatus(id)}
              className={cn(
                "h-8 rounded-lg px-3.5 text-meta font-semibold transition-colors",
                status === id ? "bg-surface text-ink shadow-pop" : "text-ink-2 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <EmptyState
          title={status === "open" ? "Nenhuma tarefa aberta aqui" : "Nenhuma tarefa concluída aqui"}
          body={active === "all" ? "Crie uma tarefa com ou sem módulo." : `Filtro: ${activeLabel}.`}
          action={
            status === "open" ? (
              <Button onClick={newTask}>
                <LuPlus className="size-4" aria-hidden />
                Nova tarefa
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={`sec-${s.id}`}>
              <h2 id={`sec-${s.id}`} className={cn("mb-2 flex items-center gap-2 font-semibold", s.id === "late" ? "text-accent-ink" : "text-ink")}>
                {s.title}
                <span className="tabular text-meta font-medium text-ink-3">{s.tasks.length}</span>
              </h2>
              <ul className="divide-y divide-line rounded-3xl border border-line bg-surface p-1.5">
                {s.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    module={moduleOf(t)}
                    today={today}
                    blocked={!t.completedAt && isBlocked(t, byId)}
                    showDate={s.id === "later" || s.id === "late" || s.id === "done"}
                    showModule={active === "all" || active === "none"}
                    actions
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}

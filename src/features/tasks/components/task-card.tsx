"use client";

import { LuClock, LuFlag, LuLock, LuPencil, LuRepeat, LuTrash2 } from "react-icons/lu";
import type { ISODate, Module, Task } from "@/types/domain";
import { deleteTask, openEditor, toggleTask } from "@/lib/store/app-store";
import { formatDuration, relativeDayLabel } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { quadrantOf } from "@/features/tasks/lib/quadrant";
import { ModuleBadge, ModuleDot } from "@/components/layout/module-badge";
import { ProgressBar } from "@/components/ui/page";
import { TaskCheck } from "@/components/ui/task-check";

interface TaskCardProps {
  task: Task;
  module?: Module;
  today: ISODate;
  blocked?: boolean;
  /** Arrastar para outro dia/quadrante */
  draggable?: boolean;
  className?: string;
}

export function dragProps(task: Task, enabled?: boolean) {
  if (!enabled) return {};
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/prisma-task", task.id);
      e.dataTransfer.effectAllowed = "move";
      (e.currentTarget as HTMLElement).dataset.dragging = "true";
    },
    onDragEnd: (e: React.DragEvent) => {
      delete (e.currentTarget as HTMLElement).dataset.dragging;
    },
  };
}

/** Botão invisível que cobre o card e abre a tarefa (o check fica por cima). */
export function OpenOverlay({ task }: { task: Task }) {
  return (
    <button
      type="button"
      onClick={() => openEditor({ taskId: task.id })}
      aria-label={`Abrir ${task.title}`}
      className="absolute inset-0 rounded-[inherit]"
    />
  );
}

function whenLabel(task: Task, today: ISODate): { text: string; overdue: boolean } | null {
  if (task.dueDate && task.dueDate < today && !task.completedAt) {
    return { text: relativeDayLabel(task.dueDate, today) === "Ontem" ? "Atrasada, era ontem" : "Atrasada", overdue: true };
  }
  if (task.scheduledTime) return { text: task.scheduledTime, overdue: false };
  return null;
}

/**
 * Bloco grande da tela inicial: módulo e horário em cima,
 * título no centro, progresso e conclusão embaixo.
 */
export function TaskBlock({ task, module, today, blocked, draggable, className }: TaskCardProps) {
  const when = whenLabel(task, today);
  const subDone = task.subtasks.filter((s) => s.done).length;
  const top = quadrantOf(task) === "do";
  return (
    <article
      {...dragProps(task, draggable)}
      className={cn(
        "group relative flex min-h-[132px] flex-col rounded-3xl sm:min-h-[156px] border border-line bg-surface p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong data-[dragging=true]:opacity-40",
        className,
      )}
    >
      <OpenOverlay task={task} />
      <div className="pointer-events-none flex items-center gap-2">
        {module && <ModuleBadge module={module} size="sm" />}
        <span className="min-w-0 flex-1 truncate text-meta text-ink-2">{module?.name}</span>
        {when && (
          <span
            className={cn(
              "tabular shrink-0 rounded-full px-2 py-0.5 text-meta font-semibold",
              when.overdue ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink",
            )}
          >
            {when.text}
          </span>
        )}
      </div>

      <h3 className={cn("pointer-events-none mt-3 line-clamp-2 text-lead font-semibold leading-6", blocked ? "text-ink-2" : "text-ink")}>
        {task.title}
      </h3>

      <div className="pointer-events-none mt-auto flex items-end gap-3 pt-4">
        <div className="min-w-0 flex-1 space-y-2">
          {task.subtasks.length > 0 && (
            <div className="flex items-center gap-2">
              <ProgressBar value={subDone} max={task.subtasks.length} label="Passos concluídos" className="w-20" />
              <span className="tabular text-meta text-ink-2">
                {subDone}/{task.subtasks.length}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-3">
            {task.estimateMin && (
              <span className="tabular flex items-center gap-1">
                <LuClock className="size-3" aria-hidden />
                {formatDuration(task.estimateMin)}
              </span>
            )}
            {top && (
              <span className="flex items-center gap-1 font-semibold text-accent-ink">
                <LuFlag className="size-3" aria-hidden />
                Prioridade
              </span>
            )}
            {task.recurrence && (
              <span className="flex items-center gap-1" title={task.recurrence.label}>
                <LuRepeat className="size-3" aria-hidden />
                {task.recurrence.streak > 0 ? `${task.recurrence.streak} seguidas` : task.recurrence.label}
              </span>
            )}
            {blocked && (
              <span className="flex items-center gap-1 text-ink-2">
                <LuLock className="size-3" aria-hidden />
                Aguardando outra tarefa
              </span>
            )}
          </div>
        </div>
        <div className="pointer-events-auto relative z-10">
          <TaskCheck
            size="lg"
            checked={Boolean(task.completedAt)}
            locked={blocked}
            label={`Concluir ${task.title}`}
            onToggle={() => toggleTask(task.id)}
          />
        </div>
      </div>
    </article>
  );
}

/** Bloco menor, para tarefas dos próximos dias. */
export function TaskMini({ task, module, today, draggable, className }: TaskCardProps) {
  return (
    <article
      {...dragProps(task, draggable)}
      className={cn(
        "group relative flex min-h-[108px] flex-col rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong data-[dragging=true]:opacity-40",
        className,
      )}
    >
      <OpenOverlay task={task} />
      <p className="pointer-events-none text-meta font-semibold text-ink-2">
        {task.dueDate ? relativeDayLabel(task.dueDate, today) : "Sem data"}
        {task.scheduledTime && <span className="tabular font-medium text-ink-3"> às {task.scheduledTime}</span>}
      </p>
      <h3 className="pointer-events-none mt-1.5 line-clamp-2 font-semibold leading-5 text-ink">{task.title}</h3>
      {module && (
        <p className="pointer-events-none mt-auto flex items-center gap-1.5 pt-3 text-meta text-ink-3">
          <ModuleDot module={module} />
          <span className="truncate">{module.name}</span>
          {quadrantOf(task) === "do" && <LuFlag className="ml-auto size-3 shrink-0 text-accent-ink" aria-label="Prioridade" />}
        </p>
      )}
    </article>
  );
}

/** Linha de lista (módulos, semana, matriz). */
export function TaskRow({
  task,
  module,
  today,
  blocked,
  draggable,
  showDate = true,
  showModule = true,
  actions = false,
  className,
}: TaskCardProps & { showDate?: boolean; showModule?: boolean; /** Botões de editar e excluir sempre visíveis */ actions?: boolean }) {
  const done = Boolean(task.completedAt);
  const overdue = !done && task.dueDate !== null && task.dueDate < today;
  return (
    <li
      {...dragProps(task, draggable)}
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface data-[dragging=true]:opacity-40",
        className,
      )}
    >
      <OpenOverlay task={task} />
      <div className="relative z-10 pt-px">
        <TaskCheck checked={done} locked={blocked} label={`Concluir ${task.title}`} onToggle={() => toggleTask(task.id)} />
      </div>
      <div className="pointer-events-none min-w-0 flex-1">
        <p className={cn("leading-5", done ? "text-ink-3 line-through" : blocked ? "text-ink-2" : "text-ink")}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-meta text-ink-3">
          {showModule && module && (
            <span className="flex items-center gap-1.5">
              <ModuleDot module={module} />
              {module.name}
            </span>
          )}
          {showDate && task.dueDate && (
            <span className={cn(overdue && "font-semibold text-accent-ink")}>
              {overdue ? "Atrasada" : relativeDayLabel(task.dueDate, today)}
            </span>
          )}
          {task.scheduledTime && <span className="tabular">{task.scheduledTime}</span>}
          {task.estimateMin && <span className="tabular">{formatDuration(task.estimateMin)}</span>}
          {task.subtasks.length > 0 && (
            <span className="tabular">
              {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} passos
            </span>
          )}
          {blocked && (
            <span className="flex items-center gap-1">
              <LuLock className="size-3" aria-hidden />
              bloqueada
            </span>
          )}
          {task.recurrence && <LuRepeat className="size-3" aria-label={task.recurrence.label} />}
        </p>
      </div>
      {actions && (
        <div className="relative z-10 -my-1 flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => openEditor({ taskId: task.id })}
            aria-label={`Editar ${task.title}`}
            title="Editar"
            className="grid size-9 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LuPencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            aria-label={`Excluir ${task.title}`}
            title="Excluir"
            className="grid size-9 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-[#e5484d]/10 hover:text-[#d93d42]"
          >
            <LuTrash2 className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </li>
  );
}

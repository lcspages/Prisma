"use client";

import { useMemo, useState } from "react";
import { LuArrowRightLeft, LuCalendarX, LuChevronLeft, LuChevronRight, LuPencil, LuPlus } from "react-icons/lu";
import type { ISODate, Module, Task, Workspace } from "@/types/domain";
import { moveTask, openEditor, toggleTask } from "@/lib/store/app-store";
import {
  addDays,
  formatDuration,
  formatShortDate,
  parseISODate,
  startOfWeek,
  toISODate,
  WEEKDAY_SHORT,
} from "@/lib/dates";
import { byPriority, isBlocked } from "@/lib/selectors";
import { useDropZone } from "@/lib/hooks/use-drop-zone";
import { cn } from "@/lib/cn";
import { dragProps, OpenOverlay } from "@/features/tasks/components/task-card";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { ModuleDot } from "@/components/layout/module-badge";
import { Button } from "@/components/ui/button";
import { Page, PageHeader } from "@/components/ui/page";
import { Modal } from "@/components/ui/modal";
import { TaskCheck } from "@/components/ui/task-check";

const TASK_TYPE = "text/prisma-task";
/** Acima disso o dia aparece como cheio. */
const DAY_CAPACITY_MIN = 6 * 60;

export function WeekBoard() {
  return <WorkspaceGate>{(data, now) => <WeekContent data={data} now={now} />}</WorkspaceGate>;
}

function WeekContent({ data, now }: { data: Workspace; now: Date }) {
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<ISODate | null>(null);
  const [moving, setMoving] = useState<Task | null>(null);
  const today = toISODate(now);
  const start = useMemo(() => addDays(startOfWeek(now), offset * 7), [now, offset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i))), [start]);
  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks]);
  const moduleOf = (t: Task) => data.modules.find((m) => m.id === t.moduleId);

  const undated = data.tasks.filter((t) => !t.completedAt && t.dueDate === null);
  const overdue = offset === 0 ? data.tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate < days[0]) : [];

  const rangeLabel = `${formatShortDate(parseISODate(days[0]))} a ${formatShortDate(parseISODate(days[6]))}`;
  // No celular aparece um dia por vez: o escolhido, ou hoje, ou a segunda.
  const selected = picked && days.includes(picked) ? picked : days.includes(today) ? today : days[0];
  const openCount = (day: ISODate) => data.tasks.filter((t) => t.dueDate === day && !t.completedAt).length;

  return (
    <Page wide>
      <PageHeader
        title="Semana"
        description={
          <>
            <span className="md:hidden">Escolha o dia. Para trocar uma tarefa de dia, toque em “Mover”.</span>
            <span className="hidden md:inline">Arraste as tarefas entre os dias para equilibrar a rotina.</span>
          </>
        }
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => setOffset((o) => o - 1)} aria-label="Semana anterior">
              <LuChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button variant={offset === 0 ? "secondary" : "ghost"} onClick={() => setOffset(0)}>
              {offset === 0 ? "Esta semana" : rangeLabel}
            </Button>
            <Button variant="ghost" onClick={() => setOffset((o) => o + 1)} aria-label="Próxima semana">
              <LuChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        }
      />

      <div role="tablist" aria-label="Dias da semana" className="mb-3 grid grid-cols-7 gap-1 md:hidden">
        {days.map((day) => {
          const date = parseISODate(day);
          const on = day === selected;
          const count = openCount(day);
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${WEEKDAY_SHORT[date.getDay()]}, ${date.getDate()}: ${count} ${count === 1 ? "tarefa" : "tarefas"}`}
              onClick={() => setPicked(day)}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors",
                on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-ink",
              )}
            >
              <span className={cn("text-[11px] font-semibold", on ? "text-on-primary" : day === today ? "text-primary-ink" : "text-ink-2")}>
                {WEEKDAY_SHORT[date.getDay()]}
              </span>
              <span className="tabular text-body font-semibold">{date.getDate()}</span>
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", count === 0 ? "bg-transparent" : on ? "bg-on-primary" : "bg-primary")} />
            </button>
          );
        })}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        <div className="grid gap-3 md:min-w-[1060px] md:grid-cols-7">
          {days.map((day) => (
            <DayColumn
              key={day}
              day={day}
              today={today}
              tasks={data.tasks.filter((t) => t.dueDate === day)}
              moduleOf={moduleOf}
              byId={byId}
              onMove={setMoving}
              className={day === selected ? undefined : "hidden md:flex"}
            />
          ))}
        </div>
      </div>

      {(overdue.length > 0 || undated.length > 0) && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {overdue.length > 0 && (
            <Tray title="Atrasadas" hint="Arraste para um dia da semana" tasks={overdue} moduleOf={moduleOf} today={today} byId={byId} onMove={setMoving} />
          )}
          {undated.length > 0 && (
            <Tray title="Sem data" hint="Arraste para planejar" tasks={undated} moduleOf={moduleOf} today={today} byId={byId} dropDate={null} onMove={setMoving} />
          )}
        </div>
      )}

      <MoveDialog task={moving} days={days} today={today} onClose={() => setMoving(null)} />
    </Page>
  );
}

/** Trocar a tarefa de dia sem arrastar (celular). */
function MoveDialog({ task, days, today, onClose }: { task: Task | null; days: ISODate[]; today: ISODate; onClose: () => void }) {
  const move = (to: ISODate | null) => {
    if (task) moveTask(task.id, to, to === null ? { time: null } : {});
    onClose();
  };
  return (
    <Modal open={Boolean(task)} onClose={onClose} title="Mover para" description={task?.title} size="sm">
      <ul className="grid grid-cols-2 gap-2">
        {days.map((day) => {
          const date = parseISODate(day);
          const current = task?.dueDate === day;
          return (
            <li key={day}>
              <button
                type="button"
                disabled={current}
                onClick={() => move(day)}
                className={cn(
                  "flex h-14 w-full items-center gap-3 rounded-2xl border px-3 text-left transition-colors disabled:opacity-50",
                  day === today ? "border-primary/50 bg-primary-soft" : "border-line bg-canvas hover:border-line-strong",
                )}
              >
                <span className="tabular grid size-8 place-items-center rounded-full bg-surface text-body font-semibold text-ink">{date.getDate()}</span>
                <span className="font-semibold text-ink">
                  {WEEKDAY_SHORT[date.getDay()]}
                  {day === today && <span className="block text-[11px] font-medium text-primary-ink">hoje</span>}
                  {current && <span className="block text-[11px] font-medium text-ink-3">dia atual</span>}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            disabled={task?.dueDate === null}
            onClick={() => move(null)}
            className="flex h-14 w-full items-center gap-3 rounded-2xl border border-line bg-canvas px-3 text-left font-semibold text-ink hover:border-line-strong disabled:opacity-50"
          >
            <LuCalendarX className="size-5 text-ink-2" aria-hidden />
            Sem data
          </button>
        </li>
      </ul>
      <button
        type="button"
        onClick={() => {
          const id = task?.id;
          onClose();
          if (id) requestAnimationFrame(() => openEditor({ taskId: id }));
        }}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-meta font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <LuPencil className="size-4" aria-hidden />
        Escolher outra data
      </button>
    </Modal>
  );
}

function DayColumn({
  day,
  today,
  tasks,
  moduleOf,
  byId,
  onMove,
  className,
}: {
  day: ISODate;
  today: ISODate;
  tasks: Task[];
  moduleOf: (t: Task) => Module | undefined;
  byId: Map<string, Task>;
  onMove: (t: Task) => void;
  className?: string;
}) {
  const { isOver, props } = useDropZone(TASK_TYPE, (id) => moveTask(id, day));
  const open = tasks.filter((t) => !t.completedAt).sort(byPriority(today));
  const done = tasks.filter((t) => t.completedAt);
  const load = open.reduce((s, t) => s + (t.estimateMin ?? 30), 0);
  const isToday = day === today;
  const past = day < today;
  const date = parseISODate(day);
  const full = load > DAY_CAPACITY_MIN;

  return (
    <section
      {...props}
      aria-label={`${WEEKDAY_SHORT[date.getDay()]}, ${date.getDate()}`}
      className={cn(
        "flex min-h-[180px] flex-col rounded-3xl border p-2.5 transition-colors md:min-h-[420px]",
        isOver ? "border-primary bg-primary-soft" : isToday ? "border-line-strong bg-surface" : "border-line bg-surface/60",
        past && !isOver && "opacity-75",
        className,
      )}
    >
      <header className="px-1.5 pb-2 pt-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-meta font-semibold", isToday ? "text-primary-ink" : "text-ink-2")}>
            {WEEKDAY_SHORT[date.getDay()]}
          </span>
          <span
            className={cn(
              "tabular grid size-7 place-items-center rounded-full text-body font-semibold",
              isToday ? "bg-primary text-on-primary" : "text-ink",
            )}
          >
            {date.getDate()}
          </span>
          <span className="tabular ml-auto text-meta text-ink-3">{load > 0 ? formatDuration(load) : ""}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <div
            className={cn("h-full rounded-full", full ? "bg-accent" : "bg-primary/60")}
            style={{ width: `${Math.min(100, (load / DAY_CAPACITY_MIN) * 100)}%` }}
          />
        </div>
        {full && <p className="mt-1 text-meta font-semibold text-accent-ink">Dia cheio</p>}
      </header>

      <ul className="flex flex-1 flex-col gap-1.5">
        {open.map((t) => (
          <WeekCard key={t.id} task={t} module={moduleOf(t)} blocked={isBlocked(t, byId)} onMove={onMove} />
        ))}
        {done.map((t) => (
          <WeekCard key={t.id} task={t} module={moduleOf(t)} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => openEditor({ taskId: null, defaults: { dueDate: day } })}
        className="mt-2 flex h-9 items-center gap-1.5 rounded-xl px-2 text-meta text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <LuPlus className="size-3.5" aria-hidden />
        Adicionar
      </button>
    </section>
  );
}

function WeekCard({ task, module, blocked, onMove }: { task: Task; module?: Module; blocked?: boolean; onMove?: (t: Task) => void }) {
  const done = Boolean(task.completedAt);
  return (
    <li
      {...dragProps(task, !done)}
      className={cn(
        "group relative flex gap-2 rounded-2xl border border-line bg-surface p-2.5 transition-colors hover:border-line-strong data-[dragging=true]:opacity-40",
        !done && "cursor-grab active:cursor-grabbing",
        done && "opacity-60",
      )}
    >
      <OpenOverlay task={task} />
      <div className="relative z-10">
        <TaskCheck size="sm" checked={done} locked={blocked} label={`Concluir ${task.title}`} onToggle={() => toggleTask(task.id)} />
      </div>
      <div className="pointer-events-none min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-meta font-semibold leading-4", done ? "text-ink-3 line-through" : "text-ink")}>
          {task.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 whitespace-nowrap text-[11px] text-ink-3">
          {module && <ModuleDot module={module} />}
          {task.scheduledTime && <span className="tabular">{task.scheduledTime}</span>}
          {task.estimateMin && <span className="tabular">{formatDuration(task.estimateMin)}</span>}
        </p>
      </div>
      {onMove && !done && (
        <button
          type="button"
          onClick={() => onMove(task)}
          aria-label={`Mover ${task.title} para outro dia`}
          className="relative z-10 -my-1 -mr-1 flex shrink-0 items-center gap-1 self-center rounded-xl px-2 py-2 text-[12px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink md:hidden"
        >
          <LuArrowRightLeft className="size-3.5" aria-hidden />
          Mover
        </button>
      )}
    </li>
  );
}

function Tray({
  title,
  hint,
  tasks,
  moduleOf,
  today,
  byId,
  dropDate,
  onMove,
}: {
  title: string;
  hint: string;
  tasks: Task[];
  moduleOf: (t: Task) => Module | undefined;
  today: ISODate;
  byId: Map<string, Task>;
  /** Se definido, aceita tarefas soltas aqui (null = tirar a data) */
  dropDate?: ISODate | null;
  onMove: (t: Task) => void;
}) {
  const { isOver, props } = useDropZone(TASK_TYPE, (id) => {
    if (dropDate !== undefined) moveTask(id, dropDate, { time: null });
  });
  return (
    <section
      {...(dropDate !== undefined ? props : {})}
      className={cn("rounded-3xl border p-4 transition-colors", isOver ? "border-primary bg-primary-soft" : "border-line")}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-ink">
          {title}
          <span className="tabular ml-2 font-medium text-ink-3">{tasks.length}</span>
        </h2>
        <span className="hidden text-meta text-ink-3 md:inline">{hint}</span>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {[...tasks].sort(byPriority(today)).map((t) => (
          <WeekCard key={t.id} task={t} module={moduleOf(t)} blocked={isBlocked(t, byId)} onMove={onMove} />
        ))}
      </ul>
    </section>
  );
}

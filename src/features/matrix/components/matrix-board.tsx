"use client";

import { useMemo } from "react";
import type { IconType } from "react-icons";
import { LuCalendarClock, LuFlame, LuMoon, LuZap } from "react-icons/lu";
import type { Quadrant, Task, Workspace } from "@/types/domain";
import { openEditor, setQuadrant, useAppStore } from "@/lib/store/app-store";
import { toISODate } from "@/lib/dates";
import { byPriority, isBlocked } from "@/lib/selectors";
import { useDropZone } from "@/lib/hooks/use-drop-zone";
import { cn } from "@/lib/cn";
import { quadrantOf } from "@/features/tasks/lib/quadrant";
import { TaskRow } from "@/features/tasks/components/task-card";
import { ContextFilter, contextOptions } from "@/features/today/components/context-filter";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { Page, PageHeader } from "@/components/ui/page";

const TASK_TYPE = "text/prisma-task";

/**
 * A matriz em linguagem simples: cada quadro diz o que fazer com as tarefas dele,
 * numerado na ordem em que vale a pena atacar.
 */
const QUADRANTS: Array<{
  id: Quadrant;
  order: number;
  title: string;
  question: string;
  advice: string;
  icon: IconType;
  tone: string;
  badge: string;
}> = [
  {
    id: "do",
    order: 1,
    title: "Fazer agora",
    question: "Tem prazo perto e faz diferença",
    advice: "Comece por aqui.",
    icon: LuFlame,
    tone: "border-accent bg-accent-soft/50",
    badge: "bg-accent text-on-accent",
  },
  {
    id: "schedule",
    order: 2,
    title: "Agendar",
    question: "Faz diferença, mas pode esperar",
    advice: "Escolha um dia e um horário para cada uma.",
    icon: LuCalendarClock,
    tone: "border-primary/50 bg-primary-soft/50",
    badge: "bg-primary text-on-primary",
  },
  {
    id: "delegate",
    order: 3,
    title: "Resolver rápido",
    question: "Tem pressa, mas pouco impacto",
    advice: "Faça em poucos minutos ou peça ajuda a alguém.",
    icon: LuZap,
    tone: "border-line bg-surface",
    badge: "bg-surface-3 text-ink",
  },
  {
    id: "eliminate",
    order: 4,
    title: "Deixar para depois",
    question: "Sem pressa e pouco impacto",
    advice: "Só se sobrar tempo. Pode até apagar.",
    icon: LuMoon,
    tone: "border-dashed border-line-strong bg-transparent",
    badge: "bg-surface-2 text-ink-2",
  },
];

export function MatrixBoard() {
  return <WorkspaceGate>{(data, now) => <MatrixContent data={data} now={now} />}</WorkspaceGate>;
}

function MatrixContent({ data, now }: { data: Workspace; now: Date }) {
  const context = useAppStore((s) => s.ui.context);
  const today = toISODate(now);
  const open = useMemo(() => data.tasks.filter((t) => !t.completedAt), [data.tasks]);
  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks]);
  const visible = context ? open.filter((t) => t.tags.includes(context)) : open;
  const boxes = QUADRANTS.map((q) => ({
    q,
    tasks: visible.filter((t) => quadrantOf(t) === q.id).sort(byPriority(today)),
  }));
  const props = { today, moduleOf: (t: Task) => data.modules.find((m) => m.id === t.moduleId), byId };

  return (
    <Page wide>
      <PageHeader
        title="Matriz de prioridade"
        description="Suas tarefas separadas em 4 quadros, do mais para o menos importante. Comece pelo 1."
      />

      <div className="mb-6 grid gap-3 rounded-3xl border border-line bg-surface p-4 text-meta text-ink-2 sm:grid-cols-3">
        <p>
          <span className="font-semibold text-ink">Urgente</span>: tem prazo perto ou alguém esperando.
        </p>
        <p>
          <span className="font-semibold text-ink">Importante</span>: faz diferença nos seus objetivos.
        </p>
        <p>
          <span className="font-semibold text-ink">Mudar de quadro</span>: arraste a tarefa ou toque nela e marque Urgente ou
          Importante.
        </p>
      </div>

      <div className="mb-5">
        <ContextFilter options={contextOptions(open, context)} active={context} />
      </div>

      {/* Rótulos dos eixos, só no computador */}
      <div className="hidden grid-cols-[28px_1fr_1fr] gap-4 md:grid">
        <span />
        <p className="pb-2 text-center text-meta font-semibold text-ink-2">Urgente</p>
        <p className="pb-2 text-center text-meta font-semibold text-ink-2">Não urgente</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[28px_1fr_1fr]">
        <AxisLabel text="Importante" />
        <QuadrantBox {...boxes[0]} {...props} />
        <QuadrantBox {...boxes[1]} {...props} />
        <AxisLabel text="Não importante" />
        <QuadrantBox {...boxes[2]} {...props} />
        <QuadrantBox {...boxes[3]} {...props} />
      </div>
    </Page>
  );
}

function AxisLabel({ text }: { text: string }) {
  return (
    <div className="hidden items-center justify-center md:flex" aria-hidden>
      <span className="whitespace-nowrap text-meta font-semibold text-ink-2 [writing-mode:vertical-rl] rotate-180">{text}</span>
    </div>
  );
}

function QuadrantBox({
  q,
  tasks,
  today,
  moduleOf,
  byId,
}: {
  q: (typeof QUADRANTS)[number];
  tasks: Task[];
  today: string;
  moduleOf: (t: Task) => Workspace["modules"][number] | undefined;
  byId: Map<string, Task>;
}) {
  const { isOver, props } = useDropZone(TASK_TYPE, (id) => setQuadrant(id, q.id));
  const Icon = q.icon;
  return (
    <section
      {...props}
      aria-labelledby={`q-${q.id}`}
      className={cn("flex min-h-[260px] flex-col rounded-3xl border-2 p-4 transition-colors md:p-5", isOver ? "border-primary bg-primary-soft" : q.tone)}
    >
      <header className="mb-3 flex items-start gap-3">
        <span className={cn("tabular grid size-9 shrink-0 place-items-center rounded-full text-lead font-semibold", q.badge)}>{q.order}</span>
        <div className="min-w-0 flex-1">
          <h2 id={`q-${q.id}`} className="flex items-center gap-2 text-lead font-semibold text-ink">
            {q.title}
            <Icon className="size-4 text-ink-3" aria-hidden />
          </h2>
          <p className="text-meta text-ink-2">
            {q.question}. {q.advice}
          </p>
        </div>
        <span className="tabular shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-meta font-semibold text-ink-2">
          {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
        </span>
      </header>
      {tasks.length === 0 ? (
        <p className="m-auto px-4 py-6 text-center text-meta text-ink-3">Nenhuma tarefa aqui.<span className="hidden md:inline"> Arraste uma para cá.</span></p>
      ) : (
        <ul className="-mx-1 max-h-[420px] overflow-y-auto scrollbar-thin">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              module={moduleOf(t)}
              today={today}
              blocked={isBlocked(t, byId)}
              draggable
              className="cursor-grab active:cursor-grabbing"
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() =>
          openEditor({
            taskId: null,
            defaults: {
              urgent: q.id === "do" || q.id === "delegate",
              important: q.id === "do" || q.id === "schedule",
            },
          })
        }
        className="mt-2 self-start rounded-xl px-2 py-1.5 text-meta font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        + Nova tarefa neste quadro
      </button>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuChevronDown, LuChevronRight, LuCirclePlay, LuFlame, LuPlus, LuTimer } from "react-icons/lu";
import type { Task, Workspace } from "@/types/domain";
import { openEditor, useAppStore } from "@/lib/store/app-store";
import {
  activityDays,
  byPriority,
  currentStreak,
  focusMinutesOn,
  isBlocked,
  isDoneOn,
} from "@/lib/selectors";
import { addDaysISO, formatDuration, formatLongDate, greeting, minutesOfDay, toISODate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { levelFromXp } from "@/features/gamification/lib/xp";
import { TaskBlock, TaskMini, TaskRow } from "@/features/tasks/components/task-card";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { Button } from "@/components/ui/button";
import { EmptyState, Page, ProgressBar } from "@/components/ui/page";
import { TodayHabits } from "@/features/habits/components/today-habits";
import { WelcomeCard } from "@/features/habits/components/welcome-card";
import { pickNext } from "../lib/pick-next";
import { ContextFilter, contextOptions } from "./context-filter";
import { NowCard } from "./now-card";

const BLOCKS_LIMIT = 6;

/**
 * Tela inicial. Ordem de leitura:
 *   1. saudação e resumo rápido do dia
 *   2. hábitos de hoje (o mais importante: um toque marca)
 *   3. "A seguir": a próxima tarefa, em destaque
 *   4. blocos das tarefas de hoje (atrasadas e importantes primeiro)
 *   5. blocos menores dos próximos dias
 */
export function TodayDashboard() {
  return <WorkspaceGate>{(data, now) => <TodayContent data={data} now={now} />}</WorkspaceGate>;
}

function TodayContent({ data, now }: { data: Workspace; now: Date }) {
  const context = useAppStore((s) => s.ui.context);
  const [showAll, setShowAll] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const today = toISODate(now);
  const nowMin = minutesOfDay(now);
  const { tasks, modules } = data;
  const moduleOf = (t: Task) => modules.find((m) => m.id === t.moduleId);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const openToday = useMemo(
    () => tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate <= today),
    [tasks, today],
  );
  const upcomingAll = useMemo(
    () =>
      tasks
        .filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate > today && t.dueDate <= addDaysISO(today, 7))
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : byPriority(today)(a, b))),
    [tasks, today],
  );
  const doneToday = useMemo(() => tasks.filter((t) => isDoneOn(t, today)), [tasks, today]);

  const filter = (list: Task[]) => (context ? list.filter((t) => t.tags.includes(context)) : list);
  const visibleToday = [...filter(openToday)].sort(byPriority(today));
  const next = pickNext(visibleToday, today, nowMin, byId);
  const blocks = visibleToday.filter((t) => t.id !== next?.task.id);
  const shownBlocks = showAll ? blocks : blocks.slice(0, BLOCKS_LIMIT);
  const upcoming = filter(upcomingAll).slice(0, 8);
  const options = contextOptions([...openToday, ...upcomingAll], context);

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-ink-2">{formatLongDate(now)}</p>
          <h1 className="mt-0.5 text-display font-semibold tracking-[-0.02em] text-ink">
            {greeting(now)}
            {data.profile.displayName.trim() ? `, ${data.profile.displayName.trim().split(" ")[0]}` : ""}
          </h1>
        </div>
        <Button onClick={() => openEditor({ taskId: null })}>
          <LuPlus className="size-4" aria-hidden />
          Nova tarefa
        </Button>
      </header>

      {/* Celular: atalhos para os tutoriais (em destaque) e para o foco */}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:hidden">
        <Link
          href="/tutoriais"
          className="flex min-w-0 items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-on-primary shadow-[0_8px_20px_-10px_rgba(41,152,255,0.8)] active:translate-y-px"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#141414]/10">
            <LuCirclePlay className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block font-semibold">Tutoriais</span>
            <span className="block truncate text-meta opacity-80">Aprenda a usar o Prisma</span>
          </span>
          <LuChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
        </Link>
        <Link
          href="/foco"
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 font-semibold text-ink active:translate-y-px"
        >
          <LuTimer className="size-[18px] text-primary-ink" aria-hidden />
          Foco
        </Link>
      </div>

      <QuickStats data={data} now={now} openCount={openToday.length} doneCount={doneToday.length} />

      <div className="mt-8 space-y-10">
        <WelcomeCard />
        <TodayHabits data={data} today={today} />

        {next ? (
          <NowCard pick={next} module={moduleOf(next.task)}  today={today} />
        ) : (
          <AllDone context={context} doneCount={doneToday.length} />
        )}

        <section aria-labelledby="hoje-title">
          <div className="mb-4 flex flex-col gap-3">
            <h2 id="hoje-title" className="text-title font-semibold tracking-[-0.01em] text-ink">
              Também para hoje
              <span className="tabular ml-2 text-body font-medium text-ink-3">{blocks.length}</span>
            </h2>
            <ContextFilter options={options} active={context} />
          </div>

          {blocks.length === 0 ? (
            <p className="rounded-3xl bg-surface-2/60 px-5 py-6 text-ink-2">
              {next ? "Só falta a tarefa em destaque." : "Nada pendente aqui."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shownBlocks.map((t) => (
                <TaskBlock key={t.id} task={t} module={moduleOf(t)} today={today} blocked={isBlocked(t, byId)} />
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {blocks.length > BLOCKS_LIMIT && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Mostrar menos" : `Mostrar mais ${blocks.length - BLOCKS_LIMIT}`}
              </Button>
            )}
            {doneToday.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                <LuChevronDown className={cn("size-4 transition-transform", !showDone && "-rotate-90")} aria-hidden />
                {doneToday.length === 1 ? "1 concluída hoje" : `${doneToday.length} concluídas hoje`}
              </Button>
            )}
          </div>
          {showDone && (
            <ul className="mt-2 max-w-2xl">
              {doneToday.map((t) => (
                <TaskRow key={t.id} task={t} module={moduleOf(t)} today={today} showDate={false} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="proximos-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="proximos-title" className="text-lead font-semibold text-ink">
              Próximos dias
            </h2>
            <Link href="/semana" className="text-meta font-semibold text-primary-ink hover:underline">
              Ver semana
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-ink-2">Nada marcado para os próximos 7 dias.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {upcoming.map((t) => (
                <TaskMini key={t.id} task={t} module={moduleOf(t)} today={today} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}

/** Quatro números rápidos. Cada um leva à página da função. */
function QuickStats({ data, now, openCount, doneCount }: { data: Workspace; now: Date; openCount: number; doneCount: number }) {
  const today = toISODate(now);
  const focus = focusMinutesOn(data, today);
  const streak = useMemo(() => currentStreak(activityDays(data, now, 60)), [data, now]);
  const level = levelFromXp(data.profile.totalXp);
  const total = openCount + doneCount;

  const tile =
    "flex min-w-0 flex-col justify-between gap-2 rounded-2xl px-4 py-3.5 transition-colors hover:bg-surface-2/70";

  return (
    <nav aria-label="Resumo do dia" className="mt-6 grid grid-cols-2 gap-1 rounded-3xl border border-line bg-surface p-1.5 md:grid-cols-4">
      <Link href="/semana" className={tile}>
        <span className="text-meta text-ink-2">Tarefas de hoje</span>
        <span className="flex items-baseline gap-1.5">
          <span className="tabular text-title font-semibold text-ink">{doneCount}</span>
          <span className="tabular text-ink-3">de {total}</span>
        </span>
        <ProgressBar value={doneCount} max={Math.max(total, 1)} label="Tarefas de hoje concluídas" />
      </Link>
      <Link href="/foco" className={tile}>
        <span className="text-meta text-ink-2">Foco hoje</span>
        <span className="flex items-center gap-2">
          <LuTimer className="size-4 text-primary-ink" aria-hidden />
          <span className="tabular text-title font-semibold text-ink">{focus > 0 ? formatDuration(focus) : "0 min"}</span>
        </span>
        <span className="text-meta text-ink-3">{focus > 0 ? "Bom ritmo" : "Comece uma sessão"}</span>
      </Link>
      <Link href="/relatorios" className={tile}>
        <span className="text-meta text-ink-2">Sequência</span>
        <span className="flex items-center gap-2">
          <LuFlame className="size-4 text-accent-ink" aria-hidden />
          <span className="tabular text-title font-semibold text-ink">{streak}</span>
          <span className="text-ink-3">{streak === 1 ? "dia" : "dias"}</span>
        </span>
        <span className="text-meta text-ink-3">Dias seguidos com atividade</span>
      </Link>
      <Link href="/relatorios" className={tile}>
        <span className="text-meta text-ink-2">Nível {level.level}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="tabular text-title font-semibold text-ink">{level.current}</span>
          <span className="tabular text-ink-3">/ {level.needed} XP</span>
        </span>
        <ProgressBar value={level.current} max={level.needed} label={`Progresso para o nível ${level.level + 1}`} tone="accent" />
      </Link>
    </nav>
  );
}

function AllDone({ context, doneCount }: { context: string | null; doneCount: number }) {
  return (
    <EmptyState
      title={context ? `Nada aberto em #${context} hoje` : "Tudo feito por hoje"}
      body={
        context
          ? "Limpe o filtro para ver as outras tarefas."
          : doneCount > 0
            ? `Você concluiu ${doneCount} ${doneCount === 1 ? "tarefa" : "tarefas"}. Planeje amanhã ou descanse.`
            : "Crie uma tarefa ou traga algo dos próximos dias."
      }
      action={
        !context && (
          <Button variant="primary" onClick={() => openEditor({ taskId: null })}>
            <LuPlus className="size-4" aria-hidden />
            Nova tarefa
          </Button>
        )
      }
    />
  );
}

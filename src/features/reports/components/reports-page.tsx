"use client";

import { useMemo } from "react";
import { LuFlame, LuSparkles } from "react-icons/lu";
import type { Workspace } from "@/types/domain";
import { addDaysISO, formatDuration, toISODate } from "@/lib/dates";
import { activityDays, currentStreak, focusByHour, xpOn } from "@/lib/selectors";
import { levelFromXp } from "@/features/gamification/lib/xp";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { Page, PageHeader, ProgressBar } from "@/components/ui/page";
import { ContributionHeatmap } from "./contribution-heatmap";
import { EnergyChart, energyInsight, peakWindow } from "./energy-chart";
import { summarizeWeek, WeeklyReview } from "./weekly-review";

export function ReportsPage() {
  return <WorkspaceGate>{(data, now) => <ReportsContent data={data} now={now} />}</WorkspaceGate>;
}

function Card({ id, title, aside, children, className }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`rounded-3xl border border-line bg-surface p-5 md:p-6 ${className ?? ""}`}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="text-lead font-semibold text-ink">
          {title}
        </h2>
        {aside && <div className="text-meta text-ink-2">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function ReportsContent({ data, now }: { data: Workspace; now: Date }) {
  const today = toISODate(now);
  const days = useMemo(() => activityDays(data, now, 364), [data, now]);
  const streak = currentStreak(days);
  const active = days.filter((d) => d.level > 0).length;
  const byHour = useMemo(() => focusByHour(data, now, 30), [data, now]);
  const peak = peakWindow(byHour);
  const insight = energyInsight(byHour);
  const summary = useMemo(() => summarizeWeek(data, now), [data, now]);
  const level = levelFromXp(data.profile.totalXp);
  const xpWeek = Array.from({ length: 7 }, (_, i) => xpOn(data, addDaysISO(today, i - 6))).reduce((a, b) => a + b, 0);

  return (
    <Page>
      <PageHeader title="Relatórios" description="Consistência, horários em que você rende mais e a revisão da semana." />

      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <Card id="r-level" title={`Nível ${level.level}`} aside={`${level.current} / ${level.needed} XP`}>
          <ProgressBar value={level.current} max={level.needed} label={`Progresso para o nível ${level.level + 1}`} tone="accent" className="h-2" />
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-meta text-ink-2">Hoje</dt>
              <dd className="tabular text-title font-semibold">+{xpOn(data, today)} XP</dd>
            </div>
            <div>
              <dt className="text-meta text-ink-2">Últimos 7 dias</dt>
              <dd className="tabular text-title font-semibold">+{xpWeek} XP</dd>
            </div>
          </dl>
          <p className="mt-4 text-meta text-ink-3">Tarefas, sessões de foco, hábitos e registros de treino dão XP.</p>
        </Card>

        <Card id="r-week" title="Revisão da semana">
          <WeeklyReview summary={summary} />
        </Card>
      </div>

      <Card
        id="r-heat"
        title="Consistência"
        className="mt-5"
        aside={
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <LuFlame className="size-3.5 text-accent-ink" aria-hidden />
              <span className="tabular font-semibold text-ink">{streak}</span> dias seguidos
            </span>
            <span className="tabular">{active} dias ativos no último ano</span>
          </span>
        }
      >
        <ContributionHeatmap days={days} />
      </Card>

      <Card id="r-energy" title="Picos de energia" className="mt-5" aside="Minutos de foco por hora, últimos 30 dias">
        {peak.minutes > 0 ? (
          <>
            <p className="mb-8 flex items-start gap-2 text-ink">
              <LuSparkles className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden />
              <span>
                Você rende mais entre <strong className="font-semibold">{peak.start}h e {peak.start + 3}h</strong>
                {` (${formatDuration(peak.minutes)} no período)`}. {insight}
              </span>
            </p>
            <EnergyChart byHour={byHour} />
          </>
        ) : (
          <p className="text-ink-2">Faça algumas sessões de foco para ver em que horários você rende mais.</p>
        )}
      </Card>
    </Page>
  );
}

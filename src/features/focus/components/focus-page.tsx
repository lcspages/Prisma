"use client";

import { useId, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuCheck,
  LuCloudRain,
  LuCoffee,
  LuHeadphones,
  LuLightbulb,
  LuPause,
  LuPlay,
  LuSquare,
  LuVolume2,
  LuVolumeX,
  LuWaves,
  LuWind,
  LuZap,
} from "react-icons/lu";
import type { InboxItem, Workspace } from "@/types/domain";
import {
  backToFocus,
  captureInbox,
  configureFocus,
  pauseFocus,
  setFocusSound,
  setFocusVolume,
  startBreak,
  startFocus,
  stopFocus,
  toggleTask,
  useAppStore,
  type SoundKind,
} from "@/lib/store/app-store";
import { formatClock, formatDuration, formatTimer, relativeDayLabel, toISODate } from "@/lib/dates";
import { byPriority, focusMinutesOn } from "@/lib/selectors";
import { useTick } from "@/lib/hooks/use-tick";
import { cn } from "@/lib/cn";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { ModuleDot } from "@/components/layout/module-badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/field";
import { Page, PageHeader } from "@/components/ui/page";

const PRESETS = [25, 50, 90];
const BREAKS = [5, 10, 15];

const SOUNDS: Array<{ id: SoundKind; label: string; icon: IconType }> = [
  { id: "off", label: "Silêncio", icon: LuVolumeX },
  { id: "white", label: "Ruído branco", icon: LuWind },
  { id: "rain", label: "Chuva", icon: LuCloudRain },
  { id: "lofi", label: "Lo-fi", icon: LuHeadphones },
  { id: "brown", label: "Ruído marrom", icon: LuWaves },
];

export function FocusPage() {
  return <WorkspaceGate>{(data, now) => <FocusContent data={data} now={now} />}</WorkspaceGate>;
}

function FocusContent({ data, now }: { data: Workspace; now: Date }) {
  const focus = useAppStore((s) => s.focus);
  const today = toISODate(now);
  const tick = useTick(focus.status === "running");

  const remainingMs =
    focus.status === "running" && focus.endsAt ? Math.max(0, focus.endsAt - tick) : focus.status === "idle" ? focus.durationMin * 60_000 : focus.remainingMs;
  const totalMs = focus.durationMin * 60_000;
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const idle = focus.status === "idle";

  const candidates = useMemo(
    () => data.tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate <= today).sort(byPriority(today)),
    [data.tasks, today],
  );
  const task = focus.taskId ? data.tasks.find((t) => t.id === focus.taskId) : undefined;
  const module = task ? data.modules.find((m) => m.id === task.moduleId) : undefined;
  const sessionsToday = data.focusSessions.filter((s) => toISODate(new Date(s.startedAt)) === today);
  const minutesToday = focusMinutesOn(data, today);

  return (
    <Page wide>
      <PageHeader
        title="Foco"
        description={
          minutesToday > 0
            ? `Hoje: ${sessionsToday.length} ${sessionsToday.length === 1 ? "sessão" : "sessões"}, ${formatDuration(minutesToday)} focados.`
            : "Escolha uma tarefa, um tempo e um som. O resto fica do lado de fora."
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Timer */}
        <section
          aria-label="Timer"
          className={cn(
            "flex flex-col items-center rounded-[28px] border p-6 md:p-10",
            focus.mode === "focus" ? "border-line bg-surface" : "border-accent/60 bg-accent-soft/40",
          )}
        >
          <p
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold",
              focus.mode === "focus" ? "bg-primary-soft text-primary-ink" : "bg-accent-soft text-accent-ink",
            )}
          >
            {focus.mode === "focus" ? <LuZap className="size-4" aria-hidden /> : <LuCoffee className="size-4" aria-hidden />}
            {focus.mode === "focus" ? "Foco" : "Pausa"}
          </p>

          <TimerRing progress={progress} mode={focus.mode}>
            <span className="tabular text-[56px] font-semibold leading-none tracking-[-0.03em] text-ink md:text-[72px]">
              {formatTimer(remainingMs / 1000)}
            </span>
            <span className="mt-2 text-ink-2">
              {focus.status === "running"
                ? focus.endsAt
                  ? `termina às ${formatClock(new Date(focus.endsAt))}`
                  : ""
                : focus.status === "paused"
                  ? "pausado"
                  : focus.mode === "focus"
                    ? "pronto para começar"
                    : "respire, levante, beba água"}
            </span>
          </TimerRing>

          {idle && (
          <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Duração">
            {(focus.mode === "focus" ? PRESETS : BREAKS).map((m) => (
              <Chip key={m} selected={focus.durationMin === m} disabled={!idle} onClick={() => configureFocus({ durationMin: m })}>
                {m} min
              </Chip>
            ))}
            <CustomMinutes disabled={!idle} value={focus.durationMin} />
          </div>
          )}

          {focus.status === "paused" ? (
            <PauseMenu mode={focus.mode} />
          ) : (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {focus.status === "running" ? (
                <Button variant="primary" className="h-12 rounded-2xl px-8 text-lead" onClick={pauseFocus}>
                  <LuPause className="size-5" aria-hidden />
                  Pausar
                </Button>
              ) : (
                <Button variant="primary" className="h-12 rounded-2xl px-8 text-lead" onClick={startFocus}>
                  <LuPlay className="size-5" aria-hidden />
                  {focus.mode === "focus" ? "Iniciar foco" : "Iniciar pausa"}
                </Button>
              )}
              {focus.status === "running" && focus.mode === "focus" && (
                <Button className="h-12 rounded-2xl px-5" onClick={() => stopFocus()}>
                  <LuSquare className="size-4" aria-hidden />
                  Encerrar
                </Button>
              )}
              {idle && focus.mode === "break" && (
                <Button className="h-12 rounded-2xl px-5" onClick={backToFocus}>
                  Pular pausa
                </Button>
              )}
            </div>
          )}
        </section>

        <div className="space-y-6">
          {/* Tarefa */}
          <section aria-labelledby="focus-task" className="rounded-3xl border border-line bg-surface p-5">
            <h2 id="focus-task" className="font-semibold text-ink">
              No que você vai focar
            </h2>
            {task ? (
              <div className="mt-3 rounded-2xl bg-surface-2/70 p-4">
                <p className="font-semibold text-ink">{task.title}</p>
                {module && (
                  <p className="mt-1 flex items-center gap-1.5 text-meta text-ink-2">
                    <ModuleDot module={module} />
                    {module.name}
                    {task.estimateMin && <span className="tabular text-ink-3">· {formatDuration(task.estimateMin)}</span>}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  {!task.completedAt ? (
                    <Button size="sm" onClick={() => toggleTask(task.id)}>
                      <LuCheck className="size-3.5" aria-hidden />
                      Concluir tarefa
                    </Button>
                  ) : (
                    <span className="text-meta font-semibold text-primary-ink">Concluída</span>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => configureFocus({ taskId: null })}>
                    Trocar
                  </Button>
                </div>
              </div>
            ) : (
              <TaskPicker data={data} candidates={candidates} />
            )}
          </section>

          <SoundPicker />
          <CapturePanel inbox={data.inbox} since={focus.startedAt} />
        </div>
      </div>
    </Page>
  );
}

function TimerRing({ progress, mode, children }: { progress: number; mode: "focus" | "break"; children: React.ReactNode }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative my-8 grid aspect-square w-full max-w-[340px] place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="3" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={mode === "focus" ? "var(--primary)" : "var(--accent)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="relative flex flex-col items-center">{children}</div>
    </div>
  );
}

function CustomMinutes({ disabled, value }: { disabled: boolean; value: number }) {
  const id = useId();
  const [text, setText] = useState("");
  const apply = () => {
    const n = Math.round(Number(text));
    if (n >= 1 && n <= 240) configureFocus({ durationMin: n });
    setText("");
  };
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        Minutos personalizados
      </label>
      <input
        id={id}
        inputMode="numeric"
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 3))}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        onBlur={() => text && apply()}
        placeholder={PRESETS.includes(value) || BREAKS.includes(value) ? "Outro" : `${value}`}
        className="h-8 w-20 rounded-full border border-line bg-surface px-3 text-center outline-none placeholder:text-ink-3 focus:border-primary disabled:opacity-50"
      />
      <span className="text-meta text-ink-3">min</span>
    </div>
  );
}

function SoundPicker() {
  const sound = useAppStore((s) => s.focus.sound);
  const volume = useAppStore((s) => s.focus.volume);
  const id = useId();
  return (
    <section aria-labelledby="focus-sound" className="rounded-3xl border border-line bg-surface p-5">
      <h2 id="focus-sound" className="font-semibold text-ink">
        Som ambiente
      </h2>
      <div role="radiogroup" aria-labelledby="focus-sound" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
        {SOUNDS.map(({ id: kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={sound === kind}
            onClick={() => setFocusSound(kind)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-meta transition-colors",
              sound === kind ? "border-primary bg-primary-soft font-semibold text-ink" : "border-line text-ink-2 hover:border-line-strong",
            )}
          >
            <Icon className={cn("size-5", sound === kind && kind !== "off" && "text-primary-ink")} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <LuVolume2 className="size-4 text-ink-3" aria-hidden />
        <label htmlFor={id} className="sr-only">
          Volume
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setFocusVolume(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
        />
      </div>
    </section>
  );
}

function CapturePanel({ inbox, since }: { inbox: InboxItem[]; since: string | null }) {
  const [text, setText] = useState("");
  const id = useId();
  const recent = (since ? inbox.filter((i) => i.createdAt >= since) : inbox).slice(0, 4);
  return (
    <section aria-labelledby="focus-capture" className="rounded-3xl border border-line bg-surface p-5">
      <h2 id="focus-capture" className="font-semibold text-ink">
        Teve uma ideia?
      </h2>
      <p className="mt-0.5 text-meta text-ink-2">Anote e volte ao que fazia. O timer continua e a ideia vai para a caixa de entrada.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          captureInbox("idea", text);
          setText("");
        }}
      >
        <label htmlFor={id} className="sr-only">
          Ideia
        </label>
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ideia: …"
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-ink outline-none placeholder:text-ink-3 focus:border-primary"
        />
        <Button type="submit" disabled={!text.trim()}>
          Guardar
        </Button>
      </form>
      {recent.length > 0 && (
        <ul className="mt-4 space-y-2">
          {recent.map((item) => (
            <li key={item.id} className="flex gap-2.5 text-ink-2">
              <LuLightbulb className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
              <span className="min-w-0 flex-1">{item.text}</span>
              <span className="tabular shrink-0 text-meta text-ink-3">
                {toISODate(new Date(item.createdAt)) === toISODate(new Date())
                  ? formatClock(new Date(item.createdAt))
                  : relativeDayLabel(toISODate(new Date(item.createdAt)), toISODate(new Date()))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Aparece ao tocar em Pausar: tudo o que dá para fazer numa pausa, num lugar só. */
function PauseMenu({ mode }: { mode: "focus" | "break" }) {
  return (
    <div role="group" aria-label="Pausado" className="mt-6 w-full max-w-md rounded-3xl border border-line bg-surface-2/60 p-5 text-center">
      <p className="font-semibold text-ink">{mode === "focus" ? "Foco pausado" : "Pausa parada"}</p>
      <Button variant="primary" className="mt-4 h-12 w-full rounded-2xl text-lead" onClick={startFocus}>
        <LuPlay className="size-5" aria-hidden />
        {mode === "focus" ? "Continuar foco" : "Continuar pausa"}
      </Button>
      {mode === "focus" ? (
        <>
          <p className="mt-5 text-meta font-semibold text-ink-2">Fazer uma pausa agora</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {BREAKS.map((m) => (
              <Button key={m} onClick={() => startBreak(m)}>
                <LuCoffee className="size-4" aria-hidden />
                {m} min
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-3">Depois da pausa, o foco continua de onde parou.</p>
        </>
      ) : (
        <Button className="mt-2 w-full" onClick={backToFocus}>
          <LuZap className="size-4" aria-hidden />
          Voltar ao foco
        </Button>
      )}
      {mode === "focus" && (
        <button
          type="button"
          onClick={() => stopFocus()}
          className="mt-4 flex h-14 w-full items-center gap-3 rounded-2xl bg-ink px-4 text-left text-canvas shadow-pop transition-transform hover:-translate-y-px active:translate-y-0"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-canvas/15">
            <LuSquare className="size-3.5 fill-current" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-tight">Encerrar sessão</span>
            <span className="block text-[11px] leading-tight opacity-70">O tempo focado fica salvo</span>
          </span>
          <LuCheck className="size-4 opacity-70" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Tarefas separadas por módulo, para não misturar academia com estudos. */
function TaskPicker({ data, candidates }: { data: Workspace; candidates: Workspace["tasks"] }) {
  const groups: Array<{ key: string; name: string; module?: Workspace["modules"][number]; tasks: Workspace["tasks"] }> = [
    ...data.modules.map((m) => ({ key: m.id, name: m.name, module: m, tasks: candidates.filter((t) => t.moduleId === m.id) })),
    { key: "none", name: "Sem módulo", tasks: candidates.filter((t) => !t.moduleId || !data.modules.some((m) => m.id === t.moduleId)) },
  ].filter((g) => g.tasks.length > 0);
  const [active, setActive] = useState<string | null>(groups[0]?.key ?? null);
  const current = groups.find((g) => g.key === active) ?? groups[0];

  return (
    <div className="mt-3">
      {groups.length === 0 ? (
        <p className="text-ink-2">Nenhuma tarefa para hoje. Foque livremente.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Módulos" className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={current?.key === g.key}
                onClick={() => setActive(g.key)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 transition-colors",
                  current?.key === g.key
                    ? "border-ink bg-ink text-canvas"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                {g.module ? <ModuleDot module={g.module} /> : <span aria-hidden className="size-2 rounded-full border border-current opacity-60" />}
                {g.name}
                <span className="tabular opacity-60">{g.tasks.length}</span>
              </button>
            ))}
          </div>
          <ul role="tabpanel" className="mt-3 space-y-1.5">
            {current?.tasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => configureFocus({ taskId: t.id })}
                  className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary-soft"
                >
                  <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                  {t.estimateMin && <span className="tabular shrink-0 text-meta text-ink-3">{formatDuration(t.estimateMin)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-meta text-ink-3">Sem escolher, a sessão é livre.</p>
    </div>
  );
}

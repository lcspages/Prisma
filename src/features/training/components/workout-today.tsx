"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LuCheck, LuFlag, LuMusic, LuPause, LuPlay, LuPlus, LuRotateCcw, LuTrash2, LuTrophy } from "react-icons/lu";
import { useRouter } from "next/navigation";
import type { Exercise, TrainingPlan, Workspace } from "@/types/domain";
import { askConfirm, finishWorkout, logExercise, pushToast, saveTrainingPlan, toggleFinisher } from "@/lib/store/app-store";
import { addDaysISO, formatDuration, formatTimer, parseISODate, toISODate, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/dates";
import { newId } from "@/lib/id";
import { useTick } from "@/lib/hooks/use-tick";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/page";
import { TaskCheck } from "@/components/ui/task-check";
import { bestBefore, formatNumber, logOn, previousLog } from "../lib/records";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const STOPWATCH_KEY = "prisma:workout-stopwatch";

/** Treino do dia: exercícios da divisão, carga e repetições, cardio, finalização e playlist. */
export function WorkoutToday({
  data,
  plan,
  onEditPlaylist,
}: {
  data: Workspace;
  plan: TrainingPlan;
  onEditPlaylist: () => void;
}) {
  const today = toISODate(new Date());
  const todayDow = parseISODate(today).getDay();
  const [day, setDay] = useState(todayDow);
  const isToday = day === todayDow;
  // Data do dia escolhido dentro da semana atual (segunda a domingo).
  const offset = ((day + 6) % 7) - ((todayDow + 6) % 7);
  const dayDate = addDaysISO(today, offset);
  const groups = plan.split[String(day)] ?? [];
  const exercises = data.exercises;
  const strength = exercises.filter((e) => e.kind === "strength" && groups.includes(e.group));
  const cardio = exercises.filter((e) => e.kind === "cardio");
  const doneToday = data.workoutSessions.filter((w) => w.date === today);

  return (
    <div className="space-y-6">
      {/* Segunda a domingo, sempre nessa ordem; hoje só ganha um ponto azul */}
      <div className="grid grid-cols-7 gap-1.5 sm:flex" role="group" aria-label="Dia da semana">
        {WEEK_ORDER.map((d) => (
          <Chip
            key={d}
            selected={day === d}
            onClick={() => setDay(d)}
            aria-label={d === todayDow ? `${WEEKDAY_LONG[d]} (hoje)` : WEEKDAY_LONG[d]}
            className="relative w-full justify-center px-0 sm:w-14"
          >
            {WEEKDAY_SHORT[d]}
            {d === todayDow && <span aria-hidden className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />}
          </Chip>
        ))}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-meta text-ink-2">{isToday ? "Treino de hoje" : WEEKDAY_LONG[day]}</p>
            <h3 className="mt-0.5 text-title font-semibold text-ink">{groups.length ? groups.join(" e ") : "Descanso"}</h3>
          </div>
          {isToday && groups.length > 0 && (
            <div className="flex items-center gap-2">
              <WorkoutTimer groups={groups} />
              <MusicMenu plan={plan} onEditPlaylist={onEditPlaylist} />
            </div>
          )}
        </div>

        {isToday && doneToday.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-meta font-medium text-primary-ink">
            <LuCheck className="size-4" aria-hidden />
            Treino encerrado hoje: {formatDuration(doneToday.reduce((sum, w) => sum + w.minutes, 0))}
          </p>
        )}

        {groups.length === 0 ? (
          <p className="mt-3 text-ink-2">Nenhum grupo muscular neste dia. Monte a divisão na aba Divisão semanal.</p>
        ) : strength.length === 0 ? (
          <p className="mt-3 text-ink-2">Cadastre exercícios desses grupos na aba Exercícios.</p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {strength.map((e) => (
              <ExerciseRow key={e.id} exercise={e} data={data} today={today} editable={isToday} />
            ))}
          </ul>
        )}
      </section>

      {isToday && cardio.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-5 md:p-6">
          <h3 className="font-semibold text-ink">Cardio</h3>
          <ul className="mt-3 divide-y divide-line">
            {cardio.map((e) => (
              <ExerciseRow key={e.id} exercise={e} data={data} today={today} editable />
            ))}
          </ul>
        </section>
      )}

      {/* Aparece em todo dia com treino; a marcação vale para a data daquele dia nesta semana */}
      {(isToday || groups.length > 0) && <Finishers plan={plan} date={dayDate} today={today} />}
    </div>
  );
}

interface Stopwatch {
  startedAt: number | null;
  accumulated: number;
}

function readStopwatch(): Stopwatch {
  try {
    const raw = localStorage.getItem(STOPWATCH_KEY);
    if (raw) return JSON.parse(raw) as Stopwatch;
  } catch {
    /* sem armazenamento */
  }
  return { startedAt: null, accumulated: 0 };
}

/** Cronômetro do treino. Continua contando se você trocar de aba; "Encerrar" salva a duração. */
function WorkoutTimer({ groups }: { groups: string[] }) {
  const router = useRouter();
  const [watch, setWatch] = useState<Stopwatch>({ startedAt: null, accumulated: 0 });
  useEffect(() => setWatch(readStopwatch()), []);
  const update = (next: Stopwatch) => {
    setWatch(next);
    try {
      localStorage.setItem(STOPWATCH_KEY, JSON.stringify(next));
    } catch {
      /* sem armazenamento */
    }
  };
  const now = useTick(watch.startedAt !== null);
  const elapsed = watch.accumulated + (watch.startedAt ? Math.max(0, now - watch.startedAt) : 0);

  const finish = () => {
    const total = watch.accumulated + (watch.startedAt ? Math.max(0, Date.now() - watch.startedAt) : 0);
    const counted = Math.round(total / 60_000);
    // Cronômetro esquecido ligado: salva no máximo 6 horas (o servidor também limita).
    const minutes = Math.min(counted, 360);
    if (minutes < 1) {
      askConfirm({
        title: "Encerrar o treino?",
        body: "O treino teve menos de 1 minuto e não será salvo nos relatórios.",
        actionLabel: "Encerrar",
        onConfirm: () => update({ startedAt: null, accumulated: 0 }),
      });
      return;
    }
    askConfirm({
      title: "Encerrar o treino?",
      body:
        counted > minutes
          ? `O cronômetro ficou ligado por ${formatDuration(counted)}. Ficam salvas 6h, o máximo de um treino.`
          : `${formatDuration(minutes)} de treino ficam salvos nos Relatórios.`,
      actionLabel: "Encerrar treino",
      onConfirm: () => {
        if (!finishWorkout({ minutes, groups })) return;
        update({ startedAt: null, accumulated: 0 });
        pushToast({
          message: `Treino encerrado: ${formatDuration(minutes)}. O resumo fica em Relatórios.`,
          actionLabel: "Ver",
          duration: 8000,
          onAction: () => router.push("/relatorios#treino"),
        });
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {elapsed > 0 && <span className="tabular min-w-[64px] text-title font-semibold text-ink">{formatTimer(elapsed / 1000)}</span>}
      {watch.startedAt ? (
        <Button onClick={() => update({ startedAt: null, accumulated: elapsed })}>
          <LuPause className="size-4" aria-hidden />
          Pausar
        </Button>
      ) : (
        <Button variant="primary" onClick={() => update({ startedAt: Date.now(), accumulated: watch.accumulated })}>
          <LuPlay className="size-4" aria-hidden />
          {elapsed > 0 ? "Continuar" : "Iniciar treino"}
        </Button>
      )}
      {elapsed > 0 && (
        <Button variant={watch.startedAt ? "secondary" : "primary"} onClick={finish}>
          <LuFlag className="size-4" aria-hidden />
          Encerrar
        </Button>
      )}
      {elapsed > 0 && !watch.startedAt && (
        <Button variant="ghost" onClick={() => update({ startedAt: null, accumulated: 0 })} aria-label="Zerar cronômetro" title="Zerar sem salvar">
          <LuRotateCcw className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}

const MUSIC_APPS = [
  { key: "spotifyUrl" as const, label: "Spotify", fallback: "https://open.spotify.com" },
  { key: "youtubeUrl" as const, label: "YouTube", fallback: "https://music.youtube.com" },
];

/** Botão de música: o usuário escolhe abrir no Spotify ou no YouTube. */
function MusicMenu({ plan, onEditPlaylist }: { plan: TrainingPlan; onEditPlaylist: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir música"
        title="Música"
        className="grid size-10 place-items-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <LuMusic className="size-4" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="palette-in absolute right-0 top-full z-20 mt-1 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-modal">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold text-ink-3">Abrir playlist no</p>
          {MUSIC_APPS.map((app) => (
            <a
              key={app.key}
              role="menuitem"
              href={plan[app.key] ?? app.fallback}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 text-ink hover:bg-surface-2"
            >
              {app.label}
              {!plan[app.key] && <span className="text-[11px] text-ink-3">sem link</span>}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEditPlaylist();
            }}
            className="w-full rounded-xl px-2.5 py-2 text-left text-meta text-primary-ink hover:bg-surface-2"
          >
            Editar links das playlists
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ exercise, data, today, editable }: { exercise: Exercise; data: Workspace; today: string; editable: boolean }) {
  const current = logOn(data.exerciseLogs, exercise.id, today);
  const previous = previousLog(data.exerciseLogs, exercise.id, today);
  const record = bestBefore(data.exerciseLogs, exercise, today);
  const cardio = exercise.kind === "cardio";
  const fieldsKey = current ? `${current.load}-${current.reps}-${current.sets}-${current.minutes}-${current.distanceKm}` : "none";

  const initial = () => ({
    a: current ? String((cardio ? current.minutes : current.load) ?? "") : "",
    b: current ? String((cardio ? current.distanceKm : current.reps) ?? "") : "",
    c: current && !cardio ? String(current.sets ?? "") : "",
  });
  const [values, setValues] = useState(initial);
  // Atualiza quando o registro oficial chega da nuvem.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setValues(initial()), [fieldsKey]);
  const ids = { a: useId(), b: useId(), c: useId() };

  const parse = (v: string) => {
    const n = Number(v.replace(",", "."));
    return v.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n;
  };
  const a = parse(values.a);
  const b = parse(values.b);
  const c = parse(values.c);
  const dirty =
    !current ||
    a !== ((cardio ? current.minutes : current.load) ?? null) ||
    b !== ((cardio ? current.distanceKm : current.reps) ?? null) ||
    (!cardio && c !== (current.sets ?? null));
  const canSave = editable && (a !== null || b !== null) && dirty;

  const todayValue = cardio ? b : a;
  const newRecord = record !== null && todayValue !== null && todayValue > record && Boolean(current);

  const save = () => {
    if (!canSave) return;
    logExercise({
      id: current?.id ?? newId(),
      exerciseId: exercise.id,
      date: today,
      ...(cardio ? { minutes: a, distanceKm: b } : { load: a, reps: b, sets: c }),
    });
  };

  const prev = previous
    ? cardio
      ? [previous.minutes && `${previous.minutes} min`, previous.distanceKm && `${formatNumber(previous.distanceKm)} km`].filter(Boolean).join(", ")
      : [previous.load && `${formatNumber(previous.load)} kg`, previous.reps && `${previous.reps} reps`].filter(Boolean).join(" × ")
    : null;

  const fields = cardio
    ? [
        { key: "a" as const, label: "Tempo", unit: "min", placeholder: previous?.minutes },
        { key: "b" as const, label: "Distância", unit: "km", placeholder: previous?.distanceKm },
      ]
    : [
        { key: "a" as const, label: "Carga", unit: "kg", placeholder: previous?.load },
        { key: "b" as const, label: "Reps", unit: "", placeholder: previous?.reps },
        { key: "c" as const, label: "Séries", unit: "", placeholder: previous?.sets },
      ];

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold text-ink">
          {exercise.name}
          {newRecord && (
            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">
              <LuTrophy className="size-3" aria-hidden />
              Novo recorde
            </span>
          )}
          {current && !newRecord && <LuCheck className="size-4 text-primary-ink" aria-label="Registrado hoje" />}
        </p>
        <p className="text-meta text-ink-3">
          {prev ? `Último: ${prev}` : "Primeiro registro"}
          {record !== null && `. Recorde: ${formatNumber(record)} ${cardio ? "km" : "kg"}`}
        </p>
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {fields.map((f) => (
          <div key={f.key} className="w-[76px]">
            <label htmlFor={ids[f.key]} className="block truncate text-[11px] text-ink-3" title={f.unit ? `${f.label} (${f.unit})` : f.label}>
              {f.unit ? `${f.label === "Distância" ? "Dist." : f.label} (${f.unit})` : f.label}
            </label>
            <input
              id={ids[f.key]}
              inputMode="decimal"
              disabled={!editable}
              value={values[f.key]}
              placeholder={f.placeholder != null ? formatNumber(f.placeholder) : "–"}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value.replace(/[^\d.,]/g, "") }))}
              className="tabular mt-0.5 h-10 w-full rounded-xl border border-line bg-canvas px-2 text-center font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-3/70 focus:border-primary disabled:opacity-60"
            />
          </div>
        ))}
        {editable && (
          <Button type="submit" variant={canSave ? "primary" : "secondary"} disabled={!canSave} className="h-10">
            {current ? "Atualizar" : "Salvar"}
          </Button>
        )}
      </form>
    </li>
  );
}

function Finishers({ plan, date, today }: { plan: TrainingPlan; date: string; today: string }) {
  const [text, setText] = useState("");
  const id = useId();
  const done = plan.finisherDone[date] ?? [];
  const future = date > today;
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 md:p-6">
      <h3 className="font-semibold text-ink">Antes de ir embora</h3>
      <p className="mt-0.5 text-meta text-ink-2">Itens inegociáveis no fim de todo treino.</p>
      {plan.finishers.length === 0 ? (
        <EmptyState className="mt-4 py-6" title="Nenhum item" body="Ex.: 15 minutos de cardio" />
      ) : (
        <ul className="mt-3 space-y-1">
          {plan.finishers.map((f) => {
            const checked = done.includes(f.id);
            return (
              <li key={f.id} className="group flex items-center gap-3 rounded-xl px-1 py-1.5">
                {future ? (
                  <span aria-hidden className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-line-strong" />
                ) : (
                  <TaskCheck checked={checked} label={f.text} onToggle={() => toggleFinisher(plan.id, date, f.id)} />
                )}
                <span className={cn("flex-1", checked ? "text-ink-3 line-through" : "text-ink")}>{f.text}</span>
                <button
                  type="button"
                  onClick={() => saveTrainingPlan({ ...plan, finishers: plan.finishers.filter((x) => x.id !== f.id) })}
                  aria-label={`Remover ${f.text}`}
                  title="Remover"
                  className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                >
                  <LuTrash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          saveTrainingPlan({ ...plan, finishers: [...plan.finishers, { id: newId(), text: text.trim() }] });
          setText("");
        }}
      >
        <label htmlFor={id} className="sr-only">
          Novo item de finalização
        </label>
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adicionar item"
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-ink outline-none placeholder:text-ink-3 focus:border-primary"
        />
        <Button type="submit" disabled={!text.trim()} aria-label="Adicionar item">
          <LuPlus className="size-4" aria-hidden />
        </Button>
      </form>
    </section>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LuHourglass, LuPlus, LuX } from "react-icons/lu";
import { formatTimer } from "@/lib/dates";
import { useTick } from "@/lib/hooks/use-tick";
import { pushToast } from "@/lib/store/app-store";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/field";
import { rest, REST_MAX_SECONDS, REST_MIN_SECONDS } from "../lib/workout-clock";

const PRESETS = [60, 120, 180];

let audio: AudioContext | null = null;

/** Prepara o som dentro do toque (o iPhone só libera áudio depois de um toque). */
function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

/** Três bipes curtos e vibração (Android) quando o descanso acaba. */
function alarm() {
  try {
    navigator.vibrate?.([200, 100, 200, 100, 300]);
  } catch {
    /* sem vibração */
  }
  if (!audio) return;
  try {
    const start = audio.currentTime + 0.02;
    for (let i = 0; i < 3; i++) {
      const t = start + i * 0.28;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 2 ? 1046 : 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    }
  } catch {
    /* sem som */
  }
}

const label = (s: number) => (s % 60 === 0 ? `${s / 60} min` : s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`);

/** Descanso entre séries: 1, 2, 3 minutos ou um tempo escolhido. Aparece depois de iniciar o treino. */
export function RestTimer() {
  const state = rest.use();
  const running = state.endsAt !== null;
  const now = useTick(running);
  const left = running ? Math.max(0, Math.ceil(((state.endsAt as number) - now) / 1000)) : 0;
  const [custom, setCustom] = useState(false);
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  const ids = { min: useId(), sec: useId() };
  const fired = useRef<number | null>(null);

  // Fim do descanso: avisa uma vez (também ao voltar para o app depois do fim).
  useEffect(() => {
    if (!running || left > 0 || fired.current === state.endsAt) return;
    fired.current = state.endsAt;
    const late = Date.now() - (state.endsAt as number) > 120_000;
    rest.set({ ...rest.get(), endsAt: null, total: 0 });
    // Voltou ao app muito depois do fim: só limpa, sem tocar.
    if (late) return;
    alarm();
    pushToast({ tone: "success", message: "Descanso acabou. Bora para a próxima série!", duration: 5000 });
  }, [running, left, state.endsAt]);

  const start = (seconds: number) => {
    unlockAudio();
    const s = Math.min(REST_MAX_SECONDS, Math.max(REST_MIN_SECONDS, Math.round(seconds)));
    rest.set({ seconds: s, endsAt: Date.now() + s * 1000, total: s });
    setCustom(false);
  };
  const customSeconds = (Number(min) || 0) * 60 + (Number(sec) || 0);
  const isPreset = PRESETS.includes(state.seconds);

  if (running) {
    const pct = state.total > 0 ? Math.min(100, ((state.total - left) / state.total) * 100) : 0;
    return (
      <div className="mt-5 rounded-2xl border border-primary/40 bg-primary-soft p-4" role="timer" aria-live="off">
        <div className="flex items-center gap-3">
          <LuHourglass className="size-5 shrink-0 text-primary-ink" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-meta font-medium text-primary-ink">Descanso</p>
            <p className="tabular text-display font-semibold leading-none text-ink">{formatTimer(left)}</p>
          </div>
          <Button
            size="sm"
            onClick={() => rest.set({ ...state, endsAt: (state.endsAt as number) + 15_000, total: state.total + 15 })}
            aria-label="Mais 15 segundos"
          >
            <LuPlus className="size-4" aria-hidden />
            15 s
          </Button>
          <Button size="sm" variant="ghost" onClick={() => rest.set({ ...state, endsAt: null, total: 0 })}>
            Pular
          </Button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-canvas p-4">
      <p className="flex items-center gap-1.5 text-meta font-semibold text-ink-2">
        <LuHourglass className="size-4" aria-hidden />
        Descanso entre séries
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Iniciar descanso">
        {PRESETS.map((s) => (
          <Chip key={s} selected={state.seconds === s} onClick={() => start(s)} aria-label={`Descansar ${label(s)}`}>
            {label(s)}
          </Chip>
        ))}
        {!isPreset && (
          <Chip selected onClick={() => start(state.seconds)} aria-label={`Descansar ${label(state.seconds)}`}>
            {label(state.seconds)}
          </Chip>
        )}
        <Chip selected={custom} onClick={() => setCustom((v) => !v)} aria-expanded={custom}>
          Personalizar
        </Chip>
      </div>
      {custom && (
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (customSeconds >= REST_MIN_SECONDS) start(customSeconds);
          }}
        >
          <div className="w-[72px]">
            <label htmlFor={ids.min} className="block text-[11px] text-ink-3">
              Minutos
            </label>
            <input
              id={ids.min}
              inputMode="numeric"
              value={min}
              placeholder="0"
              onChange={(e) => setMin(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="tabular mt-0.5 h-10 w-full rounded-xl border border-line bg-surface px-2 text-center font-semibold text-ink outline-none placeholder:text-ink-3/70 focus:border-primary"
            />
          </div>
          <div className="w-[72px]">
            <label htmlFor={ids.sec} className="block text-[11px] text-ink-3">
              Segundos
            </label>
            <input
              id={ids.sec}
              inputMode="numeric"
              value={sec}
              placeholder="0"
              onChange={(e) => setSec(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="tabular mt-0.5 h-10 w-full rounded-xl border border-line bg-surface px-2 text-center font-semibold text-ink outline-none placeholder:text-ink-3/70 focus:border-primary"
            />
          </div>
          <Button type="submit" variant="primary" className="h-10" disabled={customSeconds < REST_MIN_SECONDS}>
            Iniciar
          </Button>
          <button
            type="button"
            onClick={() => setCustom(false)}
            aria-label="Fechar"
            className={cn("grid size-10 place-items-center rounded-xl text-ink-3 hover:bg-surface-2 hover:text-ink")}
          >
            <LuX className="size-4" aria-hidden />
          </button>
        </form>
      )}
      <p className="mt-2.5 text-meta text-ink-3">Toque no tempo ao terminar a série. Avisamos com som quando acabar.</p>
    </div>
  );
}

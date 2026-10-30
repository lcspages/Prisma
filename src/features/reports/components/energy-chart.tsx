"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/dates";
import { cn } from "@/lib/cn";

const FIRST_HOUR = 6;
const HOURS = Array.from({ length: 24 - FIRST_HOUR }, (_, i) => i + FIRST_HOUR);

/** Melhor janela de 3 horas seguidas. */
export function peakWindow(byHour: number[]): { start: number; minutes: number } {
  let best = { start: FIRST_HOUR, minutes: 0 };
  for (let h = FIRST_HOUR; h <= 21; h++) {
    const sum = byHour[h] + byHour[h + 1] + byHour[h + 2];
    if (sum > best.minutes) best = { start: h, minutes: sum };
  }
  return best;
}

function periodTotal(byHour: number[], from: number, to: number) {
  return byHour.slice(from, to).reduce((s, v) => s + v, 0);
}

/** Frase com a comparação entre manhã e tarde. */
export function energyInsight(byHour: number[]): string | null {
  const morning = periodTotal(byHour, 6, 12);
  const afternoon = periodTotal(byHour, 12, 18);
  const night = periodTotal(byHour, 18, 24) + periodTotal(byHour, 0, 6);
  const periods = [
    { name: "manhã", v: morning },
    { name: "tarde", v: afternoon },
    { name: "noite", v: night },
  ].sort((a, b) => b.v - a.v);
  if (periods[0].v === 0) return null;
  if (periods[1].v === 0) return `Quase todo o seu foco acontece de ${periods[0].name}.`;
  const pct = Math.round((periods[0].v / periods[1].v - 1) * 100);
  if (pct < 10) return `Seu foco é bem distribuído entre ${periods[0].name} e ${periods[1].name}.`;
  return `Você foca ${pct}% mais de ${periods[0].name} do que de ${periods[1].name}.`;
}

/**
 * Barras de minutos de foco por hora do dia (uma série, uma cor).
 * A janela de pico fica em azul cheio; o resto em azul claro.
 */
export function EnergyChart({ byHour }: { byHour: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...HOURS.map((h) => byHour[h]), 1);
  const peak = peakWindow(byHour);
  const inPeak = (h: number) => peak.minutes > 0 && h >= peak.start && h < peak.start + 3;

  return (
    <figure>
      <div className="relative">
        {/* Linha de base e valor máximo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
        <span className="tabular pointer-events-none absolute -top-5 right-0 text-[11px] text-ink-3" aria-hidden>
          {formatDuration(max)}
        </span>
        <div className="flex h-44 items-end gap-[2px] border-b border-line-strong" aria-hidden>
          {HOURS.map((h) => {
            const v = byHour[h];
            return (
              <div
                key={h}
                className="relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(h)}
                onMouseLeave={() => setHover((c) => (c === h ? null : c))}
              >
                <div
                  className={cn(
                    "w-full rounded-t-[4px] transition-opacity",
                    inPeak(h) ? "bg-primary" : "bg-heat-2",
                    hover !== null && hover !== h && "opacity-50",
                  )}
                  style={{ height: v > 0 ? `${Math.max(2, (v / max) * 100)}%` : 0 }}
                />
                {hover === h && (
                  <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] text-canvas shadow-modal">
                    <span className="tabular font-semibold">{h}h</span> · {v > 0 ? formatDuration(v) : "sem foco"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-[2px] text-[11px] text-ink-3" aria-hidden>
          {HOURS.map((h) => (
            <span key={h} className="tabular relative h-4 min-w-0 flex-1">
              {h % 3 === 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{h}h</span>}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Minutos de foco por hora do dia, últimos 30 dias</caption>
        <thead>
          <tr>
            <th scope="col">Hora</th>
            <th scope="col">Minutos</th>
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) => (
            <tr key={h}>
              <td>{h}h</td>
              <td>{byHour[h]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

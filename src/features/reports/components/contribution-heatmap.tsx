"use client";

import { useSyncExternalStore } from "react";
import type { ActivityDay } from "@/lib/selectors";
import { formatDuration, parseISODate } from "@/lib/dates";

const LEVEL_CLASS = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** No celular cabem só as últimas 26 semanas (6 meses) sem rolar de lado. */
const NARROW_WEEKS = 26;
const NARROW_QUERY = "(max-width: 767px)";
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(NARROW_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

/**
 * Mapa de calor estilo GitHub: colunas são semanas (domingo a sábado),
 * a cor é o quanto você estudou, treinou e focou no dia.
 */
export function ContributionHeatmap({ days: allDays }: { days: ActivityDay[] }) {
  const narrow = useNarrow();
  if (allDays.length === 0) return null;
  const days = narrow ? allDays.slice(-(NARROW_WEEKS * 7)) : allDays;

  const firstWeekday = parseISODate(days[0].date).getDay();
  const cells: Array<ActivityDay | null> = [...Array<null>(firstWeekday).fill(null), ...days];
  const columns: Array<Array<ActivityDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  let lastMonth = -1;
  const monthLabels = columns.map((col) => {
    const first = col.find(Boolean);
    if (!first) return "";
    const m = parseISODate(first.date).getMonth();
    if (m === lastMonth) return "";
    lastMonth = m;
    return MONTHS[m];
  });
  // Dois nomes de mês muito perto um do outro se sobrepõem: fica só o mais recente.
  let lastLabel = -1;
  monthLabels.forEach((label, i) => {
    if (!label) return;
    if (lastLabel >= 0 && i - lastLabel < 3) monthLabels[lastLabel] = "";
    lastLabel = i;
  });

  const activeDays = days.filter((d) => d.level > 0).length;
  const gridStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` };

  return (
    <figure>
      <figcaption className="sr-only">
        Ativo em {activeDays} dos últimos {days.length} dias.
      </figcaption>

      <div aria-hidden>
        <div>
        <div className="mb-1.5 grid gap-[3px] text-[11px] leading-3 text-ink-3" style={gridStyle}>
          {monthLabels.map((label, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {label}
            </span>
          ))}
        </div>
        <div className="grid gap-[3px]" style={gridStyle}>
          {columns.map((col, ci) => (
            <div key={ci} className="grid grid-rows-7 gap-[3px]">
              {Array.from({ length: 7 }, (_, ri) => {
                const day = col[ri];
                if (!day) return <span key={ri} className="aspect-square" />;
                const date = parseISODate(day.date);
                const parts = [
                  day.minutes ? `${formatDuration(day.minutes)} de atividade` : null,
                  day.tasks ? `${day.tasks} ${day.tasks === 1 ? "tarefa" : "tarefas"}` : null,
                ].filter(Boolean);
                return (
                  <span
                    key={ri}
                    title={`${date.getDate()} de ${MONTHS[date.getMonth()]}: ${parts.join(", ") || "sem registro"}`}
                    className={`aspect-square rounded-[3px] ${LEVEL_CLASS[day.level]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-3">
          Menos
          {LEVEL_CLASS.map((c) => (
            <span key={c} className={`size-3 rounded-[3px] ${c}`} />
          ))}
          Mais
        </div>
        </div>
      </div>
    </figure>
  );
}

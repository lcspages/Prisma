import type { ActivityDay } from "@/lib/selectors";
import { formatDuration, parseISODate } from "@/lib/dates";

const LEVEL_CLASS = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Mapa de calor estilo GitHub: colunas são semanas (domingo a sábado),
 * a cor é o quanto você estudou, treinou e focou no dia.
 */
export function ContributionHeatmap({ days }: { days: ActivityDay[] }) {
  if (days.length === 0) return null;

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

  const activeDays = days.filter((d) => d.level > 0).length;
  const gridStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` };

  return (
    <figure>
      <figcaption className="sr-only">
        Ativo em {activeDays} dos últimos {days.length} dias.
      </figcaption>

      <div aria-hidden className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="min-w-[640px]">
        <div className="mb-1.5 grid gap-1 text-[11px] leading-3 text-ink-3" style={gridStyle}>
          {monthLabels.map((label, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {label}
            </span>
          ))}
        </div>
        <div className="grid gap-1" style={gridStyle}>
          {columns.map((col, ci) => (
            <div key={ci} className="grid grid-rows-7 gap-1">
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

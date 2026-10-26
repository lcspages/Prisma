"use client";

import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Mostra o número em destaque (algo esperando resposta). */
  alert?: boolean;
}

/** Abas simples com navegação por setas. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] md:mx-0 md:px-0"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const i = items.findIndex((t) => t.value === value);
        const next = items[(i + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
        onChange(next.value);
        (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            data-value={t.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative flex h-11 min-w-fit flex-1 shrink-0 items-center justify-center gap-1.5 px-2 transition-colors md:flex-none md:justify-start md:px-3",
              active ? "font-semibold text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
            {typeof t.count === "number" &&
              (t.alert ? (
                <span className="tabular grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-on-accent">
                  {t.count}
                </span>
              ) : (
                <span className="tabular text-meta text-ink-3">{t.count}</span>
              ))}
            {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

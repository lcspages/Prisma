"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown, LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";

/**
 * Seletor de grupo muscular: abre um painel com os músculos completos
 * e os divididos em áreas separadas.
 */
export function GroupPicker({
  id,
  value,
  onChange,
  full,
  split,
}: {
  id?: string;
  value: string;
  onChange: (group: string) => void;
  full: string[];
  split: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const pick = (g: string) => {
    onChange(g);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const isFull = full.includes(value);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border bg-canvas pl-2 pr-3 text-left text-ink transition-colors",
          open ? "border-primary" : "border-line hover:border-line-strong",
        )}
      >
        <span
          className={cn(
            "rounded-lg px-1.5 py-0.5 text-[11px] font-semibold",
            isFull ? "bg-primary-soft text-primary-ink" : "bg-accent-soft text-accent-ink",
          )}
        >
          {isFull ? "Completo" : "Dividido"}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{value}</span>
        <LuChevronDown className={cn("size-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <>
          {/* Celular: abre como painel de baixo, com a lista inteira rolando e por cima da barra do app */}
          <div aria-hidden className="fixed inset-0 z-[60] bg-black/40 sm:hidden" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label="Grupo muscular"
            className={cn(
              "palette-in fixed inset-x-0 bottom-0 z-[61] flex max-h-[85dvh] flex-col rounded-t-3xl border border-line bg-surface shadow-modal",
              "sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:z-30 sm:mt-2 sm:max-h-[60vh] sm:w-[440px] sm:rounded-3xl",
            )}
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-3 sm:hidden">
              <p className="font-semibold text-ink">Grupo muscular</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-surface-2"
              >
                <LuX className="size-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] scrollbar-thin sm:pb-4">
              <Section title="Músculos completos" hint="O grupo inteiro" tone="full" groups={full} value={value} onPick={pick} />
              <div className="my-4 h-px bg-line" />
              <Section title="Músculos divididos" hint="Partes de um grupo" tone="split" groups={split} value={value} onPick={pick} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  tone,
  groups,
  value,
  onPick,
}: {
  title: string;
  hint: string;
  tone: "full" | "split";
  groups: string[];
  value: string;
  onPick: (g: string) => void;
}) {
  return (
    <div role="group" aria-label={title}>
      <div className="mb-2.5 flex items-center gap-2">
        <span aria-hidden className={cn("size-2 rounded-full", tone === "full" ? "bg-primary" : "bg-accent")} />
        <p className="text-meta font-semibold text-ink">{title}</p>
        <p className="text-[11px] text-ink-3">{hint}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {groups.map((g) => {
          const selected = g === value;
          return (
            <button
              key={g}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onPick(g)}
              className={cn(
                "flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-meta transition-colors",
                selected
                  ? "border-primary bg-primary-soft font-semibold text-ink"
                  : "border-line bg-canvas text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              <span className="min-w-0 flex-1 leading-tight">{g}</span>
              {selected && <LuCheck className="size-3.5 shrink-0 text-primary-ink" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

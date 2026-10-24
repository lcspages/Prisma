"use client";

import { LuLock } from "react-icons/lu";
import { cn } from "@/lib/cn";

interface TaskCheckProps {
  checked: boolean;
  locked?: boolean;
  label: string;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "square";
}

const SIZES = {
  sm: { box: "size-4", icon: "size-2.5" },
  md: { box: "size-5", icon: "size-3" },
  lg: { box: "size-8", icon: "size-4" },
};

/**
 * Caixa de conclusão. Redonda para tarefas, quadrada para subtarefas,
 * com cadeado quando a tarefa depende de outra.
 */
export function TaskCheck({ checked, locked = false, label, onToggle, size = "md", shape = "circle" }: TaskCheckProps) {
  const s = SIZES[size];
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={locked ? `${label} (bloqueada até a outra tarefa ser concluída)` : label}
      aria-disabled={locked || undefined}
      title={locked ? "Bloqueada até a outra tarefa ser concluída" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!locked) onToggle();
      }}
      className={cn(
        "relative grid shrink-0 place-items-center border-[1.5px] transition-colors",
        s.box,
        shape === "circle" ? "rounded-full" : "rounded-[5px]",
        checked
          ? "border-primary bg-primary text-on-primary"
          : locked
            ? "cursor-not-allowed border-dashed border-line-strong bg-surface text-ink-3"
            : "border-line-strong bg-surface hover:border-primary hover:bg-primary-soft",
      )}
    >
      {locked && !checked && <LuLock className={s.icon} aria-hidden />}
      {checked && (
        <svg viewBox="0 0 12 12" className={s.icon} aria-hidden>
          <path
            d="M2.5 6.2 5 8.6 9.6 3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="check-draw"
          />
        </svg>
      )}
    </button>
  );
}

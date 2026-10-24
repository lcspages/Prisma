import type { Module } from "@/types/domain";
import { MODULE_COLORS, MODULE_ICONS } from "@/features/modules/lib/appearance";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: { box: "size-4 rounded-[5px]", icon: "size-2.5" },
  md: { box: "size-[22px] rounded-[7px]", icon: "size-3.5" },
  option: { box: "size-8 rounded-[10px]", icon: "size-4" },
  lg: { box: "size-11 rounded-2xl", icon: "size-5" },
};

/** Ícone do módulo sobre a cor escolhida pelo usuário (ícone sempre em #141414). */
export function ModuleBadge({ module, size = "md", className }: { module: Module; size?: keyof typeof SIZES; className?: string }) {
  const Icon = MODULE_ICONS[module.icon];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center text-[#141414]", SIZES[size].box, className)}
      style={{ backgroundColor: MODULE_COLORS[module.color].hex }}
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
}

/** Ponto de cor do módulo, usado nas linhas de tarefa. */
export function ModuleDot({ module }: { module: Module }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: MODULE_COLORS[module.color].hex }}
    />
  );
}

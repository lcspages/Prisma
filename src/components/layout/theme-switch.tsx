"use client";

import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";
import { useTheme, type ThemeChoice } from "@/providers/theme-provider";
import { cn } from "@/lib/cn";

const OPTIONS: Array<{ value: ThemeChoice; label: string; icon: typeof LuSun }> = [
  { value: "light", label: "Claro", icon: LuSun },
  { value: "dark", label: "Escuro", icon: LuMoon },
  { value: "system", label: "Sistema", icon: LuMonitor },
];

/** Seletor de tema com três opções (barra lateral). */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="flex rounded-[10px] bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "grid h-7 flex-1 place-items-center rounded-lg transition-colors",
            theme === value ? "bg-surface text-ink shadow-pop" : "text-ink-3 hover:text-ink",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Botão único claro/escuro (barra superior e celular). */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const Icon = resolved === "dark" ? LuSun : LuMoon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      className={cn(
        "grid size-9 place-items-center rounded-[10px] text-ink-2 hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  );
}

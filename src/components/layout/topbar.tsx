"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LuPause, LuPlay, LuSearch } from "react-icons/lu";
import { pauseFocus, setPaletteOpen, startFocus, useAppStore } from "@/lib/store/app-store";
import { formatTimer } from "@/lib/dates";
import { useTick } from "@/lib/hooks/use-tick";
import { cn } from "@/lib/cn";
import { Kbd } from "@/components/ui/kbd";
import { Logo } from "./logo";
import { SyncIndicator } from "./sync-indicator";
import { ThemeToggleButton } from "./theme-switch";

function useModKey() {
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setMod("⌘");
  }, []);
  return mod;
}

/** Timer em andamento, visível em qualquer página fora da tela de foco. */
function FocusMini({ className }: { className?: string }) {
  const focus = useAppStore((s) => s.focus);
  const pathname = usePathname();
  const now = useTick(focus.status === "running");
  if (focus.status === "idle" || pathname === "/foco") return null;
  const remaining = focus.status === "running" && focus.endsAt ? (focus.endsAt - now) / 1000 : focus.remainingMs / 1000;
  const running = focus.status === "running";
  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-1 pr-3 text-primary-ink", className)}>
      <button
        type="button"
        onClick={running ? pauseFocus : startFocus}
        aria-label={running ? "Pausar timer" : "Continuar timer"}
        className="grid size-7 place-items-center rounded-full bg-primary text-on-primary"
      >
        {running ? <LuPause className="size-3.5" aria-hidden /> : <LuPlay className="size-3.5" aria-hidden />}
      </button>
      <Link href="/foco" className="tabular font-semibold">
        {formatTimer(remaining)}
        <span className="sr-only"> restantes. Abrir foco</span>
      </Link>
    </div>
  );
}

/** Barra superior do computador: busca/paleta, timer, status de salvamento e tema. */
export function Topbar() {
  const mod = useModKey();
  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center gap-4 bg-canvas/90 px-8 backdrop-blur md:flex">
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 w-full max-w-[420px] items-center gap-3 rounded-xl border border-line bg-surface px-3 text-ink-3 transition-colors hover:border-line-strong"
      >
        <LuSearch className="size-4" aria-hidden />
        <span className="flex-1 truncate text-left">Buscar, criar tarefa ou dar um comando</span>
        <span className="flex gap-1" aria-hidden>
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd>
        </span>
        <span className="sr-only">Atalho {mod} K</span>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <FocusMini />
        <SyncIndicator />
        <ThemeToggleButton />
      </div>
    </header>
  );
}

/** Barra superior do celular. */
export function MobileTopbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-canvas/90 px-4 backdrop-blur md:hidden">
      <Logo size={26} />
      <div className="ml-auto flex items-center gap-1">
        <FocusMini className="mr-1" />
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Buscar ou criar tarefa"
          className="grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <LuSearch className="size-[18px]" aria-hidden />
        </button>
        <ThemeToggleButton />
      </div>
    </header>
  );
}

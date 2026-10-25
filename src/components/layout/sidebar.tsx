"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { LuCirclePlay, LuPlus } from "react-icons/lu";
import { openModuleForm, useAppStore } from "@/lib/store/app-store";
import { toISODate } from "@/lib/dates";
import { habitsForDay } from "@/lib/selectors";
import { levelFromXp } from "@/features/gamification/lib/xp";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/page";
import { Logo } from "./logo";
import { ModuleBadge } from "./module-badge";
import { PRIMARY_NAV } from "./nav-items";
import { ThemeSwitch } from "./theme-switch";
import { LogoutButton } from "./logout-button";
import { LegalLinks } from "./legal-links";
import { pendingCount, useSocial } from "@/features/social/social-store";

export function Sidebar() {
  const pathname = usePathname();
  const data = useAppStore((s) => s.data);
  const social = useSocial((s) => s.data);

  const counts = useMemo(() => {
    const today = toISODate(new Date());
    const open = (data?.tasks ?? []).filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate <= today);
    const byModule = new Map<string, number>();
    (data?.tasks ?? [])
      .filter((t) => !t.completedAt)
      .forEach((t) => t.moduleId && byModule.set(t.moduleId, (byModule.get(t.moduleId) ?? 0) + 1));
    const habitsLeft = habitsForDay(data?.habits ?? [], today).filter((h) => !h.checks.includes(today)).length;
    const nav: Record<string, number> = {
      "/hoje": open.length,
      "/habitos": habitsLeft,
      "/tarefas": (data?.tasks ?? []).filter((t) => !t.completedAt).length,
      "/caixa-de-entrada": data?.inbox.length ?? 0,
      "/amigos": pendingCount(social),
    };
    return { nav, byModule };
  }, [data, social]);

  const level = data ? levelFromXp(data.profile.totalXp) : null;
  const modules = useMemo(() => [...(data?.modules ?? [])].sort((a, b) => a.position - b.position), [data?.modules]);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line md:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <nav aria-label="Principal" className="px-3">
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const count = counts.nav[href];
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-xl px-2.5 transition-colors",
                    active ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-[18px]", active ? "text-primary" : "text-ink-3")} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {typeof count === "number" && count > 0 && <span className="tabular text-meta text-ink-3">{count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="sidebar-modulos" className="mt-7 min-h-0 flex-1 overflow-y-auto px-3 scrollbar-thin">
        <div className="mb-1 flex items-center justify-between px-2.5">
          <Link
            id="sidebar-modulos"
            href="/modulos"
            className={cn("text-meta font-semibold hover:text-ink", pathname === "/modulos" ? "text-ink" : "text-ink-3")}
          >
            Módulos
          </Link>
          <button
            type="button"
            onClick={() => openModuleForm({})}
            aria-label="Criar módulo"
            className="grid size-6 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <LuPlus className="size-4" aria-hidden />
          </button>
        </div>

        {!data ? (
          <div className="space-y-2 px-2.5 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {modules.map((m) => {
              const href = `/modulos/${m.id}`;
              const active = pathname === href;
              const count = counts.byModule.get(m.id) ?? 0;
              return (
                <li key={m.id}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-3 rounded-xl px-2.5 transition-colors",
                      active ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
                    )}
                  >
                    <ModuleBadge module={m} />
                    <span className="flex-1 truncate">{m.name}</span>
                    {count > 0 && <span className="tabular text-meta text-ink-3">{count}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="space-y-3 border-t border-line p-3">
        <Link
          href="/tutoriais"
          aria-current={pathname === "/tutoriais" ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-3 rounded-xl px-2.5 transition-colors",
            pathname === "/tutoriais" ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
          )}
        >
          <LuCirclePlay className={cn("size-[18px]", pathname === "/tutoriais" ? "text-primary" : "text-ink-3")} aria-hidden />
          Tutoriais
        </Link>
        <Link
          href="/perfil"
          aria-label={`Perfil de ${data?.profile.displayName ?? ""}`}
          aria-current={pathname === "/perfil" ? "page" : undefined}
          className={cn("flex items-center gap-3 rounded-xl px-1.5 py-1 hover:bg-surface-2/70", pathname === "/perfil" && "bg-surface-2")}
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-body font-semibold text-on-accent"
          >
            {data?.profile.displayName.charAt(0) ?? ""}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-semibold">{data?.profile.displayName ?? "\u00a0"}</p>
            <p className="text-meta text-ink-3">{level ? `Nível ${level.level}` : "\u00a0"}</p>
            {level && (
              <ProgressBar
                value={level.current}
                max={level.needed}
                tone="accent"
                label={`Progresso para o nível ${level.level + 1}`}
                className="mt-1.5 h-1"
              />
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ThemeSwitch />
          </div>
          <LogoutButton />
        </div>
        <LegalLinks className="justify-start px-1" />
      </div>
    </aside>
  );
}

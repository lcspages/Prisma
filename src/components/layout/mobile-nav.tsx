"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuCalendarCheck,
  LuChevronRight,
  LuFolderTree,
  LuLayoutGrid,
  LuLightbulb,
  LuListChecks,
  LuPlus,
  LuSmartphone,
  LuTimer,
} from "react-icons/lu";
import { cn } from "@/lib/cn";
import { captureInbox, openEditor, openHabitForm, openModuleForm, useAppStore } from "@/lib/store/app-store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { openInstallGuide } from "@/features/install/install-guide";
import { MOBILE_MENU, MOBILE_NAV_LEFT, MOBILE_NAV_RIGHT, PROFILE_NAV, TUTORIALS_NAV, type NavItem } from "./nav-items";
import { ModuleBadge } from "./module-badge";
import { ThemeSwitch } from "./theme-switch";
import { LogoutButton } from "./logout-button";
import { LegalLinks } from "./legal-links";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function BarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] tracking-[-0.01em]", active ? "font-semibold text-ink" : "text-ink-2")}
      >
        <span className={cn("grid h-7 w-11 place-items-center rounded-full transition-colors", active && "bg-primary-soft")}>
          <Icon className={cn("size-5", active && "text-primary-ink")} aria-hidden />
        </span>
        {item.label}
      </Link>
    </li>
  );
}

/**
 * Navegação do celular: Hoje, Tarefas, Hábitos, Criar (no meio), Foco, Tutoriais e Menu.
 * O Menu mostra todas as partes do Prisma com nome e explicação.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const inBar = [...MOBILE_NAV_LEFT, ...MOBILE_NAV_RIGHT].some((i) => isActive(pathname, i.href));
  const menuActive = !inBar;

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-7">
          {MOBILE_NAV_LEFT.map((item) => (
            <BarLink key={item.href} item={item} pathname={pathname} />
          ))}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-haspopup="dialog"
              className="flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold text-ink"
            >
              <span className="-mt-6 grid size-12 place-items-center rounded-full bg-primary text-on-primary shadow-[0_8px_20px_-6px_rgba(41,152,255,0.7)] ring-4 ring-canvas">
                <LuPlus className="size-6" strokeWidth={2.5} aria-hidden />
              </span>
              Criar
            </button>
          </li>
          {MOBILE_NAV_RIGHT.map((item) => (
            <BarLink key={item.href} item={item} pathname={pathname} />
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              className={cn("flex h-16 w-full flex-col items-center justify-center gap-1 text-[10.5px] tracking-[-0.01em]", menuActive ? "font-semibold text-ink" : "text-ink-2")}
            >
              <span className={cn("grid h-7 w-11 place-items-center rounded-full transition-colors", menuActive && "bg-primary-soft")}>
                <LuLayoutGrid className={cn("size-5", menuActive && "text-primary-ink")} aria-hidden />
              </span>
              Menu
            </button>
          </li>
        </ul>
      </nav>

      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />
    </>
  );
}

/* ---------------------------------------------------------------- criar */

function CreateOption({
  icon: Icon,
  title,
  description,
  onClick,
  tone = "bg-surface-2 text-ink",
}: {
  icon: IconType;
  title: string;
  description: string;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left hover:bg-surface-2">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tone)}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{title}</span>
          <span className="block text-meta text-ink-2">{description}</span>
        </span>
        <LuChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
      </button>
    </li>
  );
}

function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [idea, setIdea] = useState<string | null>(null);
  const close = () => {
    setIdea(null);
    onClose();
  };
  // Fecha esta janela antes de abrir a próxima (só uma janela por vez).
  const then = (fn: () => void) => () => {
    close();
    requestAnimationFrame(fn);
  };

  return (
    <Modal open={open} onClose={close} title="Criar" description="O que você quer adicionar?" size="sm">
      {idea === null ? (
        <ul className="-mx-3 space-y-1">
          <CreateOption
            icon={LuListChecks}
            title="Tarefa"
            description="Com data, horário, módulo e passos"
            tone="bg-primary text-on-primary"
            onClick={then(() => openEditor({ taskId: null }))}
          />
          <CreateOption icon={LuCalendarCheck} title="Hábito" description="Algo para repetir e marcar todo dia" onClick={then(() => openHabitForm({}))} />
          <CreateOption icon={LuLightbulb} title="Ideia rápida" description="Anote agora e organize depois" onClick={() => setIdea("")} />
          <CreateOption icon={LuFolderTree} title="Módulo" description="Uma área da vida: faculdade, trabalho…" onClick={then(() => openModuleForm({}))} />
          <CreateOption icon={LuTimer} title="Sessão de foco" description="Abrir o timer de foco" onClick={then(() => router.push("/foco"))} />
        </ul>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!idea.trim()) return;
            captureInbox("idea", idea);
            close();
          }}
        >
          <label htmlFor="ideia-rapida" className="block text-meta font-semibold text-ink-2">
            Sua ideia
          </label>
          <Input id="ideia-rapida" data-autofocus autoFocus value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Ex.: ligar para o dentista" className="mt-1.5" />
          <p className="mt-2 text-meta text-ink-3">Fica guardada na Caixa de entrada, no Menu.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setIdea(null)}>
              Voltar
            </Button>
            <Button type="submit" variant="primary" className="ml-auto" disabled={!idea.trim()}>
              Guardar ideia
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------- menu */

function MenuSheet({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const modulesData = useAppStore((s) => s.data?.modules);
  const modules = useMemo(() => [...(modulesData ?? [])].sort((a, b) => a.position - b.position), [modulesData]);

  return (
    <Modal open={open} onClose={onClose} title="Menu" description="Todas as partes do Prisma." size="sm">
      <ul className="grid grid-cols-2 gap-2">
        {MOBILE_MENU.map(({ href, label, icon: Icon, description }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-3 transition-colors",
                  active ? "border-primary/50 bg-primary-soft" : "border-line bg-canvas hover:border-line-strong",
                )}
              >
                <span className={cn("grid size-9 place-items-center rounded-xl", active ? "bg-primary text-on-primary" : "bg-surface-2 text-ink")}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="mt-2 font-semibold leading-5 text-ink">{label}</span>
                <span className="mt-0.5 text-[12px] leading-4 text-ink-2">{description}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {modules.length > 0 && (
        <section aria-labelledby="menu-modulos" className="mt-6">
          <h3 id="menu-modulos" className="mb-2 text-meta font-semibold text-ink-2">
            Seus módulos
          </h3>
          <ul className="flex flex-wrap gap-2">
            {modules.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/modulos/${m.id}`}
                  onClick={onClose}
                  className="flex h-10 items-center gap-2 rounded-xl border border-line bg-canvas pl-1.5 pr-3 font-medium text-ink hover:border-line-strong"
                >
                  <ModuleBadge module={m} size="sm" />
                  <span className="max-w-[140px] truncate">{m.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="menu-conta" className="mt-6">
        <h3 id="menu-conta" className="mb-1 text-meta font-semibold text-ink-2">
          Conta e ajuda
        </h3>
        <ul className="-mx-3">
          {[PROFILE_NAV, TUTORIALS_NAV].map(({ href, label, icon: Icon, description }) => (
            <li key={href}>
              <Link href={href} onClick={onClose} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-2">
                <Icon className="size-5 shrink-0 text-ink-2" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{label}</span>
                  <span className="block text-meta text-ink-2">{description}</span>
                </span>
                <LuChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                onClose();
                requestAnimationFrame(openInstallGuide);
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2"
            >
              <LuSmartphone className="size-5 shrink-0 text-ink-2" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">Instalar no celular</span>
                <span className="block text-meta text-ink-2">Ícone na tela inicial, como um app</span>
              </span>
              <LuChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
            </button>
          </li>
        </ul>
      </section>

      <div className="mt-5">
        <p className="mb-2 text-meta font-semibold text-ink-2">Tema</p>
        <ThemeSwitch />
      </div>
      <LogoutButton withLabel className="mt-5" />
      <LegalLinks className="mt-4" />
    </Modal>
  );
}

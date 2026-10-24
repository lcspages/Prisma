"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LuEllipsis } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { MOBILE_MORE, MOBILE_NAV } from "./nav-items";
import { ThemeSwitch } from "./theme-switch";
import { LogoutButton } from "./logout-button";
import { LegalLinks } from "./legal-links";

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px]",
                    active ? "font-semibold text-ink" : "text-ink-3",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-primary")} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px]",
                moreActive ? "font-semibold text-ink" : "text-ink-3",
              )}
            >
              <LuEllipsis className={cn("size-5", moreActive && "text-primary")} aria-hidden />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais" size="sm">
        <ul className="space-y-1">
          {MOBILE_MORE.map(({ href, label, icon: Icon, description }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-surface-2"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{label}</span>
                  <span className="text-meta text-ink-3">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <p className="mb-2 text-meta font-semibold text-ink-2">Tema</p>
          <ThemeSwitch />
        </div>
        <LogoutButton withLabel className="mt-5" />
        <LegalLinks className="mt-4" />
      </Modal>
    </>
  );
}

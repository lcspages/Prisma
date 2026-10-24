"use client";

import { useEffect, useId, useRef } from "react";
import { LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** "dialog" centralizado; "sheet" lateral no computador e de baixo no celular */
  variant?: "dialog" | "sheet";
  size?: "sm" | "md" | "lg";
}

const FOCUSABLE = 'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Janela modal acessível: foca o primeiro campo, fecha com Esc ou clicando fora,
 * mantém o Tab dentro dela e devolve o foco ao elemento que a abriu.
 */
export function Modal({ open, onClose, title, description, children, footer, variant = "dialog", size = "md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Ordem: campo marcado com data-autofocus → primeiro controle do conteúdo → o próprio painel.
    const first =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(`[data-modal-body] :is(${FOCUSABLE})`) ??
      panel;
    requestAnimationFrame(() => first?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const sheet = variant === "sheet";

  return (
    <div className={cn("fixed inset-0 z-50 flex", sheet ? "items-end md:items-stretch md:justify-end" : "items-end justify-center sm:items-center sm:p-4")}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar"
        className="absolute inset-0 bg-[#141414]/40 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "palette-in relative flex max-h-[92dvh] w-full flex-col border border-line bg-surface shadow-modal outline-none",
          sheet
            ? "rounded-t-3xl md:h-dvh md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-3xl"
            : cn(
                "rounded-t-3xl sm:rounded-3xl",
                size === "sm" && "sm:max-w-[420px]",
                size === "md" && "sm:max-w-[540px]",
                size === "lg" && "sm:max-w-[720px]",
              ),
        )}
      >
        <header className="flex items-start gap-4 px-6 pb-2 pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-title font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description && <div className="mt-1 text-ink-2">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-xl text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <LuX className="size-5" aria-hidden />
          </button>
        </header>
        <div data-modal-body className="min-h-0 flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {children}
        </div>
        {footer && (
          <footer className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

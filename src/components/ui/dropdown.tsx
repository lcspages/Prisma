"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuChevronDown, LuSearch } from "react-icons/lu";
import { cn } from "@/lib/cn";

export interface DropdownOption {
  value: string;
  label: string;
  /** Ícone ou marcador à esquerda (ex.: cor do módulo). */
  icon?: React.ReactNode;
  /** Texto pequeno ao lado, como "50 min" ou "em Código". */
  hint?: string;
  /** Agrupa as opções sob um título. */
  group?: string;
}

interface DropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  /** Nome da lista para leitores de tela (quando não há label visível ligada pelo id). */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Lista de escolha com visual próprio: abre um painel flutuante com ícones,
 * grupos, busca (em listas longas) e navegação pelo teclado.
 * Funciona dentro de janelas modais porque o painel é desenhado fora delas.
 */
export function Dropdown({ id, value, onChange, options, placeholder = "Escolher", ariaLabel, disabled, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const searchable = options.length > 8;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const width = Math.min(Math.max(r.width, 240), vw - 16);
    const left = Math.min(Math.max(8, r.left), vw - width - 8);
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    if (below >= 260 || below >= above) setPos({ left, width, top: r.bottom + 6, maxHeight: Math.min(380, below) });
    else setPos({ left, width, bottom: vh - r.top + 6, maxHeight: Math.min(380, above) });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const i = visible.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    const onMove = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      place();
    };
    // Teclado tratado na captura: o Esc fecha só a lista, nunca a janela por trás.
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    else requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    // Rola só a lista (scrollIntoView rolaria também a janela por trás).
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !item) return;
    const top = item.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top - 6;
    else if (top + item.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + item.offsetHeight - list.clientHeight + 6;
  }, [active, open]);

  const close = (refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  };

  const pick = (v: string) => {
    onChange(v);
    close();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(visible.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (visible[active]) pick(visible[active].value);
    } else if (e.key === "Tab") {
      close(false);
    }
  };
  const keyRef = useRef(onKeyDown);
  keyRef.current = onKeyDown;

  let lastGroup: string | undefined;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel && !id ? ariaLabel : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2.5 rounded-xl border bg-canvas px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          open ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-line-strong",
          className,
        )}
      >
        {selected?.icon && <span className="flex shrink-0 items-center">{selected.icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", selected ? "text-ink" : "text-ink-3")}>{selected?.label ?? placeholder}</span>
        <LuChevronDown className={cn("size-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            tabIndex={-1}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            className="palette-in fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-modal outline-none"
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-line px-3">
                <LuSearch className="size-4 shrink-0 text-ink-3" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder="Buscar"
                  aria-label="Buscar na lista"
                  aria-controls={listId}
                  className="h-11 min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
                />
              </div>
            )}
            <ul ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto p-1.5 scrollbar-thin">
              {visible.length === 0 && <li className="px-3 py-6 text-center text-meta text-ink-3">Nada encontrado</li>}
              {visible.map((o, i) => {
                const header = o.group && o.group !== lastGroup ? o.group : null;
                lastGroup = o.group;
                const isSel = o.value === value;
                return (
                  <li key={o.value || "__empty"} role="presentation">
                    {header && (
                      <p className={cn("px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3", i > 0 ? "pt-3" : "pt-1.5")}>
                        {header}
                      </p>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      data-index={i}
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(o.value)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                        i === active ? "bg-surface-2" : "",
                        isSel ? "font-semibold text-ink" : "text-ink-2",
                      )}
                    >
                      {o.icon && <span className="flex shrink-0 items-center">{o.icon}</span>}
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {o.hint && <span className="tabular shrink-0 text-meta font-medium text-ink-3">{o.hint}</span>}
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full",
                          isSel ? "bg-primary text-on-primary" : "invisible",
                        )}
                      >
                        <LuCheck className="size-3" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

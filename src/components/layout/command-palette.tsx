"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuCalendarCheck,
  LuCornerDownLeft,
  LuFolderPlus,
  LuLightbulb,
  LuMoon,
  LuPlay,
  LuPlus,
  LuRotateCcw,
  LuSearch,
  LuSquareCheck,
  LuSquarePen,
} from "react-icons/lu";
import {
  askConfirm,
  captureInbox,
  configureFocus,
  createTask,
  openEditor,
  openHabitForm,
  openModuleForm,
  resetDemo,
  canResetDemo,
  setPaletteOpen,
  useAppStore,
} from "@/lib/store/app-store";
import { parseQuickAdd } from "@/features/tasks/lib/parse-quick-add";
import { MODULE_ICONS } from "@/features/modules/lib/appearance";
import { formatDuration, toISODate } from "@/lib/dates";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/cn";
import { Kbd } from "@/components/ui/kbd";
import { MODULES_NAV, PRIMARY_NAV, PROFILE_NAV, TUTORIALS_NAV } from "./nav-items";

interface Command {
  id: string;
  group: "Criar" | "Foco" | "Ir para" | "Módulos" | "Tarefas" | "Preferências";
  label: string;
  hint?: string;
  icon: IconType;
  keywords?: string;
  run: () => void;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Paleta de comandos (Ctrl/⌘ + K).
 * Texto livre vira tarefa: "Revisar integrais #faculdade @mat 14:00 45min".
 * Começar com "ideia:" guarda direto na caixa de entrada.
 */
export function CommandPalette() {
  const open = useAppStore((s) => s.ui.paletteOpen);
  const data = useAppStore((s) => s.data);
  const router = useRouter();
  const { resolved, toggle } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Limpa ao fechar (e não ao abrir), para não apagar o que já foi digitado.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    if (!data) return [];
    const close = () => setPaletteOpen(false);
    const go = (href: string) => () => {
      close();
      router.push(href);
    };
    const q = query.trim();
    const list: Command[] = [];

    if (/^ideia:/i.test(q) && q.length > 6) {
      const text = q.replace(/^ideia:\s*/i, "");
      list.push({
        id: "capture",
        group: "Criar",
        label: `Guardar ideia: ${text}`,
        hint: "Caixa de entrada",
        icon: LuLightbulb,
        run: () => {
          captureInbox("idea", text);
          close();
        },
      });
    } else if (q.length > 0) {
      const parsed = parseQuickAdd(q, data.modules);
      const module = data.modules.find((m) => m.id === parsed.moduleId);
      const hints = [
        module && `em ${module.name}`,
        parsed.time && `às ${parsed.time}`,
        parsed.estimateMin && formatDuration(parsed.estimateMin),
        ...parsed.tags.map((t) => `#${t}`),
      ].filter(Boolean);
      if (parsed.title) {
        list.push({
          id: "create",
          group: "Criar",
          label: `Criar tarefa “${parsed.title}”`,
          hint: hints.join(", "),
          icon: LuPlus,
          run: () => {
            createTask({
              title: parsed.title,
              moduleId: module?.id ?? null,
              tags: parsed.tags,
              scheduledTime: parsed.time,
              estimateMin: parsed.estimateMin,
              dueDate: toISODate(new Date()),
            });
            close();
          },
        });
      }
    }

    [25, 50, 90].forEach((min) =>
      list.push({
        id: `focus-${min}`,
        group: "Foco",
        label: `Iniciar foco de ${min} min`,
        icon: LuPlay,
        keywords: "timer pomodoro cronometro flow",
        run: () => {
          configureFocus({ durationMin: min, mode: "focus" });
          go("/foco")();
        },
      }),
    );

    list.push({
      id: "new-task-form",
      group: "Criar",
      label: "Nova tarefa com detalhes",
      icon: LuSquarePen,
      keywords: "criar adicionar",
      run: () => openEditor({ taskId: null }),
    });
    list.push({
      id: "new-habit",
      group: "Criar",
      label: "Novo hábito",
      icon: LuCalendarCheck,
      keywords: "criar habito rotina",
      run: () => openHabitForm({}),
    });
    list.push({
      id: "new-module",
      group: "Criar",
      label: "Novo módulo",
      icon: LuFolderPlus,
      keywords: "criar modulo area",
      run: () => openModuleForm({}),
    });

    [...PRIMARY_NAV, MODULES_NAV, TUTORIALS_NAV, PROFILE_NAV].forEach((item) =>
      list.push({
        id: `nav-${item.href}`,
        group: "Ir para",
        label: item.label,
        icon: item.icon,
        run: go(item.href),
      }),
    );

    data.modules.forEach((m) =>
      list.push({
        id: `mod-${m.id}`,
        group: "Módulos",
        label: m.name,
        icon: MODULE_ICONS[m.icon],
        keywords: "modulo",
        run: go(`/modulos/${m.id}`),
      }),
    );

    if (q.length > 1) {
      data.tasks
        .filter((t) => !t.completedAt && normalize(t.title).includes(normalize(q)))
        .slice(0, 5)
        .forEach((t) =>
          list.push({
            id: `task-${t.id}`,
            group: "Tarefas",
            label: t.title,
            hint: data.modules.find((m) => m.id === t.moduleId)?.name,
            icon: LuSquareCheck,
            run: () => openEditor({ taskId: t.id }),
          }),
        );
    }

    list.push({
      id: "theme",
      group: "Preferências",
      label: resolved === "dark" ? "Usar tema claro" : "Usar tema escuro",
      icon: LuMoon,
      keywords: "tema dark mode escuro claro",
      run: () => {
        toggle();
        close();
      },
    });

    if (canResetDemo) list.push({
      id: "reset-demo",
      group: "Preferências",
      label: "Restaurar dados de exemplo",
      icon: LuRotateCcw,
      keywords: "resetar demo exemplo apagar",
      run: () => {
        close();
        askConfirm({
          title: "Restaurar dados de exemplo?",
          body: "Tudo o que você criou ou mudou no modo de demonstração será substituído.",
          actionLabel: "Restaurar",
          onConfirm: () => void resetDemo(),
        });
      },
    });

    const order: Command["group"][] = ["Criar", "Tarefas", "Foco", "Ir para", "Módulos", "Preferências"];
    const sorted = (items: Command[]) =>
      items
        .map((c, i) => ({ c, i }))
        .sort((a, b) => order.indexOf(a.c.group) - order.indexOf(b.c.group) || a.i - b.i)
        .map(({ c }) => c);

    if (!q) return sorted(list.filter((c) => c.group !== "Módulos" && c.id !== "reset-demo"));

    const nq = normalize(q);
    const matches = sorted(
      list.filter(
        (c) =>
          c.id === "create" ||
          c.id === "capture" ||
          c.group === "Tarefas" ||
          normalize(`${c.label} ${c.keywords ?? ""}`).includes(nq),
      ),
    );
    // Se o texto é o começo de um comando ("matriz", "foco 50"), o comando vem antes de "Criar tarefa".
    const exact = matches.filter((c) => c.group !== "Criar" && c.group !== "Tarefas" && normalize(c.label).startsWith(nq));
    return exact.length ? [...exact, ...matches.filter((c) => !exact.includes(c))] : matches;
  }, [data, query, resolved, router, toggle]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commands[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPaletteOpen(false);
    }
  };

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
      <button
        type="button"
        aria-label="Fechar paleta de comandos"
        className="absolute inset-0 bg-[#141414]/40 backdrop-blur-[2px] dark:bg-black/60"
        onClick={() => setPaletteOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="palette-in relative w-full max-w-[580px] overflow-hidden rounded-2xl border border-line bg-surface shadow-modal"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <LuSearch className="size-[18px] text-ink-3" aria-hidden />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite uma tarefa, um comando ou “ideia: …”"
            className="h-14 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-ink-3"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={commands[active] ? `${listId}-${commands[active].id}` : undefined}
          />
          <Kbd>Esc</Kbd>
        </div>

        <ul id={listId} role="listbox" className="max-h-[min(420px,55vh)] overflow-y-auto p-2 scrollbar-thin">
          {commands.length === 0 && (
            <li className="px-3 py-6 text-center text-ink-3">Nenhum comando encontrado.</li>
          )}
          {commands.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            const Icon = c.icon;
            return (
              <li key={c.id} role="presentation">
                {showGroup && (
                  <p className="px-3 pb-1 pt-3 text-meta font-semibold text-ink-3 first:pt-1">{c.group}</p>
                )}
                <div
                  id={`${listId}-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => c.run()}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-3 rounded-[10px] px-3",
                    i === active ? "bg-surface-2 text-ink" : "text-ink-2",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", i === active ? "text-primary" : "text-ink-3")} aria-hidden />
                  <span className="truncate">{c.label}</span>
                  {c.hint && <span className="ml-auto truncate pl-3 text-meta text-ink-3">{c.hint}</span>}
                  {i === active && !c.hint && (
                    <LuCornerDownLeft className="ml-auto size-3.5 text-ink-3" aria-hidden />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-meta text-ink-3 sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> executar
          </span>
          <span className="ml-auto">
            Use <span className="text-ink-2">#tag</span>, <span className="text-ink-2">@módulo</span> e{" "}
            <span className="text-ink-2">14:00</span> ao criar
          </span>
        </div>
      </div>
    </div>
  );
}

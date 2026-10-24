"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuCalendar,
  LuCalendarClock,
  LuChevronDown,
  LuClock,
  LuFlame,
  LuMoon,
  LuPlay,
  LuPlus,
  LuSlidersHorizontal,
  LuTrash2,
  LuX,
  LuZap,
} from "react-icons/lu";
import type { Quadrant, Task } from "@/types/domain";
import {
  blankTask,
  closeEditor,
  configureFocus,
  deleteInbox,
  deleteTask,
  saveTask,
  useAppStore,
} from "@/lib/store/app-store";
import { addDaysISO, formatShortDate, parseISODate, toISODate, WEEKDAY_SHORT } from "@/lib/dates";
import { newId } from "@/lib/id";
import { cn } from "@/lib/cn";
import { quadrantOf } from "@/features/tasks/lib/quadrant";
import { buildRecurrence, kindOf, ruleDays, type RecurrenceKind } from "@/features/tasks/lib/recurrence";
import { Button, buttonClass } from "@/components/ui/button";
import { Chip, Field, Input, Textarea } from "@/components/ui/field";
import { Dropdown } from "@/components/ui/dropdown";
import { ModuleBadge, ModuleDot } from "@/components/layout/module-badge";
import { Modal } from "@/components/ui/modal";
import { TaskCheck } from "@/components/ui/task-check";

const DURATIONS = [10, 15, 20, 25, 30, 45, 60, 90, 120, 180];

/** As 4 prioridades da Matriz, com as mesmas palavras de lá. */
const PRIORITIES: Array<{ id: Quadrant; title: string; hint: string; urgent: boolean; important: boolean; icon: IconType }> = [
  { id: "do", title: "Fazer agora", hint: "Urgente e importante", urgent: true, important: true, icon: LuFlame },
  { id: "schedule", title: "Agendar", hint: "Importante, sem pressa", urgent: false, important: true, icon: LuCalendarClock },
  { id: "delegate", title: "Resolver rápido", hint: "Urgente, pouco impacto", urgent: true, important: false, icon: LuZap },
  { id: "eliminate", title: "Deixar para depois", hint: "Sem pressa e pouco impacto", urgent: false, important: false, icon: LuMoon },
];

const REPEATS: Array<{ id: RecurrenceKind; label: string }> = [
  { id: "none", label: "Não repete" },
  { id: "daily", label: "Todo dia" },
  { id: "weekdays", label: "Dias úteis" },
  { id: "weekly", label: "Escolher dias" },
];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Painel de criar/editar tarefa, aberto de qualquer lugar do app. */
export function TaskEditor() {
  const request = useAppStore((s) => s.ui.editor);
  const data = useAppStore((s) => s.data);
  if (!request || !data) return null;
  const existing = request.taskId ? data.tasks.find((t) => t.id === request.taskId) : undefined;
  if (request.taskId && !existing) return null;
  return (
    <EditorForm
      key={request.taskId ?? "new"}
      initial={existing ?? blankTask(request.defaults)}
      isNew={!existing}
      fromInboxId={request.fromInboxId}
    />
  );
}

function EditorForm({ initial, isNew, fromInboxId }: { initial: Task; isNew: boolean; fromInboxId?: string }) {
  const data = useAppStore((s) => s.data)!;
  const [draft, setDraft] = useState<Task>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.map((t) => `#${t}`).join(" "));
  const [newStep, setNewStep] = useState("");
  const [pickingDate, setPickingDate] = useState(false);
  const [more, setMore] = useState(Boolean(initial.recurrence || initial.blockedById || initial.tags.length || initial.notes?.trim()));
  const ids = { title: useId(), time: useId(), dur: useId(), tags: useId(), dep: useId(), notes: useId(), step: useId() };

  // Se a tarefa for alterada por fora (ex.: concluída pelo card), mantém o rascunho em dia.
  useEffect(() => {
    if (!isNew) setDraft((d) => ({ ...d, completedAt: initial.completedAt }));
  }, [initial.completedAt, isNew]);

  const set = (patch: Partial<Task>) => setDraft((d) => ({ ...d, ...patch }));
  const today = toISODate(new Date());

  /** Tarefas que podem bloquear esta (sem criar ciclo). */
  const dependencyOptions = useMemo(() => {
    const dependsOnMe = (candidateId: string): boolean => {
      let cursor = data.tasks.find((t) => t.id === candidateId);
      const seen = new Set<string>();
      while (cursor?.blockedById && !seen.has(cursor.id)) {
        if (cursor.blockedById === draft.id) return true;
        seen.add(cursor.id);
        cursor = data.tasks.find((t) => t.id === cursor!.blockedById);
      }
      return false;
    };
    return data.tasks.filter((t) => t.id !== draft.id && !t.completedAt && !dependsOnMe(t.id));
  }, [data.tasks, draft.id]);

  const recKind = kindOf(draft.recurrence);
  const recDays = draft.recurrence ? ruleDays(draft.recurrence.rule) : [];
  const defaultDay = parseISODate(draft.dueDate ?? today).getDay();

  const setRecurrence = (kind: RecurrenceKind) => {
    const streak = draft.recurrence?.streak ?? 0;
    if (kind === "none") set({ recurrence: null });
    if (kind === "daily") set({ recurrence: buildRecurrence([0, 1, 2, 3, 4, 5, 6], streak) });
    if (kind === "weekdays") set({ recurrence: buildRecurrence([1, 2, 3, 4, 5], streak) });
    if (kind === "weekly") set({ recurrence: buildRecurrence([defaultDay], streak) });
  };

  const toggleDay = (day: number) => {
    const next = recDays.includes(day) ? recDays.filter((d) => d !== day) : [...recDays, day];
    set({ recurrence: buildRecurrence(next.length ? next : [day], draft.recurrence?.streak ?? 0) });
  };

  const parseTags = (text: string) =>
    [...new Set(text.split(/[\s,]+/).map((t) => t.replace(/^#/, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).filter((t) => /^[a-z0-9_-]+$/.test(t)))];

  const addStep = () => {
    const title = newStep.trim();
    if (!title) return;
    set({ subtasks: [...draft.subtasks, { id: newId(), title, done: false }] });
    setNewStep("");
  };

  const submit = () => {
    if (!draft.title.trim()) return;
    const task = { ...draft, tags: parseTags(tagsText) };
    // Se a data foi para depois de hoje vindo de hoje/atrasada, conta como adiada.
    if (!isNew && initial.dueDate && task.dueDate && initial.dueDate <= today && task.dueDate > initial.dueDate) {
      task.postponedCount = initial.postponedCount + 1;
    }
    saveTask(task, { isNew });
    if (fromInboxId) deleteInbox(fromInboxId, { silent: true });
    closeEditor();
  };

  const quadrant = quadrantOf(draft);
  const tagCount = parseTags(tagsText).length;
  const moreSummary = [
    draft.recurrence ? REPEATS.find((r) => r.id === recKind)?.label : null,
    draft.blockedById ? "depende de outra" : null,
    tagCount ? `${tagCount} ${tagCount === 1 ? "tag" : "tags"}` : null,
    draft.notes?.trim() ? "notas" : null,
  ]
    .filter(Boolean)
    .join(", ") || "repetir, tags, notas";
  const dateChoice = draft.dueDate === today ? "today" : draft.dueDate === addDaysISO(today, 1) ? "tomorrow" : draft.dueDate === null ? "none" : "other";

  return (
    <Modal
      open
      onClose={closeEditor}
      variant="sheet"
      title={isNew ? "Nova tarefa" : "Editar tarefa"}
      footer={
        <>
          {!isNew && (
            <Button
              variant="ghost"
              onClick={() => {
                closeEditor();
                deleteTask(draft.id);
              }}
            >
              <LuTrash2 className="size-4" aria-hidden />
              Excluir
            </Button>
          )}
          {!isNew && !draft.completedAt && (
            <Link
              href="/foco"
              onClick={() => {
                configureFocus({ taskId: draft.id });
                closeEditor();
              }}
              className={buttonClass("ghost")}
            >
              <LuPlay className="size-4" aria-hidden />
              Focar
            </Link>
          )}
          <div className="ml-auto flex gap-2">
            <Button onClick={closeEditor}>Cancelar</Button>
            <Button variant="primary" onClick={submit} disabled={!draft.title.trim()}>
              {isNew ? "Criar tarefa" : "Salvar"}
            </Button>
          </div>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label htmlFor={ids.title} className="sr-only">
            Título
          </label>
          <input
            id={ids.title}
            data-autofocus
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="O que precisa ser feito?"
            className="w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-lead font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink-3 focus:border-primary"
          />
        </div>

        <Section title="Módulo">
          <Dropdown
            ariaLabel="Módulo"
            value={draft.moduleId ?? ""}
            onChange={(v) => set({ moduleId: v || null, folderId: null })}
            options={[
              { value: "", label: "Sem módulo", icon: <NoModuleIcon /> },
              ...data.modules.map((m) => ({ value: m.id, label: m.name, icon: <ModuleBadge module={m} /> })),
            ]}
          />
        </Section>

        <Section title="Quando">
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={dateChoice === "today" && !pickingDate}
              onClick={() => {
                setPickingDate(false);
                set({ dueDate: today });
              }}
            >
              Hoje
            </Chip>
            <Chip
              selected={dateChoice === "tomorrow" && !pickingDate}
              onClick={() => {
                setPickingDate(false);
                set({ dueDate: addDaysISO(today, 1) });
              }}
            >
              Amanhã
            </Chip>
            <Chip selected={dateChoice === "other" || pickingDate} onClick={() => setPickingDate(true)}>
              <LuCalendar className="size-3.5" aria-hidden />
              {dateChoice === "other" && draft.dueDate ? formatShortDate(parseISODate(draft.dueDate)) : "Outro dia"}
            </Chip>
            <Chip
              selected={dateChoice === "none"}
              onClick={() => {
                setPickingDate(false);
                set({ dueDate: null, scheduledTime: null });
              }}
            >
              Sem data
            </Chip>
          </div>
          {(pickingDate || dateChoice === "other") && (
            <Input
              aria-label="Data"
              type="date"
              value={draft.dueDate ?? ""}
              onChange={(e) => set({ dueDate: e.target.value || null })}
              className="mt-2.5 sm:max-w-[220px]"
            />
          )}
          {draft.dueDate && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={ids.time} className="mb-1.5 block text-meta text-ink-2">
                  Horário <span className="text-ink-3">(opcional)</span>
                </label>
                <div className="flex gap-1.5">
                  <Input id={ids.time} type="time" value={draft.scheduledTime ?? ""} onChange={(e) => set({ scheduledTime: e.target.value || null })} />
                  {draft.scheduledTime && (
                    <Button variant="ghost" className="px-2.5" onClick={() => set({ scheduledTime: null })} aria-label="Remover horário">
                      <LuX className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor={ids.dur} className="mb-1.5 block text-meta text-ink-2">
                  Quanto tempo leva
                </label>
                <Dropdown
                  id={ids.dur}
                  ariaLabel="Duração"
                  value={draft.estimateMin ? String(draft.estimateMin) : ""}
                  onChange={(v) => set({ estimateMin: v ? Number(v) : null })}
                  options={[
                    { value: "", label: "Não sei" },
                    ...[...new Set([...DURATIONS, ...(draft.estimateMin ? [draft.estimateMin] : [])])]
                      .sort((a, b) => a - b)
                      .map((d) => ({ value: String(d), label: durationLabel(d), icon: <LuClock className="size-4 text-ink-3" /> })),
                  ]}
                />
              </div>
            </div>
          )}
        </Section>

        <Section title="Prioridade" aside="define o quadro na Matriz">
          <div role="radiogroup" aria-label="Prioridade" className="grid grid-cols-2 gap-2">
            {PRIORITIES.map((p) => {
              const selected = quadrant === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => set({ urgent: p.urgent, important: p.important })}
                  className={cn(
                    "flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", selected ? "bg-primary text-on-primary" : "bg-surface-2 text-ink-2")}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block leading-tight", selected ? "font-semibold text-ink" : "text-ink")}>{p.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-ink-3">{p.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title="Passos"
          aside={draft.subtasks.length > 0 ? `${draft.subtasks.filter((s) => s.done).length} de ${draft.subtasks.length}` : "opcional"}
        >
          {draft.subtasks.length > 0 && (
            <ul className="mb-2 space-y-1">
              {draft.subtasks.map((s) => (
                <li key={s.id} className="group flex items-center gap-2.5 rounded-xl px-1 py-1 hover:bg-surface-2">
                  <TaskCheck
                    size="sm"
                    shape="square"
                    checked={s.done}
                    label={s.title}
                    onToggle={() => set({ subtasks: draft.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
                  />
                  <input
                    value={s.title}
                    aria-label="Título do passo"
                    onChange={(e) =>
                      set({ subtasks: draft.subtasks.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)) })
                    }
                    className={cn("min-w-0 flex-1 bg-transparent outline-none", s.done && "text-ink-3 line-through")}
                  />
                  <button
                    type="button"
                    onClick={() => set({ subtasks: draft.subtasks.filter((x) => x.id !== s.id) })}
                    aria-label={`Remover ${s.title}`}
                    className="grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-surface-3 hover:text-ink"
                  >
                    <LuX className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <label htmlFor={ids.step} className="sr-only">
              Novo passo
            </label>
            <Input
              id={ids.step}
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addStep();
                }
              }}
              placeholder="Dividir em um passo menor"
            />
            <Button onClick={addStep} aria-label="Adicionar passo" disabled={!newStep.trim()}>
              <LuPlus className="size-4" aria-hidden />
            </Button>
          </div>
        </Section>

        <div className="rounded-2xl border border-line">
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left"
          >
            <LuSlidersHorizontal className="size-4 text-ink-3" aria-hidden />
            <span className="flex-1 font-semibold text-ink">Mais opções</span>
            <span className="truncate text-meta text-ink-3">{moreSummary}</span>
            <LuChevronDown className={cn("size-4 shrink-0 text-ink-3 transition-transform", more && "rotate-180")} aria-hidden />
          </button>
          {more && (
            <div className="space-y-5 border-t border-line px-4 pb-4 pt-4">
              <div>
                <p className="mb-2 text-meta font-semibold text-ink-2">Repetir</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Repetir">
                  {REPEATS.map((r) => (
                    <Chip key={r.id} selected={recKind === r.id} onClick={() => setRecurrence(r.id)}>
                      {r.label}
                    </Chip>
                  ))}
                </div>
                {recKind === "weekly" && (
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
                    {WEEK_ORDER.map((d) => (
                      <Chip key={d} selected={recDays.includes(d)} onClick={() => toggleDay(d)} className="w-12 justify-center px-0">
                        {WEEKDAY_SHORT[d]}
                      </Chip>
                    ))}
                  </div>
                )}
                {draft.recurrence && draft.recurrence.streak > 0 && (
                  <p className="mt-1.5 text-meta text-ink-3">{draft.recurrence.streak} vezes seguidas até agora</p>
                )}
              </div>

              <Field label="Só começa depois de" htmlFor={ids.dep} hint="Fica bloqueada até essa outra tarefa ser concluída">
                <Dropdown
                  id={ids.dep}
                  ariaLabel="Depende de"
                  value={draft.blockedById ?? ""}
                  onChange={(v) => set({ blockedById: v || null })}
                  options={[
                    { value: "", label: "Nenhuma tarefa" },
                    ...dependencyOptions.map((t) => {
                      const m = data.modules.find((x) => x.id === t.moduleId);
                      return { value: t.id, label: t.title, icon: m ? <ModuleDot module={m} /> : undefined, group: m?.name };
                    }).sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "", "pt-BR")),
                  ]}
                />
              </Field>

              <Field label="Tags" htmlFor={ids.tags} hint="Separe por espaço. Ex.: #faculdade #prova">
                <Input id={ids.tags} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="#faculdade" />
              </Field>

              <Field label="Notas" htmlFor={ids.notes}>
                <Textarea
                  id={ids.notes}
                  value={draft.notes ?? ""}
                  onChange={(e) => set({ notes: e.target.value })}
                  placeholder="Links, detalhes, o que lembrar"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Enviar com Enter no título */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-meta font-semibold text-ink-2">{title}</h3>
        {aside && <span className="text-[11px] text-ink-3">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function NoModuleIcon() {
  return <span aria-hidden className="block size-[22px] rounded-[7px] border border-dashed border-line-strong" />;
}

function durationLabel(d: number) {
  return d < 60 ? `${d} min` : d % 60 === 0 ? `${d / 60} h` : `${Math.floor(d / 60)} h ${d % 60} min`;
}

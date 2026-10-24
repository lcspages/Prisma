"use client";

import { useId, useMemo, useState } from "react";
import { LuChevronDown, LuMinus, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import type { Goal, ID, Note, Workspace } from "@/types/domain";
import { deleteGoal, deleteNote, openEditor, saveGoal, saveNote } from "@/lib/store/app-store";
import { formatShortDate, parseISODate, toISODate } from "@/lib/dates";
import { newId } from "@/lib/id";
import { byDueDate, isBlocked } from "@/lib/selectors";
import { cn } from "@/lib/cn";
import { TaskRow } from "@/features/tasks/components/task-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ProgressBar } from "@/components/ui/page";

interface ModuleScopeProps {
  data: Workspace;
  moduleId: ID;
  moduleName: string;
}

/* ---------------------------------------------------------------- tarefas */

export function ModuleTasks({ data, moduleId, moduleName }: ModuleScopeProps) {
  const [showDone, setShowDone] = useState(false);
  const today = toISODate(new Date());
  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks]);
  const module = data.modules.find((m) => m.id === moduleId);

  const tasks = data.tasks.filter((t) => t.moduleId === moduleId);
  const open = tasks.filter((t) => !t.completedAt).sort(byDueDate(today));
  const done = tasks.filter((t) => t.completedAt).sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => openEditor({ taskId: null, defaults: { moduleId } })}>
          <LuPlus className="size-4" aria-hidden />
          Nova tarefa
        </Button>
        <p className="text-meta text-ink-3">Nome, data, prioridade e passos, tudo na mesma janela.</p>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState className="mt-6" title={`Nenhuma tarefa em ${moduleName}`} body="Toque em Nova tarefa para criar a primeira." />
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-surface p-1.5">
          {open.length === 0 && <li className="px-3 py-4 text-ink-2">Tudo em dia por aqui.</li>}
          {open.map((t) => (
            <TaskRow key={t.id} task={t} module={module} today={today} blocked={isBlocked(t, byId)} showModule={false} actions />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <LuChevronDown className={cn("size-4 transition-transform", !showDone && "-rotate-90")} aria-hidden />
            {done.length === 1 ? "1 concluída" : `${done.length} concluídas`}
          </Button>
          {showDone && (
            <ul className="mt-1">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} module={module} today={today} showModule={false} actions />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- anotações */

export function ModuleNotes({ data, moduleId }: ModuleScopeProps) {
  const [editing, setEditing] = useState<Note | null>(null);
  const notes = data.notes.filter((n) => n.moduleId === moduleId).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            setEditing({ id: newId(), moduleId, folderId: null, title: "", body: "", updatedAt: new Date().toISOString() })
          }
          className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong text-ink-2 transition-colors hover:border-primary hover:text-ink"
        >
          <LuPlus className="size-5" aria-hidden />
          Nova anotação
        </button>
        {notes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setEditing(n)}
            className="flex min-h-[140px] flex-col rounded-3xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong"
          >
            <span className="line-clamp-1 font-semibold text-ink">{n.title || "Sem título"}</span>
            <span className="mt-1.5 line-clamp-3 whitespace-pre-line text-meta leading-5 text-ink-2">{n.body}</span>
            <span className="mt-auto pt-3 text-[11px] text-ink-3">
              {formatShortDate(new Date(n.updatedAt))}
            </span>
          </button>
        ))}
      </div>
      {editing && (
        <NoteEditor
          note={editing}
          isNew={!data.notes.some((n) => n.id === editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function NoteEditor({ note, isNew, onClose }: { note: Note; isNew: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(note);
  const ids = { title: useId(), body: useId() };
  const canSave = Boolean(draft.title.trim() || draft.body.trim());
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? "Nova anotação" : "Anotação"}
      footer={
        <>
          {!isNew && (
            <Button
              variant="ghost"
              onClick={() => {
                deleteNote(note.id);
                onClose();
              }}
            >
              <LuTrash2 className="size-4" aria-hidden />
              Excluir
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={() => {
                saveNote({ ...draft, title: draft.title.trim() || draft.body.trim().split("\n")[0].slice(0, 60) });
                onClose();
              }}
            >
              Salvar
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título" htmlFor={ids.title}>
          <Input id={ids.title} data-autofocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </Field>
        <Field label="Texto" htmlFor={ids.body}>
          <Textarea id={ids.body} rows={12} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- metas */

export function ModuleGoals({ data, moduleId }: ModuleScopeProps) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const goals = data.goals.filter((g) => g.moduleId === moduleId);

  return (
    <div>
      <Button
        onClick={() =>
          setEditing({ id: newId(), moduleId, folderId: null, title: "", current: 0, target: 10, unit: "", dueDate: null })
        }
      >
        <LuPlus className="size-4" aria-hidden />
        Nova meta
      </Button>
      {goals.length === 0 ? (
        <EmptyState className="mt-5" title="Nenhuma meta aqui" body="Metas medem progresso: listas resolvidas, clientes, quilos no supino." />
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {goals.map((g) => {
            const done = g.current >= g.target;
            return (
              <li key={g.id} className={cn("rounded-3xl border bg-surface p-5", done ? "border-primary/50" : "border-line")}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{g.title}</p>
                    <p className="mt-0.5 text-meta text-ink-2">
                      {done ? "Meta batida" : `Faltam ${g.target - g.current} ${g.unit}`.trim()}
                      {g.dueDate && `, até ${formatShortDate(parseISODate(g.dueDate))}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(g)}
                    aria-label={`Editar ${g.title}`}
                    className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                  >
                    <LuPencil className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveGoal({ ...g, current: Math.max(0, g.current - 1) })}
                    aria-label={`Diminuir ${g.title}`}
                    className="grid size-9 place-items-center rounded-xl border border-line text-ink-2 hover:border-line-strong hover:text-ink"
                  >
                    <LuMinus className="size-4" aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="tabular text-center font-semibold text-ink">
                      {g.current} <span className="font-medium text-ink-3">/ {g.target} {g.unit}</span>
                    </p>
                    <ProgressBar value={g.current} max={g.target} label={g.title} className="mt-1.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => saveGoal({ ...g, current: g.current + 1 })}
                    aria-label={`Aumentar ${g.title}`}
                    className="grid size-9 place-items-center rounded-xl bg-primary text-on-primary hover:opacity-90"
                  >
                    <LuPlus className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <GoalEditor
          goal={editing}
          isNew={!data.goals.some((g) => g.id === editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function GoalEditor({ goal, isNew, onClose }: { goal: Goal; isNew: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(goal);
  const ids = { title: useId(), current: useId(), target: useId(), unit: useId(), due: useId() };
  const valid = draft.title.trim() && draft.target > 0 && draft.current >= 0;
  const num = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Nova meta" : "Editar meta"}
      footer={
        <>
          {!isNew && (
            <Button
              variant="ghost"
              onClick={() => {
                deleteGoal(goal.id);
                onClose();
              }}
            >
              <LuTrash2 className="size-4" aria-hidden />
              Excluir
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onClick={() => {
                saveGoal({ ...draft, title: draft.title.trim(), unit: draft.unit.trim() });
                onClose();
              }}
            >
              Salvar
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="O que você quer alcançar" htmlFor={ids.title}>
          <Input id={ids.title} data-autofocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Listas resolvidas" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Atual" htmlFor={ids.current}>
            <Input id={ids.current} type="number" min={0} step="any" value={draft.current} onChange={(e) => setDraft({ ...draft, current: num(e.target.value) })} />
          </Field>
          <Field label="Meta" htmlFor={ids.target}>
            <Input id={ids.target} type="number" min={0} step="any" value={draft.target} onChange={(e) => setDraft({ ...draft, target: num(e.target.value) })} />
          </Field>
          <Field label="Unidade" htmlFor={ids.unit}>
            <Input id={ids.unit} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="kg, listas" />
          </Field>
        </div>
        <Field label="Prazo" htmlFor={ids.due}>
          <Input id={ids.due} type="date" value={draft.dueDate ?? ""} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })} />
        </Field>
      </div>
    </Modal>
  );
}


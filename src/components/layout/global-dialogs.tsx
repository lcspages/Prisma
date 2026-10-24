"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { addSubtasks, closeConfirm, openBreakdown, openModuleForm, useAppStore } from "@/lib/store/app-store";
import { useNow } from "@/lib/hooks/use-now";
import { isReviewTime, summarizeWeek, weekKey, WeeklyReview } from "@/features/reports/components/weekly-review";
import { TaskEditor } from "@/features/tasks/components/task-editor";
import { ModuleForm } from "@/features/modules/components/module-form";
import { HabitFormHost } from "@/features/habits/components/habit-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

const REVIEW_KEY = "prisma:review-seen";

function readKey(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeKey(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento */
  }
}

/** Todas as janelas globais: editor de tarefa, confirmação, quebrar em passos e avisos automáticos. */
export function GlobalDialogs() {
  return (
    <>
      <TaskEditor />
      <ModuleFormHost />
      <HabitFormHost />
      <ConfirmDialog />
      <BreakdownDialog />
      <AutoModals />
    </>
  );
}

function ModuleFormHost() {
  const request = useAppStore((s) => s.ui.moduleForm);
  const module = useAppStore((s) => (request?.moduleId ? s.data?.modules.find((m) => m.id === request.moduleId) : undefined));
  const router = useRouter();
  if (!request || (request.moduleId && !module)) return null;
  return (
    <ModuleForm
      key={request.moduleId ?? "new"}
      module={module}
      onClose={() => openModuleForm(null)}
      onCreated={(id) => router.push(`/modulos/${id}`)}
    />
  );
}

function ConfirmDialog() {
  const request = useAppStore((s) => s.ui.confirm);
  if (!request) return null;
  return (
    <Modal
      open
      size="sm"
      onClose={closeConfirm}
      title={request.title}
      description={request.body}
      footer={
        <div className="ml-auto flex gap-2">
          <Button onClick={closeConfirm}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              request.onConfirm();
              closeConfirm();
            }}
          >
            {request.actionLabel}
          </Button>
        </div>
      }
    >
      {null}
    </Modal>
  );
}

function BreakdownDialog() {
  const taskId = useAppStore((s) => s.ui.breakdownTaskId);
  const task = useAppStore((s) => s.data?.tasks.find((t) => t.id === taskId) ?? null);
  const [text, setText] = useState("");
  const id = useId();
  useEffect(() => setText(""), [taskId]);
  if (!task) return null;
  const lines = text.split("\n").filter((l) => l.trim());
  const close = () => openBreakdown(null);
  return (
    <Modal
      open
      onClose={close}
      title="Quebrar em passos"
      description={task.title}
      footer={
        <div className="ml-auto flex gap-2">
          <Button onClick={close}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={lines.length === 0}
            onClick={() => {
              addSubtasks(task.id, lines);
              close();
            }}
          >
            {lines.length > 1 ? `Adicionar ${lines.length} passos` : "Adicionar passo"}
          </Button>
        </div>
      }
    >
      {task.subtasks.length > 0 && (
        <div className="mb-4">
          <p className="text-meta font-semibold text-ink-2">Passos atuais</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-2 marker:text-ink-3">
            {task.subtasks.map((s) => (
              <li key={s.id} className={s.done ? "line-through" : undefined}>
                {s.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      <label htmlFor={id} className="text-meta font-semibold text-ink-2">
        Novos passos, um por linha
      </label>
      <Textarea
        id={id}
        data-autofocus
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Abrir o arquivo e listar o que falta\nFazer só a primeira parte\nRevisar"}
        className="mt-1.5"
      />
      <p className="mt-2 text-meta text-ink-3">Passos pequenos o bastante para começar em 10 minutos funcionam melhor.</p>
    </Modal>
  );
}

/** Revisão semanal (fim de semana). */
function AutoModals() {
  const data = useAppStore((s) => s.data);
  const otherOpen = useAppStore((s) => Boolean(s.ui.editor || s.ui.breakdownTaskId || s.ui.confirm || s.ui.moduleForm || s.ui.habitForm || s.ui.paletteOpen));
  const now = useNow();
  const [closed, setClosed] = useState(false);

  const summary = useMemo(() => (data && now ? summarizeWeek(data, now) : null), [data, now]);

  if (!data || !now || !summary || otherOpen) return null;

  const showReview =
    !closed && isReviewTime(now) && readKey(REVIEW_KEY) !== weekKey(now) && (summary.completed > 0 || summary.postponed.length > 0);
  if (showReview) {
    const close = () => {
      writeKey(REVIEW_KEY, weekKey(now));
      setClosed(true);
    };
    return (
      <Modal
        open
        onClose={close}
        title="Revisão da semana"
        description="Um resumo rápido antes do fim de semana."
        footer={
          <>
            <Link href="/relatorios" onClick={close} className={buttonClass("ghost")}>
              Ver relatórios
            </Link>
            <Button variant="primary" className="ml-auto" onClick={close}>
              Fechar revisão
            </Button>
          </>
        }
      >
        <WeeklyReview summary={summary} compact />
      </Modal>
    );
  }
  return null;
}

"use client";

/**
 * Estado global do app (cloud-first).
 *
 * Toda escrita passa por `run(operação, argumentos)`:
 *   1. a operação (lib/ops.ts) roda aqui e a tela muda na hora (otimista);
 *   2. a mesma operação é enviada para a nuvem;
 *   3. o Delta oficial que volta substitui o otimista;
 *   4. se falhar, o estado é recarregado da nuvem e aparece "Tentar de novo".
 *
 * Sem bibliotecas: um store externo lido com useSyncExternalStore.
 */
import { useSyncExternalStore } from "react";
import type {
  Area,
  ClockTime,
  Exercise,
  ExerciseLog,
  FocusSession,
  Goal,
  Habit,
  ID,
  InboxItem,
  ISODate,
  Module,
  ModuleColor,
  ModuleIcon,
  ModuleTemplate,
  Note,
  Quadrant,
  Task,
  TrainingPlan,
  Workspace,
} from "@/types/domain";
import { ALL_DAYS } from "@/types/domain";
import { api } from "@/lib/api/client";
import { applyDelta, removedEntities, runOp, type Delta, type OpArgs, type OpName } from "@/lib/ops";
import { newId } from "@/lib/id";
import { toISODate } from "@/lib/dates";
import { xpForTask } from "@/features/gamification/lib/xp";

/* ---------------------------------------------------------------- tipos */

export interface Toast {
  id: number;
  message: string;
  /** Título em destaque; com tone "success" vira um aviso maior com ícone. */
  title?: string;
  tone?: "success";
  xp?: number;
  actionLabel?: string;
  onAction?: () => void;
  /** Tempo na tela em ms (padrão: 4,5 s; 7 s para "success"). */
  duration?: number;
}

export interface ConfirmRequest {
  title: string;
  body?: string;
  actionLabel: string;
  onConfirm: () => void;
}

export interface EditorRequest {
  /** null = criar tarefa nova */
  taskId: ID | null;
  defaults?: Partial<Task>;
  /** Ao salvar, remove este item da caixa de entrada */
  fromInboxId?: ID;
}

export type SoundKind = "off" | "white" | "rain" | "lofi" | "brown";

export interface FocusState {
  status: "idle" | "running" | "paused";
  mode: "focus" | "break";
  taskId: ID | null;
  durationMin: number;
  /** Duração preferida das sessões de foco (volta a ela depois da pausa) */
  focusMin: number;
  /** Início da sessão atual (para registrar no histórico) */
  startedAt: string | null;
  /** Momento em que o timer zera, quando está rodando */
  endsAt: number | null;
  /** Tempo restante quando pausado/parado */
  remainingMs: number;
  sound: SoundKind;
  volume: number;
  /** Foco interrompido por uma pausa: o contador volta exatamente daqui. */
  resume?: { durationMin: number; remainingMs: number; startedAt: string | null } | null;
}

export interface AppState {
  status: "idle" | "loading" | "ready" | "error";
  data: Workspace | null;
  /** Escritas em andamento. 0 = tudo salvo. */
  pending: number;
  syncError: string | null;
  focus: FocusState;
  ui: {
    context: string | null;
    paletteOpen: boolean;
    toasts: Toast[];
    editor: EditorRequest | null;
    confirm: ConfirmRequest | null;
    breakdownTaskId: ID | null;
    /** Formulário de módulo: {} = criar, { moduleId } = editar */
    moduleForm: { moduleId?: ID } | null;
    /** Formulário de hábito: {} = criar, { habitId } = editar */
    habitForm: { habitId?: ID; name?: string } | null;
  };
}

const CONTEXT_KEY = "prisma:context";
const FOCUS_KEY = "prisma:focus";

const initialFocus: FocusState = {
  status: "idle",
  mode: "focus",
  taskId: null,
  durationMin: 25,
  focusMin: 25,
  startedAt: null,
  endsAt: null,
  remainingMs: 25 * 60_000,
  sound: "off",
  volume: 0.5,
};

const initialState: AppState = {
  status: "idle",
  data: null,
  pending: 0,
  syncError: null,
  focus: initialFocus,
  ui: {
    context: null,
    paletteOpen: false,
    toasts: [],
    editor: null,
    confirm: null,
    breakdownTaskId: null,
    moduleForm: null,
    habitForm: null,
  },
};

let state: AppState = initialState;
let writeQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/** O seletor deve devolver uma referência existente do estado; derive listas com useMemo. */
export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

function setUi(patch: Partial<AppState["ui"]>) {
  setState((s) => ({ ...s, ui: { ...s.ui, ...patch } }));
}

const ctxNow = () => {
  const d = new Date();
  return { now: d.toISOString(), today: toISODate(d) };
};

/* ---------------------------------------------------------------- núcleo */

/**
 * Executa uma operação: aplica na hora e sincroniza com a nuvem.
 * Devolve false quando a própria operação recusa (ex.: tarefa bloqueada).
 */
function run<N extends OpName>(name: N, args: OpArgs<N>): boolean {
  if (!state.data) return false;
  const ctx = ctxNow();
  let delta: Delta;
  try {
    delta = runOp(state.data, name, args, ctx);
  } catch (err) {
    pushToast({ message: err instanceof Error ? err.message : "Ação não permitida" });
    return false;
  }
  setState((s) => (s.data ? { ...s, data: applyDelta(s.data, delta) } : s));
  writeSeq++;

  setState((s) => ({ ...s, pending: s.pending + 1, syncError: null }));
  // As escritas saem em fila, na ordem em que aconteceram: criar um hábito e
  // marcá-lo logo em seguida nunca chega invertido na nuvem.
  writeQueue = writeQueue
    .then(() => api.run(name, args, ctx))
    .then((official) => {
      setState((s) => ({
        ...s,
        pending: s.pending - 1,
        // Com outras escritas ainda na fila, a tela já está à frente desta resposta
        // (as operações são as mesmas dos dois lados); só a última é aplicada.
        data: s.data && s.pending === 1 ? applyDelta(s.data, official) : s.data,
      }));
    })
    .catch(async (err: unknown) => {
      const message = err instanceof Error ? err.message : "não foi possível salvar";
      setState((s) => ({ ...s, pending: s.pending - 1, syncError: message }));
      await loadWorkspace({ silent: true });
      pushToast({ message: `Não salvou: ${message}`, actionLabel: "Tentar de novo", onAction: () => run(name, args) });
    });
  return true;
}

function save<K extends "modules" | "folders" | "tasks" | "notes" | "goals" | "habits" | "inbox" | "exercises" | "trainingPlans">(
  collection: K,
  items: Array<Workspace[K][number]>,
) {
  return run("upsert", { collection, items: items as Array<{ id: ID }> });
}

/**
 * Exclui e oferece "Desfazer" (devolve exatamente o que foi apagado,
 * mais o estado anterior de qualquer item que a exclusão alterou).
 */
function removeWithUndo(delta: Delta, perform: () => boolean, message: string) {
  if (!state.data) return;
  const removed = removedEntities(state.data, delta) ?? {};
  const changedBefore: Record<string, Array<{ id: ID }>> = {};
  for (const [collection, items] of Object.entries(delta.upsert ?? {})) {
    const ids = new Set((items as Array<{ id: ID }>).map((i) => i.id));
    changedBefore[collection] = (state.data[collection as keyof NonNullable<Delta["upsert"]>] as Array<{ id: ID }>).filter((x) =>
      ids.has(x.id),
    );
  }
  const snapshot: Record<string, unknown[]> = { ...removed };
  for (const [collection, items] of Object.entries(changedBefore)) {
    snapshot[collection] = [...((snapshot[collection] as unknown[] | undefined) ?? []), ...items];
  }
  if (!perform()) return;
  pushToast({
    message,
    actionLabel: "Desfazer",
    onAction: () => {
      for (const [collection, items] of Object.entries(snapshot)) {
        if (items && items.length) {
          run("upsert", { collection: collection as keyof NonNullable<Delta["upsert"]>, items: items as Array<{ id: ID }> });
        }
      }
    },
  });
}

/* ---------------------------------------------------------------- carregamento */

export async function loadWorkspace(opts: { silent?: boolean } = {}) {
  if (!opts.silent) setState((s) => ({ ...s, status: "loading" }));
  try {
    const data = await api.getWorkspace();
    let context: string | null = state.ui.context;
    if (!opts.silent) {
      try {
        context = window.localStorage.getItem(CONTEXT_KEY);
      } catch {
        /* armazenamento indisponível */
      }
    }
    setState((s) => ({ ...s, status: "ready", data, ui: { ...s.ui, context } }));
  } catch {
    if (!opts.silent) setState((s) => ({ ...s, status: "error" }));
  }
}

let writeSeq = 0;
let refreshing = false;

/**
 * Traz o que mudou em outro aparelho (celular ↔ computador) sem recarregar a página.
 * Só troca os dados quando não há nada nosso indo para a nuvem nem saindo durante a busca,
 * para nunca apagar da tela uma ação que acabou de ser feita aqui.
 */
export async function refreshWorkspace() {
  if (refreshing || state.status !== "ready" || state.pending > 0) return;
  refreshing = true;
  const seq = writeSeq;
  try {
    const data = await api.getWorkspace();
    if (state.pending > 0 || seq !== writeSeq || !state.data) return;
    if (JSON.stringify(data) === JSON.stringify(state.data)) return;
    setState((s) => ({ ...s, data }));
  } catch {
    /* sem conexão: tenta de novo na próxima vez */
  } finally {
    refreshing = false;
  }
}

/** Só o modo de demonstração tem dados de exemplo para restaurar. */
export const canResetDemo = Boolean(api.reset);

export async function resetDemo() {
  if (!api.reset) return;
  setState((s) => ({ ...s, status: "loading" }));
  const data = await api.reset();
  setState((s) => ({ ...s, status: "ready", data }));
  pushToast({ message: "Dados de exemplo restaurados" });
}

/* ---------------------------------------------------------------- perfil */

/** Troca o nome mostrado no app. Devolve false se o nome for recusado. */
export function updateDisplayName(displayName: string) {
  const ok = run("updateProfile", { displayName });
  if (ok) pushToast({ message: "Nome atualizado" });
  return ok;
}

/* ---------------------------------------------------------------- tarefas */

export function blankTask(defaults: Partial<Task> = {}): Task {
  return {
    id: newId(),
    title: "",
    moduleId: null,
    folderId: null,
    tags: [],
    urgent: false,
    important: false,
    dueDate: toISODate(new Date()),
    scheduledTime: null,
    estimateMin: null,
    subtasks: [],
    blockedById: null,
    recurrence: null,
    postponedCount: 0,
    completedAt: null,
    spawnedNextId: null,
    notes: "",
    createdAt: new Date().toISOString(),
    ...defaults,
  };
}

export function saveTask(task: Task, opts: { isNew?: boolean } = {}) {
  if (!task.title.trim()) return;
  save("tasks", [{ ...task, title: task.title.trim() }]);
  if (opts.isNew) {
    const moduleName = state.data?.modules.find((m) => m.id === task.moduleId)?.name;
    pushToast({ message: moduleName ? `Tarefa criada em ${moduleName}` : "Tarefa criada" });
  }
}

export function createTask(input: Partial<Task> & { title: string }) {
  const task = blankTask(input);
  saveTask(task, { isNew: true });
  return task;
}

export function toggleTask(id: ID) {
  const task = state.data?.tasks.find((t) => t.id === id);
  if (!task) return;
  const done = !task.completedAt;
  const ok = run("completeTask", { id, done, spawnId: newId(), xpId: newId() });
  if (ok && done) {
    pushToast({
      message: task.recurrence ? "Concluída. A próxima já está agendada" : "Tarefa concluída",
      xp: xpForTask(task),
      actionLabel: "Desfazer",
      onAction: () => toggleTask(id),
    });
  }
}

export function toggleSubtask(taskId: ID, subtaskId: ID) {
  const task = state.data?.tasks.find((t) => t.id === taskId);
  if (!task) return;
  save("tasks", [
    { ...task, subtasks: task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)) },
  ]);
}

export function addSubtasks(taskId: ID, titles: string[]) {
  const task = state.data?.tasks.find((t) => t.id === taskId);
  const clean = titles.map((t) => t.trim()).filter(Boolean);
  if (!task || clean.length === 0) return;
  save("tasks", [
    { ...task, subtasks: [...task.subtasks, ...clean.map((title) => ({ id: newId(), title, done: false }))] },
  ]);
  pushToast({ message: clean.length === 1 ? "1 passo adicionado" : `${clean.length} passos adicionados` });
}

/**
 * Muda a data (e opcionalmente o horário).
 * Conta como "adiada" quando a tarefa já era para hoje ou antes e foi para depois.
 */
export function moveTask(id: ID, toDate: ISODate | null, opts: { time?: ClockTime | null; silent?: boolean } = {}) {
  const task = state.data?.tasks.find((t) => t.id === id);
  if (!task || (task.dueDate === toDate && opts.time === undefined)) return;
  const today = toISODate(new Date());
  const postponed = Boolean(task.dueDate && toDate && task.dueDate <= today && toDate > task.dueDate);
  const updated: Task = {
    ...task,
    dueDate: toDate,
    scheduledTime: opts.time === undefined ? task.scheduledTime : opts.time,
    postponedCount: task.postponedCount + (postponed ? 1 : 0),
  };
  save("tasks", [updated]);
  if (opts.silent) return;
  pushToast({
    message: postponed ? "Tarefa adiada" : "Tarefa movida",
    actionLabel: "Desfazer",
    onAction: () => save("tasks", [task]),
  });
}

export function setQuadrant(id: ID, quadrant: Quadrant) {
  const task = state.data?.tasks.find((t) => t.id === id);
  if (!task) return;
  const urgent = quadrant === "do" || quadrant === "delegate";
  const important = quadrant === "do" || quadrant === "schedule";
  if (task.urgent === urgent && task.important === important) return;
  save("tasks", [{ ...task, urgent, important }]);
}

export function deleteTask(id: ID) {
  if (!state.data) return;
  // Tarefas que dependiam dela ficam livres (e voltam a depender dela se desfizer).
  const freed = state.data.tasks.filter((t) => t.blockedById === id).map((t) => ({ ...t, blockedById: null }));
  const delta: Delta = { remove: { tasks: [id] }, ...(freed.length ? { upsert: { tasks: freed } } : {}) };
  removeWithUndo(
    delta,
    () => {
      const ok = run("remove", { collection: "tasks", ids: [id] });
      if (ok && freed.length) save("tasks", freed);
      return ok;
    },
    "Tarefa excluída",
  );
}

/* ---------------------------------------------------------------- módulos */

export function createModule(input: { name: string; color: ModuleColor; icon: ModuleIcon; template: ModuleTemplate; area?: Area }): ID {
  const id = newId();
  const position = (state.data?.modules.length ?? 0) + 1;
  const module: Module = { id, ...input, name: input.name.trim(), position };
  save("modules", [module]);
  pushToast({ message: `Módulo ${module.name} criado` });
  return id;
}

export function updateModule(module: Module) {
  save("modules", [module]);
}

export function deleteModule(id: ID) {
  const data = state.data;
  if (!data) return;
  const module = data.modules.find((m) => m.id === id);
  if (!module) return;
  const delta = runOp(data, "deleteModule", { id }, ctxNow());
  removeWithUndo(delta, () => run("deleteModule", { id }), `Módulo ${module.name} excluído`);
}

/* ---------------------------------------------------------------- anotações e metas */

export function saveNote(note: Note) {
  save("notes", [{ ...note, updatedAt: new Date().toISOString() }]);
}

export function deleteNote(id: ID) {
  removeWithUndo({ remove: { notes: [id] } }, () => run("remove", { collection: "notes", ids: [id] }), "Anotação excluída");
}

export function saveGoal(goal: Goal) {
  save("goals", [goal]);
}

export function deleteGoal(id: ID) {
  removeWithUndo({ remove: { goals: [id] } }, () => run("remove", { collection: "goals", ids: [id] }), "Meta excluída");
}

/* ---------------------------------------------------------------- hábitos */

/** Cria um hábito. O vínculo a um módulo é opcional. */
export function createHabit(input: { name: string; days?: number[]; moduleId?: ID | null }): ID | null {
  if (!input.name.trim()) return null;
  const habit: Habit = {
    id: newId(),
    name: input.name.trim(),
    days: input.days?.length ? [...input.days].sort() : ALL_DAYS,
    moduleId: input.moduleId ?? null,
    checks: [],
    createdAt: new Date().toISOString(),
  };
  save("habits", [habit]);
  pushToast({ message: `Hábito “${habit.name}” criado. Marque quando fizer.` });
  return habit.id;
}

export function updateHabit(habit: Habit) {
  if (!habit.name.trim() || habit.days.length === 0) return;
  save("habits", [{ ...habit, name: habit.name.trim(), days: [...habit.days].sort() }]);
}

export function toggleHabit(id: ID, date: ISODate = toISODate(new Date())) {
  const habit = state.data?.habits.find((h) => h.id === id);
  if (!habit) return;
  run("setHabitDone", { id, date, done: !habit.checks.includes(date), xpId: newId() });
}

export function deleteHabit(id: ID) {
  removeWithUndo({ remove: { habits: [id] } }, () => run("remove", { collection: "habits", ids: [id] }), "Hábito excluído");
}

/* ---------------------------------------------------------------- caixa de entrada */

export function captureInbox(kind: InboxItem["kind"], text: string) {
  if (!text.trim()) return;
  save("inbox", [{ id: newId(), kind, text: text.trim(), createdAt: new Date().toISOString() }]);
  pushToast({ message: "Guardado na caixa de entrada" });
}

export function deleteInbox(id: ID, opts: { silent?: boolean } = {}) {
  if (opts.silent) {
    run("remove", { collection: "inbox", ids: [id] });
    return;
  }
  removeWithUndo({ remove: { inbox: [id] } }, () => run("remove", { collection: "inbox", ids: [id] }), "Item descartado");
}

/* ---------------------------------------------------------------- treino */

export function saveTrainingPlan(plan: TrainingPlan) {
  save("trainingPlans", [plan]);
}

export function toggleFinisher(planId: ID, date: ISODate, finisherId: ID) {
  const plan = state.data?.trainingPlans.find((p) => p.id === planId);
  if (!plan) return;
  const done = plan.finisherDone[date] ?? [];
  const next = done.includes(finisherId) ? done.filter((x) => x !== finisherId) : [...done, finisherId];
  save("trainingPlans", [{ ...plan, finisherDone: { ...plan.finisherDone, [date]: next } }]);
}

export function logExercise(log: ExerciseLog) {
  run("logExercise", { log, xpId: newId() });
}

/** Encerra o treino e guarda a duração (usado pelos relatórios). */
/** Devolve o id do treino salvo (ou null se não salvou). */
export function finishWorkout(input: { minutes: number; groups: string[] }): string | null {
  const now = new Date();
  const minutes = Math.round(input.minutes);
  const id = newId();
  const ok = run("finishWorkout", {
    session: {
      id,
      date: toISODate(now),
      startedAt: new Date(now.getTime() - minutes * 60_000).toISOString(),
      endedAt: now.toISOString(),
      minutes,
      groups: input.groups,
    },
  });
  return ok ? id : null;
}

export function deleteWorkoutSession(id: ID) {
  run("remove", { collection: "workoutSessions", ids: [id] });
}

export function saveExercise(input: { name: string; group: string; kind: "strength" | "cardio"; sets?: number | null; reps?: number | null }) {
  if (!input.name.trim()) return;
  save("exercises", [{ id: newId(), ...input, name: input.name.trim() }]);
}

/** Grava a nova ordem dos exercícios (lista completa, na ordem desejada). Só envia os que mudaram. */
export function reorderExercises(ordered: Exercise[]) {
  const changed: Exercise[] = [];
  ordered.forEach((e, i) => {
    if (e.order !== i) changed.push({ ...e, order: i });
  });
  if (changed.length) save("exercises", changed);
}

/** Séries e repetições padrão do exercício (aparecem já preenchidas no treino). */
export function updateExerciseTargets(exercise: Exercise, targets: { sets: number | null; reps: number | null }) {
  save("exercises", [{ ...exercise, ...targets }]);
}

export function deleteExercise(id: ID) {
  const data = state.data;
  if (!data) return;
  const logs = data.exerciseLogs.filter((l) => l.exerciseId === id).map((l) => l.id);
  const delta: Delta = { remove: { exercises: [id], exerciseLogs: logs } };
  removeWithUndo(
    delta,
    () => {
      const ok = run("remove", { collection: "exercises", ids: [id] });
      if (ok && logs.length) run("remove", { collection: "exerciseLogs", ids: logs });
      return ok;
    },
    "Exercício excluído",
  );
}

/* ---------------------------------------------------------------- foco */

function setFocus(patch: Partial<FocusState>) {
  setState((s) => ({ ...s, focus: { ...s.focus, ...patch } }));
  try {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(state.focus));
  } catch {
    /* timer vale só nesta aba */
  }
}

export function restoreFocus() {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as FocusState;
    // O som nunca volta sozinho: o navegador só toca áudio depois de um clique.
    setState((s) => ({ ...s, focus: { ...initialFocus, ...saved, sound: "off" } }));
  } catch {
    /* ignora estado inválido */
  }
}

export function configureFocus(patch: { durationMin?: number; mode?: FocusState["mode"]; taskId?: ID | null }) {
  const f = state.focus;
  if (f.status !== "idle" && (patch.durationMin !== undefined || patch.mode !== undefined)) return;
  const durationMin = patch.durationMin ?? f.durationMin;
  const mode = patch.mode ?? f.mode;
  setFocus({
    ...patch,
    durationMin,
    focusMin: mode === "focus" && patch.durationMin !== undefined ? patch.durationMin : f.focusMin,
    remainingMs: f.status === "idle" ? durationMin * 60_000 : f.remainingMs,
  });
}

export function startFocus() {
  const f = state.focus;
  if (f.mode === "focus" && f.status === "idle") askNotificationPermission();
  const remaining = f.status === "idle" ? f.durationMin * 60_000 : f.remainingMs;
  setFocus({
    status: "running",
    startedAt: f.startedAt ?? new Date().toISOString(),
    endsAt: Date.now() + remaining,
    remainingMs: remaining,
  });
}

export function pauseFocus() {
  const f = state.focus;
  if (f.status !== "running" || !f.endsAt) return;
  setFocus({ status: "paused", remainingMs: Math.max(0, f.endsAt - Date.now()), endsAt: null });
}

function logSession(minutes: number, startedAt: string | null, taskId: ID | null, opts: { completed?: boolean } = {}) {
  const ok = minutes >= 1 && Boolean(startedAt);
  if (ok) {
    const session: FocusSession = { id: newId(), taskId, startedAt: startedAt!, endedAt: new Date().toISOString(), minutes };
    run("logFocus", { session, xpId: newId() });
  }
  const taskTitle = taskId ? state.data?.tasks.find((t) => t.id === taskId)?.title : undefined;
  const detail = ok ? `${minutes} min focados${taskTitle ? ` em “${taskTitle}”` : ""}.` : "Menos de 1 minuto, não entrou no registro.";
  const message = opts.completed ? `${detail} Hora de uma pausa.` : detail;
  pushToast({ tone: "success", title: "Foco concluído", message, xp: ok ? Math.floor(minutes / 5) * 2 || undefined : undefined });
  notifySystem("Foco concluído", message);
}

/** Também avisa pelo sistema quando a aba está em segundo plano (se o usuário permitiu). */
function notifySystem(title: string, body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted" || !document.hidden) return;
    new Notification(title, { body, icon: "/icon-64.png" });
  } catch {
    /* sem suporte a notificações */
  }
}

/** Pede permissão para avisar pelo sistema (só uma vez, no primeiro foco iniciado). */
function askNotificationPermission() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* sem suporte a notificações */
  }
}

/** Volta para o foco que foi interrompido pela pausa, com o contador onde estava. */
function restoreResume(resume: NonNullable<FocusState["resume"]>) {
  setFocus({
    mode: "focus",
    status: "paused",
    durationMin: resume.durationMin,
    remainingMs: resume.remainingMs,
    startedAt: resume.startedAt,
    endsAt: null,
    resume: null,
  });
}

/** Registra o tempo focado (se for sessão de foco com 1 min ou mais) e zera o timer. */
export function stopFocus(opts: { completed?: boolean } = {}) {
  const f = state.focus;
  if (f.status === "idle" && !(f.mode === "break" && f.resume)) return;

  // Pausa no meio de um foco: ao terminar, o foco continua de onde parou;
  // ao encerrar a sessão durante a pausa, registra o que já tinha sido focado.
  if (f.mode === "break" && f.resume) {
    if (opts.completed) {
      restoreResume(f.resume);
      return;
    }
    logSession(Math.round((f.resume.durationMin * 60_000 - f.resume.remainingMs) / 60_000), f.resume.startedAt, f.taskId);
    const min = f.focusMin;
    setFocus({ status: "idle", mode: "focus", durationMin: min, remainingMs: min * 60_000, startedAt: null, endsAt: null, resume: null });
    return;
  }

  const remaining = f.status === "running" && f.endsAt ? Math.max(0, f.endsAt - Date.now()) : f.remainingMs;
  const elapsedMin = Math.round((f.durationMin * 60_000 - (opts.completed ? 0 : remaining)) / 60_000);
  if (f.mode === "focus") logSession(elapsedMin, f.startedAt, f.taskId, { completed: opts.completed });

  let mode = f.mode;
  let durationMin = f.durationMin;
  if (opts.completed) {
    mode = f.mode === "focus" ? "break" : "focus";
    durationMin = mode === "break" ? (f.focusMin >= 50 ? 10 : 5) : f.focusMin;
  }
  setFocus({ status: "idle", mode, durationMin, remainingMs: durationMin * 60_000, startedAt: null, endsAt: null, resume: null });
}

/** Pausa o foco guardando onde o contador estava e começa uma pausa. */
export function startBreak(minutes: number) {
  const f = state.focus;
  const resume =
    f.mode === "focus" && f.status !== "idle"
      ? {
          durationMin: f.durationMin,
          remainingMs: f.status === "running" && f.endsAt ? Math.max(0, f.endsAt - Date.now()) : f.remainingMs,
          startedAt: f.startedAt,
        }
      : (f.resume ?? null);
  setFocus({ mode: "break", durationMin: minutes, remainingMs: minutes * 60_000, status: "idle", startedAt: null, endsAt: null, resume });
  startFocus();
}

/** Sai da pausa: volta ao foco interrompido (se houver) ou deixa pronto um foco novo. */
export function backToFocus() {
  const f = state.focus;
  if (f.mode === "break" && f.resume) {
    restoreResume(f.resume);
    return;
  }
  if (f.status !== "idle") stopFocus();
  const min = state.focus.focusMin;
  setFocus({ mode: "focus", durationMin: min, remainingMs: min * 60_000, status: "idle", startedAt: null, endsAt: null, resume: null });
}

export function setFocusSound(sound: SoundKind) {
  setFocus({ sound });
}

export function setFocusVolume(volume: number) {
  setFocus({ volume });
}

/* ---------------------------------------------------------------- interface */

export function setContext(context: string | null) {
  setUi({ context });
  try {
    if (context) window.localStorage.setItem(CONTEXT_KEY, context);
    else window.localStorage.removeItem(CONTEXT_KEY);
  } catch {
    /* sem armazenamento: o filtro vale só nesta sessão */
  }
}

export function setPaletteOpen(open: boolean) {
  setUi({ paletteOpen: open });
}

export function openEditor(request: EditorRequest) {
  setUi({ editor: request, paletteOpen: false });
}

export function closeEditor() {
  setUi({ editor: null });
}

export function askConfirm(request: ConfirmRequest) {
  setUi({ confirm: request });
}

export function closeConfirm() {
  setUi({ confirm: null });
}

export function openModuleForm(request: { moduleId?: ID } | null) {
  setUi({ moduleForm: request, paletteOpen: false });
}

export function openHabitForm(request: { habitId?: ID; name?: string } | null) {
  setUi({ habitForm: request, paletteOpen: false });
}

export function openBreakdown(taskId: ID | null) {
  setUi({ breakdownTaskId: taskId });
}

let toastSeq = 0;

export function pushToast(toast: Omit<Toast, "id">) {
  const id = ++toastSeq;
  setState((s) => ({ ...s, ui: { ...s.ui, toasts: [...s.ui.toasts.slice(-2), { ...toast, id }] } }));
  return id;
}

export function dismissToast(id: number) {
  setState((s) => ({ ...s, ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } }));
}

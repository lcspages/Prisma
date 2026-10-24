/**
 * Operações de domínio como funções puras: (estado, argumentos) → Delta.
 *
 * A MESMA função roda nos dois lados:
 *   - no cliente, para a atualização otimista (a tela muda na hora);
 *   - no servidor, para gerar o estado oficial.
 * Como os ids novos vêm do cliente, os dois resultados batem.
 * No Supabase, cada operação vira uma função RPC (ou um upsert/delete simples).
 */
import type {
  CollectionKey,
  EntityOf,
  ExerciseLog,
  FocusSession,
  ID,
  ISODate,
  Profile,
  Task,
  Workspace,
  XpEvent,
} from "@/types/domain";
import { spawnNext } from "@/features/tasks/lib/recurrence";
import { XP_PER_HABIT, XP_PER_WORKOUT_LOG, xpForFocus, xpForTask } from "@/features/gamification/lib/xp";

export type Delta = {
  upsert?: { [K in CollectionKey]?: EntityOf<K>[] };
  remove?: { [K in CollectionKey]?: ID[] };
  profile?: Profile;
};

export interface OpContext {
  /** Instante ISO da ação */
  now: string;
  /** Data local do usuário (o servidor não sabe o fuso) */
  today: ISODate;
}

export const COLLECTIONS: CollectionKey[] = [
  "modules",
  "folders",
  "tasks",
  "notes",
  "goals",
  "habits",
  "inbox",
  "focusSessions",
  "xpEvents",
  "exercises",
  "exerciseLogs",
  "trainingPlans",
];

/** Aplica um Delta sem mutar o estado original. */
export function applyDelta(ws: Workspace, delta: Delta): Workspace {
  const next: Workspace = { ...ws };
  for (const key of COLLECTIONS) {
    const removeIds = delta.remove?.[key];
    const upserts = delta.upsert?.[key] as Array<{ id: ID }> | undefined;
    if (!removeIds?.length && !upserts?.length) continue;
    let list = ws[key] as Array<{ id: ID }>;
    if (removeIds?.length) {
      const set = new Set(removeIds);
      list = list.filter((item) => !set.has(item.id));
    }
    if (upserts?.length) {
      const byId = new Map(upserts.map((u) => [u.id, u]));
      list = list.map((item) => byId.get(item.id) ?? item);
      const existing = new Set(list.map((i) => i.id));
      list = [...list, ...upserts.filter((u) => !existing.has(u.id))];
    }
    (next as unknown as Record<CollectionKey, unknown>)[key] = list;
  }
  if (delta.profile) next.profile = delta.profile;
  return next;
}

function withXp(profile: Profile, amount: number, now: string): Profile {
  return { ...profile, totalXp: Math.max(0, profile.totalXp + amount), lastActivityAt: now };
}

function xpEvent(id: ID, amount: number, source: XpEvent["source"], refId: ID | null, at: string): XpEvent {
  return { id, amount, source, refId, at };
}

/* ---------------------------------------------------------------- */

function upsert(_ws: Workspace, args: { collection: CollectionKey; items: Array<{ id: ID }> }): Delta {
  return { upsert: { [args.collection]: args.items } as Delta["upsert"] };
}

function remove(_ws: Workspace, args: { collection: CollectionKey; ids: ID[] }): Delta {
  return { remove: { [args.collection]: args.ids } as Delta["remove"] };
}

function completeTask(
  ws: Workspace,
  args: { id: ID; done: boolean; spawnId: ID; xpId: ID },
  ctx: OpContext,
): Delta {
  const task = ws.tasks.find((t) => t.id === args.id);
  if (!task || Boolean(task.completedAt) === args.done) return {};

  if (args.done && task.blockedById) {
    const blocker = ws.tasks.find((t) => t.id === task.blockedById);
    if (blocker && !blocker.completedAt) {
      throw new Error("Esta tarefa depende de outra que ainda não foi concluída");
    }
  }

  if (args.done) {
    const amount = xpForTask(task);
    const spawned = spawnNext(task, args.spawnId, ctx.today, ctx.now);
    const updated: Task = {
      ...task,
      completedAt: ctx.now,
      spawnedNextId: spawned?.id ?? null,
      recurrence: task.recurrence ? { ...task.recurrence, streak: task.recurrence.streak + 1 } : null,
    };
    return {
      upsert: {
        tasks: spawned ? [updated, spawned] : [updated],
        xpEvents: [xpEvent(args.xpId, amount, "task", task.id, ctx.now)],
      },
      profile: withXp(ws.profile, amount, ctx.now),
    };
  }

  // Desfazer: devolve o XP e apaga a ocorrência criada (se ainda não foi concluída).
  const events = ws.xpEvents.filter((e) => e.source === "task" && e.refId === task.id);
  const refund = events.reduce((s, e) => s + e.amount, 0);
  const spawned = task.spawnedNextId ? ws.tasks.find((t) => t.id === task.spawnedNextId) : undefined;
  const removeSpawn = spawned && !spawned.completedAt ? [spawned.id] : [];
  const updated: Task = {
    ...task,
    completedAt: null,
    spawnedNextId: null,
    recurrence: task.recurrence ? { ...task.recurrence, streak: Math.max(0, task.recurrence.streak - 1) } : null,
  };
  return {
    upsert: { tasks: [updated] },
    remove: { tasks: removeSpawn, xpEvents: events.map((e) => e.id) },
    profile: withXp(ws.profile, -refund, ctx.now),
  };
}

function setHabitDone(
  ws: Workspace,
  args: { id: ID; date: ISODate; done: boolean; xpId: ID },
  ctx: OpContext,
): Delta {
  const habit = ws.habits.find((h) => h.id === args.id);
  if (!habit || habit.checks.includes(args.date) === args.done) return {};
  const checks = args.done
    ? [...habit.checks, args.date].sort()
    : habit.checks.filter((d) => d !== args.date);

  if (args.done) {
    return {
      upsert: {
        habits: [{ ...habit, checks }],
        xpEvents: [xpEvent(args.xpId, XP_PER_HABIT, "habit", `${habit.id}:${args.date}`, ctx.now)],
      },
      profile: withXp(ws.profile, XP_PER_HABIT, ctx.now),
    };
  }
  const events = ws.xpEvents.filter((e) => e.source === "habit" && e.refId === `${habit.id}:${args.date}`);
  return {
    upsert: { habits: [{ ...habit, checks }] },
    remove: { xpEvents: events.map((e) => e.id) },
    profile: withXp(ws.profile, -events.reduce((s, e) => s + e.amount, 0), ctx.now),
  };
}

function logFocus(ws: Workspace, args: { session: FocusSession; xpId: ID }, ctx: OpContext): Delta {
  const amount = xpForFocus(args.session.minutes);
  return {
    upsert: {
      focusSessions: [args.session],
      xpEvents: amount > 0 ? [xpEvent(args.xpId, amount, "focus", args.session.id, ctx.now)] : [],
    },
    profile: withXp(ws.profile, amount, ctx.now),
  };
}

function logExercise(ws: Workspace, args: { log: ExerciseLog; xpId: ID }, ctx: OpContext): Delta {
  const isNew = !ws.exerciseLogs.some((l) => l.id === args.log.id);
  return {
    upsert: {
      exerciseLogs: [args.log],
      xpEvents: isNew ? [xpEvent(args.xpId, XP_PER_WORKOUT_LOG, "workout", args.log.id, ctx.now)] : [],
    },
    profile: isNew ? withXp(ws.profile, XP_PER_WORKOUT_LOG, ctx.now) : undefined,
  };
}

/** Exclui a pasta, as subpastas e tudo o que estiver dentro delas. */
function deleteFolder(ws: Workspace, args: { id: ID }): Delta {
  const ids = new Set<ID>([args.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of ws.folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  const inside = <T extends { id: ID; folderId: ID | null }>(list: T[]) =>
    list.filter((x) => x.folderId && ids.has(x.folderId)).map((x) => x.id);
  return {
    remove: {
      folders: [...ids],
      tasks: inside(ws.tasks),
      notes: inside(ws.notes),
      goals: inside(ws.goals),
    },
  };
}

/**
 * Exclui o módulo com pastas, tarefas, anotações e metas.
 * Hábitos vinculados continuam existindo, só perdem o vínculo.
 */
function deleteModule(ws: Workspace, args: { id: ID }): Delta {
  const of = <T extends { id: ID; moduleId: ID | null }>(list: T[]) =>
    list.filter((x) => x.moduleId === args.id).map((x) => x.id);
  const linked = ws.habits.filter((h) => h.moduleId === args.id).map((h) => ({ ...h, moduleId: null }));
  return {
    upsert: linked.length ? { habits: linked } : undefined,
    remove: {
      modules: [args.id],
      folders: of(ws.folders),
      tasks: of(ws.tasks),
      notes: of(ws.notes),
      goals: of(ws.goals),
    },
  };
}

export const ops = {
  upsert,
  remove,
  completeTask,
  setHabitDone,
  logFocus,
  logExercise,
  deleteFolder,
  deleteModule,
};

export type Ops = typeof ops;
export type OpName = keyof Ops;
export type OpArgs<N extends OpName> = Parameters<Ops[N]>[1];

export function runOp<N extends OpName>(ws: Workspace, name: N, args: OpArgs<N>, ctx: OpContext): Delta {
  const fn = ops[name] as (ws: Workspace, args: OpArgs<N>, ctx: OpContext) => Delta;
  return fn(ws, args, ctx);
}

/** Entidades que o Delta vai apagar (usado para "Desfazer" exclusões). */
export function removedEntities(ws: Workspace, delta: Delta): Delta["upsert"] {
  const out: Record<string, unknown[]> = {};
  for (const key of COLLECTIONS) {
    const ids = delta.remove?.[key];
    if (!ids?.length) continue;
    const set = new Set(ids);
    out[key] = (ws[key] as Array<{ id: ID }>).filter((x) => set.has(x.id));
  }
  return out as Delta["upsert"];
}

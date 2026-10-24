/**
 * Converte entre os registros do banco (public.entities) e o Workspace do app,
 * e roda as operações de lib/ops.ts no servidor (o mesmo código do cliente).
 */
import type { CollectionKey, ID, Profile, Workspace } from "@/types/domain";
import { TRAINING_PLAN_ID } from "@/types/domain";
import { COLLECTIONS, ops, runOp, type Delta, type OpContext, type OpName } from "@/lib/ops";
import { rpc, type Access } from "./supabase";

type Row = [string, unknown];
type Upsert = { c: string; id: string; d: unknown };
type Removal = { c: string; id: string };

const MAX_ITEMS_PER_OP = 5000;

function emptyWorkspace(): Workspace {
  return {
    profile: { id: "me", displayName: "", totalXp: 0, lastActivityAt: new Date(0).toISOString() },
    modules: [],
    folders: [],
    tasks: [],
    notes: [],
    goals: [],
    habits: [],
    inbox: [],
    focusSessions: [],
    xpEvents: [],
    exercises: [],
    exerciseLogs: [],
    trainingPlans: [],
  };
}

/** Primeiro acesso: perfil com o nome do e-mail e um plano de treino vazio. */
export function starterWorkspace(email: string, now = new Date()): Workspace {
  const ws = emptyWorkspace();
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  ws.profile = {
    id: "me",
    displayName: name ? name.charAt(0).toUpperCase() + name.slice(1) : "",
    totalXp: 0,
    lastActivityAt: now.toISOString(),
  };
  ws.trainingPlans = [{ id: TRAINING_PLAN_ID, spotifyUrl: null, youtubeUrl: null, split: {}, finishers: [], finisherDone: {} }];
  return ws;
}

function fromRows(rows: Row[]): { ws: Workspace; hasProfile: boolean } {
  const ws = emptyWorkspace();
  let hasProfile = false;
  const lists = ws as unknown as Record<string, unknown[]>;
  for (const [collection, data] of rows) {
    if (collection === "profile") {
      ws.profile = data as Profile;
      hasProfile = true;
    } else if (Array.isArray(lists[collection])) {
      lists[collection].push(data);
    }
  }
  return { ws, hasProfile };
}

function toRows(delta: Delta): { upserts: Upsert[]; removes: Removal[] } {
  const upserts: Upsert[] = [];
  const removes: Removal[] = [];
  for (const key of COLLECTIONS) {
    for (const item of (delta.upsert?.[key] ?? []) as Array<{ id: ID }>) {
      upserts.push({ c: key, id: String(item.id), d: item });
    }
    for (const id of delta.remove?.[key] ?? []) removes.push({ c: key, id: String(id) });
  }
  if (delta.profile) upserts.push({ c: "profile", id: "me", d: delta.profile });
  return { upserts, removes };
}

export type LoadResult = { access: Access; workspace?: Workspace };

/** Carrega o Workspace do cliente (cria o inicial no primeiro acesso). */
export async function loadWorkspace(uid: string, email: string): Promise<LoadResult> {
  const res = await rpc<{ access: Access; items?: Row[] }>("prisma_load", { p_user: uid, p_email: email });
  if (!res.access.active || !res.items) return { access: res.access };
  const { ws, hasProfile } = fromRows(res.items);
  if (!hasProfile) {
    const starter = starterWorkspace(email);
    const delta: Delta = { profile: starter.profile };
    ws.profile = starter.profile;
    if (!ws.trainingPlans.length) {
      ws.trainingPlans = starter.trainingPlans;
      delta.upsert = { trainingPlans: starter.trainingPlans };
    }
    await saveDelta(uid, delta);
  }
  return { access: res.access, workspace: ws };
}

export async function saveDelta(uid: string, delta: Delta) {
  const { upserts, removes } = toRows(delta);
  if (!upserts.length && !removes.length) return;
  await rpc<null>("prisma_apply", { p_user: uid, p_upserts: upserts, p_removes: removes });
}

export class OpError extends Error {}

const isCollection = (value: unknown): value is CollectionKey =>
  typeof value === "string" && (COLLECTIONS as string[]).includes(value);

const validId = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 100;

/** Confere o pedido do cliente antes de rodar a operação. */
export function parseOp(body: unknown): { name: OpName; args: unknown; ctx: OpContext } {
  const b = (body ?? {}) as { name?: unknown; args?: unknown; ctx?: { now?: unknown; today?: unknown } };
  if (typeof b.name !== "string" || !Object.prototype.hasOwnProperty.call(ops, b.name)) throw new OpError("Ação desconhecida.");
  const now = typeof b.ctx?.now === "string" && !Number.isNaN(Date.parse(b.ctx.now)) ? b.ctx.now : new Date().toISOString();
  const today = typeof b.ctx?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.ctx.today) ? b.ctx.today : now.slice(0, 10);
  const args = (b.args ?? {}) as Record<string, unknown>;
  if (b.name === "upsert" || b.name === "remove") {
    if (!isCollection(args.collection)) throw new OpError("Coleção inválida.");
    const list = (b.name === "upsert" ? args.items : args.ids) as unknown;
    if (!Array.isArray(list) || list.length > MAX_ITEMS_PER_OP) throw new OpError("Pedido inválido.");
    if (b.name === "upsert" && !list.every((i) => i && typeof i === "object" && validId((i as { id?: unknown }).id))) {
      throw new OpError("Item sem identificação.");
    }
    if (b.name === "remove" && !list.every(validId)) throw new OpError("Item sem identificação.");
  }
  return { name: b.name as OpName, args, ctx: { now, today } };
}

/** Roda a operação sobre os dados oficiais e grava o resultado. */
export async function runAndSave(uid: string, ws: Workspace, name: OpName, args: unknown, ctx: OpContext): Promise<Delta> {
  let delta: Delta;
  try {
    delta = runOp(ws, name, args as never, ctx);
  } catch (err) {
    throw new OpError(err instanceof Error ? err.message : "Ação não permitida.");
  }
  await saveDelta(uid, delta);
  return delta;
}

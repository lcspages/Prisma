"use client";

/**
 * Amigos, grupos e batalhas: estado vindo de /api/social.
 * Fica separado dos dados do app (é compartilhado entre pessoas e calculado no servidor).
 */
import { useSyncExternalStore } from "react";

export interface Person {
  id: string;
  name: string;
  code?: string | null;
}

export interface FriendRequest extends Person {
  /** id do pedido */
  id: string;
  userId: string;
  at: string;
}

export interface Group {
  id: string;
  name: string;
  mine: boolean;
  status: "convidado" | "membro";
  members: Array<{ id: string; name: string; status: "convidado" | "membro" }>;
}

export type BattleStatus = "pendente" | "ativa" | "encerrada" | "cancelada" | "expirada";

export interface Battle {
  id: string;
  category: string;
  startsAt: string;
  endsAt: string;
  group: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  mine: boolean;
  myStatus: "convidado" | "aceito";
  status: BattleStatus;
  players: Array<{ id: string; name: string; status: "convidado" | "aceito"; points: number | null }>;
}

export interface SocialState {
  me: { id: string; code: string; name: string };
  friends: Person[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  groups: Group[];
  battles: Battle[];
}

interface Store {
  status: "idle" | "loading" | "ready" | "error";
  data: SocialState | null;
  busy: boolean;
}

let store: Store = { status: "idle", data: null, busy: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<Store>) => {
  store = { ...store, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const initial: Store = { status: "idle", data: null, busy: false };

export function useSocial<T>(selector: (s: Store) => T): T {
  return useSyncExternalStore(subscribe, () => selector(store), () => selector(initial));
}

export async function loadSocial(opts: { silent?: boolean } = {}) {
  if (!opts.silent) set({ status: store.data ? "ready" : "loading" });
  try {
    const res = await fetch("/api/social", { cache: "no-store" });
    const body = (await res.json().catch(() => null)) as { state?: SocialState } | null;
    if (!res.ok || !body?.state) throw new Error();
    set({ status: "ready", data: body.state });
  } catch {
    if (!opts.silent || !store.data) set({ status: "error" });
  }
}

/** Executa uma ação. Devolve a mensagem de erro (ou null se deu certo). */
export async function socialAction(action: string, args: Record<string, unknown> = {}): Promise<string | null> {
  set({ busy: true });
  try {
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, args }),
    });
    const body = (await res.json().catch(() => null)) as { state?: SocialState; error?: string } | null;
    if (body?.state) set({ data: body.state, status: "ready" });
    if (!res.ok) return body?.error ?? "Não deu certo agora. Tente de novo.";
    return null;
  } catch {
    return "Sem conexão com a internet.";
  } finally {
    set({ busy: false });
  }
}

/** Quantas coisas esperam resposta (pedidos, convites de grupo e desafios). */
export function pendingCount(data: SocialState | null): number {
  if (!data) return 0;
  return (
    data.incoming.length +
    data.groups.filter((g) => g.status === "convidado").length +
    data.battles.filter((b) => b.myStatus === "convidado" && (b.status === "pendente" || b.status === "ativa")).length
  );
}

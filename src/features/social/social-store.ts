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

export type SocialTab = "batalhas" | "amigos" | "grupos";

interface Store {
  status: "idle" | "loading" | "ready" | "error";
  data: SocialState | null;
  busy: boolean;
  /** Aba pedida por fora (ex.: o aviso "Ver" de um pedido novo). */
  tab: { value: SocialTab; seq: number } | null;
}

let store: Store = { status: "idle", data: null, busy: false, tab: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<Store>) => {
  store = { ...store, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const initial: Store = { status: "idle", data: null, busy: false, tab: null };

export function useSocial<T>(selector: (s: Store) => T): T {
  return useSyncExternalStore(subscribe, () => selector(store), () => selector(initial));
}

/** Abre uma aba da página Amigos (funciona mesmo se a página já estiver aberta). */
export function requestSocialTab(value: SocialTab) {
  set({ tab: { value, seq: (store.tab?.seq ?? 0) + 1 } });
}

/* ---------------------------------------------------------------- novidades */

export interface SocialNews {
  kind: "amigo" | "grupo" | "batalha";
  text: string;
}

/** Itens que esperam resposta, com uma chave para saber o que é novo. */
function waiting(data: SocialState): Map<string, SocialNews> {
  const out = new Map<string, SocialNews>();
  for (const r of data.incoming) out.set(`a:${r.id}`, { kind: "amigo", text: `${r.name} quer ser seu amigo` });
  for (const g of data.groups)
    if (g.status === "convidado") out.set(`g:${g.id}`, { kind: "grupo", text: `Convite para o grupo ${g.name}` });
  for (const b of data.battles)
    if (b.myStatus === "convidado" && (b.status === "pendente" || b.status === "ativa"))
      out.set(`b:${b.id}`, { kind: "batalha", text: `${b.createdBy.name} desafiou ${b.group ? `o grupo ${b.group.name}` : "você"}` });
  return out;
}

let newsListener: ((news: SocialNews[]) => void) | null = null;
/** O AppShell registra aqui quem mostra o aviso de novidades. */
export function onSocialNews(fn: ((news: SocialNews[]) => void) | null) {
  newsListener = fn;
}

function receive(next: SocialState) {
  const prev = store.data;
  set({ status: "ready", data: next });
  if (!prev || !newsListener) return;
  const before = waiting(prev);
  const news = [...waiting(next)].filter(([key]) => !before.has(key)).map(([, n]) => n);
  if (news.length) newsListener(news);
}

let inflight: Promise<void> | null = null;

export function loadSocial(opts: { silent?: boolean } = {}): Promise<void> {
  if (!opts.silent) set({ status: store.data ? "ready" : "loading" });
  // Evita duas consultas ao mesmo tempo (o relógio e a página podem pedir juntos).
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/social", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as { state?: SocialState } | null;
      if (!res.ok || !body?.state) throw new Error();
      receive(body.state);
    } catch {
      if (!opts.silent || !store.data) set({ status: "error" });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
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

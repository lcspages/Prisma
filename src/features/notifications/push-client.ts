"use client";

/**
 * Notificações (lembretes da manhã e da noite) no navegador / app instalado.
 * O service worker (/sw.js) mostra os avisos; o servidor envia pelo Web Push.
 */
import { useSyncExternalStore } from "react";
import { detectDevice, isStandalone } from "@/features/install/install-guide";

const PREFS_KEY = "prisma:lembretes";

export interface PushPrefs {
  manha: boolean;
  noite: boolean;
}

export type PushStatus =
  /** O navegador não tem notificações */
  | "sem-suporte"
  /** iPhone: só funciona com o Prisma instalado na tela inicial */
  | "instalar"
  /** A pessoa bloqueou as notificações nas configurações */
  | "bloqueado"
  | "desligado"
  | "ligado";

interface State {
  status: PushStatus | "carregando";
  prefs: PushPrefs;
  busy: boolean;
}

let state: State = { status: "carregando", prefs: { manha: true, noite: true }, busy: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const initial = state;
export const usePush = () => useSyncExternalStore(subscribe, () => state, () => initial);

function readPrefs(): PushPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<PushPrefs>;
      return { manha: v.manha !== false, noite: v.noite !== false };
    }
  } catch {
    /* sem armazenamento */
  }
  return { manha: true, noite: true };
}

function writePrefs(prefs: PushPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* sem armazenamento */
  }
}

function supported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** O que dá para fazer neste aparelho agora (sem pedir nada). */
function baseStatus(): PushStatus {
  if (typeof window === "undefined") return "sem-suporte";
  const { ios } = detectDevice();
  if (ios && !isStandalone()) return "instalar";
  if (!supported()) return "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  return "desligado";
}

let publicKey: string | null = null;
async function loadKey(): Promise<string | null> {
  if (publicKey) return publicKey;
  try {
    const res = await fetch("/api/notificacoes", { cache: "no-store" });
    const body = (await res.json()) as { publicKey?: string | null };
    publicKey = body.publicKey ?? null;
  } catch {
    publicKey = null;
  }
  return publicKey;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null;
  try {
    return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  } catch {
    return null;
  }
}

async function post(action: string, extra: Record<string, unknown>): Promise<{ ok: boolean; error?: string; device?: unknown }> {
  try {
    const res = await fetch("/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; device?: unknown };
    return res.ok ? { ok: true, device: body.device } : { ok: false, error: body.error ?? "Não deu certo agora. Tente de novo." };
  } catch {
    return { ok: false, error: "Sem conexão com a internet." };
  }
}

/**
 * Ao abrir o app: registra o service worker e confere se este aparelho continua
 * inscrito (o navegador pode trocar a inscrição; aí salvamos a nova).
 */
export async function initPush() {
  const prefs = readPrefs();
  const status = baseStatus();
  set({ prefs, status });
  void loadKey();
  if (status !== "desligado") return;
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription().catch(() => null);
  if (!sub || Notification.permission !== "granted") return;
  set({ status: "ligado" });
  const check = await post("estado", { subscription: sub.toJSON() });
  if (check.ok && !check.device) await post("salvar", { subscription: sub.toJSON(), ...prefs });
}

/** Liga os lembretes. Precisa ser chamado direto do toque no botão (exigência do iPhone). */
export async function enablePush(): Promise<string | null> {
  if (!supported()) return "Este navegador não recebe notificações.";
  set({ busy: true });
  try {
    // Pedir a permissão primeiro, ainda dentro do toque.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      set({ status: permission === "denied" ? "bloqueado" : "desligado" });
      return permission === "denied" ? "As notificações foram bloqueadas. Libere nas configurações do aparelho." : "Notificações não ativadas.";
    }
    const key = await loadKey();
    if (!key) return "As notificações ainda não estão disponíveis. Tente mais tarde.";
    const reg = await registration();
    if (!reg) return "Não foi possível preparar as notificações neste aparelho.";
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    const prefs = readPrefs();
    const res = await post("salvar", { subscription: sub.toJSON(), ...prefs });
    if (!res.ok) return res.error ?? "Não deu certo agora.";
    set({ status: "ligado", prefs });
    return null;
  } catch {
    return "Não foi possível ativar as notificações neste aparelho.";
  } finally {
    set({ busy: false });
  }
}

export async function disablePush(): Promise<string | null> {
  set({ busy: true });
  try {
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await post("remover", { subscription: sub.toJSON() });
      await sub.unsubscribe().catch(() => undefined);
    }
    set({ status: baseStatus() });
    return null;
  } finally {
    set({ busy: false });
  }
}

export async function setPushPrefs(prefs: PushPrefs): Promise<string | null> {
  writePrefs(prefs);
  set({ prefs });
  if (state.status !== "ligado") return null;
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const res = await post("salvar", { subscription: sub.toJSON(), ...prefs });
  return res.ok ? null : (res.error ?? "Não deu certo agora.");
}

export async function testPush(): Promise<string | null> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return "Ative as notificações neste aparelho primeiro.";
  const res = await post("teste", { subscription: sub.toJSON() });
  return res.ok ? null : (res.error ?? "Não deu certo agora.");
}

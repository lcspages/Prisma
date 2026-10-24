/**
 * Dados na nuvem: o navegador fala só com o servidor do Prisma (/api/dados),
 * que confere o login e a assinatura e grava no Supabase.
 */
import type { Workspace } from "@/types/domain";
import type { Delta } from "@/lib/ops";
import type { PrismaApi } from "./types";

async function call<T>(init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/dados", { cache: "no-store", ...init });
  } catch {
    throw new Error("sem conexão com a internet");
  }
  if (res.status === 401) {
    const back = window.location.pathname + window.location.search;
    window.location.assign(`/login?voltar=${encodeURIComponent(back)}`);
    throw new Error("sessão expirada");
  }
  if (res.status === 402) {
    window.location.assign("/assinatura");
    throw new Error("assinatura inativa");
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? "não foi possível falar com o servidor");
  return body;
}

export const remoteApi: PrismaApi = {
  getWorkspace() {
    return call<Workspace>();
  },
  run(name, args, ctx) {
    return call<Delta>({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, args, ctx }),
    });
  },
};

/**
 * Acesso ao Supabase a partir do servidor, só com fetch (sem dependências).
 *
 *   SUPABASE_URL              endereço do projeto (https://xxxx.supabase.co)
 *   SUPABASE_PUBLISHABLE_KEY  chave pública do projeto (sb_publishable_… ou anon)
 *   APP_DB_SECRET             chave do servidor: as funções prisma_* do banco só respondem com ela
 */

export function dbConfig() {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const secret = process.env.APP_DB_SECRET ?? "";
  return { url, key, secret, ready: Boolean(url && key && secret.length >= 32) };
}

export class DbError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Chama uma função prisma_* do banco. */
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { url, key, secret } = dbConfig();
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ p_secret: secret, ...args }),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let message = "falha no banco de dados";
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* resposta sem JSON */
    }
    throw new DbError(message, res.status);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Código de erro do Supabase Auth (ex.: invalid_credentials, weak_password) */
  code?: string;
  message?: string;
}

/** Chama o Supabase Auth. */
export async function authFetch<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; accessToken?: string; redirectTo?: string } = {},
): Promise<AuthResult<T>> {
  const { url, key } = dbConfig();
  const target = new URL(`${url}/auth/v1/${path.replace(/^\//, "")}`);
  if (init.redirectTo) target.searchParams.set("redirect_to", init.redirectTo);
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (init.accessToken) headers.Authorization = `Bearer ${init.accessToken}`;
  try {
    const res = await fetch(target, {
      method: init.method ?? "POST",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (res.ok) return { ok: true, status: res.status, data: data as T };
    const err = (data ?? {}) as { error_code?: string; code?: string | number; error?: string; msg?: string; message?: string; error_description?: string };
    return {
      ok: false,
      status: res.status,
      data: null,
      code: err.error_code ?? (typeof err.code === "string" ? err.code : undefined) ?? err.error,
      message: err.msg ?? err.message ?? err.error_description,
    };
  } catch {
    return { ok: false, status: 0, data: null, code: "network", message: "sem conexão com o Supabase" };
  }
}

/* ---------------------------------------------------------------- assinatura */

export interface Access {
  active: boolean;
  plan?: "mensal" | "vitalicio" | "cortesia";
  status: "ativa" | "atrasada" | "cancelada" | "reembolsada" | "chargeback" | "nenhuma";
  validUntil?: string | null;
}

export function getAccess(email: string) {
  return rpc<Access>("prisma_access", { p_email: email });
}

/* ---------------------------------------------------------------- limite de tentativas */

const WINDOW_SEC = 10 * 60;
const MAX_FAILS = 5;

/** Segundos que faltam para liberar (0 = pode tentar). */
export function secondsBlocked(keys: string[], max = MAX_FAILS) {
  return rpc<number>("prisma_login_blocked", { p_keys: keys, p_max: max, p_window_sec: WINDOW_SEC });
}

export function registerFailure(keys: string[]) {
  return rpc<null>("prisma_login_fail", { p_keys: keys });
}

export function clearFailures(keys: string[]) {
  return rpc<null>("prisma_login_ok", { p_keys: keys });
}

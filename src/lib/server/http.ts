import { authConfig, SESSION_COOKIE, verifySessionToken, type Session } from "@/lib/auth/session";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/** IP de quem fez o pedido (na Vercel vem em x-forwarded-for). */
export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** Sessão do cookie, conferida pela assinatura. */
export async function readSession(request: Request): Promise<Session | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return verifySessionToken(authConfig().secret, token);
}

/** Endereço público do app (para os links enviados por e-mail). */
export function appUrl(request: Request) {
  const fromEnv = process.env.APP_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Lê o corpo JSON com limite de tamanho. */
export async function readJson<T>(request: Request, maxBytes = 64 * 1024): Promise<T | null> {
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

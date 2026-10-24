/**
 * Sessão do cliente em cookie assinado (HMAC). A senha fica no Supabase Auth;
 * aqui só guardamos quem entrou. Usa apenas Web Crypto, então roda tanto no
 * proxy quanto nas rotas de API, sem dependências.
 *
 * Variável de ambiente:
 *   AUTH_SECRET  texto aleatório longo (32+ caracteres), usado para assinar a sessão
 */

export const SESSION_COOKIE = "prisma_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias, em segundos

const enc = new TextEncoder();

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Compara sem vazar, pelo tempo, onde os valores diferem. */
export function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export interface Session {
  /** id do usuário no Supabase Auth */
  uid: string;
  email: string;
  /** Expira em (ms desde 1970) */
  exp: number;
}

export async function createSessionToken(
  secret: string,
  user: { uid: string; email: string },
  maxAgeSec = SESSION_MAX_AGE,
): Promise<string> {
  const session: Session = { uid: user.uid, email: user.email.toLowerCase(), exp: Date.now() + maxAgeSec * 1000 };
  const payload = toB64url(enc.encode(JSON.stringify(session)));
  return `${payload}.${toB64url(await hmac(secret, payload))}`;
}

export async function verifySessionToken(secret: string, token: string | undefined | null): Promise<Session | null> {
  if (!token || !secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(await hmac(secret, payload), fromB64url(sig))) return null;
    const session = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Session;
    if (
      typeof session.uid !== "string" ||
      typeof session.email !== "string" ||
      typeof session.exp !== "number" ||
      session.exp < Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Lê a chave da sessão. Sem ela, ninguém entra (falha fechada). */
export function authConfig() {
  const secret = process.env.AUTH_SECRET ?? "";
  return { secret, ready: secret.length >= 32 };
}

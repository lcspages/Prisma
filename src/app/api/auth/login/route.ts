import { authConfig, createSessionToken } from "@/lib/auth/session";
import { sessionCookie } from "@/lib/auth/cookie";
import { clientIp, isEmail, json, normalizeEmail, readJson } from "@/lib/server/http";
import { authFetch, clearFailures, dbConfig, registerFailure, secondsBlocked, type AuthUser } from "@/lib/server/supabase";

/**
 * Entrar com e-mail e senha (Supabase Auth).
 * Limite: 5 erros a cada 10 minutos por endereço de internet e por e-mail,
 * guardado no banco (vale mesmo depois de o servidor reiniciar).
 */
export async function POST(request: Request) {
  const { secret, ready } = authConfig();
  if (!ready || !dbConfig().ready) return json({ error: "O login não está configurado no servidor." }, 503);

  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  if (!body) return json({ error: "Pedido inválido." }, 400);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!isEmail(email) || !password) return json({ error: "Preencha e-mail e senha." }, 400);

  const keys = [`ip:${clientIp(request)}`, `email:${email}`];
  try {
    const wait = await secondsBlocked(keys);
    if (wait > 0) {
      return json({ error: `Muitas tentativas. Tente de novo em ${Math.max(1, Math.ceil(wait / 60))} min.` }, 429);
    }
  } catch {
    return json({ error: "Não deu para entrar agora. Tente de novo em instantes." }, 502);
  }

  const res = await authFetch<{ user?: AuthUser }>("token?grant_type=password", { body: { email, password } });
  if (!res.ok || !res.data?.user) {
    if (res.status === 0 || res.status >= 500) return json({ error: "Não deu para entrar agora. Tente de novo em instantes." }, 502);
    if (res.code === "email_not_confirmed") {
      return json({ error: "Confirme seu e-mail pelo link que enviamos antes de entrar." }, 403);
    }
    if (res.status === 429) return json({ error: "Muitas tentativas. Aguarde alguns minutos." }, 429);
    await registerFailure(keys).catch(() => undefined);
    return json({ error: "E-mail ou senha incorretos." }, 401);
  }

  await clearFailures(keys).catch(() => undefined);
  const token = await createSessionToken(secret, { uid: res.data.user.id, email: res.data.user.email ?? email });
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}

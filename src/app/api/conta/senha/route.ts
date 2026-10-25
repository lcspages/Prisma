import { authConfig } from "@/lib/auth/session";
import { clientIp, json, readJson, readSession } from "@/lib/server/http";
import { authFetch, clearFailures, dbConfig, registerFailure, secondsBlocked } from "@/lib/server/supabase";

/**
 * Troca a senha de quem está logado: confere a senha atual no Supabase Auth
 * e grava a nova. Mesmo limite de tentativas do login.
 */
export async function POST(request: Request) {
  if (!authConfig().ready || !dbConfig().ready) return json({ error: "O servidor não está configurado." }, 503);
  const session = await readSession(request);
  if (!session) return json({ error: "Faça login para continuar." }, 401);

  const body = await readJson<{ current?: unknown; password?: unknown }>(request);
  const current = typeof body?.current === "string" ? body.current : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!current) return json({ error: "Digite a sua senha atual." }, 400);
  if (password.length < 8) return json({ error: "A nova senha precisa ter pelo menos 8 caracteres." }, 400);
  if (password.length > 72) return json({ error: "A nova senha pode ter no máximo 72 caracteres." }, 400);
  if (password === current) return json({ error: "A nova senha precisa ser diferente da atual." }, 400);

  const keys = [`ip:${clientIp(request)}`, `email:${session.email}`];
  try {
    const wait = await secondsBlocked(keys);
    if (wait > 0) return json({ error: `Muitas tentativas. Tente de novo em ${Math.max(1, Math.ceil(wait / 60))} min.` }, 429);
  } catch {
    return json({ error: "Não deu para trocar agora. Tente de novo em instantes." }, 502);
  }

  const login = await authFetch<{ access_token?: string; user?: { id?: string } }>("token?grant_type=password", {
    body: { email: session.email, password: current },
  });
  if (!login.ok || !login.data?.access_token || login.data.user?.id !== session.uid) {
    if (login.status === 0 || login.status >= 500) return json({ error: "Não deu para trocar agora. Tente de novo em instantes." }, 502);
    if (login.status === 429) return json({ error: "Muitas tentativas. Aguarde alguns minutos." }, 429);
    await registerFailure(keys).catch(() => undefined);
    return json({ error: "Senha atual incorreta." }, 401);
  }
  await clearFailures(keys).catch(() => undefined);

  const res = await authFetch("user", { method: "PUT", body: { password }, accessToken: login.data.access_token });
  if (!res.ok) {
    if (res.code === "weak_password") return json({ error: "Senha fraca. Use letras e números, com 8 caracteres ou mais." }, 400);
    if (res.code === "same_password") return json({ error: "A nova senha precisa ser diferente da atual." }, 400);
    return json({ error: "Não deu para trocar a senha agora. Tente de novo." }, 502);
  }
  return json({ ok: true });
}

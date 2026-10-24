import { authConfig, createSessionToken } from "@/lib/auth/session";
import { sessionCookie } from "@/lib/auth/cookie";
import { json, readJson } from "@/lib/server/http";
import { authFetch, dbConfig, type AuthUser } from "@/lib/server/supabase";

/**
 * Cria ou troca a senha usando o código do link enviado por e-mail
 * e já deixa a pessoa logada.
 */
export async function POST(request: Request) {
  const { secret, ready } = authConfig();
  if (!ready || !dbConfig().ready) return json({ error: "O servidor não está configurado." }, 503);

  const body = await readJson<{ accessToken?: unknown; password?: unknown }>(request);
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!accessToken) return json({ error: "Link inválido. Peça um novo link." }, 400);
  if (password.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
  if (password.length > 72) return json({ error: "A senha pode ter no máximo 72 caracteres." }, 400);

  let res = await authFetch<AuthUser>("user", { method: "PUT", body: { password }, accessToken });
  // Mesma senha de antes: o link já provou que o e-mail é dela, então só entra.
  if (!res.ok && res.code === "same_password") {
    res = await authFetch<AuthUser>("user", { method: "GET", accessToken });
  }
  if (!res.ok || !res.data?.id) {
    if (res.status === 401 || res.status === 403) {
      return json({ error: "Este link expirou ou já foi usado. Peça um novo link." }, 401);
    }
    if (res.code === "weak_password") return json({ error: "Senha fraca. Use letras e números, com 8 caracteres ou mais." }, 400);
    return json({ error: "Não deu para salvar a senha agora. Tente de novo." }, 502);
  }

  const token = await createSessionToken(secret, { uid: res.data.id, email: res.data.email });
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}

import { appUrl, clientIp, isEmail, json, normalizeEmail, readJson } from "@/lib/server/http";
import { authFetch, dbConfig, getAccess, registerFailure, secondsBlocked } from "@/lib/server/supabase";

/**
 * Envia por e-mail o link para criar ou trocar a senha.
 *   tipo "primeiro-acesso": só para quem tem compra com esse e-mail (cria a conta)
 *   tipo "esqueci":         para quem já tem conta
 * A resposta é sempre a mesma, para não revelar quem é cliente.
 */
export async function POST(request: Request) {
  if (!dbConfig().ready) return json({ error: "O servidor não está configurado." }, 503);
  const body = await readJson<{ email?: unknown; tipo?: unknown }>(request);
  const email = normalizeEmail(body?.email);
  const tipo = body?.tipo === "esqueci" ? "esqueci" : "primeiro-acesso";
  if (!isEmail(email)) return json({ error: "Digite um e-mail válido." }, 400);

  // No máximo 5 pedidos de link a cada 10 minutos por endereço e por e-mail.
  const keys = [`link-ip:${clientIp(request)}`, `link:${email}`];
  try {
    if ((await secondsBlocked(keys)) > 0) {
      return json({ error: "Você pediu muitos links. Aguarde alguns minutos e confira sua caixa de entrada e o spam." }, 429);
    }
    await registerFailure(keys);
  } catch {
    return json({ error: "Não deu para enviar agora. Tente de novo em instantes." }, 502);
  }

  const redirectTo = `${appUrl(request)}/definir-senha`;
  let sent = { ok: true, status: 200 } as { ok: boolean; status: number };
  if (tipo === "primeiro-acesso") {
    const access = await getAccess(email).catch(() => null);
    if (access && access.status !== "nenhuma") {
      sent = await authFetch("otp", { body: { email, create_user: true }, redirectTo });
    }
  } else {
    sent = await authFetch("recover", { body: { email }, redirectTo });
  }
  if (!sent.ok && (sent.status === 0 || sent.status >= 500 || sent.status === 429)) {
    return json({ error: "Não deu para enviar o e-mail agora. Tente de novo em alguns minutos." }, 502);
  }
  return json({ ok: true });
}

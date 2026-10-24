import { json, readSession } from "@/lib/server/http";
import { dbConfig, getAccess } from "@/lib/server/supabase";

/** Situação da assinatura de quem está logado. */
export async function GET(request: Request) {
  if (!dbConfig().ready) return json({ error: "Banco de dados não configurado." }, 503);
  const session = await readSession(request);
  if (!session) return json({ error: "Faça login para continuar." }, 401);
  try {
    const access = await getAccess(session.email);
    return json({ email: session.email, ...access });
  } catch {
    return json({ error: "Não foi possível consultar a assinatura." }, 502);
  }
}

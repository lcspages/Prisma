import { json, readJson, readSession } from "@/lib/server/http";
import { dbConfig, getAccess, rpc } from "@/lib/server/supabase";

/** Amigos, grupos e batalhas. GET = situação atual; POST = uma ação. */
const ACTIONS = new Set([
  "adicionar",
  "responder-amigo",
  "remover-amigo",
  "criar-grupo",
  "responder-grupo",
  "convidar-grupo",
  "sair-grupo",
  "criar-batalha",
  "responder-batalha",
  "cancelar-batalha",
  "encerrar-batalha",
  "manter-batalha",
]);

async function run(request: Request, action: string, args: unknown) {
  if (!dbConfig().ready) return json({ error: "Banco de dados não configurado." }, 503);
  const session = await readSession(request);
  if (!session) return json({ error: "Faça login para continuar." }, 401);
  try {
    const access = await getAccess(session.email);
    if (!access.active) return json({ error: "Assinatura inativa.", access }, 402);
    const result = await rpc<{ state: unknown; error?: string }>("prisma_social", {
      p_user: session.uid,
      p_action: action,
      p_args: args ?? {},
    });
    return json(result, result.error ? 422 : 200);
  } catch {
    return json({ error: "Não foi possível falar com o servidor agora." }, 502);
  }
}

export async function GET(request: Request) {
  return run(request, "estado", {});
}

export async function POST(request: Request) {
  const body = await readJson<{ action?: unknown; args?: unknown }>(request);
  if (!body || typeof body.action !== "string" || !ACTIONS.has(body.action)) return json({ error: "Pedido inválido." }, 400);
  const args = body.args && typeof body.args === "object" && !Array.isArray(body.args) ? body.args : {};
  return run(request, body.action, args);
}

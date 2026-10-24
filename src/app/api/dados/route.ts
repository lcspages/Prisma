import { json, readJson, readSession } from "@/lib/server/http";
import { dbConfig } from "@/lib/server/supabase";
import { loadWorkspace, OpError, parseOp, runAndSave } from "@/lib/server/workspace";

/** Dados do cliente logado. 401 = sem login, 402 = assinatura inativa. */
export async function GET(request: Request) {
  if (!dbConfig().ready) return json({ error: "Banco de dados não configurado." }, 503);
  const session = await readSession(request);
  if (!session) return json({ error: "Faça login para continuar." }, 401);
  try {
    const { access, workspace } = await loadWorkspace(session.uid, session.email);
    if (!workspace) return json({ error: "Assinatura inativa.", access }, 402);
    return json(workspace);
  } catch {
    return json({ error: "Não foi possível carregar os dados." }, 502);
  }
}

/** Executa uma ação (criar, concluir, excluir…) e devolve o resultado oficial. */
export async function POST(request: Request) {
  if (!dbConfig().ready) return json({ error: "Banco de dados não configurado." }, 503);
  const session = await readSession(request);
  if (!session) return json({ error: "Faça login para continuar." }, 401);
  const body = await readJson<unknown>(request, 2 * 1024 * 1024);
  if (!body) return json({ error: "Pedido inválido." }, 400);
  try {
    const { name, args, ctx } = parseOp(body);
    const { access, workspace } = await loadWorkspace(session.uid, session.email);
    if (!workspace) return json({ error: "Assinatura inativa.", access }, 402);
    const delta = await runAndSave(session.uid, workspace, name, args, ctx);
    return json(delta);
  } catch (err) {
    if (err instanceof OpError) return json({ error: err.message }, 422);
    return json({ error: "Não foi possível salvar agora." }, 502);
  }
}

/**
 * Notificações do aparelho.
 * GET  → chave pública (para o navegador inscrever o aparelho).
 * POST → { action: "salvar" | "remover" | "estado" | "teste", subscription?, manha?, noite? }
 */
import { json, readJson, readSession } from "@/lib/server/http";
import { dbConfig, getAccess, rpc } from "@/lib/server/supabase";
import { isPushEndpoint, sendPush, vapidConfig } from "@/lib/server/webpush";

interface SubscriptionJson {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

const ACTIONS = new Set(["salvar", "remover", "estado", "teste"]);
/** Último teste por pessoa (evita apertar o botão sem parar). */
const lastTest = new Map<string, number>();

export async function GET() {
  const { publicKey, ready } = vapidConfig();
  return json({ ready, publicKey: ready ? publicKey : null });
}

export async function POST(request: Request) {
  if (!dbConfig().ready) return json({ error: "Banco de dados não configurado." }, 503);
  if (!vapidConfig().ready) return json({ error: "As notificações ainda não estão disponíveis." }, 503);
  const session = await readSession(request);
  if (!session) return json({ error: "Faça login para continuar." }, 401);

  const body = await readJson<{ action?: unknown; subscription?: SubscriptionJson; manha?: unknown; noite?: unknown }>(request);
  const action = typeof body?.action === "string" ? body.action : "";
  if (!ACTIONS.has(action)) return json({ error: "Pedido inválido." }, 400);

  const sub = body?.subscription;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  if (!isPushEndpoint(endpoint)) return json({ error: "Este navegador não tem um serviço de notificação conhecido." }, 400);

  try {
    if (action === "salvar") {
      const access = await getAccess(session.email);
      if (!access.active) return json({ error: "Assinatura inativa." }, 402);
      if (!p256dh || !auth) return json({ error: "Pedido inválido." }, 400);
      const device = await rpc("prisma_push", {
        p_user: session.uid,
        p_action: "salvar",
        p_args: { endpoint, p256dh, auth, manha: body?.manha !== false, noite: body?.noite !== false },
      });
      return json({ device });
    }
    if (action === "remover") {
      await rpc("prisma_push", { p_user: session.uid, p_action: "remover", p_args: { endpoint } });
      return json({ device: null });
    }
    const device = await rpc<{ endpoint: string } | null>("prisma_push", {
      p_user: session.uid,
      p_action: "estado",
      p_args: { endpoint },
    });
    if (action === "estado") return json({ device });

    // Teste: só para um aparelho que já está salvo para esta pessoa.
    if (!device || !p256dh || !auth) return json({ error: "Ative as notificações neste aparelho primeiro." }, 409);
    const last = lastTest.get(session.uid) ?? 0;
    if (Date.now() - last < 20_000) return json({ error: "Espere alguns segundos para testar de novo." }, 429);
    lastTest.set(session.uid, Date.now());
    const result = await sendPush(
      { endpoint, p256dh, auth },
      { title: "Prisma", body: "Tudo certo! Os lembretes vão chegar assim.", url: "/hoje", tag: "teste" },
    );
    if (result === "gone") {
      await rpc("prisma_push", { p_user: session.uid, p_action: "remover", p_args: { endpoint } }).catch(() => undefined);
      return json({ error: "Este aparelho parou de aceitar notificações. Ative de novo." }, 410);
    }
    if (result !== "ok") return json({ error: "O serviço de notificação não respondeu. Tente de novo." }, 502);
    return json({ device, sent: true });
  } catch {
    return json({ error: "Não foi possível falar com o servidor agora." }, 502);
  }
}

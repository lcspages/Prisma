import { json } from "@/lib/server/http";
import { toChange, validSignature } from "@/lib/server/kiwify";
import { dbConfig, rpc } from "@/lib/server/supabase";

/** Guarda só o necessário do aviso (sem CPF, telefone ou endereço do cliente). */
function summary(p: Record<string, unknown>) {
  const o = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const sub = o(p.Subscription ?? p.subscription);
  return {
    webhook_event_type: p.webhook_event_type,
    order_id: p.order_id,
    order_status: p.order_status,
    payment_method: p.payment_method,
    approved_date: p.approved_date,
    subscription_id: p.subscription_id,
    customer_email: o(p.Customer ?? p.customer).email,
    product_id: o(p.Product ?? p.product).product_id,
    product_name: o(p.Product ?? p.product).product_name,
    subscription: {
      status: sub.status,
      next_payment: sub.next_payment,
      customer_access: sub.customer_access,
      plan: o(sub.plan).name,
    },
  };
}

/**
 * Recebe os avisos da Kiwify (compra aprovada, renovação, atraso, cancelamento,
 * reembolso, chargeback) e atualiza a assinatura do cliente.
 *
 *   KIWIFY_WEBHOOK_TOKEN   token do webhook na Kiwify (pode ter dois, separados por vírgula, na troca)
 *   KIWIFY_PRODUCT_IDS     opcional: só aceita esses produtos (ids separados por vírgula)
 */
export async function POST(request: Request) {
  const tokens = (process.env.KIWIFY_WEBHOOK_TOKEN ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  if (!tokens.length || !dbConfig().ready) return json({ error: "não configurado" }, 503);

  const raw = await request.text();
  if (raw.length > 512 * 1024) return json({ error: "grande demais" }, 413);
  const signature = new URL(request.url).searchParams.get("signature");
  if (!(await validSignature(raw, signature, tokens))) return json({ error: "assinatura inválida" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const orderId = typeof payload.order_id === "string" ? payload.order_id : null;
  const event = typeof payload.webhook_event_type === "string" ? payload.webhook_event_type : null;
  // Carrinho abandonado e outros formatos: confirma o recebimento e ignora.
  if (!orderId || !event) return json({ ok: true, result: "ignorado" });

  const productIds = (process.env.KIWIFY_PRODUCT_IDS ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const change = toChange(payload, { productIds });
  try {
    const result = await rpc<string>("prisma_kiwify", {
      p_order_id: orderId,
      p_event: event,
      p_payload: summary(payload),
      p_change: change,
    });
    return json({ ok: true, result });
  } catch {
    // Erro do nosso lado: a Kiwify tenta de novo depois.
    return json({ error: "falha ao salvar" }, 500);
  }
}

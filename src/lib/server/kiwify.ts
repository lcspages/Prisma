/**
 * Avisos (webhooks) da Kiwify.
 * Docs: https://docs.kiwify.com.br/api-reference/webhooks/receiving
 *       https://docs.kiwify.com.br/api-reference/webhooks/subscription-events
 *
 * A Kiwify manda ?signature=<HMAC-SHA1 do corpo cru, em hex> usando o token
 * do webhook como chave (KIWIFY_WEBHOOK_TOKEN).
 */

const enc = new TextEncoder();

export async function validSignature(rawBody: string, signature: string | null, tokens: string[]): Promise<boolean> {
  if (!signature || !/^[0-9a-f]{40}$/i.test(signature)) return false;
  const given = signature.toLowerCase();
  let ok = false;
  for (const token of tokens) {
    if (!token) continue;
    const key = await crypto.subtle.importKey("raw", enc.encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
    const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
    let diff = 0;
    for (let i = 0; i < 40; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
    if (diff === 0) ok = true;
  }
  return ok;
}

export interface SubscriptionChange {
  email: string;
  plan: "mensal" | "vitalicio";
  plan_name: string | null;
  status: "ativa" | "atrasada" | "cancelada" | "reembolsada" | "chargeback";
  valid_until: string | null;
  keep_until?: boolean;
  subscription_id: string | null;
  order_id: string;
  product_id: string | null;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

/** Datas da assinatura vêm em UTC, às vezes sem o "Z". */
function utcDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(" ", "T")}Z`;
  const t = Date.parse(withZone);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * Traduz o aviso para a mudança na assinatura.
 * null = aviso que não muda acesso (Pix gerado, boleto, recusado…) ou de outro produto.
 */
export function toChange(payload: unknown, opts: { productIds: string[]; now?: Date }): SubscriptionChange | null {
  const p = obj(payload);
  const now = (opts.now ?? new Date()).toISOString();
  const event = str(p.webhook_event_type);
  const orderId = str(p.order_id);
  const customer = obj(p.Customer ?? p.customer);
  const product = obj(p.Product ?? p.product);
  const sub = obj(p.Subscription ?? p.subscription);
  const access = obj(sub.customer_access);
  const email = (str(customer.email) ?? "").toLowerCase();
  const productId = str(product.product_id) ?? str(p.product_id);
  const subscriptionId = str(p.subscription_id) ?? str(sub.id);

  if (!event || !orderId || !email.includes("@")) return null;
  if (opts.productIds.length && (!productId || !opts.productIds.includes(productId))) return null;

  const accessUntil = utcDate(access.access_until) ?? utcDate(sub.next_payment);
  const base = {
    email,
    plan: subscriptionId ? ("mensal" as const) : ("vitalicio" as const),
    plan_name: str(obj(sub.plan).name) ?? str(product.product_name),
    subscription_id: subscriptionId,
    order_id: orderId,
    product_id: productId,
  };

  switch (event) {
    case "order_approved":
    case "subscription_renewed": {
      if (str(p.order_status) !== "paid") return null;
      if (!subscriptionId) return { ...base, status: "ativa", valid_until: null };
      // Sem a data do período pago, libera 35 dias (o próximo aviso corrige).
      const fallback = new Date(Date.now() + 35 * 86_400_000).toISOString();
      return { ...base, status: "ativa", valid_until: accessUntil ?? fallback };
    }
    case "subscription_late":
      return { ...base, status: "atrasada", valid_until: utcDate(access.access_until), keep_until: !utcDate(access.access_until) };
    case "subscription_canceled":
      return { ...base, status: "cancelada", valid_until: access.has_access === false ? now : (accessUntil ?? now) };
    case "order_refunded":
      return { ...base, status: "reembolsada", valid_until: now };
    case "chargeback":
      return { ...base, status: "chargeback", valid_until: now };
    default:
      return null;
  }
}

/**
 * Envio dos lembretes diários. Chamado pela Vercel (vercel.json → crons) de manhã e à noite:
 * /api/cron/lembretes?turno=manha e ?turno=noite. Só aceita o pedido com o CRON_SECRET.
 */
import { timingSafeEqual } from "node:crypto";
import { json } from "@/lib/server/http";
import { dbConfig, rpc } from "@/lib/server/supabase";
import { buildReminder, todayInBrazil, type ReminderTarget, type Turno } from "@/lib/server/reminders";
import { sendPush, vapidConfig, type PushTarget } from "@/lib/server/webpush";

export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (secret.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!authorized(request)) return json({ error: "Não autorizado." }, 401);
  const turno = new URL(request.url).searchParams.get("turno") as Turno | null;
  if (turno !== "manha" && turno !== "noite") return json({ error: "Turno inválido." }, 400);
  if (!dbConfig().ready || !vapidConfig().ready) return json({ error: "Notificações não configuradas." }, 503);

  const today = todayInBrazil();
  const targets = await rpc<Array<PushTarget & ReminderTarget>>("prisma_push_targets", { p_turno: turno, p_today: today });

  let sent = 0;
  let gone = 0;
  let failed = 0;
  // Envia em lotes para não abrir centenas de conexões de uma vez.
  for (let i = 0; i < targets.length; i += 25) {
    const batch = targets.slice(i, i + 25);
    const results = await Promise.all(
      batch.map(async (t) => {
        const result = await sendPush(t, buildReminder(turno, t, today));
        if (result === "gone") await rpc("prisma_push_gone", { p_endpoint: t.endpoint }).catch(() => undefined);
        return result;
      }),
    );
    for (const r of results) {
      if (r === "ok") sent++;
      else if (r === "gone") gone++;
      else failed++;
    }
  }
  return json({ turno, today, sent, gone, failed });
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { LuCreditCard, LuInfinity, LuLifeBuoy, LuLogOut, LuRefreshCw } from "react-icons/lu";
import { COMPANY, CHECKOUT_URL, CHECKOUT_URL_LIFETIME } from "@/lib/legal";
import { logout } from "@/components/layout/logout-button";
import { AuthShell } from "../auth-ui";

interface Status {
  email: string;
  active: boolean;
  status: "ativa" | "atrasada" | "cancelada" | "reembolsada" | "chargeback" | "nenhuma";
  plan?: string;
  validUntil?: string | null;
}

function describe(s: Status): { title: string; body: string } {
  const until = s.validUntil ? new Date(s.validUntil).toLocaleDateString("pt-BR") : null;
  switch (s.status) {
    case "nenhuma":
      return {
        title: "Nenhuma assinatura encontrada",
        body: `Não encontramos compra do Prisma para ${s.email}. Se você comprou com outro e-mail, saia e entre com ele.`,
      };
    case "atrasada":
      return { title: "Pagamento pendente", body: "A renovação da sua assinatura não foi paga. Regularize o pagamento para voltar a usar o Prisma." };
    case "cancelada":
      return { title: "Assinatura encerrada", body: `Sua assinatura foi cancelada${until ? ` e o acesso terminou em ${until}` : ""}. Assine de novo para continuar de onde parou.` };
    case "reembolsada":
      return { title: "Compra reembolsada", body: "Esta compra foi reembolsada, então o acesso foi encerrado." };
    case "chargeback":
      return { title: "Acesso suspenso", body: "O pagamento foi contestado junto ao banco, então o acesso foi suspenso. Fale com o suporte se for um engano." };
    default:
      return { title: "Assinatura inativa", body: `Seu acesso terminou${until ? ` em ${until}` : ""}. Renove para continuar.` };
  }
}

export function SubscriptionStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setFailed(false);
    try {
      const res = await fetch("/api/assinatura", { cache: "no-store" });
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      const body = (await res.json()) as Status;
      if (!res.ok) throw new Error();
      if (body.active) {
        window.location.assign("/hoje");
        return;
      }
      setStatus(body);
    } catch {
      setFailed(true);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const info = status ? describe(status) : null;
  const button = "flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl font-semibold transition-colors";

  return (
    <AuthShell
      title={info?.title ?? (failed ? "Não deu para verificar" : "Verificando…")}
      subtitle={info?.body ?? (failed ? "Confira a internet e tente de novo." : "Só um instante.")}
    >
      <div className="mt-7 space-y-3">
        {CHECKOUT_URL && status && status.status !== "chargeback" && (
          <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className={`${button} bg-primary text-on-primary hover:brightness-95`}>
            <LuCreditCard className="size-5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{status.status === "nenhuma" ? "Assinar o plano mensal" : "Renovar plano mensal"}</span>
          </a>
        )}
        {CHECKOUT_URL_LIFETIME && status && status.status !== "chargeback" && (
          <a
            href={CHECKOUT_URL_LIFETIME}
            target="_blank"
            rel="noopener noreferrer"
            className={`${button} ${CHECKOUT_URL ? "border border-primary/40 text-ink hover:bg-surface-2" : "bg-primary text-on-primary hover:brightness-95"}`}
          >
            <LuInfinity className="size-5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">Comprar o plano vitalício</span>
          </a>
        )}
        <button type="button" onClick={() => void check()} disabled={checking} className={`${button} border border-line text-ink hover:bg-surface-2 disabled:opacity-60`}>
          <LuRefreshCw className={`size-[18px] ${checking ? "animate-spin" : ""}`} aria-hidden />
          {checking ? "Verificando…" : "Já paguei, verificar de novo"}
        </button>
        <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent("Acesso ao Prisma")}`} className={`${button} border border-line text-ink-2 hover:bg-surface-2 hover:text-ink`}>
          <LuLifeBuoy className="size-[18px]" aria-hidden />
          Falar com o suporte
        </a>
        <button type="button" onClick={() => void logout()} className={`${button} text-ink-3 hover:text-ink`}>
          <LuLogOut className="size-[18px] shrink-0" aria-hidden />
          <span className="min-w-0 truncate">Sair{status ? ` (${status.email})` : ""}</span>
        </button>
      </div>
    </AuthShell>
  );
}

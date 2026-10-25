"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { LuChevronRight, LuCirclePlay, LuCrown, LuKeyRound, LuMail, LuPalette, LuSmartphone, LuUserRound } from "react-icons/lu";
import type { Workspace } from "@/types/domain";
import { COMPANY } from "@/lib/legal";
import { updateDisplayName } from "@/lib/store/app-store";
import { levelFromXp } from "@/features/gamification/lib/xp";
import { openInstallGuide } from "@/features/install/install-guide";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { ThemeSwitch } from "@/components/layout/theme-switch";
import { LogoutButton } from "@/components/layout/logout-button";
import { LegalLinks } from "@/components/layout/legal-links";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Page, PageHeader, ProgressBar } from "@/components/ui/page";

interface Account {
  email: string;
  active: boolean;
  plan?: "mensal" | "vitalicio" | "cortesia";
  status: string;
  validUntil?: string | null;
}

export function ProfilePage() {
  return <WorkspaceGate>{(data) => <ProfileContent data={data} />}</WorkspaceGate>;
}

function Card({ icon: Icon, title, children, id }: { icon: IconType; title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <h2 id={id} className="flex items-center gap-2.5 font-semibold text-ink">
        <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary-ink">
          <Icon className="size-4" aria-hidden />
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileContent({ data }: { data: Workspace }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [accountFailed, setAccountFailed] = useState(false);
  const level = levelFromXp(data.profile.totalXp);

  useEffect(() => {
    let alive = true;
    fetch("/api/assinatura", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const body = (await res.json()) as Account;
        if (alive) setAccount(body);
      })
      .catch(() => alive && setAccountFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Page>
      <PageHeader title="Perfil" description="Seus dados, sua senha e as preferências do app." />

      <div className="mb-5 flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-title font-semibold text-on-accent">
          {data.profile.displayName.charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lead font-semibold text-ink">{data.profile.displayName || "Sem nome"}</p>
          {account?.email && <p className="truncate text-meta text-ink-2">{account.email}</p>}
          <div className="mt-2 flex items-center gap-3">
            <span className="shrink-0 text-meta font-semibold text-accent-ink">Nível {level.level}</span>
            <ProgressBar value={level.current} max={level.needed} tone="accent" label={`Progresso para o nível ${level.level + 1}`} className="max-w-[200px] flex-1" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <NameCard current={data.profile.displayName} />
        <PlanCard account={account} failed={accountFailed} />
        <PasswordCard email={account?.email ?? null} />
        <div className="space-y-5">
          <Card icon={LuPalette} title="Aparência" id="perfil-tema">
            <ThemeSwitch />
            <p className="mt-2 text-meta text-ink-3">Claro, escuro ou igual ao do seu celular/computador.</p>
          </Card>
          <Card icon={LuSmartphone} title="Ajuda e app no celular" id="perfil-ajuda">
            <ul className="-mx-2 space-y-0.5">
              <RowButton icon={LuSmartphone} label="Instalar o Prisma no celular" onClick={openInstallGuide} />
              <RowLink icon={LuCirclePlay} label="Tutoriais em vídeo" href="/tutoriais" />
              <RowLink icon={LuMail} label={`Falar com o suporte (${COMPANY.email})`} href={`mailto:${COMPANY.email}`} external />
            </ul>
          </Card>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-sm">
        <LogoutButton withLabel />
        <LegalLinks className="mt-4" />
      </div>
    </Page>
  );
}

const rowClass = "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-ink transition-colors hover:bg-surface-2";

function RowButton({ icon: Icon, label, onClick }: { icon: IconType; label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={rowClass}>
        <Icon className="size-4 shrink-0 text-ink-2" aria-hidden />
        <span className="min-w-0 flex-1">{label}</span>
        <LuChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
      </button>
    </li>
  );
}

function RowLink({ icon: Icon, label, href, external }: { icon: IconType; label: string; href: string; external?: boolean }) {
  const inner = (
    <>
      <Icon className="size-4 shrink-0 text-ink-2" aria-hidden />
      <span className="min-w-0 flex-1 break-words">{label}</span>
      <LuChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
    </>
  );
  return (
    <li>
      {external ? (
        <a href={href} className={rowClass}>
          {inner}
        </a>
      ) : (
        <Link href={href} className={rowClass}>
          {inner}
        </Link>
      )}
    </li>
  );
}

function NameCard({ current }: { current: string }) {
  const [name, setName] = useState(current);
  useEffect(() => setName(current), [current]);
  const clean = name.replace(/\s+/g, " ").trim();
  const changed = clean !== current && clean.length > 0;

  return (
    <Card icon={LuUserRound} title="Seu nome" id="perfil-nome">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) updateDisplayName(clean);
        }}
      >
        <Field label="Como o Prisma chama você" htmlFor="perfil-nome-input" hint="Aparece na saudação da tela Hoje.">
          <Input id="perfil-nome-input" value={name} maxLength={40} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" className="mt-4" disabled={!changed}>
          Salvar nome
        </Button>
      </form>
    </Card>
  );
}

function PlanCard({ account, failed }: { account: Account | null; failed: boolean }) {
  let title = "Carregando…";
  let body = "";
  if (failed) {
    title = "Não deu para ver o plano agora";
    body = "Confira a conexão e abra esta página de novo.";
  } else if (account) {
    const until = account.validUntil ? new Date(account.validUntil).toLocaleDateString("pt-BR") : null;
    if (account.plan === "vitalicio") {
      title = "Plano vitalício";
      body = "Pago uma vez. Sem novas cobranças enquanto o Prisma estiver em operação.";
    } else if (account.plan === "mensal") {
      title = "Plano mensal";
      body = until ? `Ativo, com renovação automática. Pago até ${until}.` : "Ativo, com renovação automática todo mês.";
    } else if (account.plan === "cortesia") {
      title = "Acesso cortesia";
      body = until ? `Liberado até ${until}.` : "Liberado pela equipe do Prisma.";
    } else {
      title = account.active ? "Acesso ativo" : "Sem plano ativo";
    }
  }
  return (
    <Card icon={LuCrown} title="Seu plano" id="perfil-plano">
      <p className="font-semibold text-ink" aria-live="polite">
        {title}
      </p>
      {body && <p className="mt-1 text-ink-2">{body}</p>}
      <p className="mt-4 text-meta text-ink-3">
        Para cancelar, trocar o cartão ou tirar dúvidas sobre pagamento, escreva para{" "}
        <a href={`mailto:${COMPANY.email}`} className="font-semibold text-primary-ink hover:underline">
          {COMPANY.email}
        </a>
        . Veja também a{" "}
        <Link href="/reembolso" className="font-semibold text-primary-ink hover:underline">
          política de reembolso
        </Link>
        .
      </p>
    </Card>
  );
}

function PasswordCard({ email }: { email: string | null }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setMessage(null);
    if (next.length < 8) return setMessage({ ok: false, text: "A nova senha precisa ter pelo menos 8 caracteres." });
    if (next !== confirm) return setMessage({ ok: false, text: "A confirmação não está igual à nova senha." });
    setBusy(true);
    try {
      const res = await fetch("/api/conta/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, password: next }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Não deu para trocar a senha agora.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ ok: true, text: "Senha trocada. Use a nova senha no próximo login." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Não deu para trocar a senha agora." });
    } finally {
      setBusy(false);
    }
  };

  const sendLink = async () => {
    if (!email) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/enviar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tipo: "esqueci" }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Não deu para enviar agora.");
      setMessage({ ok: true, text: `Enviamos um link para ${email}. Abra o e-mail para criar uma senha nova (confira o spam).` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Não deu para enviar agora." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={LuKeyRound} title="Trocar senha" id="perfil-senha">
      <form onSubmit={submit} className="space-y-3">
        {email && <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />}
        <Field label="Senha atual" htmlFor="senha-atual">
          <Input id="senha-atual" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="Nova senha" htmlFor="senha-nova" hint="Pelo menos 8 caracteres.">
          <Input id="senha-nova" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} maxLength={72} />
        </Field>
        <Field label="Repita a nova senha" htmlFor="senha-confirma">
          <Input id="senha-confirma" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required maxLength={72} />
        </Field>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-meta font-semibold text-[#1f9d55]" : "text-meta font-semibold text-[#d93d42]"}>
            {message.text}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Aguarde…" : "Trocar senha"}
          </Button>
          {email && (
            <Button type="button" variant="ghost" disabled={busy} onClick={sendLink}>
              Esqueci a senha atual
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

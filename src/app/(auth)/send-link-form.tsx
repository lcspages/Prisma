"use client";

import Link from "next/link";
import { useState } from "react";
import { LuArrowLeft, LuMail, LuMailCheck, LuSend } from "react-icons/lu";
import { ErrorAlert, postJson, SubmitButton, TextField } from "./auth-ui";

/** Pede o link por e-mail (primeiro acesso ou esqueci a senha). */
export function SendLinkForm({ tipo, hint }: { tipo: "primeiro-acesso" | "esqueci"; hint: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Digite um e-mail válido.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/enviar-link", { email: value, tipo });
    setBusy(false);
    if (res.ok) setSentTo(value);
    else setError(res.error);
  };

  if (sentTo) {
    return (
      <div className="mt-7">
        <div className="flex gap-3 rounded-2xl bg-primary-soft p-4">
          <LuMailCheck className="mt-0.5 size-5 shrink-0 text-primary-ink" aria-hidden />
          <div role="status">
            <p className="font-semibold text-ink">Confira seu e-mail</p>
            <p className="mt-1 text-meta text-ink-2">
              {tipo === "primeiro-acesso"
                ? `Se ${sentTo} tiver uma compra do Prisma, você vai receber em instantes um link para criar sua senha.`
                : `Se ${sentTo} tiver uma conta no Prisma, você vai receber em instantes um link para criar uma nova senha.`}{" "}
              Não chegou? Veja a caixa de spam e as promoções.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-4 w-full rounded-2xl border border-line py-3 font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Usar outro e-mail
        </button>
        <BackToLogin />
      </div>
    );
  }

  return (
    <>
      <form
        className="mt-7 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField
          id="link-email"
          label="E-mail"
          icon={LuMail}
          type="email"
          inputMode="email"
          autoFocus
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          invalid={Boolean(error)}
        />
        <p className="text-meta text-ink-3">{hint}</p>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <SubmitButton busy={busy} icon={LuSend} busyLabel="Enviando…">
          Enviar link
        </SubmitButton>
      </form>
      <BackToLogin />
    </>
  );
}

function BackToLogin() {
  return (
    <Link href="/login" className="mt-5 flex items-center justify-center gap-1.5 text-meta font-semibold text-ink-2 hover:text-ink">
      <LuArrowLeft className="size-4" aria-hidden />
      Voltar para o login
    </Link>
  );
}

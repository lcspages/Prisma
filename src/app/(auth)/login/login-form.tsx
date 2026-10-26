"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuLogIn, LuMail, LuSparkles } from "react-icons/lu";
import { ErrorAlert, PasswordField, postJson, SubmitButton, TextField } from "../auth-ui";

/** Só aceita voltar para um caminho do próprio app (nunca para outro site). */
function safeReturnPath(): string {
  try {
    const value = new URLSearchParams(window.location.search).get("voltar");
    // "/\\site.com" e "//site.com" levam a outro site em alguns navegadores: recusados.
    if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.startsWith("/login")) return value;
  } catch {
    /* ignora */
  }
  return "/hoje";
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Link do e-mail que caiu aqui (endereço do site sem /definir-senha): segue para lá.
  useEffect(() => {
    const hash = window.location.hash;
    if (/access_token=|error_description=/.test(hash)) window.location.replace(`/definir-senha${hash}`);
  }, []);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/login", { email: email.trim(), password });
    if (res.ok) {
      // Recarrega de verdade para o servidor já enxergar a sessão.
      window.location.assign(safeReturnPath());
      return;
    }
    setError(res.error);
    setPassword("");
    setBusy(false);
  };

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
          id="login-email"
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

        <div>
          <PasswordField
            id="login-pass"
            label="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
          />
          <div className="mt-2 text-right">
            <Link href="/esqueci-senha" className="text-meta font-semibold text-primary-ink hover:underline">
              Esqueci a senha
            </Link>
          </div>
        </div>

        {error && <ErrorAlert id="login-error">{error}</ErrorAlert>}

        <SubmitButton busy={busy} icon={LuLogIn} busyLabel="Entrando…">
          Entrar
        </SubmitButton>
      </form>

      <Link
        href="/primeiro-acesso"
        className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-canvas px-4 py-3 transition-colors hover:border-line-strong"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
          <LuSparkles className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink">Primeiro acesso</span>
          <span className="block text-meta text-ink-2">Acabou de comprar? Crie sua senha aqui.</span>
        </span>
      </Link>
    </>
  );
}

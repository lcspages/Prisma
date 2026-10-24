"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuCheck } from "react-icons/lu";
import { AuthShell, ErrorAlert, PasswordField, postJson, SubmitButton } from "../auth-ui";

type LinkState = { status: "reading" } | { status: "ok"; token: string; recovery: boolean } | { status: "invalid"; message: string };

let cached: LinkState | null = null;

/** Lê o código que o link do e-mail traz depois do "#" e apaga ele da barra de endereço. */
function readLink(): LinkState {
  // Lido uma vez só: o endereço é limpo logo em seguida.
  if (cached) return cached;
  cached = parseLink();
  return cached;
}

function parseLink(): LinkState {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const token = params.get("access_token");
  const failure = params.get("error_description") ?? query.get("error_description");
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  if (token) return { status: "ok", token, recovery: params.get("type") === "recovery" };
  if (failure && /expired|invalid/i.test(failure)) {
    return { status: "invalid", message: "Este link expirou ou já foi usado. Peça um novo link abaixo." };
  }
  return { status: "invalid", message: "Abra esta página pelo link que enviamos para o seu e-mail." };
}

export function SetPasswordForm() {
  const [link, setLink] = useState<LinkState>({ status: "reading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setLink(readLink()), []);

  const recovery = link.status === "ok" && link.recovery;

  const submit = async () => {
    if (busy || link.status !== "ok") return;
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/definir-senha", { accessToken: link.token, password });
    if (res.ok) {
      window.location.assign("/hoje");
      return;
    }
    setError(res.error);
    setBusy(false);
  };

  if (link.status === "invalid") {
    return (
      <AuthShell title="Link inválido" subtitle={link.message}>
        <div className="mt-7 space-y-3">
          <Link
            href="/esqueci-senha"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-on-primary hover:brightness-95"
          >
            Pedir um novo link
          </Link>
          <Link href="/login" className="flex h-12 w-full items-center justify-center rounded-2xl border border-line font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink">
            Voltar para o login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={recovery ? "Nova senha" : "Crie sua senha"}
      subtitle={recovery ? "Escolha uma nova senha para entrar no Prisma." : "Último passo: escolha a senha que você vai usar para entrar."}
    >
      <form
        className="mt-7 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <PasswordField
          id="new-pass"
          label="Senha"
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Pelo menos 8 caracteres"
          invalid={Boolean(error)}
          disabled={link.status !== "ok"}
        />
        <PasswordField
          id="confirm-pass"
          label="Repita a senha"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Digite de novo"
          invalid={Boolean(error)}
          disabled={link.status !== "ok"}
        />
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <SubmitButton busy={busy || link.status !== "ok"} icon={LuCheck} busyLabel={link.status === "ok" ? "Salvando…" : "Carregando…"}>
          Salvar e entrar
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

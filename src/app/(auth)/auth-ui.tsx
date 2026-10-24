"use client";

import Image from "next/image";
import { useState } from "react";
import type { IconType } from "react-icons";
import { LuEye, LuEyeOff, LuLock } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { LegalLinks } from "@/components/layout/legal-links";

/** Moldura das telas de acesso: logo, cartão e links discretos no rodapé. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh grid-cols-1 place-items-center overflow-hidden bg-canvas px-4 py-10">
      {/* Brilho suave com as cores da marca */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 right-[-10%] h-[420px] w-[520px] rounded-full bg-accent/15 blur-3xl dark:bg-accent/5" />

      <div className="relative w-full max-w-[400px]">
        <div className="flex items-center gap-3">
          <Image src="/logo-prisma.png" alt="" width={44} height={44} className="rounded-[22%]" priority />
          <span className="text-title font-semibold tracking-[-0.01em] text-ink">Prisma</span>
        </div>
        <div className="mt-8 rounded-[28px] border border-line bg-surface p-6 shadow-modal sm:p-8">
          <h1 className="text-display font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-2 [overflow-wrap:anywhere]">{subtitle}</p>}
          {children}
        </div>
        <LegalLinks className="mt-6" />
      </div>
    </main>
  );
}

const fieldClass =
  "h-12 w-full rounded-2xl border bg-canvas pl-11 text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function TextField({
  id,
  label,
  icon: Icon,
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: IconType; invalid?: boolean }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-meta font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden />
        <input id={id} aria-invalid={invalid} className={cn(fieldClass, "pr-4", invalid ? "border-[#e5484d]/60" : "border-line")} {...props} />
      </div>
    </div>
  );
}

export function PasswordField({
  id,
  label,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-meta font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <LuLock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={invalid}
          className={cn(fieldClass, "pr-12", invalid ? "border-[#e5484d]/60" : "border-line")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={show}
          className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          {show ? <LuEyeOff className="size-[18px]" aria-hidden /> : <LuEye className="size-[18px]" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export function ErrorAlert({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="rounded-xl bg-[#e5484d]/10 px-3.5 py-2.5 text-meta font-semibold text-[#c9363b] dark:text-[#ff8a8e]">
      {children}
    </p>
  );
}

export function SubmitButton({ busy, icon: Icon, children, busyLabel }: { busy: boolean; icon: IconType; children: React.ReactNode; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lead font-semibold text-on-primary transition-[filter,transform] hover:brightness-95 active:translate-y-px disabled:opacity-70"
    >
      {busy ? (
        <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
      ) : (
        <Icon className="size-5" aria-hidden />
      )}
      {busy ? busyLabel : children}
    </button>
  );
}

/** Envia um POST em JSON e devolve o erro (se houver) já em texto para a tela. */
export async function postJson(url: string, body: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? "Algo deu errado. Tente de novo." };
  } catch {
    return { ok: false, error: "Sem conexão com o servidor. Confira a internet e tente de novo." };
  }
}

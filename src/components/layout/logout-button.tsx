"use client";

import { useState } from "react";
import { LuLogOut } from "react-icons/lu";
import { cn } from "@/lib/cn";

/** Encerra a sessão no servidor e volta para a tela de login. */
export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* sem rede: o cookie expira sozinho; mesmo assim volta para o login */
  }
  window.location.assign("/login");
}

export function LogoutButton({ withLabel = false, className }: { withLabel?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void logout();
      }}
      aria-label="Sair da conta"
      title="Sair"
      className={cn(
        "flex shrink-0 items-center justify-center gap-2 rounded-[10px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60",
        withLabel ? "h-11 w-full border border-line font-semibold" : "size-8",
        className,
      )}
    >
      <LuLogOut className="size-4" aria-hidden />
      {withLabel && "Sair da conta"}
    </button>
  );
}

"use client";

import { LuCloud, LuCloudOff, LuLoaderCircle } from "react-icons/lu";
import { loadWorkspace, useAppStore } from "@/lib/store/app-store";

/** Mostra se o que está na tela já foi salvo na nuvem. */
export function SyncIndicator() {
  const pending = useAppStore((s) => s.pending);
  const error = useAppStore((s) => s.syncError);
  const status = useAppStore((s) => s.status);

  let content: React.ReactNode;
  if (status === "error") {
    content = (
      <button type="button" onClick={() => loadWorkspace()} className="flex items-center gap-1.5 text-ink hover:underline">
        <LuCloudOff className="size-4" aria-hidden />
        Sem conexão. Tentar de novo
      </button>
    );
  } else if (pending > 0 || status === "loading") {
    content = (
      <span className="flex items-center gap-1.5">
        <LuLoaderCircle className="size-4 animate-spin" aria-hidden />
        Salvando
      </span>
    );
  } else if (error) {
    content = (
      <span className="flex items-center gap-1.5 text-ink">
        <LuCloudOff className="size-4" aria-hidden />
        Alteração não salva
      </span>
    );
  } else {
    content = (
      <span className="flex items-center gap-1.5">
        <LuCloud className="size-4" aria-hidden />
        Salvo
      </span>
    );
  }

  return (
    <div role="status" aria-live="polite" className="text-meta text-ink-3">
      {content}
    </div>
  );
}

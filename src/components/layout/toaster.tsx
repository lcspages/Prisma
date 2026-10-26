"use client";

import { useEffect } from "react";
import { LuCheck, LuX } from "react-icons/lu";
import { dismissToast, useAppStore, type Toast } from "@/lib/store/app-store";

function ToastItem({ toast }: { toast: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), toast.duration ?? (toast.tone === "success" ? 7000 : 4500));
    return () => clearTimeout(timer);
  }, [toast.id, toast.tone, toast.duration]);

  if (toast.tone === "success") {
    return (
      <li role="status" className="toast-in flex items-start gap-3 rounded-2xl border border-primary/40 bg-surface p-3.5 pr-2 text-ink shadow-modal md:max-w-[380px]">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
          <LuCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex items-center gap-2 font-semibold text-ink">
            {toast.title}
            {toast.xp ? (
              <span className="tabular rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-on-accent">+{toast.xp} XP</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-meta text-ink-2">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          aria-label="Fechar aviso"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <LuX className="size-4" aria-hidden />
        </button>
      </li>
    );
  }

  return (
    <li className="toast-in flex items-center gap-3 rounded-xl bg-ink py-2 pl-4 pr-2 text-canvas shadow-modal">
      <span className="flex-1">{toast.title ? `${toast.title}. ${toast.message}` : toast.message}</span>
      {toast.xp ? (
        <span className="tabular rounded-md bg-accent px-1.5 py-0.5 text-meta font-semibold text-on-accent">
          +{toast.xp} XP
        </span>
      ) : null}
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
            dismissToast(toast.id);
          }}
          className="h-7 rounded-lg bg-primary px-2.5 text-meta font-semibold text-on-primary"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Fechar aviso"
        className="grid size-7 place-items-center rounded-lg opacity-70 hover:opacity-100"
      >
        <LuX className="size-4" aria-hidden />
      </button>
    </li>
  );
}

export function Toaster() {
  const toasts = useAppStore((s) => s.ui.toasts);
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end [&>li]:pointer-events-auto [&>li]:w-full md:[&>li]:w-auto md:[&>li]:min-w-[300px]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </ol>
  );
}

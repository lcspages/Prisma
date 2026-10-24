"use client";

import type { Workspace } from "@/types/domain";
import { loadWorkspace, useAppStore } from "@/lib/store/app-store";
import { useNow } from "@/lib/hooks/use-now";
import { Button } from "@/components/ui/button";
import { Page, PageSkeleton } from "@/components/ui/page";

/** Mostra o esqueleto enquanto carrega e o erro se a nuvem não responder. */
export function WorkspaceGate({ children }: { children: (data: Workspace, now: Date) => React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const data = useAppStore((s) => s.data);
  const now = useNow();

  if (status === "error") {
    return (
      <Page>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-title font-semibold">Não foi possível carregar os seus dados</h1>
          <p className="mt-2 text-ink-2">Confira a conexão com a internet e tente de novo.</p>
          <Button variant="primary" className="mt-6" onClick={() => loadWorkspace()}>
            Tentar de novo
          </Button>
        </div>
      </Page>
    );
  }
  if (!data || !now) return <PageSkeleton />;
  return <>{children(data, now)}</>;
}

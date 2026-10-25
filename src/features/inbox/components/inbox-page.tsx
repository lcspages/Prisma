"use client";

import { useId, useState } from "react";
import { LuArrowRight, LuLightbulb, LuTrash2 } from "react-icons/lu";
import type { Workspace } from "@/types/domain";
import { captureInbox, deleteInbox, openEditor } from "@/lib/store/app-store";
import { formatClock, relativeDayLabel, toISODate } from "@/lib/dates";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { Button } from "@/components/ui/button";
import { EmptyState, Page, PageHeader, SectionHeader } from "@/components/ui/page";

export function InboxPage() {
  return <WorkspaceGate>{(data, now) => <InboxContent data={data} now={now} />}</WorkspaceGate>;
}

function InboxContent({ data, now }: { data: Workspace; now: Date }) {
  const [text, setText] = useState("");
  const inputId = useId();
  const today = toISODate(now);
  const items = [...data.inbox].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <Page>
      <PageHeader title="Caixa de entrada" description="Suas ideias anotadas. Transforme em tarefa ou descarte." />

      <form
        className="mb-8 flex gap-2 rounded-3xl border border-line bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          captureInbox("idea", text);
          setText("");
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Nova ideia
        </label>
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tive uma ideia sobre…"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-ink outline-none placeholder:text-ink-3 focus:border-primary"
        />
        <Button type="submit" variant="primary" className="h-11" disabled={!text.trim()}>
          Guardar
        </Button>
      </form>

      <SectionHeader title="Ideias" count={items.length} />

      {items.length === 0 ? (
        <EmptyState title="Caixa vazia" body="Tudo processado. As ideias que você anotar no Foco ou pelo botão Criar aparecem aqui." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const created = new Date(item.createdAt);
            const day = toISODate(created);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
                  <LuLightbulb className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink">{item.text}</p>
                  <p className="tabular text-meta text-ink-3">
                    {relativeDayLabel(day, today)}, {formatClock(created)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => openEditor({ taskId: null, defaults: { title: item.text }, fromInboxId: item.id })}
                  >
                    Virar tarefa
                    <LuArrowRight className="size-3.5" aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteInbox(item.id)} aria-label={`Descartar ${item.text}`}>
                    <LuTrash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}

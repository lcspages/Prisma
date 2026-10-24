"use client";

import Link from "next/link";
import { LuPlus } from "react-icons/lu";
import type { Workspace } from "@/types/domain";
import { openModuleForm } from "@/lib/store/app-store";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { ModuleBadge } from "@/components/layout/module-badge";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, ProgressBar } from "@/components/ui/page";
import { MODULE_TEMPLATES } from "../lib/templates";

export function ModulesPage() {
  return <WorkspaceGate>{(data) => <ModulesContent data={data} onCreate={() => openModuleForm({})} />}</WorkspaceGate>;
}

function ModulesContent({ data, onCreate }: { data: Workspace; onCreate: () => void }) {
  const modules = [...data.modules].sort((a, b) => a.position - b.position);
  return (
    <Page>
      <PageHeader
        title="Módulos"
        description="Cada área da sua vida com tarefas, hábitos, anotações e metas."
        actions={
          <Button variant="primary" onClick={onCreate}>
            <LuPlus className="size-4" aria-hidden />
            Novo módulo
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const tasks = data.tasks.filter((t) => t.moduleId === m.id);
          const open = tasks.filter((t) => !t.completedAt).length;
          const done = tasks.length - open;
          const notes = data.notes.filter((n) => n.moduleId === m.id).length;
          return (
            <Link
              key={m.id}
              href={`/modulos/${m.id}`}
              className="group flex min-h-[176px] flex-col rounded-3xl border border-line bg-surface p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong"
            >
              <div className="flex items-center gap-3">
                <ModuleBadge module={m} size="lg" />
                <span className="text-meta text-ink-3">{MODULE_TEMPLATES.find((t) => t.id === m.template)?.name}</span>
              </div>
              <h2 className="mt-4 text-title font-semibold text-ink">{m.name}</h2>
              <p className="mt-1 text-meta text-ink-2">
                {open} {open === 1 ? "tarefa aberta" : "tarefas abertas"}, {notes}{" "}
                {notes === 1 ? "anotação" : "anotações"}
              </p>
              <div className="mt-auto pt-5">
                <ProgressBar value={done} max={Math.max(tasks.length, 1)} label={`Tarefas concluídas em ${m.name}`} />
              </div>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-[176px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong text-ink-2 transition-colors hover:border-primary hover:text-ink"
        >
          <LuPlus className="size-6" aria-hidden />
          Criar módulo
        </button>
      </div>
    </Page>
  );
}

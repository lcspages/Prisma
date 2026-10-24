"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import type { Module, Workspace } from "@/types/domain";
import { askConfirm, deleteModule, openModuleForm } from "@/lib/store/app-store";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { ModuleBadge } from "@/components/layout/module-badge";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState, Page } from "@/components/ui/page";
import { Tabs } from "@/components/ui/tabs";
import { ModuleHabits } from "@/features/habits/components/module-habits";
import { MODULE_TEMPLATES } from "../lib/templates";
import { ModuleGoals, ModuleNotes, ModuleTasks } from "./module-content";

type TabId = "tasks" | "habits" | "notes" | "goals";

export function ModulePage({ moduleId }: { moduleId: string }) {
  return (
    <WorkspaceGate>
      {(data) => {
        const module = data.modules.find((m) => m.id === moduleId);
        if (!module) {
          return (
            <Page>
              <EmptyState
                className="mt-10"
                title="Módulo não encontrado"
                body="Ele pode ter sido excluído."
                action={
                  <Link href="/modulos" className={buttonClass("secondary")}>
                    Ver módulos
                  </Link>
                }
              />
            </Page>
          );
        }
        return <ModuleContent key={module.id} data={data} module={module} />;
      }}
    </WorkspaceGate>
  );
}

function ModuleContent({ data, module }: { data: Workspace; module: Module }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("tasks");

  const tabs = [
    { value: "tasks" as const, label: "Tarefas", count: data.tasks.filter((t) => t.moduleId === module.id && !t.completedAt).length },
    { value: "habits" as const, label: "Hábitos", count: data.habits.filter((h) => h.moduleId === module.id).length },
    { value: "notes" as const, label: "Anotações", count: data.notes.filter((n) => n.moduleId === module.id).length },
    { value: "goals" as const, label: "Metas", count: data.goals.filter((g) => g.moduleId === module.id).length },
  ];
  const props = { data, moduleId: module.id, moduleName: module.name };

  const remove = () => {
    const n = data.tasks.filter((t) => t.moduleId === module.id).length;
    askConfirm({
      title: `Excluir o módulo ${module.name}?`,
      body: `Pastas, ${n} ${n === 1 ? "tarefa" : "tarefas"}, anotações e metas dele também serão excluídas. Dá para desfazer logo depois.`,
      actionLabel: "Excluir módulo",
      onConfirm: () => {
        router.push("/modulos");
        deleteModule(module.id);
      },
    });
  };

  return (
    <Page wide>
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <ModuleBadge module={module} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-display font-semibold tracking-[-0.02em] text-ink">{module.name}</h1>
          <p className="text-ink-2">{MODULE_TEMPLATES.find((t) => t.id === module.template)?.name}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" onClick={() => openModuleForm({ moduleId: module.id })}>
            <LuPencil className="size-4" aria-hidden />
            Editar
          </Button>
          <Button variant="ghost" onClick={remove} aria-label={`Excluir módulo ${module.name}`}>
            <LuTrash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <Tabs label="Seções do módulo" items={tabs} value={tab} onChange={setTab} />

      <div className="mt-6">
        {tab === "habits" && <ModuleHabits data={data} module={module} />}
        {tab === "tasks" && <ModuleTasks {...props} />}
        {tab === "notes" && <ModuleNotes {...props} />}
        {tab === "goals" && <ModuleGoals {...props} />}
      </div>
    </Page>
  );
}

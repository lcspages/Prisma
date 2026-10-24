"use client";

import { setContext } from "@/lib/store/app-store";
import { Chip } from "@/components/ui/field";

export interface ContextOption {
  tag: string;
  count: number;
}

/** Alterna a "caixa" da vida que está na tela: #faculdade, #front-end, #treino… */
export function ContextFilter({ options, active }: { options: ContextOption[]; active: string | null }) {
  if (options.length === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Filtrar por contexto"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0"
    >
      <Chip selected={active === null} onClick={() => setContext(null)}>
        Tudo
      </Chip>
      {options.map(({ tag, count }) => (
        <Chip key={tag} selected={active === tag} onClick={() => setContext(active === tag ? null : tag)}>
          #{tag}
          <span className="tabular opacity-60">{count}</span>
        </Chip>
      ))}
    </div>
  );
}

/** Conta as tags das tarefas para montar os filtros (mantém o filtro ativo mesmo sem tarefas). */
export function contextOptions(tasks: Array<{ tags: string[] }>, active: string | null): ContextOption[] {
  const counts = new Map<string, number>();
  tasks.forEach((t) => t.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  if (active && !counts.has(active)) counts.set(active, 0);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

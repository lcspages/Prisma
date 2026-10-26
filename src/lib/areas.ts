/**
 * Categorias dos pontos (usadas nas batalhas).
 * Cada módulo tem uma categoria; o que é feito ligado ao módulo conta nela.
 * Treino registrado na aba Treino conta sempre como "treino".
 * Tudo conta também na categoria "geral" das batalhas.
 */
import type { Area, ID, Module, ModuleTemplate, Workspace } from "@/types/domain";

export const AREAS: Array<{ id: Area; label: string; hint: string }> = [
  { id: "estudo", label: "Estudo", hint: "Faculdade, cursos, leitura" },
  { id: "trabalho", label: "Trabalho", hint: "Emprego, projetos, negócios" },
  { id: "treino", label: "Treino", hint: "Academia, corrida, esportes" },
  { id: "alimentacao", label: "Alimentação", hint: "Dieta, refeições, água" },
  { id: "sono", label: "Sono", hint: "Hora de dormir, descanso" },
  { id: "pessoal", label: "Pessoal", hint: "Casa, rotina e o resto" },
];

export const BATTLE_CATEGORIES: Array<{ id: Area | "geral"; label: string }> = [
  { id: "geral", label: "Geral" },
  ...AREAS.map(({ id, label }) => ({ id, label })),
];

const FROM_TEMPLATE: Record<ModuleTemplate, Area> = {
  study: "estudo",
  code: "trabalho",
  training: "treino",
  blank: "pessoal",
};

export const isArea = (v: unknown): v is Area => AREAS.some((a) => a.id === v);

/** Categoria do módulo (módulos antigos usam a do modelo). */
export function moduleArea(module: Pick<Module, "template"> & { area?: Area | null }): Area {
  return module.area && isArea(module.area) ? module.area : FROM_TEMPLATE[module.template] ?? "pessoal";
}

/** Categoria de algo ligado a um módulo (sem módulo = pessoal). */
export function areaOf(ws: Workspace, moduleId: ID | null | undefined): Area {
  const m = moduleId ? ws.modules.find((x) => x.id === moduleId) : undefined;
  return m ? moduleArea(m) : "pessoal";
}

export function areaLabel(id: string): string {
  return BATTLE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

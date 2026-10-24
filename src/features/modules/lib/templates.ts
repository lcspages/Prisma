import type { ModuleColor, ModuleIcon, ModuleTemplate } from "@/types/domain";

/** Campos extras que um modelo adiciona às tarefas do módulo. */
export interface TemplateField {
  key: string;
  label: string;
  type: "number" | "duration" | "distance" | "text";
  unit?: string;
}

export interface ModuleTemplateDef {
  id: ModuleTemplate;
  name: string;
  description: string;
  defaultIcon: ModuleIcon;
  defaultColor: ModuleColor;
  taskFields: TemplateField[];
}

export const MODULE_TEMPLATES: ModuleTemplateDef[] = [
  {
    id: "blank",
    name: "Em branco",
    description: "Comece do zero e organize do seu jeito.",
    defaultIcon: "folder",
    defaultColor: "slate",
    taskFields: [],
  },
  {
    id: "study",
    name: "Estudos",
    description: "Disciplinas com conteúdo, exercícios e revisões.",
    defaultIcon: "book",
    defaultColor: "blue",
    taskFields: [{ key: "pages", label: "Páginas", type: "number" }],
  },
  {
    id: "code",
    name: "Projeto de código",
    description: "Tarefas do projeto, bugs e ideias em um só lugar.",
    defaultIcon: "code",
    defaultColor: "violet",
    taskFields: [{ key: "branch", label: "Branch", type: "text" }],
  },
  {
    id: "training",
    name: "Treino",
    description: "Tarefas e metas físicas. O registro de cargas fica na aba Treino.",
    defaultIcon: "dumbbell",
    defaultColor: "green",
    taskFields: [],
  },
];

import type { IconType } from "react-icons";
import {
  LuCalendarCheck,
  LuCalendarRange,
  LuChartColumn,
  LuDumbbell,
  LuFolderTree,
  LuGrid2X2,
  LuHouse,
  LuInbox,
  LuListChecks,
  LuTimer,
} from "react-icons/lu";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
  description: string;
}

/** Hábitos vêm logo depois de Hoje: são o centro da rotina. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/hoje", label: "Hoje", icon: LuHouse, description: "O que fazer agora" },
  { href: "/habitos", label: "Hábitos", icon: LuCalendarCheck, description: "Sua rotina diária e sequências" },
  { href: "/tarefas", label: "Tarefas", icon: LuListChecks, description: "Todas as tarefas, com filtro por módulo" },
  { href: "/semana", label: "Semana", icon: LuCalendarRange, description: "Planeje e arraste entre os dias" },
  { href: "/matriz", label: "Matriz", icon: LuGrid2X2, description: "Urgente contra importante" },
  { href: "/foco", label: "Foco", icon: LuTimer, description: "Timer, sons e captura de ideias" },
  { href: "/treino", label: "Treino", icon: LuDumbbell, description: "Divisão semanal, cargas e cardio" },
  { href: "/relatorios", label: "Relatórios", icon: LuChartColumn, description: "Consistência, energia e revisão" },
  { href: "/caixa-de-entrada", label: "Caixa de entrada", icon: LuInbox, description: "Ideias e interrupções anotadas" },
];

export const MODULES_NAV: NavItem = {
  href: "/modulos",
  label: "Módulos",
  icon: LuFolderTree,
  description: "Suas áreas e conteúdos",
};

const byHref = (href: string) => [...PRIMARY_NAV, MODULES_NAV].find((i) => i.href === href)!;

/** No celular cabem quatro destinos fixos; o resto fica em "Mais". */
export const MOBILE_NAV: NavItem[] = ["/hoje", "/habitos", "/foco", "/treino"].map(byHref);

export const MOBILE_MORE: NavItem[] = ["/tarefas", "/semana", "/matriz", "/modulos", "/relatorios", "/caixa-de-entrada"].map(byHref);

import type { IconType } from "react-icons";
import {
  LuCalendarCheck,
  LuCirclePlay,
  LuCircleUserRound,
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
  { href: "/semana", label: "Semana", icon: LuCalendarRange, description: "Planeje os dias e mude tarefas de dia" },
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

export const PROFILE_NAV: NavItem = {
  href: "/perfil",
  label: "Perfil",
  icon: LuCircleUserRound,
  description: "Nome, senha, plano e aparência",
};

export const TUTORIALS_NAV: NavItem = {
  href: "/tutoriais",
  label: "Tutoriais",
  icon: LuCirclePlay,
  description: "Vídeos curtos ensinando cada parte",
};

const byHref = (href: string) => [...PRIMARY_NAV, MODULES_NAV].find((i) => i.href === href)!;

/** Barra de baixo do celular: dois destinos de cada lado do botão de criar. */
export const MOBILE_NAV_LEFT: NavItem[] = ["/hoje", "/tarefas"].map(byHref);
export const MOBILE_NAV_RIGHT: NavItem[] = ["/habitos"].map(byHref);

/** Tudo o que aparece no Menu do celular, na ordem de uso. */
export const MOBILE_MENU: NavItem[] = [
  "/hoje",
  "/tarefas",
  "/habitos",
  "/foco",
  "/semana",
  "/treino",
  "/matriz",
  "/modulos",
  "/relatorios",
  "/caixa-de-entrada",
].map(byHref);

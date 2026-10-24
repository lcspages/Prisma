import type { IconType } from "react-icons";
import {
  LuBookOpen,
  LuBriefcase,
  LuCode,
  LuDumbbell,
  LuFolder,
  LuLightbulb,
  LuSigma,
} from "react-icons/lu";
import type { ModuleColor, ModuleIcon } from "@/types/domain";

/**
 * Cores que o usuário pode escolher para um módulo.
 * Ficam restritas a pontos, ícones e marcadores pequenos:
 * a interface em si continua usando só a paleta da marca.
 */
export const MODULE_COLORS: Record<ModuleColor, { label: string; hex: string }> = {
  blue: { label: "Azul", hex: "#2998FF" },
  yellow: { label: "Amarelo", hex: "#FFD648" },
  green: { label: "Verde", hex: "#3DBE8B" },
  violet: { label: "Violeta", hex: "#9C7BFF" },
  coral: { label: "Coral", hex: "#FF8A6B" },
  slate: { label: "Grafite", hex: "#8A94A6" },
};

export const MODULE_ICONS: Record<ModuleIcon, IconType> = {
  sigma: LuSigma,
  book: LuBookOpen,
  code: LuCode,
  briefcase: LuBriefcase,
  dumbbell: LuDumbbell,
  folder: LuFolder,
  lightbulb: LuLightbulb,
};

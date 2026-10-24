import type { ClockTime, Module } from "@/types/domain";

export interface QuickAdd {
  title: string;
  tags: string[];
  moduleId: string | null;
  moduleName: string | null;
  time: ClockTime | null;
  estimateMin: number | null;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Interpreta a criação rápida da paleta de comandos.
 *   "Revisar integrais #faculdade @mat 14:00 45min"
 *   → título "Revisar integrais", tag faculdade, módulo Matemática, 14:00, 45 min
 */
export function parseQuickAdd(input: string, modules: Module[]): QuickAdd {
  let text = ` ${input} `;
  const tags: string[] = [];
  let moduleId: string | null = null;
  let moduleName: string | null = null;
  let time: ClockTime | null = null;
  let estimateMin: number | null = null;

  text = text.replace(/\s#([\p{L}\p{N}_-]+)/gu, (_, tag: string) => {
    tags.push(normalize(tag));
    return " ";
  });

  text = text.replace(/\s@([\p{L}\p{N}_-]+)/gu, (match, name: string) => {
    const found = modules.find((m) => normalize(m.name).startsWith(normalize(name)));
    if (!found) return match;
    moduleId = found.id;
    moduleName = found.name;
    return " ";
  });

  text = text.replace(/\s([01]?\d|2[0-3])[:h]([0-5]\d)(?=\s)/, (_, h: string, m: string) => {
    time = `${h.padStart(2, "0")}:${m}`;
    return " ";
  });

  text = text.replace(/\s(\d{1,3})\s?(min|m)(?=\s)/i, (_, n: string) => {
    estimateMin = Number(n);
    return " ";
  });

  text = text.replace(/\s(\d)h(?=\s)/i, (_, n: string) => {
    estimateMin = Number(n) * 60;
    return " ";
  });

  return {
    title: text.replace(/\s+/g, " ").trim(),
    tags,
    moduleId,
    moduleName,
    time,
    estimateMin,
  };
}

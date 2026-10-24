/** Ideias de hábitos para quem está começando (um toque cria o hábito). */
export const HABIT_SUGGESTIONS = [
  "Beber 2 L de água",
  "Ler 10 páginas",
  "Meditar 10 min",
  "Treinar",
  "Estudar 30 min",
  "Dormir antes das 23h",
  "Arrumar a cama",
  "Caminhar 20 min",
];

/** Ordem de exibição dos dias: segunda a domingo (0 = domingo). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAYS = [1, 2, 3, 4, 5];

/** "Todo dia", "Dias úteis", "Seg, Qua e Sex" */
export function daysLabel(days: number[]): string {
  const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const sorted = WEEK_ORDER.filter((d) => days.includes(d));
  if (sorted.length === 7) return "Todo dia";
  if (sorted.join() === "1,2,3,4,5") return "Dias úteis";
  if (sorted.join() === "6,0") return "Fins de semana";
  const list = sorted.map((d) => names[d]);
  return list.length === 1 ? `Só ${list[0].toLowerCase()}` : `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

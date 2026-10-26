/**
 * Texto dos lembretes diários (manhã e noite), montado com o que a pessoa tem no dia.
 */
import type { PushMessage } from "./webpush";

export type Turno = "manha" | "noite";

export interface ReminderTarget {
  name: string | null;
  tasks: Array<{ title: string | null; dueDate: string | null; time: string | null }>;
  habits: Array<{ name: string | null; done: boolean }>;
}

const short = (s: string | null | undefined, max = 40) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "A, B e C" */
function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

/** Lista curta de nomes: até 2 e "mais N". */
function few(names: string[]) {
  if (names.length <= 2) return list(names);
  return `${names.slice(0, 2).join(", ")} e mais ${names.length - 2}`;
}

export function buildReminder(turno: Turno, t: ReminderTarget, today: string): PushMessage {
  const first = short(t.name, 30).split(" ")[0] ?? "";
  const todayTasks = t.tasks
    .filter((x) => x.dueDate === today && x.title)
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  const late = t.tasks.filter((x) => x.dueDate && x.dueDate < today).length;
  const habitsLeft = t.habits.filter((h) => !h.done && h.name).map((h) => short(h.name, 30));
  const base = { url: "/hoje", tag: `lembrete-${turno}` };

  if (turno === "manha") {
    const title = first ? `Bom dia, ${first}!` : "Bom dia!";
    const lateText = late ? ` (${plural(late, "atrasada", "atrasadas")})` : "";
    if (todayTasks.length === 1) {
      const x = todayTasks[0];
      return { ...base, title, body: `Hoje tem “${short(x.title)}”${x.time ? ` às ${x.time}` : ""}${lateText}. Bora?` };
    }
    if (todayTasks.length > 1) {
      return { ...base, title, body: `Hoje: ${few(todayTasks.map((x) => short(x.title, 30)))}${lateText}.` };
    }
    if (late) return { ...base, title, body: `Você tem ${plural(late, "tarefa atrasada", "tarefas atrasadas")}. Que tal resolver uma hoje?` };
    if (habitsLeft.length) {
      return { ...base, title, body: `${plural(habitsLeft.length, "hábito", "hábitos")} para hoje: ${few(habitsLeft)}.` };
    }
    return { ...base, title, body: "Que tal planejar o dia? Leva 2 minutos no Prisma." };
  }

  // Noite
  const hadSomething = t.habits.length > 0 || t.tasks.length > 0;
  if (habitsLeft.length && todayTasks.length) {
    return {
      ...base,
      title: "Antes de dormir",
      body: `Ainda faltam ${plural(habitsLeft.length, "hábito", "hábitos")} e ${plural(todayTasks.length, "tarefa", "tarefas")} de hoje.`,
    };
  }
  if (habitsLeft.length) return { ...base, title: "Seus hábitos de hoje", body: `Falta marcar: ${few(habitsLeft)}.` };
  if (todayTasks.length) {
    return { ...base, title: "Ainda dá tempo", body: `Falta concluir: ${few(todayTasks.map((x) => short(x.title, 30)))}.` };
  }
  if (hadSomething) return { ...base, title: "Dia completo!", body: "Você fez tudo o que tinha para hoje. Amanhã tem mais." };
  return { ...base, title: "Como foi o seu dia?", body: "Deixe o amanhã planejado no Prisma: leva 2 minutos." };
}

/** Data de hoje no horário de Brasília (AAAA-MM-DD). */
export function todayInBrazil(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

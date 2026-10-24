import type { Quadrant, Task } from "@/types/domain";

export function quadrantOf(task: Pick<Task, "urgent" | "important">): Quadrant {
  if (task.urgent && task.important) return "do";
  if (task.important) return "schedule";
  if (task.urgent) return "delegate";
  return "eliminate";
}

export const QUADRANT_ORDER: Record<Quadrant, number> = {
  do: 0,
  schedule: 1,
  delegate: 2,
  eliminate: 3,
};

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  do: "Urgente e importante",
  schedule: "Importante, sem urgência",
  delegate: "Urgente, pouco importante",
  eliminate: "Nem urgente nem importante",
};

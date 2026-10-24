import type { Metadata } from "next";
import { TasksPage } from "@/features/tasks/components/tasks-page";

export const metadata: Metadata = { title: "Tarefas" };

export default function Page() {
  return <TasksPage />;
}

import type { Metadata } from "next";
import { HabitsPage } from "@/features/habits/components/habits-page";

export const metadata: Metadata = { title: "Hábitos" };

export default function Page() {
  return <HabitsPage />;
}

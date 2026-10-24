import type { Metadata } from "next";
import { WeekBoard } from "@/features/week/components/week-board";

export const metadata: Metadata = { title: "Semana" };

export default function Page() {
  return <WeekBoard />;
}

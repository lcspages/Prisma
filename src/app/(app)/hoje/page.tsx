import type { Metadata } from "next";
import { TodayDashboard } from "@/features/today/components/today-dashboard";

export const metadata: Metadata = { title: "Hoje" };

export default function TodayPage() {
  return <TodayDashboard />;
}

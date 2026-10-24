import type { Metadata } from "next";
import { ReportsPage } from "@/features/reports/components/reports-page";

export const metadata: Metadata = { title: "Relatórios" };

export default function Page() {
  return <ReportsPage />;
}

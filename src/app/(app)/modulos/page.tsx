import type { Metadata } from "next";
import { ModulesPage } from "@/features/modules/components/modules-page";

export const metadata: Metadata = { title: "Módulos" };

export default function Page() {
  return <ModulesPage />;
}

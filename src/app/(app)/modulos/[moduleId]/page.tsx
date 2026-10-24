import type { Metadata } from "next";
import { ModulePage } from "@/features/modules/components/module-page";

export const metadata: Metadata = { title: "Módulo" };

export default async function Page({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  return <ModulePage moduleId={moduleId} />;
}

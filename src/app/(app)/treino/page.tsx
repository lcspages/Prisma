import type { Metadata } from "next";
import { TrainingPage } from "@/features/training/components/training-page";

export const metadata: Metadata = { title: "Treino" };

export default function Page() {
  return <TrainingPage />;
}

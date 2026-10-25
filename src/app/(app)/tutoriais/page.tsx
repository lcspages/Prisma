import type { Metadata } from "next";
import { TutorialsPage } from "@/features/tutorials/tutorials-page";

export const metadata: Metadata = { title: "Tutoriais" };

export default function Page() {
  return <TutorialsPage />;
}

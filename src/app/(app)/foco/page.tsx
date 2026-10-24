import type { Metadata } from "next";
import { FocusPage } from "@/features/focus/components/focus-page";

export const metadata: Metadata = { title: "Foco" };

export default function Page() {
  return <FocusPage />;
}

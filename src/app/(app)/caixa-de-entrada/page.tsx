import type { Metadata } from "next";
import { InboxPage } from "@/features/inbox/components/inbox-page";

export const metadata: Metadata = { title: "Caixa de entrada" };

export default function Page() {
  return <InboxPage />;
}

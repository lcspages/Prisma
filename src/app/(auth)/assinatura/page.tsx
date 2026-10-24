import type { Metadata } from "next";
import { SubscriptionStatus } from "./subscription-status";

export const metadata: Metadata = { title: "Assinatura inativa" };

export default function SubscriptionPage() {
  return <SubscriptionStatus />;
}

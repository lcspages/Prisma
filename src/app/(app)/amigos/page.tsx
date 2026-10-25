import type { Metadata } from "next";
import { SocialPage } from "@/features/social/social-page";

export const metadata: Metadata = { title: "Amigos" };

export default function Page() {
  return <SocialPage />;
}

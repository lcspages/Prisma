import type { Metadata } from "next";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Criar senha" };

export default function SetPasswordPage() {
  return <SetPasswordForm />;
}

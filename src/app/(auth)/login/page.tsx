import type { Metadata } from "next";
import { AuthShell } from "../auth-ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthShell title="Entrar" subtitle="Sua rotina, seus hábitos e suas tarefas em um lugar só.">
      <LoginForm />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { AuthShell } from "../auth-ui";
import { SendLinkForm } from "../send-link-form";

export const metadata: Metadata = { title: "Esqueci a senha" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Esqueci a senha" subtitle="Digite seu e-mail e enviaremos um link para você criar uma nova senha.">
      <SendLinkForm tipo="esqueci" hint="É o mesmo e-mail que você usa para entrar no Prisma." />
    </AuthShell>
  );
}

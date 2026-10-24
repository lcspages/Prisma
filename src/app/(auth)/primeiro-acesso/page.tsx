import type { Metadata } from "next";
import { AuthShell } from "../auth-ui";
import { SendLinkForm } from "../send-link-form";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default function FirstAccessPage() {
  return (
    <AuthShell title="Primeiro acesso" subtitle="Digite o e-mail que você usou na compra. Vamos enviar um link para você criar sua senha.">
      <SendLinkForm tipo="primeiro-acesso" hint="Use exatamente o mesmo e-mail da compra na Kiwify." />
    </AuthShell>
  );
}

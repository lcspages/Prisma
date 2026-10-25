import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      intro={`Esta política explica quais dados o ${COMPANY.product} coleta, para que usa e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). O responsável pelos dados é ${COMPANY.name}.`}
      sections={[
        {
          title: "Dados que coletamos",
          body: [
            [
              "Conta: seu e-mail e a senha (guardada de forma criptografada; nós não conseguimos ver a senha).",
              "Compra: nome, e-mail, produto, plano, status e datas do pagamento, recebidos da Kiwify.",
              `Conteúdo: o que você cadastra no ${COMPANY.product}, como tarefas, hábitos, módulos, anotações, sessões de foco e treinos.`,
              "Dados técnicos: endereço de internet (IP) para segurança, como o limite de tentativas de login.",
            ],
          ],
        },
        {
          title: "Para que usamos",
          body: [
            [
              "Criar sua conta, liberar o acesso de acordo com a sua compra e manter seus dados sincronizados.",
              "Enviar e-mails necessários, como o link de primeiro acesso e o de troca de senha.",
              "Proteger o serviço contra fraudes e acessos indevidos.",
              "Atender pedidos de suporte e cumprir obrigações legais.",
            ],
            "Não vendemos seus dados e não usamos o seu conteúdo para publicidade.",
          ],
        },
        {
          title: "Bases legais",
          body: ["Tratamos os dados para executar o contrato com você, por legítimo interesse (segurança do serviço) e para cumprir obrigações legais."],
        },
        {
          title: "Com quem compartilhamos",
          body: [
            "Apenas com empresas que tornam o serviço possível, que tratam os dados conforme nossas instruções:",
            [
              "Kiwify: processamento do pagamento.",
              "Supabase: banco de dados e login.",
              "Vercel: hospedagem do aplicativo.",
            ],
            "Alguns desses serviços podem processar dados fora do Brasil, com garantias de proteção adequadas.",
          ],
        },
        {
          title: "Amigos e batalhas",
          body: [
            "Se você usar Amigos, Grupos ou Batalhas, estas informações aparecem para as pessoas que você adicionou ou que estão no mesmo grupo: seu nome no Prisma, seu código de amigo e os pontos que você fez em cada batalha.",
            "Ninguém vê suas tarefas, hábitos, anotações, treinos ou seu e-mail. Você pode desfazer uma amizade ou sair de um grupo a qualquer momento.",
          ],
        },
        {
          title: "Cookies",
          body: [
            "Usamos apenas um cookie essencial, que mantém você conectado, e o armazenamento do navegador para preferências como o tema claro ou escuro. Não usamos cookies de propaganda.",
          ],
        },
        {
          title: "Por quanto tempo guardamos",
          body: [
            "Os dados da conta e o seu conteúdo ficam guardados enquanto a conta existir. Registros de compra podem ser mantidos pelo prazo exigido por lei. Tentativas de login são apagadas em até 1 dia.",
          ],
        },
        {
          title: "Seus direitos",
          body: [
            "Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, cópia (portabilidade), exclusão da conta e dos dados, e informações sobre o compartilhamento.",
            `Para isso, escreva para ${COMPANY.email}. Respondemos em até 15 dias.`,
          ],
        },
        {
          title: "Segurança",
          body: [
            "Usamos conexão criptografada (HTTPS), senhas protegidas, separação dos dados por conta e limite de tentativas de login. Nenhum sistema é 100% imune, mas avisaremos você e as autoridades em caso de incidente relevante.",
          ],
        },
        {
          title: "Mudanças nesta política",
          body: ["Podemos atualizar esta política. A data no topo mostra a versão atual."],
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Política de reembolso" };

export default function RefundPage() {
  const days = COMPANY.refundDays;
  return (
    <LegalPage
      title="Política de reembolso"
      intro={`Você pode experimentar o ${COMPANY.product} com tranquilidade: se não gostar, devolvemos o valor pago dentro do prazo de garantia.`}
      sections={[
        {
          title: "Prazo de garantia",
          body: [
            `Você tem ${days} dias corridos, contados a partir da data da compra, para pedir o reembolso integral, sem precisar explicar o motivo (direito de arrependimento, art. 49 do Código de Defesa do Consumidor).`,
          ],
        },
        {
          title: "Como pedir",
          body: [
            [
              "Pela Kiwify, no e-mail de confirmação da compra ou na área de compras do cliente; ou",
              `Escrevendo para ${COMPANY.email} com o e-mail usado na compra.`,
            ],
          ],
        },
        {
          title: "Devolução do valor",
          body: [
            "O reembolso é feito pela Kiwify no mesmo meio de pagamento. No cartão de crédito, o estorno pode aparecer em até duas faturas, conforme o banco. No Pix, o valor volta para a conta de origem.",
          ],
        },
        {
          title: "Depois do reembolso",
          body: ["O acesso ao Prisma é encerrado assim que o reembolso é confirmado."],
        },
        {
          title: "Plano mensal",
          body: [
            [
              `A garantia de ${days} dias vale para a primeira compra.`,
              "Você pode cancelar a qualquer momento e não será cobrado nos meses seguintes. O acesso continua até o fim do mês já pago.",
              "Depois do prazo de garantia, não há reembolso proporcional de meses já iniciados, salvo quando a lei exigir.",
            ],
          ],
        },
        {
          title: "Plano vitalício",
          body: [`O reembolso pode ser pedido dentro dos ${days} dias da compra. Depois desse prazo, a compra é definitiva.`],
        },
        {
          title: "Contestação no cartão",
          body: [
            "Se precisar de ajuda, fale primeiro com a gente: resolvemos mais rápido. Em caso de contestação (chargeback) junto ao banco, o acesso fica suspenso até a análise ser concluída.",
          ],
        },
      ]}
    />
  );
}

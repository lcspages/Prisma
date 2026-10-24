import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      intro={`Estes termos regem o uso do ${COMPANY.product}, aplicativo web de organização de rotina, hábitos, estudos, treinos e tarefas oferecido por ${COMPANY.name}. Ao criar sua conta ou usar o ${COMPANY.product}, você concorda com estes termos.`}
      sections={[
        {
          title: "O serviço",
          body: [
            `O ${COMPANY.product} é acessado pelo navegador, no computador ou no celular, e guarda seus dados na nuvem. Novas funções podem ser adicionadas e funções existentes podem ser ajustadas para melhorar o serviço.`,
          ],
        },
        {
          title: "Conta e acesso",
          body: [
            [
              "O acesso é pessoal e intransferível. Não compartilhe sua senha.",
              "Use o mesmo e-mail da compra para criar sua conta em “Primeiro acesso”.",
              "Você é responsável pelo que acontece na sua conta e deve nos avisar se suspeitar de uso indevido.",
              "Contas usadas para fraude, revenda de acesso ou abuso do serviço podem ser suspensas.",
            ],
          ],
        },
        {
          title: "Planos e pagamento",
          body: [
            "Os pagamentos são processados pela Kiwify, que segue os próprios termos e meios de pagamento.",
            [
              "Plano mensal: renovado automaticamente a cada mês até você cancelar. O acesso vale enquanto a assinatura estiver paga.",
              `Plano vitalício: pagamento único, com acesso por todo o tempo em que o ${COMPANY.product} continuar existindo. “Vitalício” significa que não há nova cobrança enquanto o serviço estiver em operação; não é uma garantia de que o serviço será mantido para sempre. Se o ${COMPANY.product} for encerrado, o acesso termina, como explicado em “Encerramento do serviço”.`,
            ],
            "Se um pagamento não for aprovado, o acesso pode ser suspenso até a regularização.",
          ],
        },
        {
          title: "Cancelamento e reembolso",
          body: [
            "Você pode cancelar a assinatura mensal a qualquer momento pela Kiwify; o acesso continua até o fim do período já pago. As regras de reembolso estão na Política de reembolso.",
          ],
        },
        {
          title: "Uso permitido",
          body: [
            "Não é permitido tentar acessar dados de outras pessoas, sobrecarregar ou atacar o sistema, copiar ou revender o aplicativo, nem usá-lo para qualquer atividade ilegal.",
          ],
        },
        {
          title: "Seus dados e conteúdo",
          body: [
            `O que você cria no ${COMPANY.product} (tarefas, hábitos, anotações, treinos) é seu. Usamos esses dados apenas para fazer o serviço funcionar, como explicado na Política de privacidade.`,
          ],
        },
        {
          title: "Disponibilidade",
          body: [
            "Trabalhamos para manter o serviço sempre no ar, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros (hospedagem, internet). Não garantimos funcionamento ininterrupto.",
          ],
        },
        {
          title: "Encerramento do serviço",
          body: [
            `${COMPANY.name} pode decidir encerrar o ${COMPANY.product} em definitivo. Se isso acontecer, avisaremos com pelo menos 30 dias de antecedência, por um aviso dentro do próprio aplicativo, informando a data do encerramento.`,
            [
              "Durante esse prazo você continua usando o serviço normalmente e pode pedir uma cópia dos seus dados, como descrito na Política de privacidade.",
              "Plano mensal: nenhuma nova cobrança será feita depois da data de encerramento, e o acesso vale até essa data.",
              `Plano vitalício: o acesso vale somente enquanto o ${COMPANY.product} tiver continuidade, ou seja, até a data de encerramento avisada. Depois dessa data, o acesso termina para todos os clientes.`,
              "Depois do encerramento, as contas e os dados guardados no serviço deixam de existir (são apagados do sistema em até 30 dias), ressalvados os registros que a lei exigir manter. Por isso, aproveite o prazo do aviso para pedir uma cópia do que quiser guardar.",
            ],
          ],
        },
        {
          title: "Responsabilidade",
          body: [
            `O ${COMPANY.product} é uma ferramenta de organização e não substitui orientação profissional de saúde, treino ou estudo. Na medida permitida pela lei, não respondemos por danos indiretos decorrentes do uso ou da impossibilidade de uso do serviço.`,
          ],
        },
        {
          title: "Propriedade intelectual",
          body: [`A marca, o visual e o código do ${COMPANY.product} pertencem a ${COMPANY.name}.`],
        },
        {
          title: "Mudanças nestes termos",
          body: ["Podemos atualizar estes termos. Mudanças importantes serão avisadas no aplicativo ou por e-mail; a data no topo mostra a versão atual."],
        },
        {
          title: "Lei aplicável",
          body: ["Estes termos seguem a legislação brasileira, incluindo o Código de Defesa do Consumidor."],
        },
      ]}
    />
  );
}

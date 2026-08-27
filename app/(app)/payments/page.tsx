import { ModulePlaceholder } from '@/components/shared/module-placeholder'

export default function PaymentsPage() {
  return (
    <ModulePlaceholder
      title="Pagamentos"
      description="Cobranças, assinaturas e confirmações automáticas em um só lugar."
      icon="CreditCard"
      features={[
        'Integração com Stripe, Mercado Pago e Asaas',
        'Geração de links de cobrança e PIX',
        'Assinaturas recorrentes e planos',
        'Confirmação automática muda status do lead',
        'Controle de inadimplência',
        'Relatórios de receita e projeção',
      ]}
    />
  )
}

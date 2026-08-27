import { ModulePlaceholder } from '@/components/shared/module-placeholder'

export default function ContractsPage() {
  return (
    <ModulePlaceholder
      title="Gerador de Contratos"
      description="Templates inteligentes com assinatura eletrônica."
      icon="FileText"
      features={[
        'Templates com variáveis dinâmicas do lead',
        'Assinatura eletrônica com validade jurídica',
        'Envio automático por email e WhatsApp',
        'Acompanhamento de status de assinatura',
        'Armazenamento seguro na nuvem',
        'Geração de PDF profissional',
      ]}
    />
  )
}

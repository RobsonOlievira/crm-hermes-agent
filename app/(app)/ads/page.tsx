import { ModulePlaceholder } from '@/components/shared/module-placeholder'

export default function AdsPage() {
  return (
    <ModulePlaceholder
      title="Tráfego Pago"
      description="Acompanhe o desempenho das suas campanhas e o ROI de cada lead."
      icon="Megaphone"
      features={[
        'Conexão com Meta Ads e Google Ads',
        'Cálculo de CPL, CAC e ROI por campanha',
        'Atribuição de leads às campanhas de origem',
        'Dashboard de performance de mídia',
        'Comparação entre canais de aquisição',
        'Alertas de orçamento e performance',
      ]}
    />
  )
}

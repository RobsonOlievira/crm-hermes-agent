import { PaymentsManager } from '@/components/payments/payments-manager'

export const metadata = {
  title: 'Pagamentos | CRM Nexus',
  description: 'Gestão de cobranças, assinaturas recorrentes e gateways de pagamento.',
}

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Módulo de Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie cobranças avulsas, assinaturas recorrentes, métricas financeiras e gateways integrados.
        </p>
      </div>

      <PaymentsManager />
    </div>
  )
}

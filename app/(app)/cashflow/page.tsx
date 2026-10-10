export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { CashFlowView } from '@/components/cashflow/cashflow-view'

export default async function CashFlowPage() {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') redirect('/')
  const tenantId = user?.tenantId ?? null

  const clients = tenantId
    ? await prisma.client.findMany({
        where: { tenantId, status: { not: 'CANCELADO' } },
        select: { id: true, name: true, phone: true, email: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <div>
      <PageHeading
        title="Fluxo de Caixa"
        description="Acompanhe receitas projetadas, realizadas e despesas mês a mês, além de gerenciar cobranças e inadimplências."
      />
      <CashFlowView clients={clients} />
    </div>
  )
}

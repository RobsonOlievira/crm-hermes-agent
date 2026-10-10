export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { BillingView } from '@/components/billing/billing-view'

export default async function BillingPage() {
  const user = await getCurrentUser()
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
        title="Cobranças"
        description="Visualize parcelas pendentes, atrasadas e gere notinhas de cobrança via WhatsApp."
      />
      <BillingView clients={clients} />
    </div>
  )
}

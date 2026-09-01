export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { ClientsTable, ClientRow } from '@/components/clients/clients-table'
import { NewClientDialog } from '@/components/clients/new-client-dialog'

export default async function ClientsPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const clients = tenantId
    ? await prisma.client.findMany({
        where: { tenantId },
        include: { assignedTo: true },
        orderBy: { lifetimeValue: 'desc' },
      })
    : []

  const members = tenantId
    ? await prisma.user.findMany({
        where: { tenantId, role: { in: ['ADMIN', 'MANAGER', 'MEMBER'] } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
    : []

  const rows: ClientRow[] = (clients as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    companyName: c.companyName,
    cnpj: c.cnpj,
    email: c.email,
    status: c.status,
    lifetimeValue: c.lifetimeValue,
    segment: c.segment,
    assignedToName: c.assignedTo?.name ?? null,
    assignedToAvatar: c.assignedTo?.avatarUrl ?? null,
  }))

  return (
    <div>
      <PageHeading
        title="Clientes"
        description="Sua base de clientes ativos e o valor gerado ao longo do relacionamento."
        actions={<NewClientDialog members={members} />}
      />
      <ClientsTable clients={rows} />
    </div>
  )
}

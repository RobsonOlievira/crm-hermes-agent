export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { LeadsTable } from '@/components/leads/leads-table'
import { DemoActionButton } from '@/components/shared/demo-action-button'
import { queryLeads } from '@/lib/leads-list'

export default async function LeadsPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const [initial, members, leadTypes] = tenantId
    ? await Promise.all([
        queryLeads(tenantId, { sortKey: 'date', sortDir: 'desc', assigneeId: user?.role === 'MEMBER' ? user.id : undefined }),
        prisma.user.findMany({
          where: { tenantId, role: { in: ['ADMIN', 'MANAGER', 'MEMBER'] } },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
        prisma.leadType.findMany({ where: { tenantId }, select: { id: true, label: true }, orderBy: { label: 'asc' } }),
      ])
    : [{ rows: [], total: 0, totalValue: 0 }, [], []]

  return (
    <div>
      <PageHeading
        title="Leads"
        description="Gerencie e acompanhe todos os seus contatos e oportunidades."
        actions={<DemoActionButton label="Novo Lead" icon="Users" title="Cadastro de leads" description="O formulário completo de cadastro e importação de leads faz parte da próxima etapa desta interface." />}
      />
      <LeadsTable initial={initial} members={members} leadTypeOptions={leadTypes} />
    </div>
  )
}

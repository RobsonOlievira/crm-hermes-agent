export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { LeadsTable, LeadRow } from '@/components/leads/leads-table'
import { DemoActionButton } from '@/components/shared/demo-action-button'

export default async function LeadsPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const [leads, members] = await Promise.all([
    tenantId
      ? prisma.lead.findMany({
          where: { tenantId },
          include: { assignedTo: true, leadTypes: { include: { leadType: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    tenantId
      ? prisma.user.findMany({ where: { tenantId, role: { in: ['ADMIN', 'MANAGER', 'MEMBER'] } }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
  ])

  const rows: LeadRow[] = (leads as any[]).map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    companyName: l.companyName,
    status: l.status,
    source: l.source,
    dealValue: l.dealValue,
    leadTypeIds: (l.leadTypes ?? []).map((lt: any) => lt.leadTypeId),
    leadTypeLabels: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.label),
    leadTypeColors: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.color),
    leadTypeIcons: (l.leadTypes ?? []).map((lt: any) => lt.leadType?.icon),
    assignedToId: l.assignedToId,
    assignedToName: l.assignedTo?.name ?? null,
    assignedToAvatar: l.assignedTo?.avatarUrl ?? null,
    createdAt: l.createdAt?.toISOString?.() ?? '',
  }))

  const memberList = (members as any[]).map((m) => ({ id: m.id, name: m.name }))

  return (
    <div>
      <PageHeading
        title="Leads"
        description="Gerencie e acompanhe todos os seus contatos e oportunidades."
        actions={<DemoActionButton label="Novo Lead" icon="Users" title="Cadastro de leads" description="O formulário completo de cadastro e importação de leads faz parte da próxima etapa desta interface." />}
      />
      <LeadsTable leads={rows} members={memberList} currentUserId={user?.id ?? ''} />
    </div>
  )
}

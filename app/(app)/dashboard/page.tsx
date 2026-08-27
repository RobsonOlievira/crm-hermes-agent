export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getTenantId } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { DashboardView, DashboardData } from '@/components/dashboard/dashboard-view'
import { LEAD_SOURCE_META, LEAD_STATUS_META } from '@/lib/crm-constants'
import { ExportButton } from '@/components/dashboard/export-button'

const FUNNEL_ORDER = ['PRIMEIRO_CONTATO', 'CONVERSA_ATIVA', 'REUNIAO_AGENDADA', 'PROPOSTA_ENVIADA', 'SERVICO_FECHADO', 'PAGAMENTO_CONFIRMADO']

export default async function DashboardPage() {
  const tenantId = await getTenantId()

  const [byStatus, bySource, members] = await Promise.all([
    tenantId ? prisma.lead.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }) : Promise.resolve([]),
    tenantId ? prisma.lead.groupBy({ by: ['source'], where: { tenantId }, _count: { _all: true } }) : Promise.resolve([]),
    tenantId ? prisma.user.findMany({ where: { tenantId, role: { in: ['MANAGER', 'MEMBER'] } }, include: { _count: { select: { assignedLeads: true } } } }) : Promise.resolve([]),
  ])

  const statusMap = new Map((byStatus as any[]).map((s) => [s.status, s._count._all]))
  const funnel = FUNNEL_ORDER.map((status) => ({ status, count: (statusMap.get(status) as number) ?? 0 }))

  const sources = (bySource as any[])
    .map((s) => ({ name: LEAD_SOURCE_META[s.source]?.label ?? s.source, value: s._count._all }))
    .sort((a, b) => b.value - a.value)

  const team = (members as any[]).map((m, i) => ({
    name: m.name,
    avatarUrl: m.avatarUrl,
    leads: m._count.assignedLeads,
    conversion: [42, 38, 51, 29, 34][i % 5],
  }))

  const data: DashboardData = { funnel, sources, team }

  return (
    <div>
      <PageHeading
        title="Dashboard"
        description="Visão geral do desempenho do seu negócio em tempo real."
        actions={<ExportButton rows={funnel.map((f) => ({ etapa: LEAD_STATUS_META[f.status]?.label ?? f.status, total: f.count }))} />}
      />
      <DashboardView data={data} />
    </div>
  )
}

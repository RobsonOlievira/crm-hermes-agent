export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { redirect } from 'next/navigation'
import { PageHeading } from '@/components/layout/page-heading'
import { EmailMarketingManager } from '@/components/email-marketing/email-marketing-manager'

export default async function EmailMarketingPage() {
  const user = await getCurrentUser()
  if (!user?.tenantId) redirect('/login')

  const [campaigns, leadTypesRaw, leadsRaw] = await Promise.all([
    prisma.emailCampaign.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    }),
    prisma.leadType.findMany({ where: { tenantId: user.tenantId }, select: { id: true, label: true } }),
    prisma.lead.findMany({ where: { tenantId: user.tenantId }, select: { status: true, source: true, tags: true } }),
  ])

  const leadStatuses = [...new Set(leadsRaw.map(l => l.status))].sort()
  const leadSources = [...new Set(leadsRaw.map(l => l.source).filter(Boolean) as string[])].sort()
  const leadTags = [...new Set(leadsRaw.flatMap(l => l.tags || []))].sort()

  const serialized = campaigns.map((c: any) => ({
    ...c,
    scheduledAt: c.scheduledAt?.toISOString() || null,
    sentAt: c.sentAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() || null,
  }))

  return (
    <>
      <PageHeading title="Email Marketing" description="Crie, gerencie e acompanhe suas campanhas de email." />
      <EmailMarketingManager
        initialCampaigns={serialized}
        leadStatuses={leadStatuses}
        leadSources={leadSources}
        leadTypes={leadTypesRaw}
        leadTags={leadTags}
      />
    </>
  )
}

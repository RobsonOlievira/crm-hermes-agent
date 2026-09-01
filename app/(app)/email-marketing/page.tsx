export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { redirect } from 'next/navigation'
import { PageHeading } from '@/components/layout/page-heading'
import { EmailMarketingManager } from '@/components/email-marketing/email-marketing-manager'

export default async function EmailMarketingPage() {
  const user = await getCurrentUser()
  if (!user?.tenantId) redirect('/login')

  const [campaigns, leadTypesRaw, leadsRaw, catalogItems] = await Promise.all([
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
    prisma.lead.findMany({
      where: { tenantId: user.tenantId },
      select: { status: true, source: true, tags: true, formulario: true, companyName: true, cnpj: true, objective: true },
    }),
    prisma.catalogItem.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
  ])

  const leadStatuses = [...new Set(leadsRaw.map(l => l.status))].sort()
  const leadSources = [...new Set(leadsRaw.map(l => l.source).filter(Boolean) as string[])].sort()
  const leadTags = [...new Set(leadsRaw.flatMap(l => l.tags || []))].sort()
  const leadFormularios = [...new Set(leadsRaw.map(l => l.formulario).filter(Boolean) as string[])].sort()
  const leadCompanies = [...new Set(leadsRaw.map(l => l.companyName).filter(Boolean) as string[])].sort()
  const leadCnpjs = [...new Set(leadsRaw.map(l => l.cnpj).filter(Boolean) as string[])].sort()
  const leadObjectives = [...new Set(leadsRaw.map(l => l.objective).filter(Boolean) as string[])].sort()

  const serialized = campaigns.map((c: any) => ({
    ...c,
    scheduledAt: c.scheduledAt?.toISOString() || null,
    sentAt: c.sentAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() || null,
  }))

  return (
    <>
      <PageHeading title="Email Marketing" description="Crie, gerencie e dispara suas campanhas de email por segmentos, listas, tipos e tags." />
      <EmailMarketingManager
        initialCampaigns={serialized}
        leadStatuses={leadStatuses}
        leadSources={leadSources}
        leadTypes={leadTypesRaw}
        leadTags={leadTags}
        leadFormularios={leadFormularios}
        leadCompanies={leadCompanies}
        leadCnpjs={leadCnpjs}
        leadObjectives={leadObjectives}
        catalogItems={catalogItems}
      />
    </>
  )
}

export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { redirect } from 'next/navigation'
import { PageHeading } from '@/components/layout/page-heading'
import { ProspectingManager } from '@/components/prospecting/prospecting-manager'

export default async function ProspectingPage() {
  const user = await getCurrentUser()
  if (!user?.tenantId) redirect('/login')

  const [tenant, totalProspectsImported] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { niche: true, aisaApiKey: true, name: true },
    }),
    prisma.lead.count({
      where: {
        tenantId: user.tenantId,
        tags: { has: 'prospect_ai' },
      },
    }),
  ])

  const initialNiche = tenant?.niche || 'Dentistas'
  const hasApiKey = Boolean(tenant?.aisaApiKey || process.env.AISA_API_KEY)

  return (
    <>
      <PageHeading
        title="Prospecção Ativa (ProspectAI)"
        description="Busque e aborde empresas qualificadas no seu nicho de atuação com inteligência artificial AIsa."
      />
      <ProspectingManager
        initialNiche={initialNiche}
        hasApiKey={hasApiKey}
        totalProspectsImported={totalProspectsImported}
      />
    </>
  )
}

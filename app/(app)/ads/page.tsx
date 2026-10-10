export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { redirect } from 'next/navigation'
import { AdsDashboard } from '@/components/ads/ads-dashboard'
import { calcCPL, calcCAC, calcROI } from '@/lib/ads/metrics'

export default async function AdsPage() {
  const user = await getCurrentUser()
  if (!user?.tenantId) redirect('/login')

  const [campaignsRaw, alertsRaw, accountsRaw] = await Promise.all([
    prisma.adCampaign.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSpend: 'desc' },
      include: {
        account: { select: { name: true, platform: true } },
      },
    }),
    prisma.adBudgetAlert.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { triggeredAt: 'desc' },
      take: 10,
    }),
    prisma.adAccount.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        externalId: true,
        name: true,
        currency: true,
        isActive: true,
        lastSyncAt: true,
        syncError: true,
        _count: { select: { campaigns: true } },
      },
    }),
  ])

  const totalSpend = campaignsRaw.reduce((acc, c) => acc + c.totalSpend, 0)
  const totalLeads = campaignsRaw.reduce((acc, c) => acc + c.totalLeads, 0)
  const totalConversions = campaignsRaw.reduce((acc, c) => acc + c.totalConversions, 0)
  const totalRevenue = campaignsRaw.reduce((acc, c) => acc + c.totalRevenue, 0)

  const initialKpis = {
    totalSpend,
    totalLeads,
    totalConversions,
    totalRevenue,
    avgCPL: calcCPL(totalSpend, totalLeads),
    avgCAC: calcCAC(totalSpend, totalConversions),
    roi: calcROI(totalRevenue, totalSpend),
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    conversionRate: totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0,
  }

  const initialCampaigns = campaignsRaw.map((c) => ({
    id: c.id,
    externalId: c.externalId,
    name: c.name,
    platform: c.platform,
    status: c.status,
    objective: c.objective,
    dailyBudget: c.dailyBudget,
    totalSpend: c.totalSpend,
    totalImpressions: c.totalImpressions,
    totalClicks: c.totalClicks,
    totalLeads: c.totalLeads,
    totalConversions: c.totalConversions,
    totalRevenue: c.totalRevenue,
    cpl: calcCPL(c.totalSpend, c.totalLeads),
    cac: calcCAC(c.totalSpend, c.totalConversions),
    roi: calcROI(c.totalRevenue, c.totalSpend),
    accountName: c.account?.name ?? 'Desconhecida',
  }))

  const initialAlerts = alertsRaw.map((a) => ({
    ...a,
    triggeredAt: a.triggeredAt.toISOString(),
  }))

  const initialAccounts = accountsRaw.map((acc) => ({
    ...acc,
    lastSyncAt: acc.lastSyncAt?.toISOString() || null,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AdsDashboard
        initialKpis={initialKpis}
        initialCampaigns={initialCampaigns}
        initialAlerts={initialAlerts}
        initialAccounts={initialAccounts}
      />
    </div>
  )
}

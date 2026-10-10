export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { calcCPL, calcCAC, calcROI, calcROAS, calcConversionRate } from '@/lib/ads/metrics'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    // 1. Campanhas e KPIs agregados
    const campaigns = await prisma.adCampaign.findMany({
      where: { tenantId: user.tenantId },
      include: {
        account: { select: { name: true, platform: true } },
      },
    })

    const totalSpend = campaigns.reduce((acc, c) => acc + c.totalSpend, 0)
    const totalLeads = campaigns.reduce((acc, c) => acc + c.totalLeads, 0)
    const totalConversions = campaigns.reduce((acc, c) => acc + c.totalConversions, 0)
    const totalRevenue = campaigns.reduce((acc, c) => acc + c.totalRevenue, 0)

    const kpis = {
      totalSpend,
      totalLeads,
      totalConversions,
      totalRevenue,
      avgCPL: calcCPL(totalSpend, totalLeads),
      avgCAC: calcCAC(totalSpend, totalConversions),
      roi: calcROI(totalRevenue, totalSpend),
      roas: calcROAS(totalRevenue, totalSpend),
      conversionRate: calcConversionRate(totalConversions, totalLeads),
    }

    // 2. Métricas por Plataforma (Meta vs Google)
    const platforms = ['META', 'GOOGLE'] as const
    const byPlatform = platforms.map((platform) => {
      const platformCampaigns = campaigns.filter((c) => c.platform === platform)
      const spend = platformCampaigns.reduce((acc, c) => acc + c.totalSpend, 0)
      const leads = platformCampaigns.reduce((acc, c) => acc + c.totalLeads, 0)
      const conversions = platformCampaigns.reduce((acc, c) => acc + c.totalConversions, 0)
      const revenue = platformCampaigns.reduce((acc, c) => acc + c.totalRevenue, 0)

      return {
        platform,
        spend,
        leads,
        conversions,
        revenue,
        cpl: calcCPL(spend, leads),
        cac: calcCAC(spend, conversions),
        roi: calcROI(revenue, spend),
      }
    })

    // 3. Tendência diária (últimos N dias)
    const dailyMetrics = await prisma.adMetricDaily.findMany({
      where: { tenantId: user.tenantId, date: { gte: since } },
      orderBy: { date: 'asc' },
    })

    // Agrupar por data
    const dailyMap = new Map<string, { date: string; spend: number; leads: number; conversions: number; clicks: number }>()
    for (const m of dailyMetrics) {
      const dStr = m.date.toISOString().split('T')[0]
      const curr = dailyMap.get(dStr) || { date: dStr, spend: 0, leads: 0, conversions: 0, clicks: 0 }
      curr.spend += m.spend
      curr.leads += m.leads
      curr.conversions += m.conversions
      curr.clicks += m.clicks
      dailyMap.set(dStr, curr)
    }
    const dailyTrend = Array.from(dailyMap.values())

    // 4. Top 5 campanhas por investimento
    const topCampaigns = [...campaigns]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        totalSpend: c.totalSpend,
        totalLeads: c.totalLeads,
        totalConversions: c.totalConversions,
        totalRevenue: c.totalRevenue,
        cpl: calcCPL(c.totalSpend, c.totalLeads),
        roi: calcROI(c.totalRevenue, c.totalSpend),
      }))

    // 5. Alertas recentes não lidos
    const alerts = await prisma.adBudgetAlert.findMany({
      where: { tenantId: user.tenantId, isRead: false },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      kpis,
      byPlatform,
      dailyTrend,
      topCampaigns,
      alerts,
    })
  } catch (error) {
    console.error('Erro ao buscar dashboard de ads:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard' }, { status: 500 })
  }
}

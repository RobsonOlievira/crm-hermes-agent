export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { calcCPL, calcCAC, calcROI } from '@/lib/ads/metrics'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')

    const where: any = { tenantId: user.tenantId }
    if (platform && ['META', 'GOOGLE'].includes(platform)) where.platform = platform
    if (status && ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'].includes(status)) where.status = status

    const campaigns = await prisma.adCampaign.findMany({
      where,
      orderBy: { totalSpend: 'desc' },
      include: {
        account: { select: { id: true, name: true, platform: true } },
        _count: { select: { leads: true } },
      },
    })

    const rows = campaigns.map((c) => ({
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

    return NextResponse.json({ campaigns: rows })
  } catch (error) {
    console.error('Erro ao listar campanhas:', error)
    return NextResponse.json({ error: 'Erro ao listar campanhas' }, { status: 500 })
  }
}

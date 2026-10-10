export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

function getDateRange(period: string) {
  const now = new Date()
  let startDate = new Date()

  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 7)
  } else if (period === 'year') {
    startDate.setFullYear(now.getFullYear() - 1)
  } else {
    // month
    startDate.setMonth(now.getMonth() - 1)
  }
  return { startDate, endDate: now }
}

function getPreviousDateRange(period: string) {
  const now = new Date()
  let startDate = new Date()
  let endDate = new Date()

  if (period === 'today') {
    startDate.setDate(now.getDate() - 1)
    startDate.setHours(0, 0, 0, 0)
    endDate.setDate(now.getDate() - 1)
    endDate.setHours(23, 59, 59, 999)
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 14)
    endDate.setDate(now.getDate() - 7)
  } else if (period === 'year') {
    startDate.setFullYear(now.getFullYear() - 2)
    endDate.setFullYear(now.getFullYear() - 1)
  } else {
    startDate.setMonth(now.getMonth() - 2)
    endDate.setMonth(now.getMonth() - 1)
  }
  return { startDate, endDate }
}

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'month'

  const tenantId = user.tenantId
  const { startDate, endDate } = getDateRange(period)
  const prevRange = getPreviousDateRange(period)

  try {
    const [currentOrders, prevOrders, activeSubs, pastDueSubs] = await Promise.all([
      prisma.paymentOrder.findMany({
        where: { tenantId, status: 'CONFIRMED', paidAt: { gte: startDate, lte: endDate } },
      }),
      prisma.paymentOrder.findMany({
        where: { tenantId, status: 'CONFIRMED', paidAt: { gte: prevRange.startDate, lte: prevRange.endDate } },
      }),
      prisma.subscription.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { tenantId, status: 'PAST_DUE' } }),
    ])

    const totalReceita = currentOrders.reduce((s, o) => s + o.amount, 0)
    const prevReceita = prevOrders.reduce((s, o) => s + o.amount, 0)
    const ticketMedio = currentOrders.length > 0 ? totalReceita / currentOrders.length : 0
    const deltaReceita = prevReceita > 0 ? ((totalReceita - prevReceita) / prevReceita) * 100 : 0

    const receitaPorMetodo = currentOrders.reduce((acc, o) => {
      const m = o.method || 'OTHER'
      acc[m] = (acc[m] || 0) + o.amount
      return acc
    }, {} as Record<string, number>)

    const receitaPorProvider = currentOrders.reduce((acc, o) => {
      acc[o.provider] = (acc[o.provider] || 0) + o.amount
      return acc
    }, {} as Record<string, number>)

    const allActiveSubs = await prisma.subscription.findMany({
      where: { tenantId, status: 'ACTIVE' },
    })

    const mrr = allActiveSubs.reduce((s, sub) => {
      const monthly = sub.intervalType === 'YEARLY'
        ? sub.amount / 12
        : sub.intervalType === 'WEEKLY'
        ? sub.amount * 4.33
        : sub.amount
      return s + monthly
    }, 0)
    const arr = mrr * 12

    const dateMap: Record<string, number> = {}
    currentOrders.forEach((o) => {
      const dateKey = o.paidAt ? new Date(o.paidAt).toISOString().slice(0, 10) : 'outros'
      dateMap[dateKey] = (dateMap[dateKey] || 0) + o.amount
    })

    const receitaPorPeriodo = Object.entries(dateMap)
      .map(([date, valor]) => ({ date, valor }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      kpis: {
        totalReceita,
        deltaReceita: Math.round(deltaReceita),
        totalCobrancas: currentOrders.length,
        ticketMedio,
        assinaturasAtivas: activeSubs,
        inadimplentes: pastDueSubs,
        mrr,
        arr,
      },
      charts: {
        receitaPorPeriodo,
        receitaPorMetodo: Object.entries(receitaPorMetodo).map(([method, value]) => ({ method, value })),
        receitaPorProvider: Object.entries(receitaPorProvider).map(([provider, value]) => ({ provider, value })),
      },
    })
  } catch (error) {
    console.error('Erro ao gerar dados do dashboard de pagamentos:', error)
    return NextResponse.json({ error: 'Erro ao gerar dados do dashboard' }, { status: 500 })
  }
}

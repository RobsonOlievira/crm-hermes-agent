export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getTenantId } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { DashboardView, DashboardData, PeriodKey } from '@/components/dashboard/dashboard-view'
import { LEAD_SOURCE_META, LEAD_STATUS_META } from '@/lib/crm-constants'
import { ExportButton } from '@/components/dashboard/export-button'

const FUNNEL_ORDER = ['PRIMEIRO_CONTATO', 'CONVERSA_ATIVA', 'REUNIAO_AGENDADA', 'PROPOSTA_ENVIADA', 'SERVICO_FECHADO', 'PAGAMENTO_CONFIRMADO']
const CONVERSION_STATUSES = ['SERVICO_FECHADO', 'PAGAMENTO_CONFIRMADO']
const MS_DAY = 86400000
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface Win {
  start: Date
  end: Date
  label: string
}

function windowsFor(period: PeriodKey): Win[] {
  const now = new Date()
  if (period === 'today') {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const out: Win[] = []
    for (let h = 0; h < 24; h++) {
      out.push({
        start: new Date(dayStart.getTime() + h * 3600000),
        end: new Date(dayStart.getTime() + (h + 1) * 3600000),
        label: `${h}h`,
      })
    }
    return out
  }
  if (period === 'week') {
    const out: Win[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * MS_DAY)
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      out.push({ start: s, end: new Date(s.getTime() + MS_DAY), label: WEEKDAY_LABELS[d.getDay()] })
    }
    return out
  }
  if (period === 'month') {
    const out: Win[] = []
    for (let w = 3; w >= 0; w--) {
      const end = new Date(now.getTime() - w * 7 * MS_DAY)
      const start = new Date(end.getTime() - 7 * MS_DAY)
      out.push({ start, end, label: `Sem ${4 - w}` })
    }
    return out
  }
  const out: Win[] = []
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1), label: MONTH_LABELS[start.getMonth()] })
  }
  return out
}

function countInWindows(dates: Date[], wins: Win[]) {
  return wins.map((w) => ({ label: w.label, count: dates.filter((d) => d >= w.start && d < w.end).length }))
}

function sumInWindows(entries: { at: Date; amount: number }[], wins: Win[]) {
  return wins.map((w) => ({
    label: w.label,
    total: entries.filter((e) => e.at >= w.start && e.at < w.end).reduce((acc, e) => acc + (e.amount || 0), 0),
  }))
}

function delta(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

export default async function DashboardPage() {
  const tenantId = await getTenantId()

  const twoYearsAgo = new Date(Date.now() - 730 * MS_DAY)

  const [leadsInWindow, studentsInWindow, byStatus, bySource, members, clientsAtivos] = await Promise.all([
    tenantId
      ? prisma.lead.findMany({
          where: { tenantId, createdAt: { gte: twoYearsAgo } },
          select: { createdAt: true, status: true, source: true, assignedToId: true },
        })
      : Promise.resolve([]),
    tenantId
      ? prisma.student.findMany({
          where: { tenantId, enrolledAt: { gte: twoYearsAgo } },
          select: { enrolledAt: true, amountPaid: true },
        })
      : Promise.resolve([]),
    tenantId ? prisma.lead.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }) : Promise.resolve([]),
    tenantId ? prisma.lead.groupBy({ by: ['source'], where: { tenantId }, _count: { _all: true } }) : Promise.resolve([]),
    tenantId ? prisma.user.findMany({ where: { tenantId, role: { in: ['MANAGER', 'MEMBER'] } }, include: { _count: { select: { assignedLeads: true } } } }) : Promise.resolve([]),
    tenantId ? prisma.client.count({ where: { tenantId, status: 'ATIVO' } }) : Promise.resolve(0),
  ])

  const leadDates = (leadsInWindow as { createdAt: Date }[]).map((l) => l.createdAt)
  const saleEntries = (studentsInWindow as { enrolledAt: Date; amountPaid: number }[]).map((s) => ({ at: s.enrolledAt, amount: s.amountPaid }))

  const periods = {} as Record<PeriodKey, DashboardData['periods'][PeriodKey]>
  const rangeLen: Record<PeriodKey, number> = { today: 1, week: 7, month: 30, year: 365 }

  ;(['today', 'week', 'month', 'year'] as PeriodKey[]).forEach((key) => {
    const len = rangeLen[key] * MS_DAY
    const curStart = Date.now() - len
    const prevStart = curStart - len
    const curLedCount = leadsInWindow.filter((l) => l.createdAt.getTime() >= curStart).length
    const prevLedCount = leadsInWindow.filter((l) => l.createdAt.getTime() >= prevStart && l.createdAt.getTime() < curStart).length
    const curSales = saleEntries.filter((s) => s.at.getTime() >= curStart && s.amount > 0)
    const prevSales = saleEntries.filter((s) => s.at.getTime() >= prevStart && s.at.getTime() < curStart && s.amount > 0)

    const curRevenue = curSales.reduce((a, s) => a + s.amount, 0)
    const prevRevenue = prevSales.reduce((a, s) => a + s.amount, 0)
    const curConversions = curSales.length
    const prevConversions = prevSales.length
    const newLeads = curLedCount

    periods[key] = {
      newLeads,
      conversions: curConversions,
      revenue: curRevenue,
      ticket: curConversions > 0 ? Math.round(curRevenue / curConversions) : 0,
      deltas: [
        delta(newLeads, prevLedCount),
        delta(curConversions, prevConversions),
        delta(curRevenue, prevRevenue),
        delta(curConversions > 0 ? Math.round(curRevenue / curConversions) : 0, prevConversions > 0 ? Math.round(prevRevenue / prevConversions) : 0),
      ],
      leadsSeries: countInWindows(leadDates, windowsFor(key)).map((w) => ({ label: w.label, leads: w.count })),
      revenueSeries: sumInWindows(saleEntries, windowsFor(key)).map((w) => ({ label: w.label, receita: w.total })),
    }
  })

  const statusMap = new Map((byStatus as any[]).map((s) => [s.status, s._count._all]))
  const funnel = FUNNEL_ORDER.map((status) => ({ status, count: (statusMap.get(status) as number) ?? 0 }))

  const sources = (bySource as any[])
    .map((s) => ({ name: LEAD_SOURCE_META[s.source]?.label ?? s.source, value: s._count._all }))
    .sort((a, b) => b.value - a.value)

  const team = (members as any[]).map((m) => {
    const assigned = m._count.assignedLeads
    const closed = leadsInWindow.filter((l) => l.assignedToId === m.id && CONVERSION_STATUSES.includes(l.status)).length
    return {
      name: m.name,
      avatarUrl: m.avatarUrl,
      leads: assigned,
      conversion: assigned > 0 ? Math.round((closed / assigned) * 100) : 0,
    }
  })

  const data: DashboardData = { periods, funnel, sources, team, clientsAtivos }

  return (
    <div>
      <PageHeading
        title="Dashboard"
        description="Visão geral do desempenho do seu negócio em tempo real."
        actions={<ExportButton rows={[...funnel.map((f) => ({ etapa: LEAD_STATUS_META[f.status]?.label ?? f.status, total: f.count })), { etapa: 'Clientes ativos', total: clientsAtivos }]} />}
      />
      <DashboardView data={data} />
    </div>
  )
}
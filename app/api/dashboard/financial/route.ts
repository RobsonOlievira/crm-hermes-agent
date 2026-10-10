import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// ── GET — KPIs financeiros para o dashboard ──
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const tenantId = user.tenantId
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const last6Start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [projectsByStatus, projectsThisMonth, bankAccounts, overdueInstallments] = await Promise.all([
      // Projetos por status (propostas em negociação ficam de fora)
      prisma.project.groupBy({
        by: ['status'],
        where: { tenantId, status: { not: 'PROPOSAL' } },
        _count: { _all: true },
        _sum: { totalValue: true },
      }),

      // Projetos do mês atual (competência = startDate)
      prisma.project.findMany({
        where: {
          tenantId,
          status: { not: 'PROPOSAL' },
          startDate: { gte: thisMonth, lt: nextMonth },
        },
        include: { installments: true },
      }),

      // Contas bancárias ativas
      prisma.bankAccount.findMany({
        where: { tenantId, isActive: true },
      }),

      // Parcelas atrasadas (vencidas e não pagas)
      prisma.projectInstallment.findMany({
        where: {
          tenantId,
          paid: false,
          dueDate: { lt: now },
        },
        include: {
          project: {
            select: {
              name: true,
              client: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
    ])

    // KPIs do mês
    const totalAReceber = projectsThisMonth
      .flatMap((p) => p.installments)
      .filter((i) => !i.paid)
      .reduce((s, i) => s + i.amount, 0)
    const totalRecebidoMes = projectsThisMonth
      .flatMap((p) => p.installments)
      .filter((i) => i.paid)
      .reduce((s, i) => s + (i.paidAmount ?? i.amount), 0)
    const saldoBancario = bankAccounts.reduce((s, a) => s + a.balance, 0)

    const totalAtrasado = await prisma.projectInstallment.aggregate({
      where: { tenantId, paid: false, dueDate: { lt: now } },
      _sum: { amount: true },
      _count: { _all: true },
    })

    const totalProjetosAtivos = projectsByStatus
      .filter((p) => !['CANCELLED', 'PAID'].includes(p.status))
      .reduce((s, p) => s + p._count._all, 0)

    const valorTotalProjetos = projectsByStatus.reduce((s, p) => s + (p._sum.totalValue ?? 0), 0)

    // Últimos 6 meses para o gráfico
    const last6Months = await prisma.project.findMany({
      where: {
        tenantId,
        status: { not: 'PROPOSAL' },
        startDate: { gte: last6Start, lt: nextMonth },
      },
      include: { installments: true },
    })

    const chartData = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const m = monthDate.getMonth()
      const y = monthDate.getFullYear()
      const monthProjects = last6Months.filter((p) => {
        const d = new Date(p.startDate)
        return d.getMonth() === m && d.getFullYear() === y
      })
      return {
        month: monthDate.toLocaleString('pt-BR', { month: 'short' }),
        projetado: monthProjects.reduce((s, p) => s + p.totalValue, 0),
        realizado: monthProjects.reduce(
          (s, p) =>
            s +
            p.installments
              .filter((i) => i.paid)
              .reduce((a, i) => a + (i.paidAmount ?? i.amount), 0),
          0
        ),
      }
    })

    return NextResponse.json({
      kpis: {
        totalAReceber,
        totalRecebidoMes,
        totalProjetosAtivos,
        valorTotalProjetos,
        saldoBancario,
        totalAtrasado: totalAtrasado._sum.amount ?? 0,
        parcelasAtrasadas: totalAtrasado._count._all,
      },
      projectsByStatus,
      overdueInstallments: overdueInstallments.map((i) => ({
        id: i.id,
        project: i.project.name,
        client: i.project.client.name,
        clientPhone: i.project.client.phone,
        amount: i.amount,
        dueDate: i.dueDate,
        daysLate: Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / 86400000),
      })),
      bankAccounts,
      chartData,
    })
  } catch (err) {
    console.error('[GET /api/dashboard/financial]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

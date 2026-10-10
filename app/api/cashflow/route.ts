import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// ── GET — Resumo mensal ou anual ──
// Query: ?year=2026 → resumo anual (12 meses)
// Query: ?year=2026&month=8 → mês específico
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const monthParam = searchParams.get('month')

    if (monthParam !== null) {
      // ── Mês específico ──
      const month = parseInt(monthParam)
      const cf = await prisma.monthlyCashFlow.findUnique({
        where: { tenantId_year_month: { tenantId: user.tenantId, year, month } },
        include: { expenses: true, extraRevenues: true, revenueEntries: true },
      })

      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)

      // Projetos do mês por competência (startDate). Cada projeto aparece
      // somente no mês em que começou; o pagamento das parcelas é controlado
      // por checkbox e alimenta o fluxo de caixa sob demanda.
      const projects = await prisma.project.findMany({
        where: {
          tenantId: user.tenantId,
          status: { not: 'PROPOSAL' }, // propostas em negociação não entram no caixa
          startDate: { gte: monthStart, lte: monthEnd },
        },
        include: {
          client: { select: { id: true, name: true } },
          installments: { orderBy: { number: 'asc' } },
        },
        orderBy: { startDate: 'asc' },
      })

      const receitaProjetada = projects.reduce((s, p) => s + p.totalValue, 0)
      const receitaRealizada = projects.reduce(
        (s, p) =>
          s +
          p.installments
            .filter((i) => i.paid)
            .reduce((a, i) => a + (i.paidAmount ?? i.amount), 0),
        0
      )
      const receitaExtraManual = cf?.extraRevenues?.reduce((s, r) => s + r.amount, 0) ?? 0
      const receitaFontes = cf?.revenueEntries?.reduce((s, r) => s + r.amount, 0) ?? 0
      const receitaExtra = receitaExtraManual + receitaFontes
      const despesas = cf?.expenses?.reduce((s, e) => s + e.amount, 0) ?? 0
      const saldo = receitaRealizada + receitaExtra - despesas

      const activeProjects = await prisma.project.findMany({
        where: {
          tenantId: user.tenantId,
          // Projetos que começaram neste mês ou antes e não estão cancelados
          startDate: { lte: monthEnd },
          status: { in: ['IN_PROGRESS', 'ENTRY'] } // PROPOSAL fica de fora
        },
        select: { id: true, name: true, client: { select: { name: true } }, status: true }
      })

      // Invoices do mês
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: user.tenantId, issueDate: { gte: monthStart, lte: monthEnd } },
      })

      // Contas Bancárias
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { tenantId: user.tenantId }
      })
      
      // Default Expenses
      const defaultExpenses = await prisma.tenantDefaultExpense.findMany({
        where: { tenantId: user.tenantId }
      })

      // Revenue Sources
      const revenueSources = await prisma.revenueSource.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })

      return NextResponse.json({
        cashFlow: cf,
        projects,
        activeProjects,
        invoices,
        bankAccounts,
        defaultExpenses,
        revenueSources,
        receitaProjetada,
        receitaRealizada,
        receitaExtra,
        despesas,
        saldo,
      })
    }

    // ── Resumo anual ──
    const cashFlows = await prisma.monthlyCashFlow.findMany({
      where: { tenantId: user.tenantId, year },
      include: { expenses: true, extraRevenues: true, revenueEntries: true },
      orderBy: { month: 'asc' },
    })

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    const projects = await prisma.project.findMany({
      where: {
        tenantId: user.tenantId,
        status: { not: 'PROPOSAL' }, // propostas em negociação não entram no caixa
        startDate: { gte: yearStart, lte: yearEnd },
      },
      include: { installments: true },
    })

    const byMonth = Array.from({ length: 12 }, (_, m) => {
      const cf = cashFlows.find((c) => c.month === m)
      const monthProjects = projects.filter(
        (p) => new Date(p.startDate).getMonth() === m
      )

      const receitaProjetada = monthProjects.reduce((s, p) => s + p.totalValue, 0)
      const receitaRealizada = monthProjects.reduce(
        (s, p) =>
          s +
          p.installments
            .filter((i) => i.paid)
            .reduce((a, i) => a + (i.paidAmount ?? i.amount), 0),
        0
      )
      const receitaExtraManual = cf?.extraRevenues?.reduce((s, r) => s + r.amount, 0) ?? 0
      const receitaFontes = cf?.revenueEntries?.reduce((s, r) => s + r.amount, 0) ?? 0
      const receitaExtra = receitaExtraManual + receitaFontes
      const despesas = cf?.expenses?.reduce((s, e) => s + e.amount, 0) ?? 0

      return {
        month: m,
        receitaProjetada,
        receitaRealizada,
        receitaExtra,
        despesas,
        saldo: receitaRealizada + receitaExtra - despesas,
        observation: cf?.observation ?? null,
      }
    })

    const totals = byMonth.reduce(
      (acc, m) => ({
        receitaProjetada: acc.receitaProjetada + m.receitaProjetada,
        receitaRealizada: acc.receitaRealizada + m.receitaRealizada,
        receitaExtra: acc.receitaExtra + m.receitaExtra,
        despesas: acc.despesas + m.despesas,
        saldo: acc.saldo + m.saldo,
      }),
      { receitaProjetada: 0, receitaRealizada: 0, receitaExtra: 0, despesas: 0, saldo: 0 }
    )
    
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId }
    })
    
    const defaultExpenses = await prisma.tenantDefaultExpense.findMany({
      where: { tenantId: user.tenantId }
    })

    const revenueSources = await prisma.revenueSource.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    const yearInvoices = await prisma.invoice.findMany({
      where: { tenantId: user.tenantId, issueDate: { gte: yearStart, lte: yearEnd } }
    })

    return NextResponse.json({ year, months: byMonth, totals, bankAccounts, defaultExpenses, revenueSources, yearInvoices })
  } catch (err) {
    console.error('[GET /api/cashflow]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── POST — Salvar despesas e receitas extras de um mês ──
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { year, month, expenses = [], extraRevenues = [], revenueEntries = [], observation, propagateFixed = false } = body

    if (year === undefined || month === undefined) {
      return NextResponse.json({ error: 'year e month são obrigatórios' }, { status: 400 })
    }

    // Upsert MonthlyCashFlow
    const cf = await prisma.monthlyCashFlow.upsert({
      where: { tenantId_year_month: { tenantId: user.tenantId, year, month } },
      create: { tenantId: user.tenantId, year, month, observation },
      update: { observation },
    })

    // Recriar expenses (delete + create = mais simples para edição inline)
    await prisma.cashFlowExpense.deleteMany({ where: { cashFlowId: cf.id } })
    if (expenses.length > 0) {
      await prisma.cashFlowExpense.createMany({
        data: expenses.map((e: any) => ({
          cashFlowId: cf.id,
          category: e.category,
          description: e.description,
          amount: e.amount,
          isFixed: e.isFixed ?? false,
        })),
      })
    }

    // Recriar extraRevenues
    await prisma.cashFlowExtraRevenue.deleteMany({ where: { cashFlowId: cf.id } })
    if (extraRevenues.length > 0) {
      await prisma.cashFlowExtraRevenue.createMany({
        data: extraRevenues.map((r: any) => ({
          cashFlowId: cf.id,
          description: r.description,
          amount: r.amount,
        })),
      })
    }

    // Recriar revenueEntries (fontes de receita do mês)
    await prisma.monthlyRevenueEntry.deleteMany({ where: { cashFlowId: cf.id } })
    const validEntries = (revenueEntries as any[]).filter((e) => e.sourceId && parseFloat(e.amount) > 0)
    if (validEntries.length > 0) {
      await prisma.monthlyRevenueEntry.createMany({
        data: validEntries.map((e: any) => ({
          cashFlowId: cf.id,
          sourceId: e.sourceId,
          amount: parseFloat(e.amount),
        })),
      })
    }

    // Propagar despesas fixas para os outros meses do ano (se solicitado)
    if (propagateFixed) {
      const fixedExpenses = expenses.filter((e: any) => e.isFixed)
      if (fixedExpenses.length > 0) {
        for (let m = 0; m < 12; m++) {
          if (m === month) continue

          const targetCf = await prisma.monthlyCashFlow.upsert({
            where: { tenantId_year_month: { tenantId: user.tenantId, year, month: m } },
            create: { tenantId: user.tenantId, year, month: m },
            update: {},
          })

          await prisma.cashFlowExpense.deleteMany({
            where: { cashFlowId: targetCf.id, isFixed: true },
          })

          await prisma.cashFlowExpense.createMany({
            data: fixedExpenses.map((e: any) => ({
              cashFlowId: targetCf.id,
              category: e.category,
              description: e.description,
              amount: e.amount,
              isFixed: true,
            })),
          })
        }
      }
    }

    return NextResponse.json({ ok: true, id: cf.id })
  } catch (err) {
    console.error('[POST /api/cashflow]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── POST — Gerenciar Default Expenses ──
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { expenses } = await req.json()
    
    await prisma.tenantDefaultExpense.deleteMany({ where: { tenantId: user.tenantId } })
    
    if (expenses && expenses.length > 0) {
      await prisma.tenantDefaultExpense.createMany({
        data: expenses.map((e: any) => ({
          tenantId: user.tenantId,
          category: e.category,
          description: e.description,
          amount: parseFloat(e.amount) || 0
        }))
      })
    }
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/cashflow]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}


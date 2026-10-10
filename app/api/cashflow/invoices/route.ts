import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { onInvoiceIssued } from '@/lib/cashflow-engine'

// ── GET — Listar notas fiscais ──
// Query: ?year=2026&month=8&clientId=xxx
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const clientId = searchParams.get('clientId')

    const where: any = { tenantId: user.tenantId }

    if (year && month !== null) {
      const y = parseInt(year)
      const m = parseInt(month as string)
      where.issueDate = {
        gte: new Date(y, m, 1),
        lte: new Date(y, m + 1, 0, 23, 59, 59),
      }
    } else if (year) {
      const y = parseInt(year)
      where.issueDate = {
        gte: new Date(y, 0, 1),
        lte: new Date(y, 11, 31, 23, 59, 59),
      }
    }

    if (clientId) where.clientId = clientId

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { issueDate: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (err) {
    console.error('[GET /api/cashflow/invoices]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── POST — Criar nota fiscal ──
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { clientId, projectId, number, issueDate, amount, description, status = 'ISSUED' } = body

    if (!number || !issueDate || !amount) {
      return NextResponse.json({ error: 'number, issueDate e amount são obrigatórios' }, { status: 400 })
    }

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: user.tenantId,
        clientId,
        projectId,
        number,
        issueDate: new Date(issueDate),
        amount,
        description,
        status,
      },
    })

    // Registrar no motor financeiro
    await onInvoiceIssued({
      tenantId: user.tenantId,
      invoiceId: invoice.id,
      clientId,
      projectId,
      amount,
      issueDate: new Date(issueDate),
      description: `NF ${number}${description ? ` — ${description}` : ''}`,
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (err) {
    console.error('[POST /api/cashflow/invoices]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── PUT — Atualizar status da NF ──
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { id, status } = body

    if (!id || !status) return NextResponse.json({ error: 'id e status são obrigatórios' }, { status: 400 })

    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!invoice) return NextResponse.json({ error: 'NF não encontrada' }, { status: 404 })

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/cashflow/invoices]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

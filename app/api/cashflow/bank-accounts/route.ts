import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// ── GET — Listar contas bancárias ──
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const accounts = await prisma.bankAccount.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    const total = accounts.reduce((s, a) => s + a.balance, 0)

    return NextResponse.json({ accounts, total })
  } catch (err) {
    console.error('[GET /api/cashflow/bank-accounts]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── POST — Criar conta bancária ──
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { name, balance = 0, color } = body

    if (!name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })

    const account = await prisma.bankAccount.create({
      data: { tenantId: user.tenantId, name, balance, color },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (err) {
    console.error('[POST /api/cashflow/bank-accounts]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ── PUT — Atualizar conta bancária ──
// body: { id, name?, balance?, color?, isActive? }
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { id, name, balance, color, isActive } = body

    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const account = await prisma.bankAccount.findFirst({
      where: { id, tenantId: user.tenantId },
    })
    if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        name: name ?? account.name,
        balance: balance !== undefined ? balance : account.balance,
        color: color !== undefined ? color : account.color,
        isActive: isActive !== undefined ? isActive : account.isActive,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/cashflow/bank-accounts]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

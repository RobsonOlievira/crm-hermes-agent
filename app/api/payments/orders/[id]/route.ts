export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const order = await prisma.paymentOrder.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: {
        lead: true,
        catalogItem: true,
        purchase: true,
        gatewayConfig: { select: { provider: true, displayName: true } },
      },
    })

    if (!order) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Erro ao buscar cobrança:', error)
    return NextResponse.json({ error: 'Erro ao buscar cobrança' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const order = await prisma.paymentOrder.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
    })

    if (!order) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

    const updated = await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ order: updated })
  } catch (error) {
    console.error('Erro ao cancelar cobrança:', error)
    return NextResponse.json({ error: 'Erro ao cancelar cobrança' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const alertId = params.id

    const updated = await prisma.adBudgetAlert.updateMany({
      where: { id: alertId, tenantId: user.tenantId },
      data: { isRead: true, resolvedAt: new Date() },
    })

    return NextResponse.json({ ok: true, updatedCount: updated.count })
  } catch (error) {
    console.error('Erro ao marcar alerta como lido:', error)
    return NextResponse.json({ error: 'Erro ao atualizar alerta' }, { status: 500 })
  }
}

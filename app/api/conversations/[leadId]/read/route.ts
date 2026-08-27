export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Marca a conversa como lida (zera o contador de não lidas).
export async function PATCH(_req: Request, { params }: { params: { leadId: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    await prisma.lead.updateMany({
      where: { id: params.leadId, tenantId: user.tenantId },
      data: { unreadCount: 0 },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao marcar como lida' }, { status: 500 })
  }
}

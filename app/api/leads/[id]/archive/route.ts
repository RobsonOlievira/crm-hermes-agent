export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Banco de conversas em off: arquiva (dissolve) ou restaura uma conversa.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { archived } = await req.json()
    const isArchived = Boolean(archived)
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: { isArchived, archivedAt: isArchived ? new Date() : null },
    })
    return NextResponse.json({ lead })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar a conversa' }, { status: 500 })
  }
}

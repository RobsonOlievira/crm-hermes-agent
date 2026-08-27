export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { LeadStatus } from '@prisma/client'

const STAGE_STATUS: Record<string, LeadStatus> = {
  'stage-1': 'PRIMEIRO_CONTATO',
  'stage-2': 'CONVERSA_ATIVA',
  'stage-3': 'FOLLOW_UP',
  'stage-4': 'BANCO_7_DIAS',
  'stage-5': 'SERVICO_FECHADO',
  'stage-6': 'NOVAS_MENSAGENS',
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { stageId } = await req.json()
    const data: any = { stageId }
    if (STAGE_STATUS[stageId]) data.status = STAGE_STATUS[stageId]
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json({ lead })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao mover lead' }, { status: 500 })
  }
}

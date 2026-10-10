export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { deriveLeadStatus } from '@/lib/lead-stages'
import { resolveTenantStage } from '@/lib/stage-resolver'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { stageId } = await req.json()
    if (!stageId || typeof stageId !== 'string') {
      return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 })
    }
    const stage = await resolveTenantStage(user.tenantId, stageId)
    if (!stage) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 })

    const data: any = { stageId: stage.id }
    const status = deriveLeadStatus(stage)
    if (status) data.status = status

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json({ lead })
  } catch (e) {
    console.error('[leads stage PATCH]', params.id, e)
    return NextResponse.json({ error: 'Erro ao mover lead' }, { status: 500 })
  }
}

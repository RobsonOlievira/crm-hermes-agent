export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const automation = await prisma.journeyAutomation.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!automation) return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 })
    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if ('description' in body) data.description = body.description?.trim() || null
    if ('fromStatus' in body) data.fromStatus = body.fromStatus || null
    if ('toStatus' in body) data.toStatus = body.toStatus || null
    if (typeof body.triggerType === 'string' && body.triggerType) data.triggerType = body.triggerType
    if ('delayHours' in body && Number.isFinite(Number(body.delayHours))) data.delayHours = Math.max(0, Math.round(Number(body.delayHours)))
    if (typeof body.action === 'string' && body.action) data.action = body.action
    if ('message' in body) data.message = body.message?.trim() || null
    if (typeof body.keepChannelTag === 'boolean') data.keepChannelTag = body.keepChannelTag
    if (typeof body.connectHermes === 'boolean') data.connectHermes = body.connectHermes
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    const updated = await prisma.journeyAutomation.update({ where: { id: automation.id }, data })
    return NextResponse.json({ automation: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar automação' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const automation = await prisma.journeyAutomation.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!automation) return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 })
    await prisma.journeyAutomation.delete({ where: { id: automation.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir automação' }, { status: 500 })
  }
}

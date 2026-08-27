export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const automations = await prisma.journeyAutomation.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ automations })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body?.name?.trim()) return NextResponse.json({ error: 'Informe um nome para a automação' }, { status: 400 })
    const count = await prisma.journeyAutomation.count({ where: { tenantId: user.tenantId } })
    const created = await prisma.journeyAutomation.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        fromStatus: body.fromStatus || null,
        toStatus: body.toStatus || null,
        triggerType: body.triggerType || 'no_reply',
        delayHours: Number.isFinite(Number(body.delayHours)) ? Math.max(0, Math.round(Number(body.delayHours))) : 0,
        action: body.action || 'move_stage',
        message: body.message?.trim() || null,
        keepChannelTag: body.keepChannelTag !== false,
        connectHermes: body.connectHermes !== false,
        isActive: body.isActive !== false,
        sortOrder: count + 1,
      },
    })
    return NextResponse.json({ automation: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar automação' }, { status: 500 })
  }
}

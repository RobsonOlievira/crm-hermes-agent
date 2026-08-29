export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const type = await prisma.leadType.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!type) return NextResponse.json({ error: 'Tipo não encontrado' }, { status: 404 })
    const data: any = {}
    if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim()
    if (typeof body.color === 'string') data.color = body.color
    if (typeof body.icon === 'string') data.icon = body.icon
    if ('description' in body) data.description = body.description?.trim() || null
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    const updated = await prisma.leadType.update({ where: { id: type.id }, data })
    return NextResponse.json({ leadType: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar tipo' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const type = await prisma.leadType.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!type) return NextResponse.json({ error: 'Tipo não encontrado' }, { status: 404 })
    if (type.isSystem) return NextResponse.json({ error: 'Tipos padrão do sistema não podem ser excluídos. Você pode desativá-lo.' }, { status: 400 })
    // Associações com leads, catálogo e regras de classificação são removidas automaticamente (ON DELETE CASCADE).
    await prisma.leadType.delete({ where: { id: type.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir tipo' }, { status: 500 })
  }
}

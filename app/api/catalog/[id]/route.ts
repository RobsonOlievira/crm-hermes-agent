export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const item = await prisma.catalogItem.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (body.kind === 'PRODUTO' || body.kind === 'SERVICO') data.kind = body.kind
    if ('description' in body) data.description = body.description?.trim() || null
    if ('price' in body) data.price = body.price != null && body.price !== '' ? Number(body.price) : null
    if ('objective' in body) data.objective = body.objective?.trim() || null
    if ('leadTypeId' in body) data.leadTypeId = body.leadTypeId || null
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    const updated = await prisma.catalogItem.update({ where: { id: item.id }, data })
    return NextResponse.json({ item: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const item = await prisma.catalogItem.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    await prisma.lead.updateMany({ where: { catalogItemId: item.id }, data: { catalogItemId: null } })
    await prisma.classificationRule.updateMany({ where: { catalogItemId: item.id }, data: { catalogItemId: null } })
    await prisma.catalogItem.delete({ where: { id: item.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir item' }, { status: 500 })
  }
}

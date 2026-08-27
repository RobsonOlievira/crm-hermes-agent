export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

function parseKeywords(input: any): string[] {
  if (Array.isArray(input)) return input.map((k) => String(k).trim()).filter(Boolean)
  if (typeof input === 'string') return input.split(',').map((k) => k.trim()).filter(Boolean)
  return []
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const rule = await prisma.classificationRule.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!rule) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })
    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if ('keywords' in body) data.keywords = parseKeywords(body.keywords)
    if (body.matchType === 'any' || body.matchType === 'all') data.matchType = body.matchType
    if ('source' in body) data.source = body.source || null
    if ('leadTypeId' in body) data.leadTypeId = body.leadTypeId || null
    if ('catalogItemId' in body) data.catalogItemId = body.catalogItemId || null
    if ('autoReply' in body) data.autoReply = body.autoReply?.trim() || null
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    const updated = await prisma.classificationRule.update({ where: { id: rule.id }, data })
    return NextResponse.json({ rule: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar regra' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const rule = await prisma.classificationRule.findFirst({ where: { id: params.id, tenantId: user.tenantId } })
    if (!rule) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })
    await prisma.classificationRule.delete({ where: { id: rule.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir regra' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

function parseKeywords(input: any): string[] {
  if (Array.isArray(input)) return input.map((k) => String(k).trim()).filter(Boolean)
  if (typeof input === 'string') return input.split(',').map((k) => k.trim()).filter(Boolean)
  return []
}

function parseStrings(input: any): string[] {
  if (Array.isArray(input)) return input.filter((m): m is string => typeof m === 'string').map((m) => m.trim()).filter(Boolean)
  return []
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const rules = await prisma.classificationRule.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { priority: 'asc' },
    include: { leadTypes: { include: { leadType: true } }, catalogItems: { include: { catalogItem: true } } },
  })
  return NextResponse.json({ rules })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { name, keywords, matchType, source, leadTypeIds, catalogItemIds, autoMessages, autoReply } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Informe um nome para a regra' }, { status: 400 })
    const kw = parseKeywords(keywords)
    if (kw.length === 0) return NextResponse.json({ error: 'Adicione ao menos uma palavra-chave' }, { status: 400 })
    const requestedIds: string[] = Array.isArray(leadTypeIds) ? leadTypeIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id)) : []
    const validTypes = requestedIds.length
      ? await prisma.leadType.findMany({ where: { tenantId: user.tenantId, id: { in: requestedIds }, isActive: true }, select: { id: true } })
      : []
    const requestedCatalogIds: string[] = Array.isArray(catalogItemIds) ? catalogItemIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id)) : []
    const validCatalogItems = requestedCatalogIds.length
      ? await prisma.catalogItem.findMany({ where: { tenantId: user.tenantId, id: { in: requestedCatalogIds }, isActive: true }, select: { id: true } })
      : []
    const count = await prisma.classificationRule.count({ where: { tenantId: user.tenantId } })
    const created = await prisma.classificationRule.create({
      data: {
        tenantId: user.tenantId,
        name: name.trim(),
        keywords: kw,
        matchType: matchType === 'all' ? 'all' : 'any',
        source: source || null,
        autoMessages: parseStrings(autoMessages),
        autoReply: autoReply?.trim() || null,
        isActive: true,
        priority: count + 1,
        leadTypes: validTypes.length ? { create: validTypes.map((t) => ({ leadTypeId: t.id })) } : undefined,
        catalogItems: validCatalogItems.length ? { create: validCatalogItems.map((c) => ({ catalogItemId: c.id })) } : undefined,
      },
    })
    return NextResponse.json({ rule: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar regra' }, { status: 500 })
  }
}

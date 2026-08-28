export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const items = await prisma.catalogItem.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { sortOrder: 'asc' },
    include: { leadTypes: { include: { leadType: true } }, _count: { select: { leads: true } } },
  })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { name, kind, description, price, objective, leadTypeIds } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Informe o nome do item' }, { status: 400 })
    const requestedIds: string[] = Array.isArray(leadTypeIds) ? leadTypeIds.filter((id): id is string => typeof id === 'string' && Boolean(id)) : []
    const validTypes = requestedIds.length
      ? await prisma.leadType.findMany({ where: { id: { in: requestedIds }, tenantId: user.tenantId }, select: { id: true } })
      : []
    const count = await prisma.catalogItem.count({ where: { tenantId: user.tenantId } })
    const created = await prisma.catalogItem.create({
      data: {
        tenantId: user.tenantId,
        name: name.trim(),
        kind: kind === 'SERVICO' ? 'SERVICO' : 'PRODUTO',
        description: description?.trim() || null,
        price: price != null && price !== '' ? Number(price) : null,
        objective: objective?.trim() || null,
        isActive: true,
        sortOrder: count + 1,
        leadTypes: validTypes.length ? { create: validTypes.map((t) => ({ leadType: { connect: { id: t.id } } })) } : undefined,
      },
    })
    return NextResponse.json({ item: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar item do catálogo' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `tipo_${Date.now()}`
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const types = await prisma.leadType.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { leads: true, catalogItems: true } } },
  })
  return NextResponse.json({ leadTypes: types })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { label, color, icon, description } = await req.json()
    if (!label?.trim()) return NextResponse.json({ error: 'Informe um nome para o tipo' }, { status: 400 })
    let key = slugify(label)
    const existing = await prisma.leadType.findUnique({ where: { tenantId_key: { tenantId: user.tenantId, key } } })
    if (existing) key = `${key}_${Date.now().toString().slice(-4)}`
    const count = await prisma.leadType.count({ where: { tenantId: user.tenantId } })
    const created = await prisma.leadType.create({
      data: {
        tenantId: user.tenantId,
        key,
        label: label.trim(),
        color: color || '#3B82F6',
        icon: icon || 'Tag',
        description: description?.trim() || null,
        isSystem: false,
        isActive: true,
        sortOrder: count + 1,
      },
    })
    return NextResponse.json({ leadType: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar tipo de lead' }, { status: 500 })
  }
}

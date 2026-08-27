export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const modules = await prisma.module.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ modules })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { key, isActive } = await req.json()
    if (!key) return NextResponse.json({ error: 'Chave do módulo ausente' }, { status: 400 })
    const mod = await prisma.module.findUnique({ where: { tenantId_key: { tenantId: user.tenantId, key } } })
    if (!mod) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    if (mod.isCore) return NextResponse.json({ error: 'Módulo essencial não pode ser desativado' }, { status: 400 })
    const updated = await prisma.module.update({
      where: { id: mod.id },
      data: { isActive: Boolean(isActive) },
    })
    return NextResponse.json({ module: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar módulo' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const client = await prisma.client.findFirst({ where: { id: params.id, tenantId: user.tenantId }, select: { id: true } })
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const body = await req.json()
    const data: any = {}

    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.email === 'string') data.email = body.email.trim() || null
    if (typeof body.phone === 'string' && body.phone.trim()) data.phone = body.phone.trim()
    if (typeof body.companyName === 'string') data.companyName = body.companyName.trim() || null
    if (typeof body.cnpj === 'string') data.cnpj = body.cnpj.trim() || null
    if (typeof body.status === 'string') data.status = body.status
    if (typeof body.segment === 'string') data.segment = body.segment.trim() || null
    if ('lifetimeValue' in body) data.lifetimeValue = body.lifetimeValue == null || body.lifetimeValue === '' ? 0 : Number(body.lifetimeValue) || 0
    if ('assignedToId' in body) data.assignedToId = body.assignedToId || null

    const updated = await prisma.client.update({
      where: { id: params.id },
      data,
      include: { assignedTo: true },
    })
    return NextResponse.json({ client: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}
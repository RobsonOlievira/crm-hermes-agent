export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const lead = await prisma.lead.findFirst({ where: { id: params.id, tenantId: user.tenantId }, select: { id: true } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    const body = await req.json()
    const data: any = {}

    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.email === 'string') data.email = body.email.trim() || null
    if (typeof body.phone === 'string' && body.phone.trim()) data.phone = body.phone.trim()
    if (typeof body.companyName === 'string') data.companyName = body.companyName.trim() || null
    if (typeof body.cnpj === 'string') data.cnpj = body.cnpj.trim() || null
    if (typeof body.status === 'string') data.status = body.status
    if (typeof body.source === 'string') data.source = body.source
    if (typeof body.score === 'number' || typeof body.score === 'string') data.score = Number(body.score) || 0
    if ('dealValue' in body) data.dealValue = body.dealValue == null || body.dealValue === '' ? null : Number(body.dealValue)
    if (typeof body.socialMedia === 'string') data.socialMedia = body.socialMedia.trim() || null
    if (typeof body.objective === 'string') data.objective = body.objective.trim() || null
    if (Array.isArray(body.tags)) data.tags = body.tags.map((t: any) => String(t).trim()).filter(Boolean)
    if ('assignedToId' in body) data.assignedToId = body.assignedToId || null
    if ('catalogItemId' in body) data.catalogItemId = body.catalogItemId || null
    if (Array.isArray(body.leadTypeIds)) {
      const leadTypeIds = body.leadTypeIds.map((t: any) => String(t)).filter(Boolean)
      const valid = await prisma.leadType.findMany({
        where: { tenantId: user.tenantId, id: { in: leadTypeIds } },
        select: { id: true },
      })
      data.leadTypes = { deleteMany: {}, create: valid.map((lt) => ({ leadTypeId: lt.id })) }
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data,
      include: { leadTypes: { include: { leadType: true } }, assignedTo: true, catalogItem: true },
    })
    return NextResponse.json({ lead: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar lead' }, { status: 500 })
  }
}
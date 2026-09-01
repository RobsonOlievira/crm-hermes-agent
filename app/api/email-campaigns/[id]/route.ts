export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: {
        template: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        recipients: { orderBy: { createdAt: 'desc' }, take: 200 },
        _count: { select: { recipients: true } },
      },
    })
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    return NextResponse.json({ campaign })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao carregar campanha' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const existing = await prisma.emailCampaign.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      select: { id: true, status: true },
    })
    if (!existing) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Apenas campanhas em rascunho podem ser editadas' }, { status: 400 })
    }

    const body = await req.json()
    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.subject === 'string' && body.subject.trim()) data.subject = body.subject.trim()
    if (typeof body.htmlBody === 'string') data.htmlBody = body.htmlBody
    if (typeof body.category === 'string' && body.category) data.category = body.category
    if ('templateId' in body) data.templateId = body.templateId || null
    if (typeof body.segmentType === 'string' && body.segmentType) data.segmentType = body.segmentType
    if ('segmentValue' in body) data.segmentValue = body.segmentValue || null
    if ('senderName' in body) data.senderName = body.senderName || null
    if ('senderEmail' in body) data.senderEmail = body.senderEmail || null
    if ('scheduledAt' in body) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    }

    const updated = await prisma.emailCampaign.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json({ campaign: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const existing = await prisma.emailCampaign.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      select: { id: true, status: true },
    })
    if (!existing) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Apenas campanhas em rascunho ou canceladas podem ser excluídas' }, { status: 400 })
    }
    await prisma.emailCampaign.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir campanha' }, { status: 500 })
  }
}

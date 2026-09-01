export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const where: any = { tenantId: user.tenantId }
    if (status) where.status = status
    const campaigns = await prisma.emailCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    })
    return NextResponse.json({ campaigns })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao carregar campanhas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body?.name?.trim()) return NextResponse.json({ error: 'Informe o nome da campanha' }, { status: 400 })
    if (!body?.subject?.trim()) return NextResponse.json({ error: 'Informe o assunto do email' }, { status: 400 })

    let scheduledAt: Date | null = null
    if (body.scheduledAt) {
      const d = new Date(body.scheduledAt)
      if (!isNaN(d.getTime())) scheduledAt = d
    }

    const created = await prisma.emailCampaign.create({
      data: {
        tenantId: user.tenantId,
        name: body.name.trim(),
        subject: body.subject.trim(),
        htmlBody: typeof body.htmlBody === 'string' ? body.htmlBody : '',
        category: typeof body.category === 'string' && body.category ? body.category : 'broadcast',
        templateId: body.templateId || null,
        segmentType: body.segmentType || 'ALL',
        segmentValue: body.segmentValue || null,
        senderName: body.senderName || null,
        senderEmail: body.senderEmail || null,
        scheduledAt,
        createdById: user.id || null,
      },
    })
    return NextResponse.json({ campaign: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 })
  }
}

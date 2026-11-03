export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { buildSegmentWhere } from '@/lib/email-segment'
import { audienceWhere, segmentsWhere, type CampaignSegment } from '@/lib/services/email/campaigns'

// Prévia do público de uma campanha (sem criar nem enviar nada).
// Aceita várias listas e, se `campanhaId` vier, desconta as exclusões dela.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    let segments: CampaignSegment[] = Array.isArray(body.segmentos)
      ? body.segmentos
          .map((s: any) => ({
            segmentType: String(s?.segmentType || s?.tipo || '').toUpperCase(),
            segmentValue: s?.segmentValue || s?.valor || null,
          }))
          .filter((s: any) => s.segmentType)
      : []
    if (segments.length === 0) segments = [{ segmentType: 'ALL', segmentValue: null }]

    const activeBase = { email: { not: null }, isArchived: false, emailOptOut: false }

    const porLista = await Promise.all(
      segments.map(async (s) => ({
        segmentType: s.segmentType,
        segmentValue: s.segmentValue,
        total: await prisma.lead.count({
          where: {
            ...buildSegmentWhere(user.tenantId!, s.segmentType, s.segmentValue ?? null),
            ...activeBase,
          } as any,
        }),
      }))
    )

    const where: any = { ...audienceWhere(user.tenantId, segments) }
    let excluidos = 0
    if (body.campanhaId) {
      const exclusions = await prisma.emailCampaignExclusion.findMany({
        where: { campaignId: String(body.campanhaId), tenantId: user.tenantId },
        select: { leadId: true, email: true },
      })
      const leadIds = exclusions.map((e) => e.leadId).filter(Boolean) as string[]
      const emails = exclusions.map((e) => e.email).filter(Boolean) as string[]
      if (leadIds.length) where.id = { notIn: leadIds }
      if (emails.length) where.email = { not: null, notIn: emails }
      excluidos = exclusions.length
    }

    const universe = segmentsWhere(user.tenantId, segments) as any
    const [total, semEmail, descadastrados] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...universe, isArchived: false, email: null } }),
      prisma.lead.count({ where: { ...universe, isArchived: false, email: { not: null }, emailOptOut: true } }),
    ])

    return NextResponse.json({
      total,
      porLista,
      semEmail,
      descadastrados,
      excluidos,
      listas: segments.length,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao calcular o público' }, { status: 500 })
  }
}

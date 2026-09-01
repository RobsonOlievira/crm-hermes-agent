export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { buildSegmentWhere } from '@/lib/email-segment'
import { prisma } from '@/lib/db'

const LIMIT = 5000

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const segmentType = searchParams.get('segmentType') || 'ALL'
    const segmentValue = searchParams.get('segmentValue')

    const where = {
      ...buildSegmentWhere(user.tenantId, segmentType, segmentValue || null),
      email: { not: null },
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        take: LIMIT,
        select: { id: true, name: true, email: true, status: true, source: true, tags: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({ leads, total })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao carregar leads' }, { status: 500 })
  }
}

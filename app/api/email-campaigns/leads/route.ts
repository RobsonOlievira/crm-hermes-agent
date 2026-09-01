export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

const LIMIT = 5000

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const segmentType = searchParams.get('segmentType') || 'ALL'
    const segmentValue = searchParams.get('segmentValue')

    const where: any = { tenantId: user.tenantId }

    if (segmentType === 'STATUS' && segmentValue) {
      where.status = segmentValue
    } else if (segmentType === 'SOURCE' && segmentValue) {
      where.source = segmentValue
    } else if (segmentType === 'LEAD_TYPE' && segmentValue) {
      where.leadTypes = { some: { leadTypeId: segmentValue } }
    } else if (segmentType === 'TAG' && segmentValue) {
      where.tags = { has: segmentValue }
    }

    const emailWhere = { ...where, email: { not: null } }
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: emailWhere,
        take: LIMIT,
        select: { id: true, name: true, email: true, status: true, source: true, tags: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where: emailWhere }),
    ])

    return NextResponse.json({ leads, total })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao carregar leads' }, { status: 500 })
  }
}

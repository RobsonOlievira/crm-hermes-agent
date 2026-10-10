export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const isRead = searchParams.get('isRead')

    const where: any = { tenantId: user.tenantId }
    if (isRead === 'true') where.isRead = true
    if (isRead === 'false') where.isRead = false

    const alerts = await prisma.adBudgetAlert.findMany({
      where,
      orderBy: { triggeredAt: 'desc' },
      include: {
        campaign: { select: { id: true, name: true, platform: true } },
      },
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Erro ao buscar alertas de tráfego pago:', error)
    return NextResponse.json({ error: 'Erro ao buscar alertas' }, { status: 500 })
  }
}

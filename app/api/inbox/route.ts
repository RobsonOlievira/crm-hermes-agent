import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get('leadId')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')

    const where: any = { tenantId: user.tenantId }
    if (leadId) where.leadId = leadId
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { snippet: { contains: search, mode: 'insensitive' } },
        { fromAddress: { contains: search, mode: 'insensitive' } },
      ]
    }

    const messages = await prisma.emailMessage.findMany({
      where,
      include: {
        account: { select: { id: true, emailAddress: true, displayName: true, provider: true } },
        lead: { select: { id: true, name: true, email: true, phone: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(messages)
  } catch (err) {
    console.error('[GET /api/inbox]', err)
    return NextResponse.json({ error: 'Erro ao listar mensagens' }, { status: 500 })
  }
}

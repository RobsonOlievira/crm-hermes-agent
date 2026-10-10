export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const proposals = await prisma.proposal.findMany({
      where: { tenantId: user.tenantId },
      include: { client: true, lead: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ proposals })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const proposal = await prisma.proposal.create({
      data: {
        tenantId: user.tenantId,
        clientId: body.clientId || body.data?.clientId || null,
        leadId: body.leadId || body.data?.leadId || null,
        title: body.title,
        data: JSON.stringify(body.data),
        status: 'DRAFT',
      },
    })
    return NextResponse.json({ proposal })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar orçamento' }, { status: 500 })
  }
}

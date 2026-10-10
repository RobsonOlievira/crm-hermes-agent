import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const proposal = await prisma.proposal.findFirst({
      where: { 
          id: params.id,
          tenantId: user.tenantId
      },
      include: { client: true, lead: true },
    })

    if (!proposal) {
        return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const proposal = await prisma.proposal.update({
      where: { 
          id: params.id,
          tenantId: user.tenantId
      },
      data: {
        title: body.title,
        clientId: body.data?.clientId || undefined,
        leadId: body.data?.leadId || undefined,
        data: JSON.stringify(body.data),
      },
    })
    return NextResponse.json({ proposal })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 })
  }
}

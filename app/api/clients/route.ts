export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const clients = await prisma.client.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ clients })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    const body = await req.json()

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    if (!name) return NextResponse.json({ error: 'Informe o nome do cliente.' }, { status: 400 })
    if (!phone) return NextResponse.json({ error: 'Informe o telefone/WhatsApp do cliente.' }, { status: 400 })

    const leadTypeConnections = Array.isArray(body.leadTypeIds)
      ? body.leadTypeIds.filter((id: any) => typeof id === 'string').map((id: string) => ({ leadTypeId: id }))
      : []

    const client = await prisma.client.create({
      data: {
        tenantId: user.tenantId,
        name,
        phone,
        email: typeof body.email === 'string' ? body.email.trim() || null : null,
        companyName: typeof body.companyName === 'string' ? body.companyName.trim() || null : null,
        cnpj: typeof body.cnpj === 'string' ? body.cnpj.trim() || null : null,
        status: typeof body.status === 'string' ? body.status : 'ATIVO',
        segment: typeof body.segment === 'string' ? body.segment.trim() || null : null,
        lifetimeValue:
          typeof body.lifetimeValue === 'number'
            ? body.lifetimeValue
            : typeof body.lifetimeValue === 'string' && body.lifetimeValue !== ''
              ? Number(body.lifetimeValue) || 0
              : 0,
        assignedToId: typeof body.assignedToId === 'string' && body.assignedToId ? body.assignedToId : null,
        ...(leadTypeConnections.length > 0 ? { leadTypes: { create: leadTypeConnections } } : {}),
      },
      include: {
        assignedTo: true,
        leadTypes: { include: { leadType: true } },
      },
    })

    return NextResponse.json({ client })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
}
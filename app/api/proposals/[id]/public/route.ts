import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/proposals/[id]/public — Dados públicos do orçamento
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        lead: { select: { id: true, name: true, phone: true, email: true } },
        tenant: { select: { id: true, name: true, legalName: true, logoUrl: true, primaryColor: true, companyPhone: true, companyEmail: true } },
      },
    })

    if (!proposal) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 })
  }
}

// POST /api/proposals/[id]/public — Aprovação pública do cliente
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
    })

    if (!proposal) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
    }

    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: { status: 'ACCEPTED' },
    })

    return NextResponse.json({ ok: true, proposal: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao aprovar orçamento' }, { status: 500 })
  }
}

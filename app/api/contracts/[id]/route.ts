export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { client: true, template: true, services: true, signatures: true },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  return NextResponse.json({ contract })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  
  if (contract.status !== 'DRAFT') {
     return NextResponse.json({ error: 'Apenas rascunhos podem ser excluídos. Cancele o contrato em vez disso.' }, { status: 400 })
  }

  await prisma.contract.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ ok: true })
}

// PUT para editar rascunho
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  if (contract.status !== 'DRAFT') return NextResponse.json({ error: 'Apenas rascunhos podem ser editados' }, { status: 400 })

  const { title, totalValue, paymentTerms, bodyRendered } = await req.json()
  
  // Se o bodyRendered foi alterado, o hash deve ser atualizado
  // Vamos atualizar o contrato com os novos dados
  
  const updated = await prisma.contract.update({
    where: { id: params.id },
    data: {
      title: title !== undefined ? title : contract.title,
      totalValue: totalValue !== undefined ? totalValue : contract.totalValue,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : contract.paymentTerms,
      bodyRendered: bodyRendered !== undefined ? bodyRendered : contract.bodyRendered,
      // hash deve ser re-calculado se o bodyRendered mudou (em uma rota específica /render ou aqui)
    },
  })

  return NextResponse.json({ contract: updated })
}
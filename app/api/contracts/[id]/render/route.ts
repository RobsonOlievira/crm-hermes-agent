export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { renderContract, hashContent, buildRenderData } from '@/lib/contracts/render'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { client: true, template: true, services: true },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  if (contract.status !== 'DRAFT') return NextResponse.json({ error: 'Apenas rascunhos podem ser re-renderizados' }, { status: 400 })

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
  const body = contract.template?.body ?? ''
  const data = buildRenderData(tenant, contract.client, contract.services, { 
    totalValue: contract.totalValue ?? undefined, 
    paymentTerms: contract.paymentTerms ?? undefined 
  })
  
  const bodyRendered = renderContract(body, data)
  const contentHash = hashContent(bodyRendered)

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      bodyRendered,
      contentHash,
      providerSnapshot: JSON.stringify(data.empresa),
      clientSnapshot: JSON.stringify(data.cliente),
    },
  })

  return NextResponse.json({ contract: updated })
}
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  if (contract.status !== 'DRAFT') return NextResponse.json({ error: 'Contrato já foi enviado para assinatura' }, { status: 400 })

  const headerList = headers()
  const ip = headerList.get('x-forwarded-for') || headerList.get('x-real-ip') || 'IP Desconhecido'
  const userAgent = headerList.get('user-agent') || 'Navegador Desconhecido'

  // Captura nome do prestador
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
  const providerName = tenant?.legalRepName || tenant?.legalName || user.name || 'Prestador'
  const providerEmail = user.email || ''

  await prisma.$transaction(async (tx) => {
    // 1. Cria a assinatura do prestador
    await tx.contractSignature.create({
      data: {
        contractId: contract.id,
        signerRole: 'PROVIDER',
        signerName: providerName,
        signerEmail: providerEmail,
        ipAddress: ip,
        userAgent: userAgent,
        contentHash: contract.contentHash ?? '',
        contractVersion: contract.contentHash ?? '',
        signedAt: new Date(),
      },
    })

    // 2. Atualiza o status do contrato
    await tx.contract.update({
      where: { id: contract.id },
      data: { status: 'PENDING_CLIENT' },
    })
  })

  return NextResponse.json({ ok: true })
}
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Rota pública, não precisa de session
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { client: true },
  })

  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  if (contract.status !== 'PENDING_CLIENT') return NextResponse.json({ error: 'Contrato não está aguardando assinatura do cliente' }, { status: 400 })

  const { signatureName, documentId } = await req.json()
  
  if (!signatureName) {
    return NextResponse.json({ error: 'Nome da assinatura é obrigatório' }, { status: 400 })
  }

  const headerList = headers()
  const ip = headerList.get('x-forwarded-for') || headerList.get('x-real-ip') || 'IP Desconhecido'
  const userAgent = headerList.get('user-agent') || 'Navegador Desconhecido'

  await prisma.$transaction(async (tx) => {
    // 1. Cria a assinatura do cliente
    await tx.contractSignature.create({
      data: {
        contractId: contract.id,
        signerRole: 'CLIENT',
        signerName: signatureName,
        signerEmail: contract.client?.email ?? '',
        ipAddress: ip,
        userAgent: userAgent,
        contentHash: contract.contentHash ?? '',
        contractVersion: contract.contentHash ?? '',
        signedAt: new Date(),
      },
    })

    // 2. Atualiza o status do contrato para SIGNED
    await tx.contract.update({
      where: { id: contract.id },
      data: { status: 'SIGNED' },
    })
  })

  return NextResponse.json({ ok: true })
}

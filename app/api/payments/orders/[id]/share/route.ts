export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const order = await prisma.paymentOrder.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: { lead: true },
    })

    if (!order) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

    const valor = order.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    let whatsappMessage = `💳 *Cobrança: ${order.description}*\n\nValor: *${valor}*\n`

    if (order.pixCopyPaste) {
      whatsappMessage += `\n📱 *PIX Copia e Cola:*\n\`${order.pixCopyPaste}\`\n`
    }
    if (order.externalUrl) {
      whatsappMessage += `\n🔗 *Link de pagamento:*\n${order.externalUrl}\n`
    }
    if (order.boletoUrl) {
      whatsappMessage += `\n📄 *Boleto:*\n${order.boletoUrl}\n`
    }

    return NextResponse.json({
      checkoutUrl: order.externalUrl,
      pixCopyPaste: order.pixCopyPaste,
      pixQrCode: order.pixQrCode,
      boletoUrl: order.boletoUrl,
      amount: order.amount,
      description: order.description,
      whatsappMessage,
    })
  } catch (error) {
    console.error('Erro ao gerar compartilhamento:', error)
    return NextResponse.json({ error: 'Erro ao gerar compartilhamento' }, { status: 500 })
  }
}

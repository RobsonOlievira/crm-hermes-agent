export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdapter } from '@/lib/payment-gateways'
import { decryptSecret } from '@/lib/payment-crypto'
import { processPaymentEvent } from '@/lib/payment-processor'

export async function POST(req: Request, { params }: { params: { provider: string } }) {
  const providerStr = params.provider.toUpperCase()
  const rawBody = await req.text()

  const signature = req.headers.get('stripe-signature')
    || req.headers.get('x-signature')
    || req.headers.get('access_token')
    || req.headers.get('asaas-access-token')
    || ''

  try {
    await prisma.paymentWebhookLog.create({
      data: {
        provider: providerStr as any,
        eventType: 'raw',
        payload: rawBody,
      },
    })

    const adapter = getAdapter(providerStr)
    const event = adapter.parseWebhookEvent(rawBody)

    if (!event.externalId) {
      return NextResponse.json({ ok: true, message: 'Evento sem externalId identificado' })
    }

    const order = await prisma.paymentOrder.findFirst({
      where: { provider: providerStr as any, externalId: event.externalId },
      include: { gatewayConfig: true, lead: true },
    })

    if (!order) {
      const sub = await prisma.subscription.findFirst({
        where: { provider: providerStr as any, externalId: event.externalId },
        include: { gatewayConfig: true, lead: true },
      })

      if (sub && event.type === 'subscription.cancelled') {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })
      }
      return NextResponse.json({ ok: true, message: 'Processado para assinatura ou pedido não encontrado' })
    }

    if (order.gatewayConfig) {
      const decrypted = {
        id: order.gatewayConfig.id,
        provider: order.gatewayConfig.provider,
        apiKey: decryptSecret(order.gatewayConfig.encApiKey || ''),
        secretKey: decryptSecret(order.gatewayConfig.encSecretKey || ''),
        webhookSecret: decryptSecret(order.gatewayConfig.encWebhookSecret || ''),
        accessToken: decryptSecret(order.gatewayConfig.encAccessToken || ''),
        isSandbox: order.gatewayConfig.isSandbox,
      }

      const isValid = adapter.verifyWebhookSignature(decrypted, rawBody, signature)
      if (!isValid) {
        return NextResponse.json({ error: 'Assinatura do webhook inválida' }, { status: 401 })
      }
    }

    await processPaymentEvent(order, event)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Erro no webhook de pagamento:', error)
    return NextResponse.json({ error: error.message || 'Erro ao processar webhook' }, { status: 500 })
  }
}

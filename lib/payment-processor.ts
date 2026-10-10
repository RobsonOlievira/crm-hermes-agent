import { prisma } from '@/lib/db'
import type { ParsedPaymentEvent } from './payment-gateways'

export async function processPaymentEvent(
  order: any,
  event: ParsedPaymentEvent
) {
  const tenantId = order.tenantId

  switch (event.type) {
    case 'payment.confirmed': {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paidAt: event.paidAt || new Date(),
          method: (event.method as any) || order.method,
        },
      })

      const purchase = await prisma.purchase.create({
        data: {
          tenantId,
          leadId: order.leadId,
          description: order.description,
          amount: order.amount,
          catalogItemId: order.catalogItemId,
        },
      })

      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { purchaseId: purchase.id },
      })

      await prisma.lead.update({
        where: { id: order.leadId },
        data: {
          totalPurchased: { increment: order.amount },
          status: 'PAGAMENTO_CONFIRMADO',
          lastInteraction: new Date(),
        },
      })

      await prisma.interaction.create({
        data: {
          tenantId,
          leadId: order.leadId,
          type: 'PAYMENT_RECEIVED',
          title: `Pagamento confirmado: ${order.description}`,
          content: `R$ ${order.amount.toFixed(2)} via ${order.provider}`,
          amount: order.amount,
        },
      })

      if (order.subscriptionId) {
        await prisma.subscription.update({
          where: { id: order.subscriptionId },
          data: {
            totalCollected: { increment: order.amount },
            paymentCount: { increment: 1 },
            status: 'ACTIVE',
          },
        })
      }
      break
    }

    case 'payment.failed': {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failReason: event.failReason || 'Pagamento recusado',
        },
      })

      if (order.subscriptionId) {
        await prisma.subscription.update({
          where: { id: order.subscriptionId },
          data: { status: 'PAST_DUE', failedPayments: { increment: 1 } },
        })
      }

      await prisma.interaction.create({
        data: {
          tenantId,
          leadId: order.leadId,
          type: 'SYSTEM_EVENT',
          title: `Pagamento falhou: ${order.description}`,
          content: event.failReason || 'Cartão recusado ou saldo insuficiente',
        },
      })
      break
    }

    case 'payment.refunded': {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      })

      await prisma.lead.update({
        where: { id: order.leadId },
        data: { totalPurchased: { decrement: order.amount } },
      })

      await prisma.interaction.create({
        data: {
          tenantId,
          leadId: order.leadId,
          type: 'SYSTEM_EVENT',
          title: `Estorno processado: ${order.description}`,
          content: `R$ ${order.amount.toFixed(2)} estornado via ${order.provider}`,
          amount: -order.amount,
        },
      })
      break
    }

    case 'subscription.cancelled': {
      if (order.subscriptionId) {
        await prisma.subscription.update({
          where: { id: order.subscriptionId },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: event.cancelReason },
        })
      }
      break
    }
  }

  if (event.rawEventId) {
    await prisma.paymentWebhookLog.updateMany({
      where: { provider: order.provider, externalId: event.rawEventId },
      data: { processed: true, tenantId },
    })
  }
}

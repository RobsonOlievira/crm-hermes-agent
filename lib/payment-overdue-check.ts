import { prisma } from '@/lib/db'

export async function checkOverduePayments(tenantId: string) {
  const now = new Date()

  const overdueOrders = await prisma.paymentOrder.findMany({
    where: {
      tenantId,
      status: 'PENDING',
      expiresAt: { lt: now },
    },
  })

  for (const order of overdueOrders) {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'OVERDUE' },
    })

    await prisma.interaction.create({
      data: {
        tenantId,
        leadId: order.leadId,
        type: 'SYSTEM_EVENT',
        title: `Cobrança vencida: ${order.description}`,
        content: `R$ ${order.amount.toFixed(2)} não foi pago até o vencimento`,
      },
    })
  }

  const INADIMPLENCIA_DIAS = 15
  const pastDueSubs = await prisma.subscription.findMany({
    where: {
      tenantId,
      status: 'PAST_DUE',
      updatedAt: { lt: new Date(now.getTime() - INADIMPLENCIA_DIAS * 86400000) },
    },
    include: { lead: true },
  })

  for (const sub of pastDueSubs) {
    const client = await prisma.client.findFirst({
      where: { tenantId, phone: sub.lead.phone },
    })
    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: { status: 'INADIMPLENTE' },
      })
    }
  }

  return { overdueOrders: overdueOrders.length, inadimplentes: pastDueSubs.length }
}

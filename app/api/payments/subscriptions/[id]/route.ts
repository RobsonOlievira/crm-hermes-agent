export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getAdapter } from '@/lib/payment-gateways'
import { decryptSecret } from '@/lib/payment-crypto'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, tenantId: user.tenantId },
      include: { gatewayConfig: true },
    })

    if (!sub) return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })

    if (sub.externalId && sub.provider !== 'MANUAL' && sub.gatewayConfig) {
      try {
        const decrypted = {
          id: sub.gatewayConfig.id,
          provider: sub.gatewayConfig.provider,
          apiKey: decryptSecret(sub.gatewayConfig.encApiKey || ''),
          secretKey: decryptSecret(sub.gatewayConfig.encSecretKey || ''),
          webhookSecret: decryptSecret(sub.gatewayConfig.encWebhookSecret || ''),
          accessToken: decryptSecret(sub.gatewayConfig.encAccessToken || ''),
          isSandbox: sub.gatewayConfig.isSandbox,
        }
        const adapter = getAdapter(sub.provider)
        await adapter.cancelSubscription(decrypted, sub.externalId)
      } catch (e) {
        console.error('Erro ao cancelar no gateway remoto:', e)
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error)
    return NextResponse.json({ error: 'Erro ao cancelar assinatura' }, { status: 500 })
  }
}

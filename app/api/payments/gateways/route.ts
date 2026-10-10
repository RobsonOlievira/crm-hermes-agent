export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { encryptSecret } from '@/lib/payment-crypto'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const configs = await prisma.paymentGatewayConfig.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        provider: true,
        displayName: true,
        isActive: true,
        isSandbox: true,
        defaultCurrency: true,
        pixEnabled: true,
        boletoEnabled: true,
        creditEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ configs })
  } catch (error) {
    console.error('Erro ao listar gateways:', error)
    return NextResponse.json({ error: 'Erro ao listar gateways' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { provider, displayName, isSandbox, pixEnabled, boletoEnabled, creditEnabled, apiKey, secretKey, webhookSecret, accessToken } = body

    if (!provider || !['STRIPE', 'MERCADO_PAGO', 'ASAAS', 'MANUAL'].includes(provider)) {
      return NextResponse.json({ error: 'Provider inválido' }, { status: 400 })
    }

    const data: any = {
      tenantId: user.tenantId,
      provider,
      displayName: displayName || provider,
      isSandbox: isSandbox ?? false,
      isActive: true,
      pixEnabled: pixEnabled ?? true,
      boletoEnabled: boletoEnabled ?? false,
      creditEnabled: creditEnabled ?? true,
    }

    if (apiKey) data.encApiKey = encryptSecret(apiKey)
    if (secretKey) data.encSecretKey = encryptSecret(secretKey)
    if (webhookSecret) data.encWebhookSecret = encryptSecret(webhookSecret)
    if (accessToken) data.encAccessToken = encryptSecret(accessToken)

    const config = await prisma.paymentGatewayConfig.upsert({
      where: {
        tenantId_provider: {
          tenantId: user.tenantId,
          provider,
        },
      },
      create: data,
      update: data,
    })

    return NextResponse.json({ config: { id: config.id, provider: config.provider, displayName: config.displayName } })
  } catch (error) {
    console.error('Erro ao salvar configuração do gateway:', error)
    return NextResponse.json({ error: 'Erro ao salvar configuração do gateway' }, { status: 500 })
  }
}

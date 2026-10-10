export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getAdapter } from '@/lib/payment-gateways'
import { decryptSecret } from '@/lib/payment-crypto'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const leadId = searchParams.get('leadId')

  try {
    const subs = await prisma.subscription.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status: status as any } : {}),
        ...(leadId ? { leadId } : {}),
      },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        catalogItem: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ subscriptions: subs })
  } catch (error) {
    console.error('Erro ao listar assinaturas:', error)
    return NextResponse.json({ error: 'Erro ao listar assinaturas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { leadId, planName, amount, intervalType, provider, catalogItemId, trialDays } = body

    if (!leadId || !planName || !amount) {
      return NextResponse.json({ error: 'leadId, planName e valor são obrigatórios' }, { status: 400 })
    }

    const gatewayProvider = provider || 'MANUAL'
    const gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { tenantId: user.tenantId, provider: gatewayProvider, isActive: true },
    })

    if (!gatewayConfig && gatewayProvider !== 'MANUAL') {
      return NextResponse.json({ error: `Gateway ${gatewayProvider} não está configurado` }, { status: 400 })
    }

    let configId = gatewayConfig?.id
    if (!configId && gatewayProvider === 'MANUAL') {
      const createdConfig = await prisma.paymentGatewayConfig.create({
        data: {
          tenantId: user.tenantId,
          provider: 'MANUAL',
          displayName: 'Manual',
          isActive: true,
        },
      })
      configId = createdConfig.id
    }

    const sub = await prisma.subscription.create({
      data: {
        tenantId: user.tenantId,
        leadId,
        catalogItemId: catalogItemId || null,
        gatewayConfigId: configId!,
        provider: gatewayProvider,
        planName,
        amount: Number(amount),
        intervalType: intervalType || 'MONTHLY',
        trialEnd: trialDays ? new Date(Date.now() + Number(trialDays) * 86400000) : null,
        status: trialDays ? 'TRIALING' : 'ACTIVE',
      },
    })

    let externalId = `sub_local_${Date.now()}`
    if (gatewayProvider !== 'MANUAL' && gatewayConfig) {
      const decrypted = {
        id: gatewayConfig.id,
        provider: gatewayConfig.provider,
        apiKey: decryptSecret(gatewayConfig.encApiKey || ''),
        secretKey: decryptSecret(gatewayConfig.encSecretKey || ''),
        webhookSecret: decryptSecret(gatewayConfig.encWebhookSecret || ''),
        accessToken: decryptSecret(gatewayConfig.encAccessToken || ''),
        isSandbox: gatewayConfig.isSandbox,
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } })
      const adapter = getAdapter(gatewayProvider)
      const res = await adapter.createSubscription(decrypted, {
        subscriptionId: sub.id,
        leadId,
        leadName: lead?.name || '',
        leadEmail: lead?.email || '',
        planName,
        amount: Number(amount),
        intervalType: intervalType || 'MONTHLY',
      })
      externalId = res.externalId
    }

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { externalId },
    })

    await prisma.interaction.create({
      data: {
        tenantId: user.tenantId,
        leadId,
        type: 'SYSTEM_EVENT',
        title: `Assinatura criada: ${planName}`,
        content: `R$ ${Number(amount).toFixed(2)}/${intervalType || 'MONTHLY'} via ${gatewayProvider}`,
      },
    })

    return NextResponse.json({ subscription: updated })
  } catch (error: any) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json({ error: error.message || 'Erro ao criar assinatura' }, { status: 500 })
  }
}

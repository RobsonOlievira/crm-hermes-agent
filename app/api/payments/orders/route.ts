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
  const provider = searchParams.get('provider')

  try {
    const orders = await prisma.paymentOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status: status as any } : {}),
        ...(leadId ? { leadId } : {}),
        ...(provider ? { provider: provider as any } : {}),
      },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        catalogItem: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Erro ao listar cobranças:', error)
    return NextResponse.json({ error: 'Erro ao listar cobranças' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { leadId, description, amount, method, provider, catalogItemId, installments, expiresInHours } = body

    if (!leadId || !description || !amount) {
      return NextResponse.json({ error: 'leadId, descrição e valor são obrigatórios' }, { status: 400 })
    }

    const gatewayProvider = provider || 'MANUAL'
    const gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { tenantId: user.tenantId, provider: gatewayProvider, isActive: true },
    })

    if (!gatewayConfig && gatewayProvider !== 'MANUAL') {
      return NextResponse.json({ error: `Gateway ${gatewayProvider} não está configurado ou ativo` }, { status: 400 })
    }

    // Se for manual e não tiver config, cria uma padrão
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

    const order = await prisma.paymentOrder.create({
      data: {
        tenantId: user.tenantId,
        leadId,
        catalogItemId: catalogItemId || null,
        gatewayConfigId: configId!,
        provider: gatewayProvider,
        description,
        amount: Number(amount),
        method: method || null,
        installments: Number(installments) || 1,
        expiresAt: expiresInHours ? new Date(Date.now() + Number(expiresInHours) * 3600000) : null,
        createdById: user.id,
      },
      include: {
        lead: true,
      },
    })

    let gatewayResult: any = {}
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

      const adapter = getAdapter(gatewayProvider)
      gatewayResult = await adapter.createCharge(decrypted, order, method)
    } else {
      const adapter = getAdapter('MANUAL')
      gatewayResult = await adapter.createCharge({ id: 'manual', provider: 'MANUAL' }, order, method)
    }

    const updated = await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        externalId: gatewayResult.externalId || null,
        externalUrl: gatewayResult.checkoutUrl || null,
        pixQrCode: gatewayResult.pixQrCode || null,
        pixCopyPaste: gatewayResult.pixCopyPaste || null,
        boletoUrl: gatewayResult.boletoUrl || null,
        boletoBarcode: gatewayResult.boletoBarcode || null,
      },
    })

    return NextResponse.json({ order: updated })
  } catch (error: any) {
    console.error('Erro ao criar cobrança:', error)
    return NextResponse.json({ error: error.message || 'Erro ao criar cobrança' }, { status: 500 })
  }
}

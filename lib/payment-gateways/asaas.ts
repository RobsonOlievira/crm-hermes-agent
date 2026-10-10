import type { GatewayAdapter, GatewayChargeResult, DecryptedConfig, SubCreateData, ParsedPaymentEvent } from './index'

async function asaasRequest(accessToken: string, isSandbox: boolean, path: string, options?: RequestInit) {
  const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': accessToken,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Asaas API error (${res.status}): ${errorText}`)
  }
  return res.json()
}

export const asaasAdapter: GatewayAdapter = {
  async createCharge(config: DecryptedConfig, order: any, method?: string): Promise<GatewayChargeResult> {
    const accessToken = config.accessToken || config.apiKey || ''
    if (!accessToken) throw new Error('Access Token do Asaas não configurado')

    const isSandbox = !!config.isSandbox

    const customer = await asaasRequest(accessToken, isSandbox, '/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: order.lead?.name || 'Cliente',
        email: order.lead?.email,
        phone: order.lead?.phone,
        cpfCnpj: order.lead?.cnpj,
        externalReference: order.leadId,
      }),
    })

    const billingType = method === 'PIX' ? 'PIX'
      : method === 'CREDIT_CARD' ? 'CREDIT_CARD'
      : method === 'BOLETO' ? 'BOLETO'
      : 'UNDEFINED'

    const charge = await asaasRequest(accessToken, isSandbox, '/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType,
        value: order.amount,
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        description: order.description,
        externalReference: order.id,
      }),
    })

    let pixData: any = {}
    if (billingType === 'PIX' || billingType === 'UNDEFINED') {
      try {
        pixData = await asaasRequest(accessToken, isSandbox, `/payments/${charge.id}/pixQrCode`)
      } catch {}
    }

    return {
      externalId: charge.id,
      checkoutUrl: charge.invoiceUrl,
      pixQrCode: pixData.encodedImage,
      pixCopyPaste: pixData.payload,
      boletoUrl: charge.bankSlipUrl,
      boletoBarcode: charge.nossoNumero,
    }
  },

  async createSubscription(config: DecryptedConfig, data: SubCreateData): Promise<{ externalId: string }> {
    const accessToken = config.accessToken || config.apiKey || ''
    if (!accessToken) throw new Error('Access Token do Asaas não configurado')
    const isSandbox = !!config.isSandbox

    let customerId = data.asaasCustomerId
    if (!customerId) {
      const customer = await asaasRequest(accessToken, isSandbox, '/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: data.leadName || 'Cliente',
          email: data.leadEmail,
          externalReference: data.leadId,
        }),
      })
      customerId = customer.id
    }

    const sub = await asaasRequest(accessToken, isSandbox, '/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: data.amount,
        cycle: data.intervalType || 'MONTHLY',
        description: data.planName,
        externalReference: data.subscriptionId,
      }),
    })

    return { externalId: sub.id }
  },

  async cancelSubscription(config: DecryptedConfig, externalId: string): Promise<void> {
    const accessToken = config.accessToken || config.apiKey || ''
    if (!accessToken) return
    const isSandbox = !!config.isSandbox
    await asaasRequest(accessToken, isSandbox, `/subscriptions/${externalId}`, {
      method: 'DELETE',
    })
  },

  verifyWebhookSignature(config: DecryptedConfig, rawBody: string, signature: string): boolean {
    const accessToken = config.accessToken || config.apiKey || ''
    if (config.webhookSecret) {
      return signature === config.webhookSecret
    }
    return signature === accessToken
  },

  parseWebhookEvent(rawBody: string): ParsedPaymentEvent {
    const body = JSON.parse(rawBody)

    const typeMap: Record<string, string> = {
      PAYMENT_CONFIRMED: 'payment.confirmed',
      PAYMENT_RECEIVED: 'payment.confirmed',
      PAYMENT_OVERDUE: 'payment.failed',
      PAYMENT_REFUNDED: 'payment.refunded',
      PAYMENT_DELETED: 'payment.failed',
      SUBSCRIPTION_DELETED: 'subscription.cancelled',
    }

    return {
      type: typeMap[body.event] || body.event,
      externalId: body.payment?.id || body.subscription?.id,
      rawEventId: body.id,
      method: body.payment?.billingType === 'PIX' ? 'PIX'
        : body.payment?.billingType === 'CREDIT_CARD' ? 'CREDIT_CARD'
        : body.payment?.billingType === 'BOLETO' ? 'BOLETO'
        : undefined,
      failReason: body.payment?.description,
    }
  },
}

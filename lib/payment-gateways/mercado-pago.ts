import type { GatewayAdapter, GatewayChargeResult, DecryptedConfig, SubCreateData, ParsedPaymentEvent } from './index'
import crypto from 'crypto'

export const mercadoPagoAdapter: GatewayAdapter = {
  async createCharge(config: DecryptedConfig, order: any, method?: string): Promise<GatewayChargeResult> {
    const accessToken = config.accessToken || config.secretKey || ''
    if (!accessToken) throw new Error('Access token do Mercado Pago não configurado')

    const { MercadoPagoConfig, Payment, Preference } = await import('mercadopago')
    const mp = new MercadoPagoConfig({ accessToken })

    if (method === 'PIX') {
      const payment = new Payment(mp)
      const result = await payment.create({
        body: {
          transaction_amount: order.amount,
          description: order.description,
          payment_method_id: 'pix',
          payer: { email: order.lead?.email || 'cliente@exemplo.com' },
          metadata: { orderId: order.id, leadId: order.leadId },
        },
      })

      return {
        externalId: String(result.id),
        pixQrCode: result.point_of_interaction?.transaction_data?.qr_code_base64,
        pixCopyPaste: result.point_of_interaction?.transaction_data?.qr_code,
      }
    }

    const preference = new Preference(mp)
    const pref = await preference.create({
      body: {
        items: [{
          id: order.id,
          title: order.description,
          quantity: 1,
          unit_price: order.amount,
          currency_id: 'BRL',
        }],
        back_urls: {
          success: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments?success=true&orderId=${order.id}`,
          failure: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments?failed=true&orderId=${order.id}`,
          pending: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments?pending=true&orderId=${order.id}`,
        },
        auto_return: 'approved',
        metadata: { orderId: order.id, leadId: order.leadId },
        payment_methods: {
          excluded_payment_types: method === 'BOLETO'
            ? [{ id: 'credit_card' }, { id: 'debit_card' }]
            : [{ id: 'ticket' }],
        },
      },
    })

    return {
      externalId: pref.id!,
      checkoutUrl: pref.init_point!,
    }
  },

  async createSubscription(config: DecryptedConfig, data: SubCreateData): Promise<{ externalId: string }> {
    const accessToken = config.accessToken || config.secretKey || ''
    if (!accessToken) throw new Error('Access token do Mercado Pago não configurado')

    const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reason: data.planName,
        auto_recurring: {
          frequency: 1,
          frequency_type: data.intervalType === 'YEARLY' ? 'months' : 'months',
          transaction_amount: data.amount,
          currency_id: 'BRL',
        },
        back_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments`,
      }),
    })
    const json = await res.json()
    return { externalId: json.id || `mp_sub_${Date.now()}` }
  },

  async cancelSubscription(config: DecryptedConfig, externalId: string): Promise<void> {
    const accessToken = config.accessToken || config.secretKey || ''
    if (!accessToken) return
    await fetch(`https://api.mercadopago.com/preapproval/${externalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })
  },

  verifyWebhookSignature(config: DecryptedConfig, rawBody: string, signature: string): boolean {
    if (!config.webhookSecret) return true
    try {
      const hmac = crypto.createHmac('sha256', config.webhookSecret)
      hmac.update(rawBody)
      return hmac.digest('hex') === signature
    } catch {
      return false
    }
  },

  parseWebhookEvent(rawBody: string): ParsedPaymentEvent {
    const body = JSON.parse(rawBody)

    const statusMap: Record<string, string> = {
      approved: 'payment.confirmed',
      rejected: 'payment.failed',
      refunded: 'payment.refunded',
      cancelled: 'payment.failed',
    }

    return {
      type: statusMap[body.status] || body.action || 'payment.updated',
      externalId: String(body.data?.id || body.id || ''),
      rawEventId: String(body.id || ''),
      method: body.payment_type_id === 'pix' ? 'PIX'
        : body.payment_type_id === 'credit_card' ? 'CREDIT_CARD'
        : body.payment_type_id === 'ticket' ? 'BOLETO'
        : undefined,
    }
  },
}

import type { GatewayAdapter, GatewayChargeResult, DecryptedConfig, SubCreateData, ParsedPaymentEvent } from './index'

export const stripeAdapter: GatewayAdapter = {
  async createCharge(config: DecryptedConfig, order: any, method?: string): Promise<GatewayChargeResult> {
    const secretKey = config.secretKey || config.apiKey || ''
    if (!secretKey) throw new Error('Chave do Stripe não configurada')

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any })

    if (method === 'PIX') {
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(order.amount * 100),
        currency: 'brl',
        payment_method_types: ['pix'],
        description: order.description,
        metadata: { orderId: order.id, leadId: order.leadId },
      })

      return {
        externalId: pi.id,
        pixQrCode: (pi.next_action as any)?.pix_display_qr_code?.image_url_png,
        pixCopyPaste: (pi.next_action as any)?.pix_display_qr_code?.data,
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: order.description },
          unit_amount: Math.round(order.amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { orderId: order.id, leadId: order.leadId },
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments?success=true&orderId=${order.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments?cancelled=true&orderId=${order.id}`,
    })

    return { externalId: session.id, checkoutUrl: session.url! }
  },

  async createSubscription(config: DecryptedConfig, data: SubCreateData): Promise<{ externalId: string }> {
    const secretKey = config.secretKey || config.apiKey || ''
    if (!secretKey) throw new Error('Chave do Stripe não configurada')

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any })

    const customer = await stripe.customers.create({
      email: data.leadEmail || undefined,
      name: data.leadName || undefined,
      metadata: { leadId: data.leadId },
    })

    let priceId = data.stripePriceId
    if (!priceId) {
      const product = await stripe.products.create({ name: data.planName })
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(data.amount * 100),
        currency: 'brl',
        recurring: { interval: data.intervalType === 'YEARLY' ? 'year' : data.intervalType === 'WEEKLY' ? 'week' : 'month' },
      })
      priceId = price.id
    }

    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      metadata: { subscriptionId: data.subscriptionId, leadId: data.leadId },
    })

    return { externalId: sub.id }
  },

  async cancelSubscription(config: DecryptedConfig, externalId: string): Promise<void> {
    const secretKey = config.secretKey || config.apiKey || ''
    if (!secretKey) return
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any })
    await stripe.subscriptions.cancel(externalId)
  },

  verifyWebhookSignature(config: DecryptedConfig, rawBody: string, signature: string): boolean {
    try {
      const secretKey = config.secretKey || config.apiKey || ''
      const webhookSecret = config.webhookSecret || ''
      if (!secretKey || !webhookSecret) return true
      const Stripe = require('stripe')
      const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' })
      stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      return true
    } catch {
      return false
    }
  },

  parseWebhookEvent(rawBody: string): ParsedPaymentEvent {
    const event = JSON.parse(rawBody)
    const obj = event.data?.object || {}

    const typeMap: Record<string, string> = {
      'checkout.session.completed': 'payment.confirmed',
      'payment_intent.succeeded': 'payment.confirmed',
      'payment_intent.payment_failed': 'payment.failed',
      'charge.refunded': 'payment.refunded',
      'customer.subscription.deleted': 'subscription.cancelled',
      'invoice.payment_failed': 'payment.failed',
    }

    return {
      type: typeMap[event.type] || event.type,
      externalId: obj.id || obj.payment_intent,
      rawEventId: event.id,
      paidAt: obj.created ? new Date(obj.created * 1000) : undefined,
      method: obj.payment_method_types?.[0] === 'pix' ? 'PIX' : 'CREDIT_CARD',
      failReason: obj.last_payment_error?.message,
      cancelReason: obj.cancellation_details?.reason,
    }
  },
}

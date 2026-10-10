export interface GatewayChargeResult {
  externalId: string
  checkoutUrl?: string
  pixQrCode?: string
  pixCopyPaste?: string
  boletoUrl?: string
  boletoBarcode?: string
}

export interface DecryptedConfig {
  id: string
  provider: string
  apiKey?: string
  secretKey?: string
  webhookSecret?: string
  accessToken?: string
  isSandbox?: boolean
}

export interface SubCreateData {
  subscriptionId: string
  leadId: string
  leadName?: string
  leadEmail?: string
  planName: string
  amount: number
  intervalType: string
  stripePriceId?: string
  asaasCustomerId?: string
}

export interface ParsedPaymentEvent {
  type: string // payment.confirmed, payment.failed, payment.refunded, subscription.cancelled
  externalId?: string
  rawEventId?: string
  paidAt?: Date
  method?: string
  failReason?: string
  cancelReason?: string
}

export interface GatewayAdapter {
  createCharge(config: DecryptedConfig, order: any, method?: string): Promise<GatewayChargeResult>
  createSubscription(config: DecryptedConfig, data: SubCreateData): Promise<{ externalId: string }>
  cancelSubscription(config: DecryptedConfig, externalId: string): Promise<void>
  verifyWebhookSignature(config: DecryptedConfig, rawBody: string, signature: string): boolean
  parseWebhookEvent(rawBody: string): ParsedPaymentEvent
}

import { stripeAdapter } from './stripe'
import { mercadoPagoAdapter } from './mercado-pago'
import { asaasAdapter } from './asaas'
import { manualAdapter } from './manual'

const adapters: Record<string, GatewayAdapter> = {
  STRIPE: stripeAdapter,
  MERCADO_PAGO: mercadoPagoAdapter,
  ASAAS: asaasAdapter,
  MANUAL: manualAdapter,
}

export function getAdapter(provider: string): GatewayAdapter {
  const adapter = adapters[provider.toUpperCase()]
  if (!adapter) throw new Error(`Gateway adapter não encontrado: ${provider}`)
  return adapter
}

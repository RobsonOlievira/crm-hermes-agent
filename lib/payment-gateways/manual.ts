import type { GatewayAdapter, GatewayChargeResult, DecryptedConfig, SubCreateData, ParsedPaymentEvent } from './index'

export const manualAdapter: GatewayAdapter = {
  async createCharge(config: DecryptedConfig, order: any, method?: string): Promise<GatewayChargeResult> {
    return {
      externalId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    }
  },

  async createSubscription(config: DecryptedConfig, data: SubCreateData): Promise<{ externalId: string }> {
    return {
      externalId: `sub_manual_${Date.now()}`,
    }
  },

  async cancelSubscription(config: DecryptedConfig, externalId: string): Promise<void> {
    return
  },

  verifyWebhookSignature(config: DecryptedConfig, rawBody: string, signature: string): boolean {
    return true
  },

  parseWebhookEvent(rawBody: string): ParsedPaymentEvent {
    try {
      const data = JSON.parse(rawBody)
      return {
        type: data.type || 'payment.confirmed',
        externalId: data.externalId,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        method: data.method || 'OTHER',
      }
    } catch {
      return {
        type: 'payment.confirmed',
      }
    }
  },
}
